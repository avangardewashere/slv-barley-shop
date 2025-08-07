import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product, { ProductUtils } from '@/models/Product';
import Review from '@/models/Review';
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
    const includeReviews = searchParams.get('includeReviews') === 'true';
    const includeRelated = searchParams.get('includeRelated') === 'true';
    const reviewsLimit = parseInt(searchParams.get('reviewsLimit') || '5');
    
    let query = Product.findById(id);
    
    // Populate bundle items if it's a bundle product
    query = query.populate({
      path: 'bundleConfig.items.productId',
      select: 'name images variants category brand'
    });
    
    // Populate related products if requested
    if (includeRelated) {
      query = query
        .populate('relatedProducts', 'name images basePriceRange reviewStats')
        .populate('crossSellProducts', 'name images basePriceRange reviewStats')
        .populate('upSellProducts', 'name images basePriceRange reviewStats');
    }
    
    const product = await query;
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // Increment view count
    await Product.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
    
    let reviews = null;
    if (includeReviews) {
      reviews = await Review.find({ 
        productId: id, 
        status: 'approved' 
      })
      .sort({ createdAt: -1 })
      .limit(reviewsLimit)
      .select('rating title content customerName createdAt media analytics')
      .lean();
    }
    
    return NextResponse.json({ 
      product,
      reviews: includeReviews ? reviews : undefined
    });
  } catch (error) {
    console.error('Get product error:', error);
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
    
    // Validate product data if productType is being changed
    if (body.productType) {
      const validationErrors = ProductUtils.validateProductData(body);
      if (validationErrors.length > 0) {
        return NextResponse.json(
          { error: validationErrors.join(', ') },
          { status: 400 }
        );
      }
    }
    
    // Update price range if variants are being updated
    if (body.variants && body.variants.length > 0) {
      const prices = body.variants.map((v: any) => v.price);
      body.basePriceRange = {
        min: Math.min(...prices),
        max: Math.max(...prices)
      };
    }
    
    const product = await Product.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    ).populate({
      path: 'bundleConfig.items.productId',
      select: 'name images variants category brand'
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Product updated successfully',
      product,
    });
  } catch (error: any) {
    console.error('Update product error:', error);
    
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

    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});