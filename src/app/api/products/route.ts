import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product, { ProductType, ProductStatus, ProductUtils } from '@/models/Product';
import Review from '@/models/Review';
import { requireAuth } from '@/middleware/authMiddleware';
import { transformProductImages } from '@/lib/cloudinary';
import { VERSION_INFO } from '@/lib/version';

export const GET = async (request: NextRequest) => {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const category = searchParams.get('category');
    const brand = searchParams.get('brand');
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive');
    const productType = searchParams.get('productType') as ProductType;
    const status = searchParams.get('status') as ProductStatus;
    const isFeatured = searchParams.get('isFeatured');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const includeReviews = searchParams.get('includeReviews') === 'true';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (isActive !== null) filter.isActive = isActive === 'true';
    if (productType) filter.productType = productType;
    if (status) filter.status = status;
    if (isFeatured !== null) filter.isFeatured = isFeatured === 'true';
    if (minPrice || maxPrice) {
      filter['basePriceRange.min'] = {};
      if (minPrice) filter['basePriceRange.min'].$gte = parseFloat(minPrice);
      if (maxPrice) filter['basePriceRange.max'] = { $lte: parseFloat(maxPrice) };
    }
    if (search) {
      filter.$text = { $search: search };
    }

    // Build sort object
    const sortObj: any = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    let query = Product.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit);
    
    // Populate related products if requested
    if (includeReviews) {
      query = query.populate({
        path: 'reviewStats',
        select: 'averageRating totalReviews'
      });
    }
    
    const products = await query.lean();

    // Transform product images to ensure optimized URLs
    const transformedProducts = products.map(product => ({
      ...product,
      images: transformProductImages(product.images || [])
    }));

    const total = await Product.countDocuments(filter);

    return NextResponse.json({
      products: transformedProducts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        category,
        brand,
        productType,
        status,
        isFeatured,
        priceRange: { min: minPrice, max: maxPrice }
      },
      api: VERSION_INFO,
    });
  } catch (error) {
    console.error('Get products error:', error);
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
    
    // Validate required fields
    const requiredFields = ['name', 'description', 'category', 'brand', 'images', 'variants', 'productType'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }
    
    // Validate product data using utility function
    const validationErrors = ProductUtils.validateProductData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors.join(', ') },
        { status: 400 }
      );
    }
    
    // Set default values for new schema fields
    body.productType = body.productType || ProductType.SINGLE;
    body.status = body.status || ProductStatus.ACTIVE;
    body.isActive = body.isActive !== undefined ? body.isActive : true;
    body.isFeatured = body.isFeatured || false;
    body.trackInventory = body.trackInventory !== undefined ? body.trackInventory : true;
    body.allowBackorder = body.allowBackorder || false;
    body.lowStockThreshold = body.lowStockThreshold || 10;
    
    // Calculate price range from variants
    if (body.variants && body.variants.length > 0) {
      const prices = body.variants.map((v: any) => v.price);
      body.basePriceRange = {
        min: Math.min(...prices),
        max: Math.max(...prices)
      };
    }
    
    // Initialize review stats
    body.reviewStats = {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      lastUpdated: new Date()
    };
    
    // Initialize analytics fields
    body.viewCount = 0;
    body.purchaseCount = 0;
    body.wishlistCount = 0;

    const product = new Product(body);
    await product.save();

    return NextResponse.json({
      message: 'Product created successfully',
      product,
      api: VERSION_INFO,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create product error:', error);
    
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