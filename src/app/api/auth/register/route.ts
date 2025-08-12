import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/models/Admin';
import { hashPassword, generateToken } from '@/lib/auth';
import { logSecurityEvent, logAudit } from '@/lib/logger';

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function POST(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  };

  try {
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    
    // Parse request body
    const body = await request.json().catch(() => null);
    
    if (!body) {
      logSecurityEvent('Invalid registration attempt - malformed request', 'low', {
        ip: clientIp,
      });
      
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { email, password, name } = body;

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Password strength validation
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check for password complexity
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return NextResponse.json(
        { error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Name validation
    if (name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { error: 'Name must be between 2 and 100 characters' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Sanitize inputs
    const sanitizedEmail = email.toLowerCase().trim();
    const sanitizedName = name.trim();

    await connectDB();

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: sanitizedEmail });
    if (existingAdmin) {
      logSecurityEvent('Registration attempt with existing email', 'medium', {
        email: sanitizedEmail,
        ip: clientIp,
      });

      return NextResponse.json(
        { error: 'Admin with this email already exists' },
        { status: 409, headers: corsHeaders }
      );
    }

    // Check admin count limit for security
    const adminCount = await Admin.countDocuments({ role: 'superadmin', isActive: true });
    if (adminCount >= 5) { // Increased limit to 5 for flexibility
      logSecurityEvent('Registration blocked - admin limit reached', 'high', {
        email: sanitizedEmail,
        ip: clientIp,
        currentAdminCount: adminCount,
      });

      return NextResponse.json(
        { error: 'Maximum number of admin users reached. Contact system administrator.' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Hash password with bcrypt
    const hashedPassword = await hashPassword(password);

    // Create new admin
    const admin = new Admin({
      email: sanitizedEmail,
      password: hashedPassword,
      name: sanitizedName,
      role: 'superadmin',
      isActive: true,
      createdAt: new Date(),
      lastLogin: null,
      failedLoginAttempts: 0,
    });

    await admin.save();

    // Log successful registration
    logAudit(
      'admin_registration',
      admin._id.toString(),
      'admin',
      admin._id.toString(),
      undefined,
      {
        email: sanitizedEmail,
        name: sanitizedName,
        ip: clientIp,
      }
    );

    // Generate JWT token
    const token = generateToken({
      adminId: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    });

    // Log security event for new admin creation
    logSecurityEvent('New admin registered', 'info', {
      adminId: admin._id.toString(),
      email: sanitizedEmail,
      ip: clientIp,
    });

    // Create response
    const response = NextResponse.json({
      message: 'Admin registered successfully',
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      token,
    }, { 
      status: 201,
      headers: corsHeaders 
    });

    // Set secure cookie
    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;

  } catch (error: unknown) {
    console.error('Registration error:', error);
    
    logSecurityEvent('Registration system error', 'high', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : undefined
      },
      { status: 500, headers: corsHeaders }
    );
  }
}