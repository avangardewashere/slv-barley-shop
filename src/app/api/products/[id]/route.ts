import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product, { ProductUtils } from '@/models/Product';
import Review from '@/models/Review';
import { authenticateAdmin } from '@/middleware/auth';

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

export const PUT = async (request: NextRequest, { params }: RouteParams) => {
  const authResult = await authenticateAdmin(request, false); // Disable CSRF check
  if (!authResult.isAuthenticated) {
    return authResult.response!;
  }
  try {
    await connectDB();
    const { id } = await params;

    const body = await request.json();
    
    // Parse stringified fields if they exist
    if (typeof body.images === 'string') {
      try {
        body.images = JSON.parse(body.images);
      } catch (error) {
        console.error('Failed to parse images field:', error);
        return NextResponse.json(
          { error: 'Invalid images format' },
          { status: 400 }
        );
      }
    }
    
    if (typeof body.variants === 'string') {
      try {
        body.variants = JSON.parse(body.variants);
      } catch (error) {
        console.error('Failed to parse variants field:', error);
        return NextResponse.json(
          { error: 'Invalid variants format' },
          { status: 400 }
        );
      }
    }
    
    if (typeof body.tags === 'string') {
      try {
        body.tags = JSON.parse(body.tags);
      } catch (error) {
        console.error('Failed to parse tags field:', error);
        return NextResponse.json(
          { error: 'Invalid tags format' },
          { status: 400 }
        );
      }
    }
    
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
    );

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
};

export const DELETE = async (request: NextRequest, { params }: RouteParams) => {
  const authResult = await authenticateAdmin(request, false); // Disable CSRF check
  if (!authResult.isAuthenticated) {
    return authResult.response!;
  }
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
};