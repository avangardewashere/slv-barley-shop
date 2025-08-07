import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies, extractTokensFromCookies, verifyAccessToken } from '@/lib/auth-cookies';
import { logAudit, logSecurityEvent } from '@/lib/logger';
import { VERSION_INFO } from '@/lib/version';

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = extractTokensFromCookies(request);
    
    if (accessToken) {
      const admin = verifyAccessToken(accessToken);
      if (admin) {
        // Log successful logout
        logAudit(
          'user_logout',
          admin.adminId,
          'admin',
          admin.adminId,
          undefined,
          {
            email: admin.email,
            ip: request.headers.get('x-forwarded-for') || 'unknown',
          }
        );
      }
    }

    const response = NextResponse.json({
      message: 'Logout successful',
      api: VERSION_INFO,
    });

    // Clear auth cookies
    return clearAuthCookies(response);
  } catch (error) {
    logSecurityEvent('Logout system error', 'medium', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );

    // Still clear cookies even on error
    return clearAuthCookies(response);
  }
}