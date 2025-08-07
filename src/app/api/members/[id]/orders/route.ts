import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import { requireAuth } from '@/middleware/authMiddleware';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export const GET = requireAuth(async (request, { params }: RouteParams) => {
  try {
    await connectDB();
    const { id } = await params;
    const userId = (request as any).user?.id;
    const userRole = (request as any).user?.role;
    
    // Allow access if user is requesting their own orders or is admin
    if (id !== userId && userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = { customerId: id };
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('items.productId', 'name images category')
      .lean();

    const total = await Order.countDocuments(filter);

    // Get order statistics for this member
    const stats = await Order.aggregate([
      { $match: { customerId: id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totals.total' },
          averageOrderValue: { $avg: '$totals.total' },
          statusBreakdown: {
            $push: {
              status: '$status',
              count: 1
            }
          }
        }
      }
    ]);

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: stats[0] || {
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        statusBreakdown: []
      },
      filters: {
        status,
        dateRange: { startDate, endDate }
      }
    });

  } catch (error) {
    console.error('Get member orders error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});