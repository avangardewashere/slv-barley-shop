import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/models/Admin';
import { comparePassword } from '@/lib/auth';
import { generateTokenPair, setAuthCookies } from '@/lib/auth-cookies';
import { VERSION_INFO } from '@/lib/version';
import { authRateLimiter } from '@/middleware/rate-limit';
import { validateLoginData } from '@/middleware/validation';
import { createSanitizationMiddleware } from '@/middleware/sanitization';
import { logSecurityEvent, logAudit } from '@/lib/logger';
import { validatePassword } from '@/lib/password-validator';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await authRateLimiter(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Validate and sanitize input
    const validationResult = await validateLoginData(request);
    if (!validationResult.isValid) {
      return validationResult.response!;
    }

    const { email, password } = validationResult.data!;

    await connectDB();

    const admin = await Admin.findOne({ email, isActive: true });
    if (!admin) {
      logSecurityEvent('Failed login attempt', 'medium', {
        email,
        reason: 'User not found',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });

      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isPasswordValid = await comparePassword(password, admin.password);
    if (!isPasswordValid) {
      logSecurityEvent('Failed login attempt', 'medium', {
        email,
        reason: 'Invalid password',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });

      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
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

    // Set httpOnly cookies
    return setAuthCookies(response, tokens);
  } catch (error) {
    logSecurityEvent('Login system error', 'high', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}