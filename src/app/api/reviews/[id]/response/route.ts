import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Review from '@/models/Review';
import Admin from '@/models/Admin';
import { requireAuth } from '@/middleware/authMiddleware';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export const POST = requireAuth(async (request, { params }: RouteParams) => {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const userId = (request as any).user?.id;
    const userRole = (request as any).user?.role;

    const { response } = body;

    if (!response || response.trim().length === 0) {
      return NextResponse.json(
        { error: 'Response content is required' },
        { status: 400 }
      );
    }

    if (!['admin', 'merchant'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Only admins and merchants can respond to reviews' },
        { status: 403 }
      );
    }

    const review = await Review.findById(id);
    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Get responder information
    let responderName = 'Administrator';
    if (userRole === 'admin') {
      const admin = await Admin.findById(userId);
      if (admin) {
        responderName = admin.name || 'Administrator';
      }
    }

    // Add response
    review.addResponse(userId, userRole, responderName, response.trim());
    await review.save();

    return NextResponse.json({
      message: 'Response added successfully',
      response: {
        responderName,
        response: response.trim(),
        respondedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Add review response error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});