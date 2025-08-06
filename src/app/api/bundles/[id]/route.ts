import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Bundle from '@/models/Bundle';
import Product from '@/models/Product';
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

    const bundle = await Bundle.findById(id)
      .populate({
        path: 'items.productId',
        select: 'name images category brand variants',
      });

    if (!bundle) {
      return NextResponse.json(
        { error: 'Bundle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ bundle });
  } catch (error) {
    console.error('Get bundle error:', error);
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
    
    // If items are being updated, validate products and variants
    if (body.items) {
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
    }
    
    const bundle = await Bundle.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    ).populate({
      path: 'items.productId',
      select: 'name images category brand',
    });

    if (!bundle) {
      return NextResponse.json(
        { error: 'Bundle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Bundle updated successfully',
      bundle,
    });
  } catch (error: any) {
    console.error('Update bundle error:', error);
    
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

    const bundle = await Bundle.findByIdAndDelete(id);
    if (!bundle) {
      return NextResponse.json(
        { error: 'Bundle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Bundle deleted successfully',
    });
  } catch (error) {
    console.error('Delete bundle error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});