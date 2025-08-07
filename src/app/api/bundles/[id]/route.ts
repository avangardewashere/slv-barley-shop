import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product, { ProductType } from '@/models/Product';
import { requireAuth } from '@/middleware/authMiddleware';

// DEPRECATED: This endpoint is deprecated. Bundles are now products with type='bundle'
// This endpoint provides backward compatibility during transition

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export const GET = async (request: NextRequest, { params }: RouteParams) => {
  try {
    await connectDB();
    const { id } = await params;

    const product = await Product.findOne({ _id: id, productType: ProductType.BUNDLE })
      .populate({
        path: 'bundleConfig.items.productId',
        select: 'name images category brand variants',
      });

    if (!product) {
      return NextResponse.json(
        { error: 'Bundle not found' },
        { status: 404 }
      );
    }
    
    // Transform to old bundle format for backward compatibility
    const bundle = {
      _id: product._id,
      name: product.name,
      description: product.description,
      images: product.images,
      items: product.bundleConfig?.items || [],
      totalSavings: product.bundleConfig?.totalSavings || 0,
      savingsPercentage: product.bundleConfig?.savingsPercentage || 0,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };

    return NextResponse.json({ 
      bundle,
      _deprecated: true,
      _message: 'This endpoint is deprecated. Use /api/products/' + id + ' instead'
    });
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
    
    // Transform old bundle update to product update
    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.description) updateData.description = body.description;
    if (body.images) updateData.images = body.images;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    
    // Handle bundle items update
    if (body.items) {
      const productIds = body.items.map((item: any) => item.productId);
      const existingProducts = await Product.find({ _id: { $in: productIds } });
      
      if (existingProducts.length !== productIds.length) {
        return NextResponse.json(
          { error: 'One or more products in bundle do not exist' },
          { status: 400 }
        );
      }
      
      updateData['bundleConfig.items'] = body.items.map((item: any) => ({
        productId: item.productId,
        variantSku: item.variantSku || item.variantName,
        quantity: item.quantity || 1,
        discountPercentage: item.discountPercentage || 0
      }));
    }
    
    if (body.totalSavings !== undefined) updateData['bundleConfig.totalSavings'] = body.totalSavings;
    if (body.savingsPercentage !== undefined) updateData['bundleConfig.savingsPercentage'] = body.savingsPercentage;
    
    const product = await Product.findOneAndUpdate(
      { _id: id, productType: ProductType.BUNDLE },
      updateData,
      { new: true, runValidators: true }
    ).populate({
      path: 'bundleConfig.items.productId',
      select: 'name images category brand variants',
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Bundle not found' },
        { status: 404 }
      );
    }
    
    // Transform back to bundle format
    const bundle = {
      _id: product._id,
      name: product.name,
      description: product.description,
      images: product.images,
      items: product.bundleConfig?.items || [],
      totalSavings: product.bundleConfig?.totalSavings || 0,
      savingsPercentage: product.bundleConfig?.savingsPercentage || 0,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };

    return NextResponse.json({
      message: 'Bundle updated successfully',
      bundle,
      _deprecated: true,
      _message: 'Bundle updated as product. Use /api/products/' + id + ' for future updates'
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

    const product = await Product.findOneAndDelete({ _id: id, productType: ProductType.BUNDLE });
    if (!product) {
      return NextResponse.json(
        { error: 'Bundle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Bundle deleted successfully',
      _deprecated: true,
      _message: 'Bundle deleted as product. Use /api/products/' + id + ' for future operations'
    });
  } catch (error) {
    console.error('Delete bundle error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});