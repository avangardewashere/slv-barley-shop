import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Review, { ReviewStatus } from '@/models/Review';
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
    const includeProduct = searchParams.get('includeProduct') === 'true';
    const includeCustomer = searchParams.get('includeCustomer') === 'true';
    const includeResponses = searchParams.get('includeResponses') === 'true';

    let query = Review.findById(id);

    // Populate related data if requested
    if (includeProduct) {
      query = query.populate('productId', 'name images category brand variants');
    }
    
    if (includeCustomer) {
      query = query.populate('customerId', 'name avatar membershipTier');
    }

    const review = await query;
    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Increment view count
    review.incrementView();
    await review.save();

    const response: any = { review };

    // Include responses if requested (for admin view)
    if (includeResponses) {
      response.responses = review.responses;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get review error:', error);
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
    const userId = (request as any).user?.id;

    const review = await Review.findById(id);
    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Check if user owns this review or is admin
    const isOwner = review.customerId.toString() === userId;
    const isAdmin = (request as any).user?.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized to update this review' },
        { status: 403 }
      );
    }

    // Handle different types of updates
    if (isAdmin) {
      // Admin can update status, moderation info
      const allowedAdminFields = ['status', 'moderationReason', 'adminNotes'];
      for (const field of allowedAdminFields) {
        if (body[field] !== undefined) {
          if (field === 'status' && body.moderationReason) {
            review.moderate(userId, body[field], body.moderationReason, body.adminNotes);
          } else {
            (review as any)[field] = body[field];
          }
        }
      }
    }

    if (isOwner) {
      // Owner can update content (only if not approved yet)
      if (review.status === ReviewStatus.PENDING) {
        const allowedOwnerFields = ['rating', 'title', 'content', 'pros', 'cons', 'featureRatings', 'media'];
        for (const field of allowedOwnerFields) {
          if (body[field] !== undefined) {
            (review as any)[field] = body[field];
          }
        }
      } else {
        return NextResponse.json(
          { error: 'Cannot edit approved review' },
          { status: 400 }
        );
      }
    }

    await review.save();

    const updatedReview = await Review.findById(id)
      .populate('productId', 'name images category')
      .populate('customerId', 'name avatar membershipTier');

    return NextResponse.json({
      message: 'Review updated successfully',
      review: updatedReview,
    });

  } catch (error: any) {
    console.error('Update review error:', error);
    
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
    const userId = (request as any).user?.id;

    const review = await Review.findById(id);
    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Check if user owns this review or is admin
    const isOwner = review.customerId.toString() === userId;
    const isAdmin = (request as any).user?.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this review' },
        { status: 403 }
      );
    }

    // Soft delete by setting status to hidden instead of actually deleting
    if (isAdmin) {
      review.status = ReviewStatus.HIDDEN;
      review.moderate(userId, ReviewStatus.HIDDEN, 'Review deleted by admin');
      await review.save();
    } else {
      // Owner can only delete if not approved
      if (review.status === ReviewStatus.PENDING) {
        await Review.findByIdAndDelete(id);
      } else {
        return NextResponse.json(
          { error: 'Cannot delete approved review' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      message: 'Review deleted successfully',
    });
  } catch (error) {
    console.error('Delete review error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});