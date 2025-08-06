import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import { requireAuth } from '@/middleware/authMiddleware';
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

    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (isActive !== null) filter.isActive = isActive === 'true';
    if (search) {
      filter.$text = { $search: search };
    }

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments(filter);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
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
    const requiredFields = ['name', 'description', 'category', 'brand', 'images', 'variants'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

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