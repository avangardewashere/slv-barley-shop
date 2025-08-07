import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Review from '@/models/Review';
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

    const { reason } = body;

    const validReasons = ['spam', 'inappropriate', 'fake', 'offensive', 'copyright', 'other'];
    if (!reason || !validReasons.includes(reason)) {
      return NextResponse.json(
        { error: `Valid reason is required. Must be one of: ${validReasons.join(', ')}` },
        { status: 400 }
      );
    }

    const review = await Review.findById(id);
    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Prevent users from reporting their own reviews
    if (review.customerId.toString() === userId) {
      return NextResponse.json(
        { error: 'Cannot report your own review' },
        { status: 400 }
      );
    }

    // Report the review
    review.reportReview(userId, reason);
    await review.save();

    // Auto-flag review if it gets multiple reports
    if (review.analytics.reportCount >= 3 && review.status !== 'flagged') {
      review.status = 'flagged';
      await review.save();
    }

    return NextResponse.json({
      message: 'Review reported successfully',
      reportCount: review.analytics.reportCount
    });

  } catch (error) {
    console.error('Report review error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});