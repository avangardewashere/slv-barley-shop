import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Member from '@/models/Member';
import Product from '@/models/Product';
import { requireAuth } from '@/middleware/authMiddleware';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export const GET = requireAuth(async (request, { params }: RouteParams) => {
  try {
    await connectDB();
    const { id } = await params;
    const userId = (request as any).user?.id;
    
    // Allow access if user is requesting their own wishlist
    if (id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const member = await Member.findById(id)
      .populate({
        path: 'wishlist',
        select: 'name images basePriceRange reviewStats category brand isActive',
        match: { isActive: true }
      });

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      wishlist: member.wishlist,
      totalItems: member.wishlist.length
    });

  } catch (error) {
    console.error('Get wishlist error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const POST = requireAuth(async (request, { params }: RouteParams) => {
  try {
    await connectDB();
    const { id } = await params;
    const userId = (request as any).user?.id;
    const body = await request.json();
    
    // Allow access if user is updating their own wishlist
    if (id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { productId } = body;
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Validate product exists and is active
    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found or inactive' },
        { status: 404 }
      );
    }

    const member = await Member.findById(id);
    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Add to wishlist
    member.addToWishlist(productId);
    await member.save();

    return NextResponse.json({
      message: 'Product added to wishlist',
      wishlistCount: member.stats.wishlistItems
    });

  } catch (error) {
    console.error('Add to wishlist error:', error);
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
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    
    // Allow access if user is updating their own wishlist
    if (id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const member = await Member.findById(id);
    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Remove from wishlist
    member.removeFromWishlist(productId);
    await member.save();

    return NextResponse.json({
      message: 'Product removed from wishlist',
      wishlistCount: member.stats.wishlistItems
    });

  } catch (error) {
    console.error('Remove from wishlist error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});