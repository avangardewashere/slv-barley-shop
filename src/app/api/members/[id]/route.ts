import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Member, { MemberUtils } from '@/models/Member';
import Order from '@/models/Order';
import Review from '@/models/Review';
import { requireAuth } from '@/middleware/authMiddleware';
import bcrypt from 'bcryptjs';

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
    const userRole = (request as any).user?.role;
    
    // Allow access if user is requesting their own profile or is admin
    if (id !== userId && userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeOrders = searchParams.get('includeOrders') === 'true';
    const includeReviews = searchParams.get('includeReviews') === 'true';
    const includeWishlist = searchParams.get('includeWishlist') === 'true';
    const includeCart = searchParams.get('includeCart') === 'true';

    let query = Member.findById(id)
      .select('-password -passwordResetToken -emailVerificationToken -phoneVerificationToken -twoFactorSecret');

    // Populate wishlist if requested
    if (includeWishlist) {
      query = query.populate('wishlist', 'name images basePriceRange reviewStats');
    }

    // Populate cart items if requested
    if (includeCart) {
      query = query.populate('cartItems.productId', 'name images variants');
    }

    const member = await query;
    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    const response: any = { member };

    // Include recent orders if requested
    if (includeOrders) {
      const orders = await Order.find({ customerId: id })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('orderNumber status totals createdAt items')
        .lean();
      response.recentOrders = orders;
    }

    // Include recent reviews if requested
    if (includeReviews) {
      const reviews = await Review.find({ customerId: id })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('productId productName rating title createdAt status')
        .populate('productId', 'name images')
        .lean();
      response.recentReviews = reviews;
    }

    // Update last active timestamp
    member.lastActiveAt = new Date();
    await member.save();

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get member error:', error);
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
    const userRole = (request as any).user?.role;
    const body = await request.json();
    
    // Allow access if user is updating their own profile or is admin
    if (id !== userId && userRole !== 'admin') {
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

    // Define allowed fields for different user types
    const memberAllowedFields = [
      'name', 'firstName', 'lastName', 'phone', 'avatar', 
      'dateOfBirth', 'gender', 'addresses', 'preferences'
    ];
    
    const adminAllowedFields = [
      ...memberAllowedFields,
      'membershipTier', 'membershipStatus', 'isActive', 
      'isBanned', 'banReason', 'suspensionEndDate'
    ];

    const allowedFields = userRole === 'admin' ? adminAllowedFields : memberAllowedFields;

    // Handle password change separately
    if (body.password) {
      if (userRole !== 'admin' && id === userId) {
        // Member changing their own password - require current password
        if (!body.currentPassword) {
          return NextResponse.json(
            { error: 'Current password is required' },
            { status: 400 }
          );
        }
        
        const isCurrentPasswordValid = await bcrypt.compare(body.currentPassword, member.password || '');
        if (!isCurrentPasswordValid) {
          return NextResponse.json(
            { error: 'Current password is incorrect' },
            { status: 400 }
          );
        }
      }
      
      body.password = await bcrypt.hash(body.password, 12);
      member.password = body.password;
      delete body.password;
      delete body.currentPassword;
    }

    // Update allowed fields
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'addresses') {
          // Validate addresses
          if (body[field].length > 10) {
            return NextResponse.json(
              { error: 'Maximum 10 addresses allowed' },
              { status: 400 }
            );
          }
        }
        
        (member as any)[field] = body[field];
      }
    }

    // Calculate new membership tier based on total spent if admin is not explicitly setting it
    if (userRole !== 'admin' && member.stats.totalSpent) {
      const calculatedTier = MemberUtils.calculateMembershipTier(member.stats.totalSpent);
      if (calculatedTier !== member.membershipTier) {
        member.membershipTier = calculatedTier;
      }
    }

    await member.save();

    // Remove sensitive data from response
    const memberResponse = member.toObject();
    delete memberResponse.password;
    delete memberResponse.passwordResetToken;
    delete memberResponse.emailVerificationToken;
    delete memberResponse.phoneVerificationToken;
    delete memberResponse.twoFactorSecret;

    return NextResponse.json({
      message: 'Member updated successfully',
      member: memberResponse,
    });

  } catch (error: any) {
    console.error('Update member error:', error);
    
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
    const userRole = (request as any).user?.role;
    
    // Only admin can delete members
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
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

    // Check if member has active orders
    const activeOrders = await Order.countDocuments({
      customerId: id,
      status: { $in: ['pending', 'confirmed', 'processing', 'shipped'] }
    });

    if (activeOrders > 0) {
      return NextResponse.json(
        { error: 'Cannot delete member with active orders. Consider deactivating instead.' },
        { status: 400 }
      );
    }

    // Soft delete by deactivating instead of hard delete
    member.isActive = false;
    member.membershipStatus = 'inactive';
    member.bannedAt = new Date();
    member.banReason = 'Account deleted by administrator';
    await member.save();

    return NextResponse.json({
      message: 'Member account deactivated successfully',
    });
  } catch (error) {
    console.error('Delete member error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});