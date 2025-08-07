import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order, { OrderStatus } from '@/models/Order';
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

    const order = await Order.findById(id).select('orderNumber shippingInfo timeline status');
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Filter timeline for shipping-related events
    const shippingTimeline = order.timeline.filter(event => 
      [OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(event.status)
    );

    return NextResponse.json({
      orderNumber: order.orderNumber,
      status: order.status,
      trackingNumber: order.shippingInfo.trackingNumber,
      trackingUrl: order.shippingInfo.trackingUrl,
      carrier: order.shippingInfo.carrier,
      estimatedDelivery: order.shippingInfo.estimatedDelivery,
      actualDelivery: order.shippingInfo.actualDelivery,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      timeline: shippingTimeline
    });

  } catch (error) {
    console.error('Get tracking info error:', error);
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

    // Update shipping information
    const allowedFields = [
      'trackingNumber',
      'trackingUrl', 
      'carrier',
      'estimatedDelivery',
      'actualDelivery',
      'specialInstructions'
    ];

    let statusChanged = false;
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (order.shippingInfo as any)[field] = body[field];
        
        // If tracking number is added and order hasn't been marked as shipped
        if (field === 'trackingNumber' && body[field] && order.status !== OrderStatus.SHIPPED) {
          order.addTimelineEvent(
            OrderStatus.SHIPPED, 
            `Tracking number added: ${body[field]}`, 
            updatedBy
          );
          statusChanged = true;
        }
        
        // If actual delivery date is set
        if (field === 'actualDelivery' && body[field] && order.status !== OrderStatus.DELIVERED) {
          order.addTimelineEvent(
            OrderStatus.DELIVERED,
            'Package delivered',
            updatedBy
          );
          statusChanged = true;
        }
      }
    }

    await order.save();

    const response = {
      message: 'Tracking information updated successfully',
      orderNumber: order.orderNumber,
      trackingInfo: {
        trackingNumber: order.shippingInfo.trackingNumber,
        trackingUrl: order.shippingInfo.trackingUrl,
        carrier: order.shippingInfo.carrier,
        estimatedDelivery: order.shippingInfo.estimatedDelivery,
        actualDelivery: order.shippingInfo.actualDelivery
      }
    };

    if (statusChanged) {
      response.message += '. Order status updated.';
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Update tracking info error:', error);
    
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