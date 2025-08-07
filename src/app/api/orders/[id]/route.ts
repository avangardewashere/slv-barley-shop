import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order, { OrderStatus, PaymentStatus } from '@/models/Order';
import { requireAuth } from '@/middleware/authMiddleware';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export const GET = async (request: NextRequest, { params }: RouteParams) => {
  try {
    await connectDB();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeCustomer = searchParams.get('includeCustomer') === 'true';
    const includeTimeline = searchParams.get('includeTimeline') === 'true';

    let query = Order.findById(id);

    // Populate customer information if requested
    if (includeCustomer) {
      query = query.populate('customerId', 'name email phone membershipTier avatar');
    }

    // Populate product information in items
    query = query.populate({
      path: 'items.productId',
      select: 'name images category brand'
    });

    const order = await query;
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const response: any = { order };

    // Include timeline if requested
    if (includeTimeline) {
      response.timeline = order.timeline;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

export const PUT = requireAuth(async (request, { params }: RouteParams) => {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const updatedBy = (request as any).user?.id || 'system';

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Handle status updates
    if (body.status && body.status !== order.status) {
      order.addTimelineEvent(body.status, body.statusNote, updatedBy);
    }

    // Handle payment status updates
    if (body.paymentStatus && body.paymentStatus !== order.paymentStatus) {
      order.paymentInfo.status = body.paymentStatus;
      if (body.paymentStatus === PaymentStatus.CAPTURED) {
        order.paymentInfo.capturedAt = new Date();
        order.totals.paidAmount = body.paidAmount || order.totals.total;
      }
    }

    // Handle shipping updates
    if (body.shippingInfo) {
      Object.assign(order.shippingInfo, body.shippingInfo);
      if (body.shippingInfo.trackingNumber && !order.shippedAt) {
        order.addTimelineEvent(OrderStatus.SHIPPED, 'Tracking number added', updatedBy);
      }
    }

    // Handle admin notes
    if (body.adminNotes !== undefined) {
      order.adminNotes = body.adminNotes;
    }

    // Handle other updates
    const allowedUpdates = [
      'customerNotes', 
      'expectedDeliveryDate',
      'shippingAddress',
      'billingAddress'
    ];
    
    for (const field of allowedUpdates) {
      if (body[field] !== undefined) {
        (order as any)[field] = body[field];
      }
    }

    await order.save();

    const updatedOrder = await Order.findById(id)
      .populate('customerId', 'name email phone membershipTier')
      .populate({
        path: 'items.productId',
        select: 'name images category brand'
      });

    return NextResponse.json({
      message: 'Order updated successfully',
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error('Update order error:', error);
    
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

export const DELETE = requireAuth(async (request, { params }: RouteParams) => {
  try {
    await connectDB();
    const { id } = await params;

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if order can be cancelled
    if (!order.canBeCancelled()) {
      return NextResponse.json(
        { error: 'Order cannot be cancelled in current status' },
        { status: 400 }
      );
    }

    // Update status to cancelled instead of deleting
    const updatedBy = (request as any).user?.id || 'system';
    order.addTimelineEvent(OrderStatus.CANCELLED, 'Order cancelled via API', updatedBy);
    await order.save();

    return NextResponse.json({
      message: 'Order cancelled successfully',
      order,
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});