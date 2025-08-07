import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order, { OrderStatus, PaymentStatus, OrderUtils } from '@/models/Order';
import Product from '@/models/Product';
import Member from '@/models/Member';
import { requireAuth } from '@/middleware/authMiddleware';
import { VERSION_INFO } from '@/lib/version';

export const GET = async (request: NextRequest) => {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') as OrderStatus;
    const paymentStatus = searchParams.get('paymentStatus') as PaymentStatus;
    const customerId = searchParams.get('customerId');
    const customerEmail = searchParams.get('customerEmail');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const includeCustomer = searchParams.get('includeCustomer') === 'true';

    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (customerId) filter.customerId = customerId;
    if (customerEmail) filter.customerEmail = customerEmail.toLowerCase();
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
        { 'shippingAddress.firstName': { $regex: search, $options: 'i' } },
        { 'shippingAddress.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sortObj: any = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

    let query = Order.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    // Populate customer information if requested
    if (includeCustomer) {
      query = query.populate('customerId', 'name email phone membershipTier');
    }

    const orders = await query.lean();
    const total = await Order.countDocuments(filter);

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        status,
        paymentStatus,
        customerId,
        customerEmail,
        dateRange: { startDate, endDate }
      },
      api: VERSION_INFO,
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

export const POST = requireAuth(async (request) => {
  try {
    await connectDB();

    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['customerId', 'customerEmail', 'items', 'shippingAddress', 'billingAddress', 'paymentInfo'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate order data
    const validationErrors = OrderUtils.validateOrderData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors.join(', ') },
        { status: 400 }
      );
    }

    // Validate customer exists
    const customer = await Member.findById(body.customerId);
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Validate and process order items
    const processedItems = [];
    let totalWeight = 0;

    for (const item of body.items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 404 }
        );
      }

      const variant = product.variants.find((v: any) => v.sku === item.variantSku);
      if (!variant) {
        return NextResponse.json(
          { error: `Variant ${item.variantSku} not found in product ${product.name}` },
          { status: 404 }
        );
      }

      // Check inventory
      if (product.trackInventory && variant.inventory < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient inventory for ${product.name} - ${variant.name}` },
          { status: 400 }
        );
      }

      const processedItem = {
        productId: product._id,
        productName: product.name,
        productType: product.productType,
        variantSku: variant.sku,
        variantName: variant.name,
        quantity: item.quantity,
        unitPrice: variant.price,
        totalPrice: variant.price * item.quantity,
        discount: item.discount || 0,
        discountType: item.discountType || 'fixed',
        weight: (variant.weight || product.shipping?.weight || 0) * item.quantity,
        dimensions: variant.dimensions || product.shipping?.dimensions
      };

      // Handle bundle items
      if (product.productType === 'bundle' && product.bundleConfig?.items) {
        processedItem.bundleItems = product.bundleConfig.items.map((bundleItem: any) => ({
          productId: bundleItem.productId,
          productName: '', // Will be populated later
          variantSku: bundleItem.variantSku,
          quantity: bundleItem.quantity * item.quantity
        }));
      }

      processedItems.push(processedItem);
      totalWeight += processedItem.weight;
    }

    // Calculate shipping cost
    const shippingMethod = body.shippingInfo?.method || 'standard';
    const shippingCost = OrderUtils.calculateShipping(
      totalWeight, 
      { length: 30, width: 20, height: 15 }, // Default dimensions
      shippingMethod as any
    );

    // Prepare order data
    const orderData = {
      ...body,
      items: processedItems,
      shippingInfo: {
        ...body.shippingInfo,
        cost: shippingCost,
        weight: totalWeight,
        dimensions: { length: 30, width: 20, height: 15 }
      }
    };

    // Calculate totals
    orderData.totals = OrderUtils.calculateOrderTotals(
      processedItems,
      shippingCost,
      body.discounts || [],
      body.taxes || []
    );

    const order = new Order(orderData);
    await order.save();

    // Update product inventory
    if (body.updateInventory !== false) {
      for (const item of processedItems) {
        await Product.updateOne(
          { _id: item.productId, 'variants.sku': item.variantSku },
          { $inc: { 'variants.$.inventory': -item.quantity } }
        );
      }
    }

    // Update customer statistics
    customer.updateStats({
      total: orderData.totals.total,
      itemCount: processedItems.length
    });
    await customer.save();

    // Populate the order for response
    const populatedOrder = await Order.findById(order._id)
      .populate('customerId', 'name email phone membershipTier');

    return NextResponse.json({
      message: 'Order created successfully',
      order: populatedOrder,
      api: VERSION_INFO,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create order error:', error);
    
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: errorMessages.join(', ') },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});