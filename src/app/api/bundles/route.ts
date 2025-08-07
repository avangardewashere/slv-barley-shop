import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product, { ProductType } from '@/models/Product';
import { requireAuth } from '@/middleware/authMiddleware';
import { VERSION_INFO } from '@/lib/version';

// DEPRECATED: This endpoint is deprecated. Bundles are now products with type='bundle'
// This endpoint provides backward compatibility during transition

export const GET = async (request: NextRequest) => {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive');

    const skip = (page - 1) * limit;

    // Build filter object for bundle products
    const filter: any = { productType: ProductType.BUNDLE };
    if (isActive !== null) filter.isActive = isActive === 'true';
    if (search) {
      filter.$text = { $search: search };
    }

    const bundles = await Product.find(filter)
      .populate({
        path: 'bundleConfig.items.productId',
        select: 'name images category brand variants',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments(filter);

    // Transform to match old bundle format for backward compatibility
    const transformedBundles = bundles.map(bundle => ({
      _id: bundle._id,
      name: bundle.name,
      description: bundle.description,
      images: bundle.images,
      items: bundle.bundleConfig?.items || [],
      totalSavings: bundle.bundleConfig?.totalSavings || 0,
      savingsPercentage: bundle.bundleConfig?.savingsPercentage || 0,
      isActive: bundle.isActive,
      createdAt: bundle.createdAt,
      updatedAt: bundle.updatedAt
    }));

    return NextResponse.json({
      bundles: transformedBundles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      _deprecated: true,
      _message: 'This endpoint is deprecated. Use /api/products?productType=bundle instead',
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
    
    // Transform old bundle data to new product schema
    const productData = {
      name: body.name,
      description: body.description,
      shortDescription: body.shortDescription || body.description?.substring(0, 200),
      productType: ProductType.BUNDLE,
      category: body.category || 'Bundles',
      brand: body.brand || 'Salveo Organics',
      images: body.images,
      variants: body.variants || [{
        name: 'Default',
        price: body.bundlePrice || body.price || 0,
        compareAtPrice: body.originalPrice,
        sku: body.sku || `BUNDLE-${Date.now()}`,
        inventory: body.inventory || 999,
        isDefault: true,
        attributes: []
      }],
      bundleConfig: {
        items: body.items?.map((item: any) => ({
          productId: item.productId,
          variantSku: item.variantSku || item.variantName,
          quantity: item.quantity || 1,
          discountPercentage: item.discountPercentage || 0
        })) || [],
        totalSavings: body.totalSavings || 0,
        savingsPercentage: body.savingsPercentage || 0
      },
      isActive: body.isActive !== undefined ? body.isActive : true,
      isFeatured: body.isFeatured || false
    };
    
    // Validate that all products in bundle items exist
    if (productData.bundleConfig.items.length > 0) {
      const productIds = productData.bundleConfig.items.map((item: any) => item.productId);
      const existingProducts = await Product.find({ _id: { $in: productIds } });
      
      if (existingProducts.length !== productIds.length) {
        return NextResponse.json(
          { error: 'One or more products in bundle do not exist' },
          { status: 400 }
        );
      }
    }
    
    // Calculate price range
    if (productData.variants.length > 0) {
      const prices = productData.variants.map(v => v.price);
      productData.basePriceRange = {
        min: Math.min(...prices),
        max: Math.max(...prices)
      };
    }

    const product = new Product(productData);
    await product.save();

    // Populate bundle items
    const populatedProduct = await Product.findById(product._id)
      .populate({
        path: 'bundleConfig.items.productId',
        select: 'name images category brand variants',
      });

    // Transform back to bundle format for backward compatibility
    const bundleResponse = {
      _id: populatedProduct._id,
      name: populatedProduct.name,
      description: populatedProduct.description,
      images: populatedProduct.images,
      items: populatedProduct.bundleConfig?.items || [],
      totalSavings: populatedProduct.bundleConfig?.totalSavings || 0,
      savingsPercentage: populatedProduct.bundleConfig?.savingsPercentage || 0,
      isActive: populatedProduct.isActive,
      createdAt: populatedProduct.createdAt,
      updatedAt: populatedProduct.updatedAt
    };

    return NextResponse.json({
      message: 'Bundle created successfully (migrated to product)',
      bundle: bundleResponse,
      _deprecated: true,
      _message: 'Bundle created as product with type=bundle. Use /api/products for future operations',
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