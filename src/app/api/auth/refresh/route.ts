import { NextRequest, NextResponse } from 'next/server';
import { 
  extractTokensFromCookies, 
  refreshAccessToken, 
  generateCSRFToken,
  setAuthCookies,
  clearAuthCookies 
} from '@/lib/auth-cookies';
import { logSecurityEvent, logAudit } from '@/lib/logger';
import { VERSION_INFO } from '@/lib/version';

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = extractTokensFromCookies(request);
    
    if (!refreshToken) {
      logSecurityEvent('Token refresh attempted without refresh token', 'medium', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });

      return NextResponse.json(
        { error: 'No refresh token provided' },
        { status: 401 }
      );
    }

    // Attempt to refresh the access token
    const tokenResult = await refreshAccessToken(refreshToken);
    
    if (!tokenResult) {
      logSecurityEvent('Invalid refresh token used', 'medium', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });

      const response = NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );

      // Clear invalid cookies
      return clearAuthCookies(response);
    }

    // Generate new CSRF token
    const newCSRFToken = generateCSRFToken();
    
    const tokens = {
      accessToken: tokenResult.accessToken,
      refreshToken: tokenResult.newRefreshToken,
      csrfToken: newCSRFToken,
    };

    const response = NextResponse.json({
      message: 'Token refreshed successfully',
      csrfToken: newCSRFToken, // Send new CSRF token to client
      api: VERSION_INFO,
    });

    // Set new auth cookies
    return setAuthCookies(response, tokens);
    
  } catch (error) {
    logSecurityEvent('Token refresh system error', 'high', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );

    // Clear cookies on system error for security
    return clearAuthCookies(response);
  }
}