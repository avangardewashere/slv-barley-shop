import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/models/Admin';
import { requireAuth } from '@/middleware/authMiddleware';

export const GET = requireAuth(async (request) => {
  try {
    await connectDB();

    const admin = await Admin.findById(request.admin!.adminId).select('-password');
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        isActive: admin.isActive,
        createdAt: admin.createdAt,
      },
    });
  } catch (error) {
    console.error('Get admin info error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});