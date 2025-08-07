import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Review, { ReviewStatus } from '@/models/Review';

export const GET = async (request: NextRequest) => {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Get review statistics
    const stats = await Review.getReviewStats(
      productId || undefined,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    // Rating distribution
    const ratingDistribution = await Review.aggregate([
      {
        $match: {
          status: ReviewStatus.APPROVED,
          ...(productId && { productId: productId }),
          ...(startDate && endDate && {
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          })
        }
      },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    // Status breakdown
    const statusBreakdown = await Review.aggregate([
      {
        $match: {
          ...(productId && { productId: productId }),
          ...(startDate && endDate && {
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          })
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Top rated products (if not filtered by product)
    let topRatedProducts = null;
    if (!productId) {
      topRatedProducts = await Review.aggregate([
        {
          $match: {
            status: ReviewStatus.APPROVED,
            ...(startDate && endDate && {
              createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
              }
            })
          }
        },
        {
          $group: {
            _id: '$productId',
            productName: { $first: '$productName' },
            averageRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 },
            totalQualityScore: { $avg: '$qualityScore' }
          }
        },
        {
          $match: {
            totalReviews: { $gte: 3 } // At least 3 reviews
          }
        },
        { $sort: { averageRating: -1, totalReviews: -1 } },
        { $limit: 10 }
      ]);
    }

    // Most helpful reviews
    const mostHelpfulReviews = await Review.aggregate([
      {
        $match: {
          status: ReviewStatus.APPROVED,
          ...(productId && { productId: productId }),
          ...(startDate && endDate && {
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          })
        }
      },
      {
        $addFields: {
          helpfulnessRatio: {
            $cond: {
              if: { $eq: [{ $add: ['$analytics.helpfulVotes', '$analytics.notHelpfulVotes'] }, 0] },
              then: 0,
              else: {
                $divide: [
                  '$analytics.helpfulVotes',
                  { $add: ['$analytics.helpfulVotes', '$analytics.notHelpfulVotes'] }
                ]
              }
            }
          }
        }
      },
      {
        $match: {
          'analytics.helpfulVotes': { $gte: 5 } // At least 5 helpful votes
        }
      },
      { $sort: { helpfulnessRatio: -1, 'analytics.helpfulVotes': -1 } },
      { $limit: 10 },
      {
        $project: {
          title: 1,
          customerName: 1,
          rating: 1,
          productName: 1,
          'analytics.helpfulVotes': 1,
          'analytics.notHelpfulVotes': 1,
          helpfulnessRatio: 1,
          qualityScore: 1,
          createdAt: 1
        }
      }
    ]);

    // Recent activity
    const recentActivity = await Review.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          reviewCount: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          averageQualityScore: { $avg: '$qualityScore' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Quality score distribution
    const qualityDistribution = await Review.aggregate([
      {
        $match: {
          status: ReviewStatus.APPROVED,
          ...(productId && { productId: productId })
        }
      },
      {
        $bucket: {
          groupBy: '$qualityScore',
          boundaries: [0, 25, 50, 75, 100],
          default: 'other',
          output: {
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' }
          }
        }
      }
    ]);

    return NextResponse.json({
      summary: stats[0] || {
        totalReviews: 0,
        averageRating: 0,
        verifiedPurchases: 0
      },
      ratingDistribution,
      statusBreakdown,
      topRatedProducts,
      mostHelpfulReviews,
      recentActivity,
      qualityDistribution,
      filters: {
        productId,
        startDate,
        endDate
      }
    });

  } catch (error) {
    console.error('Get review stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};