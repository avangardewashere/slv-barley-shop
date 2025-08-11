import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/models/Admin';
import { comparePassword } from '@/lib/auth';
import { generateTokenPair, setAuthCookies } from '@/lib/auth-cookies';
import { VERSION_INFO } from '@/lib/version';
import { authRateLimiter } from '@/middleware/rate-limit';
import { validateLoginData } from '@/middleware/validation';
import { logSecurityEvent, logAudit } from '@/lib/logger';

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { email, password } = body;

    // Basic validation
    if (!email || !password) {
      const errorResponse = NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
      errorResponse.headers.set('Access-Control-Allow-Origin', '*');
      return errorResponse;
    }

    await connectDB();

    const admin = await Admin.findOne({ email, isActive: true });
    if (!admin) {
      logSecurityEvent('Failed login attempt', 'medium', {
        email,
        reason: 'User not found',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });

      const errorResponse = NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
      errorResponse.headers.set('Access-Control-Allow-Origin', '*');
      return errorResponse;
    }

    const isPasswordValid = await comparePassword(password, admin.password);
    if (!isPasswordValid) {
      logSecurityEvent('Failed login attempt', 'medium', {
        email,
        reason: 'Invalid password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });

      const errorResponse = NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
      errorResponse.headers.set('Access-Control-Allow-Origin', '*');
      return errorResponse;
    }

    // Generate token pair with CSRF token
    const tokens = generateTokenPair({
      adminId: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    });

    // Log successful login
    logAudit(
      'user_login',
      admin._id.toString(),
      'admin',
      admin._id.toString(),
      undefined,
      {
        email: admin.email,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      }
    );

    const response = NextResponse.json({
      message: 'Login successful',
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      csrfToken: tokens.csrfToken, // Send CSRF token to client for headers
      api: VERSION_INFO,
    });

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Set httpOnly cookies
    return setAuthCookies(response, tokens);
  } catch (error) {
    logSecurityEvent('Login system error', 'high', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    const errorResponse = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    return errorResponse;
  }
}