import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order, { OrderStatus } from '@/models/Order';
import { requireAuth } from '@/middleware/authMiddleware';

export const GET = requireAuth(async (request) => {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const groupBy = searchParams.get('groupBy') || 'day'; // day, week, month
    
    // Build date filter
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    
    const matchStage: any = {};
    if (Object.keys(dateFilter).length > 0) {
      matchStage.createdAt = dateFilter;
    }

    // Basic order statistics
    const basicStats = await Order.getOrderStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    // Status breakdown
    const statusBreakdown = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$totals.total' }
        }
      }
    ]);

    // Payment status breakdown
    const paymentBreakdown = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$paymentInfo.status',
          count: { $sum: 1 },
          totalValue: { $sum: '$totals.total' }
        }
      }
    ]);

    // Top customers by order count and value
    const topCustomers = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$customerId',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$totals.total' },
          avgOrderValue: { $avg: '$totals.total' },
          customerEmail: { $first: '$customerEmail' }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 }
    ]);

    // Revenue over time
    let groupByFormat: string;
    switch (groupBy) {
      case 'week':
        groupByFormat = '%Y-%U';
        break;
      case 'month':
        groupByFormat = '%Y-%m';
        break;
      case 'day':
      default:
        groupByFormat = '%Y-%m-%d';
        break;
    }

    const revenueOverTime = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: groupByFormat, date: '$createdAt' } },
          revenue: { $sum: '$totals.total' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$totals.total' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Product performance (most ordered products)
    const productPerformance = await Order.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);

    // Shipping method breakdown
    const shippingBreakdown = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$shippingInfo.method',
          count: { $sum: 1 },
          totalShippingCost: { $sum: '$shippingInfo.cost' },
          avgShippingCost: { $avg: '$shippingInfo.cost' }
        }
      }
    ]);

    // Average delivery time (for delivered orders)
    const deliveryStats = await Order.aggregate([
      { 
        $match: { 
          ...matchStage,
          status: OrderStatus.DELIVERED,
          shippedAt: { $exists: true },
          deliveredAt: { $exists: true }
        }
      },
      {
        $addFields: {
          deliveryTime: {
            $subtract: ['$deliveredAt', '$shippedAt']
          }
        }
      },
      {
        $group: {
          _id: null,
          avgDeliveryTime: { $avg: '$deliveryTime' },
          minDeliveryTime: { $min: '$deliveryTime' },
          maxDeliveryTime: { $max: '$deliveryTime' },
          deliveredOrdersCount: { $sum: 1 }
        }
      }
    ]);

    return NextResponse.json({
      summary: basicStats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0
      },
      statusBreakdown,
      paymentBreakdown,
      topCustomers,
      revenueOverTime,
      productPerformance,
      shippingBreakdown,
      deliveryStats: deliveryStats[0] || {
        avgDeliveryTime: 0,
        minDeliveryTime: 0,
        maxDeliveryTime: 0,
        deliveredOrdersCount: 0
      },
      filters: {
        startDate,
        endDate,
        groupBy
      }
    });

  } catch (error) {
    console.error('Get order stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});