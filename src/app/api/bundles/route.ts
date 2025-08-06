import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Bundle from '@/models/Bundle';
import Product from '@/models/Product';
import { requireAuth } from '@/middleware/authMiddleware';
import { VERSION_INFO } from '@/lib/version';

export const GET = async (request: NextRequest) => {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive');

    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};
    if (isActive !== null) filter.isActive = isActive === 'true';
    if (search) {
      filter.$text = { $search: search };
    }

    const bundles = await Bundle.find(filter)
      .populate({
        path: 'items.productId',
        select: 'name images category brand',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Bundle.countDocuments(filter);

    return NextResponse.json({
      bundles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      api: VERSION_INFO,
    });
  } catch (error) {
    console.error('Get bundles error:', error);
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
    const requiredFields = ['name', 'description', 'images', 'items', 'originalPrice', 'discount', 'discountType'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate that all products in bundle items exist
    const productIds = body.items.map((item: any) => item.productId);
    const existingProducts = await Product.find({ _id: { $in: productIds } });
    
    if (existingProducts.length !== productIds.length) {
      return NextResponse.json(
        { error: 'One or more products in bundle do not exist' },
        { status: 400 }
      );
    }

    // Validate variants exist in products
    for (const item of body.items) {
      const product = existingProducts.find(p => p._id.toString() === item.productId);
      const variantExists = product?.variants.some((v: any) => v.name === item.variantName);
      
      if (!variantExists) {
        return NextResponse.json(
          { error: `Variant '${item.variantName}' does not exist in product '${product?.name}'` },
          { status: 400 }
        );
      }
    }

    const bundle = new Bundle(body);
    await bundle.save();

    // Populate the bundle with product details
    const populatedBundle = await Bundle.findById(bundle._id)
      .populate({
        path: 'items.productId',
        select: 'name images category brand',
      });

    return NextResponse.json({
      message: 'Bundle created successfully',
      bundle: populatedBundle,
      api: VERSION_INFO,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create bundle error:', error);
    
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