import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Review from '@/models/Review';
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
    
    // Allow access if user is requesting their own reviews or is admin
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
    const rating = searchParams.get('rating');
    const productId = searchParams.get('productId');

    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = { customerId: id };
    if (status) filter.status = status;
    if (rating) filter.rating = parseInt(rating);
    if (productId) filter.productId = productId;

    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('productId', 'name images category brand')
      .select('-verificationToken') // Don't expose verification token
      .lean();

    const total = await Review.countDocuments(filter);

    // Get review statistics for this member
    const stats = await Review.aggregate([
      { $match: { customerId: id } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          averageQualityScore: { $avg: '$qualityScore' },
          totalHelpfulVotes: { $sum: '$analytics.helpfulVotes' },
          ratingDistribution: {
            $push: '$rating'
          },
          statusBreakdown: {
            $push: '$status'
          }
        }
      }
    ]);

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: stats[0] || {
        totalReviews: 0,
        averageRating: 0,
        averageQualityScore: 0,
        totalHelpfulVotes: 0,
        ratingDistribution: [],
        statusBreakdown: []
      },
      filters: {
        status,
        rating,
        productId
      }
    });

  } catch (error) {
    console.error('Get member reviews error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});