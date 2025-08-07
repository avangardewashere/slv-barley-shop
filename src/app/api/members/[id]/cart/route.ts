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
    
    // Allow access if user is requesting their own cart
    if (id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const member = await Member.findById(id)
      .populate({
        path: 'cartItems.productId',
        select: 'name images variants basePriceRange isActive'
      });

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Calculate cart totals
    let subtotal = 0;
    const validCartItems = member.cartItems.filter((item: any) => {
      if (!item.productId || !item.productId.isActive) return false;
      
      const variant = item.productId.variants?.find((v: any) => v.sku === item.variantSku);
      if (!variant) return false;
      
      // Add price calculation
      item.unitPrice = variant.price;
      item.totalPrice = variant.price * item.quantity;
      subtotal += item.totalPrice;
      
      return true;
    });

    return NextResponse.json({
      cartItems: validCartItems,
      totals: {
        subtotal,
        itemCount: validCartItems.reduce((sum: number, item: any) => sum + item.quantity, 0),
        totalItems: validCartItems.length
      }
    });

  } catch (error) {
    console.error('Get cart error:', error);
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
    
    // Allow access if user is updating their own cart
    if (id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { productId, variantSku, quantity = 1 } = body;
    
    if (!productId || !variantSku) {
      return NextResponse.json(
        { error: 'Product ID and variant SKU are required' },
        { status: 400 }
      );
    }

    if (quantity < 1) {
      return NextResponse.json(
        { error: 'Quantity must be at least 1' },
        { status: 400 }
      );
    }

    // Validate product and variant
    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found or inactive' },
        { status: 404 }
      );
    }

    const variant = product.variants.find((v: any) => v.sku === variantSku);
    if (!variant) {
      return NextResponse.json(
        { error: 'Product variant not found' },
        { status: 404 }
      );
    }

    // Check inventory
    if (product.trackInventory && variant.inventory < quantity) {
      return NextResponse.json(
        { error: 'Insufficient inventory' },
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

    // Add to cart
    member.addToCart(productId, variantSku, quantity);
    await member.save();

    return NextResponse.json({
      message: 'Product added to cart',
      cartItemCount: member.cartItems.length
    });

  } catch (error) {
    console.error('Add to cart error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const PUT = requireAuth(async (request, { params }: RouteParams) => {
  try {
    await connectDB();
    const { id } = await params;
    const userId = (request as any).user?.id;
    const body = await request.json();
    
    // Allow access if user is updating their own cart
    if (id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { productId, variantSku, quantity } = body;
    
    if (!productId || !variantSku || quantity < 1) {
      return NextResponse.json(
        { error: 'Product ID, variant SKU, and valid quantity are required' },
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

    // Find cart item
    const cartItem = member.cartItems.find((item: any) => 
      item.productId.toString() === productId && item.variantSku === variantSku
    );

    if (!cartItem) {
      return NextResponse.json(
        { error: 'Cart item not found' },
        { status: 404 }
      );
    }

    // Validate inventory for new quantity
    const product = await Product.findById(productId);
    if (product?.trackInventory) {
      const variant = product.variants.find((v: any) => v.sku === variantSku);
      if (variant && variant.inventory < quantity) {
        return NextResponse.json(
          { error: 'Insufficient inventory' },
          { status: 400 }
        );
      }
    }

    // Update quantity
    cartItem.quantity = quantity;
    cartItem.addedAt = new Date();
    member.markModified('cartItems');
    await member.save();

    return NextResponse.json({
      message: 'Cart item updated',
      cartItemCount: member.cartItems.length
    });

  } catch (error) {
    console.error('Update cart error:', error);
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
    const variantSku = searchParams.get('variantSku');
    const clearAll = searchParams.get('clearAll') === 'true';
    
    // Allow access if user is updating their own cart
    if (id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const member = await Member.findById(id);
    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    if (clearAll) {
      // Clear entire cart
      member.clearCart();
      await member.save();
      
      return NextResponse.json({
        message: 'Cart cleared',
        cartItemCount: 0
      });
    } else if (productId) {
      // Remove specific item(s)
      member.removeFromCart(productId, variantSku || undefined);
      await member.save();
      
      return NextResponse.json({
        message: 'Item removed from cart',
        cartItemCount: member.cartItems.length
      });
    } else {
      return NextResponse.json(
        { error: 'Product ID or clearAll parameter is required' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Remove from cart error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});