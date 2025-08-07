import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order, { OrderStatus } from '@/models/Order';
import { requireAuth } from '@/middleware/authMiddleware';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export const PUT = requireAuth(async (request, { params }: RouteParams) => {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const updatedBy = (request as any).user?.id || 'system';

    const { status, note, metadata } = body;

    if (!status || !Object.values(OrderStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required' },
        { status: 400 }
      );
    }

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Validate status transition
    const currentStatus = order.status;
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.RETURNED],
      [OrderStatus.DELIVERED]: [OrderStatus.RETURNED, OrderStatus.REFUNDED],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.RETURNED]: [OrderStatus.REFUNDED],
      [OrderStatus.REFUNDED]: []
    };

    if (!validTransitions[currentStatus].includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${currentStatus} to ${status}` },
        { status: 400 }
      );
    }

    // Add timeline event and update status
    order.addTimelineEvent(status, note, updatedBy, metadata);
    await order.save();

    // Return updated order with timeline
    const updatedOrder = await Order.findById(id)
      .populate('customerId', 'name email phone')
      .select('orderNumber status timeline totals');

    return NextResponse.json({
      message: `Order status updated to ${status}`,
      order: updatedOrder,
      timeline: updatedOrder.timeline
    });

  } catch (error: any) {
    console.error('Update order status error:', error);
    
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