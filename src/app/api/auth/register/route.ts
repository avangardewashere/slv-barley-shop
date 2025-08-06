import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/models/Admin';
import { hashPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Admin with this email already exists' },
        { status: 409 }
      );
    }

    // Check admin count limit
    const adminCount = await Admin.countDocuments({ role: 'superadmin', isActive: true });
    if (adminCount >= 2) {
      return NextResponse.json(
        { error: 'Maximum 2 superadmin users allowed' },
        { status: 403 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const admin = new Admin({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role: 'superadmin',
    });

    await admin.save();

    const token = generateToken({
      adminId: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    });

    return NextResponse.json({
      message: 'Admin registered successfully',
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      token,
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Registration error:', error);
    
    if (error instanceof Error && error.message === 'Maximum 2 superadmin users allowed') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}