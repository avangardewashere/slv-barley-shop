import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Review, { ReviewStatus, ReviewType, ReviewUtils } from '@/models/Review';
import Product from '@/models/Product';
import Member from '@/models/Member';
import Order from '@/models/Order';
import { requireAuth } from '@/middleware/authMiddleware';
import { VERSION_INFO } from '@/lib/version';

export const GET = async (request: NextRequest) => {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '20'));
    const productId = searchParams.get('productId');
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status') as ReviewStatus;
    const rating = searchParams.get('rating');
    const isVerified = searchParams.get('isVerified');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const includeProduct = searchParams.get('includeProduct') === 'true';
    const includeCustomer = searchParams.get('includeCustomer') === 'true';

    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};
    if (productId) filter.productId = productId;
    if (customerId) filter.customerId = customerId;
    if (status) filter.status = status;
    if (rating) filter.rating = parseInt(rating);
    if (isVerified !== null) filter.isVerifiedPurchase = isVerified === 'true';
    
    if (search) {
      filter.$text = { $search: search };
    }

    // Build sort object
    const sortObj: any = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

    let query = Review.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    // Populate related data if requested
    if (includeProduct) {
      query = query.populate('productId', 'name images category brand');
    }
    
    if (includeCustomer) {
      query = query.populate('customerId', 'name avatar membershipTier');
    }

    const reviews = await query.lean();
    const total = await Review.countDocuments(filter);

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        productId,
        customerId,
        status,
        rating,
        isVerified
      },
      api: VERSION_INFO,
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

export const POST = requireAuth(async (request) => {
  try {
    await connectDB();

    const body = await request.json();
    const userId = (request as any).user?.id;
    
    // Validate required fields
    const requiredFields = ['productId', 'rating', 'title', 'content'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate review data
    const validationErrors = ReviewUtils.validateReviewData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors.join(', ') },
        { status: 400 }
      );
    }

    // Get customer information
    const customer = await Member.findById(userId || body.customerId);
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get product information
    const product = await Product.findById(body.productId);
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if customer can review this product
    const canReview = await ReviewUtils.canCustomerReviewProduct(
      customer._id.toString(),
      body.productId,
      body.orderId
    );

    if (!canReview.canReview) {
      return NextResponse.json(
        { error: canReview.reason },
        { status: 400 }
      );
    }

    // Prepare review data
    const reviewData = {
      productId: body.productId,
      customerId: customer._id,
      orderId: body.orderId,
      orderItemId: body.orderItemId,
      rating: body.rating,
      title: body.title,
      content: body.content,
      pros: body.pros || [],
      cons: body.cons || [],
      
      // Customer information (cached)
      customerName: customer.name,
      customerEmail: customer.email,
      customerAvatar: customer.avatar,
      customerMembershipTier: customer.membershipTier,
      
      // Product information (cached)
      productName: product.name,
      productVariantSku: body.variantSku,
      productVariantName: body.variantName,
      
      // Media attachments
      media: body.media || [],
      
      // Verification
      isVerifiedPurchase: canReview.verifiedPurchase,
      type: canReview.verifiedPurchase ? ReviewType.VERIFIED_PURCHASE : ReviewType.UNVERIFIED,
      
      // Feature ratings
      featureRatings: body.featureRatings || [],
      
      // Context
      reviewSource: body.reviewSource || 'web',
      isIncentivized: body.isIncentivized || false,
      incentiveType: body.incentiveType
    };

    // Generate verification token for email verification if needed
    if (body.verificationToken) {
      reviewData.verificationToken = ReviewUtils.generateVerificationToken();
    }

    const review = new Review(reviewData);
    await review.save();

    // Update customer review statistics
    customer.stats.totalReviews += 1;
    const avgRating = (customer.stats.averageRating * (customer.stats.totalReviews - 1) + body.rating) / customer.stats.totalReviews;
    customer.stats.averageRating = Math.round(avgRating * 100) / 100;
    await customer.save();

    // Populate the review for response
    const populatedReview = await Review.findById(review._id)
      .populate('productId', 'name images category')
      .populate('customerId', 'name avatar membershipTier');

    return NextResponse.json({
      message: 'Review created successfully',
      review: populatedReview,
      api: VERSION_INFO,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create review error:', error);
    
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: errorMessages.join(', ') },
        { status: 400 }
      );
    }

    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'You have already reviewed this product for this order' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});