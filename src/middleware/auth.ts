import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader, JWTPayload } from '@/lib/auth';
import { verifyAccessToken, extractTokensFromCookies, verifyCSRFToken } from '@/lib/auth-cookies';
import { logSecurityEvent } from '@/lib/logger';

export interface AuthenticatedRequest extends NextRequest {
  admin?: JWTPayload;
}

export interface AuthResult {
  isAuthenticated: boolean;
  admin?: JWTPayload;
  response?: NextResponse;
}

export const authenticateAdmin = async (request: NextRequest, requireCSRF: boolean = true): Promise<AuthResult> => {
  let token: string | null = null;
  let admin: JWTPayload | null = null;
  
  // Try to get token from cookies first (preferred method)
  const { accessToken } = extractTokensFromCookies(request);
  if (accessToken) {
    token = accessToken;
    admin = verifyAccessToken(token);
    
    // Verify CSRF token for state-changing operations
    if (admin && requireCSRF && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      if (!verifyCSRFToken(request)) {
        logSecurityEvent('CSRF token validation failed', 'high', {
          url: request.url,
          method: request.method,
          adminId: admin.adminId,
        });
        return {
          isAuthenticated: false,
          response: NextResponse.json(
            { error: 'CSRF token validation failed' },
            { status: 403 }
          )
        };
      }
    }
  } else {
    // Fallback to Authorization header (for backwards compatibility)
    const authHeader = request.headers.get('authorization');
    token = extractTokenFromHeader(authHeader);
    
    if (token) {
      admin = verifyToken(token);
    }
  }
  
  if (!token || !admin) {
    return {
      isAuthenticated: false,
      response: NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      )
    };
  }

  // Check role permissions
  if (admin.role !== 'superadmin') {
    logSecurityEvent('Insufficient privileges', 'medium', {
      url: request.url,
      method: request.method,
      adminId: admin.adminId,
      role: admin.role,
    });
    return {
      isAuthenticated: false,
      response: NextResponse.json(
        { error: 'Insufficient privileges' },
        { status: 403 }
      )
    };
  }

  return {
    isAuthenticated: true,
    admin
  };
};

export const authenticateAdminSync = (request: NextRequest, requireCSRF: boolean = true): JWTPayload | null => {
  let token: string | null = null;
  let admin: JWTPayload | null = null;
  
  // Try to get token from cookies first (preferred method)
  const { accessToken } = extractTokensFromCookies(request);
  if (accessToken) {
    token = accessToken;
    admin = verifyAccessToken(token);
    
    // Verify CSRF token for state-changing operations
    if (admin && requireCSRF && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      if (!verifyCSRFToken(request)) {
        logSecurityEvent('CSRF token validation failed', 'high', {
          url: request.url,
          method: request.method,
          adminId: admin.adminId,
        });
        return null;
      }
    }
  } else {
    // Fallback to Authorization header (for backwards compatibility)
    const authHeader = request.headers.get('authorization');
    token = extractTokenFromHeader(authHeader);
    
    if (token) {
      admin = verifyToken(token);
    }
  }
  
  if (!token || !admin) {
    return null;
  }

  // Check role permissions
  if (admin.role !== 'superadmin') {
    logSecurityEvent('Insufficient privileges', 'medium', {
      url: request.url,
      method: request.method,
      adminId: admin.adminId,
      role: admin.role,
    });
    return null;
  }

  return admin;
};

export const requireAuth = (handler: (req: AuthenticatedRequest) => Promise<Response>) => {
  return async (request: NextRequest): Promise<Response> => {
    const admin = authenticateAdminSync(request);
    
    if (!admin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized access' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.admin = admin;
    
    return handler(authenticatedRequest);
  };
};