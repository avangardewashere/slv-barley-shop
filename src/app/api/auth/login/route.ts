import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/models/Admin';
import { comparePassword } from '@/lib/auth';
import { generateTokenPair, setAuthCookies } from '@/lib/auth-cookies';
import { VERSION_INFO } from '@/lib/version';
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
  // Add CORS headers to all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  };

  try {
    // Parse request body
    const body = await request.json().catch(() => null);
    
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { email, password } = body;

    // Basic validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Connect to database
    await connectDB();

    // Find admin user
    const admin = await Admin.findOne({ email, isActive: true });
    if (!admin) {
      logSecurityEvent('Failed login attempt', 'medium', {
        email,
        reason: 'User not found',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });

      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, admin.password);
    if (!isPasswordValid) {
      logSecurityEvent('Failed login attempt', 'medium', {
        email,
        reason: 'Invalid password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });

      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401, headers: corsHeaders }
      );
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

    // Create successful response
    const response = NextResponse.json({
      message: 'Login successful',
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      csrfToken: tokens.csrfToken,
      api: VERSION_INFO,
    }, { headers: corsHeaders });

    // Set httpOnly cookies for authentication
    return setAuthCookies(response, tokens);

  } catch (error) {
    console.error('Login error:', error);
    logSecurityEvent('Login system error', 'high', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    );
  }
}