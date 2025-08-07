import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Member, { MemberUtils } from '@/models/Member';
import { requireAuth } from '@/middleware/authMiddleware';
import { VERSION_INFO } from '@/lib/version';
import bcrypt from 'bcryptjs';

export const GET = requireAuth(async (request) => {
  try {
    await connectDB();
    
    // Admin access is already verified by requireAuth middleware

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const membershipTier = searchParams.get('membershipTier');
    const membershipStatus = searchParams.get('membershipStatus');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const includeStats = searchParams.get('includeStats') === 'true';

    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};
    if (membershipTier) filter.membershipTier = membershipTier;
    if (membershipStatus) filter.membershipStatus = membershipStatus;
    if (isActive !== null) filter.isActive = isActive === 'true';
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { referralCode: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sortObj: any = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

    let query = Member.find(filter)
      .select('-password -passwordResetToken -emailVerificationToken -phoneVerificationToken -twoFactorSecret')
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    const members = await query.lean();
    const total = await Member.countDocuments(filter);

    let stats = null;
    if (includeStats) {
      stats = await Member.getMembershipStats();
    }

    return NextResponse.json({
      members,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats,
      filters: {
        membershipTier,
        membershipStatus,
        isActive,
        search
      },
      api: VERSION_INFO,
    });
  } catch (error) {
    console.error('Get members error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const POST = requireAuth(async (request) => {
  try {
    await connectDB();
    
    // Admin access is already verified by requireAuth middleware

    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'email'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate member data
    const validationErrors = MemberUtils.validateMemberData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors.join(', ') },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingMember = await Member.findByEmail(body.email);
    if (existingMember) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password if provided
    if (body.password) {
      body.password = await bcrypt.hash(body.password, 12);
    }

    // Set default values
    body.membershipTier = body.membershipTier || 'basic';
    body.membershipStatus = body.membershipStatus || 'active';
    body.isActive = body.isActive !== undefined ? body.isActive : true;
    body.isEmailVerified = body.isEmailVerified || false;
    body.isPhoneVerified = body.isPhoneVerified || false;

    const member = new Member(body);
    await member.save();

    // Remove sensitive data from response
    const memberResponse = member.toObject();
    delete memberResponse.password;
    delete memberResponse.passwordResetToken;
    delete memberResponse.emailVerificationToken;
    delete memberResponse.phoneVerificationToken;
    delete memberResponse.twoFactorSecret;

    return NextResponse.json({
      message: 'Member created successfully',
      member: memberResponse,
      api: VERSION_INFO,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create member error:', error);
    
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: errorMessages.join(', ') },
        { status: 400 }
      );
    }

    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Email or referral code already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});