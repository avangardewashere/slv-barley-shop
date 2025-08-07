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

    const { voteType } = body;

    if (!voteType || !['helpful', 'not_helpful'].includes(voteType)) {
      return NextResponse.json(
        { error: 'Valid vote type (helpful or not_helpful) is required' },
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

    // Prevent users from voting on their own reviews
    if (review.customerId.toString() === userId) {
      return NextResponse.json(
        { error: 'Cannot vote on your own review' },
        { status: 400 }
      );
    }

    // Add or update vote
    review.addVote(userId, voteType);
    await review.save();

    return NextResponse.json({
      message: `Vote registered as ${voteType}`,
      analytics: {
        helpfulVotes: review.analytics.helpfulVotes,
        notHelpfulVotes: review.analytics.notHelpfulVotes,
        totalVotes: review.analytics.helpfulVotes + review.analytics.notHelpfulVotes
      }
    });

  } catch (error) {
    console.error('Vote review error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});