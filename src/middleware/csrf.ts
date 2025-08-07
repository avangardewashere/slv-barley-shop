import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { logSecurityEvent } from '@/lib/logger';

// CSRF token storage (use Redis in production)
class CSRFTokenStore {
  private store: Map<string, { token: string; expires: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired tokens every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.store.entries()) {
        if (value.expires < now) {
          this.store.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  get(sessionId: string): string | null {
    const entry = this.store.get(sessionId);
    if (!entry) return null;
    
    if (entry.expires < Date.now()) {
      this.store.delete(sessionId);
      return null;
    }
    
    return entry.token;
  }

  set(sessionId: string, token: string, ttl: number = 3600000): void {
    this.store.set(sessionId, {
      token,
      expires: Date.now() + ttl,
    });
  }

  delete(sessionId: string): void {
    this.store.delete(sessionId);
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Global CSRF token store
const csrfTokenStore = new CSRFTokenStore();

// CSRF configuration
export interface CSRFConfig {
  cookieName?: string;
  headerName?: string;
  paramName?: string;
  secret?: string;
  saltLength?: number;
  tokenLength?: number;
  ignoreMethods?: string[];
  ignoreRoutes?: string[];
  sessionIdExtractor?: (req: NextRequest) => string;
  onError?: (req: NextRequest, reason: string) => void;
}

// Default configuration
const defaultConfig: Required<CSRFConfig> = {
  cookieName: 'csrf-token',
  headerName: 'x-csrf-token',
  paramName: 'csrfToken',
  secret: process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production',
  saltLength: 8,
  tokenLength: 32,
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  ignoreRoutes: ['/api/health', '/api/auth/refresh'],
  sessionIdExtractor: (req: NextRequest) => {
    // Extract session ID from cookie or generate one
    const cookies = req.headers.get('cookie');
    if (cookies) {
      const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('session-id='));
      if (sessionCookie) {
        return sessionCookie.split('=')[1];
      }
    }
    return crypto.randomBytes(16).toString('hex');
  },
  onError: (req: NextRequest, reason: string) => {
    logSecurityEvent('CSRF validation failed', 'high', {
      url: req.url,
      method: req.method,
      reason,
    });
  },
};

// Generate CSRF token
export const generateCSRFToken = (sessionId: string, secret: string = defaultConfig.secret): string => {
  const salt = crypto.randomBytes(8).toString('hex');
  const hash = crypto
    .createHash('sha256')
    .update(`${salt}-${sessionId}-${secret}`)
    .digest('hex');
  
  return `${salt}.${hash}`;
};

// Verify CSRF token
export const verifyCSRFToken = (
  token: string,
  sessionId: string,
  secret: string = defaultConfig.secret
): boolean => {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  const parts = token.split('.');
  if (parts.length !== 2) {
    return false;
  }
  
  const [salt, hash] = parts;
  const expectedHash = crypto
    .createHash('sha256')
    .update(`${salt}-${sessionId}-${secret}`)
    .digest('hex');
  
  // Use timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(expectedHash)
  );
};

// Double Submit Cookie pattern
export const createDoubleSubmitCSRF = (config?: CSRFConfig) => {
  const finalConfig = { ...defaultConfig, ...config };
  
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const method = request.method.toUpperCase();
    const pathname = new URL(request.url).pathname;
    
    // Skip CSRF check for ignored methods
    if (finalConfig.ignoreMethods.includes(method)) {
      return null;
    }
    
    // Skip CSRF check for ignored routes
    if (finalConfig.ignoreRoutes.some(route => pathname.startsWith(route))) {
      return null;
    }
    
    const sessionId = finalConfig.sessionIdExtractor(request);
    
    // Get token from cookie
    const cookies = request.headers.get('cookie');
    let cookieToken: string | null = null;
    
    if (cookies) {
      const csrfCookie = cookies
        .split(';')
        .find(c => c.trim().startsWith(`${finalConfig.cookieName}=`));
      
      if (csrfCookie) {
        cookieToken = csrfCookie.split('=')[1];
      }
    }
    
    // Get token from header or body
    let submittedToken: string | null = null;
    
    // Check header
    submittedToken = request.headers.get(finalConfig.headerName);
    
    // Check body if not in header
    if (!submittedToken && request.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await request.clone().json();
        submittedToken = body[finalConfig.paramName];
      } catch {
        // Body parsing failed, continue without body token
      }
    }
    
    // Validate tokens
    if (!cookieToken || !submittedToken) {
      if (finalConfig.onError) {
        finalConfig.onError(request, 'Missing CSRF token');
      }
      
      return NextResponse.json(
        {
          error: 'CSRF validation failed',
          message: 'Missing CSRF token',
        },
        { status: 403 }
      );
    }
    
    if (cookieToken !== submittedToken) {
      if (finalConfig.onError) {
        finalConfig.onError(request, 'CSRF token mismatch');
      }
      
      return NextResponse.json(
        {
          error: 'CSRF validation failed',
          message: 'Invalid CSRF token',
        },
        { status: 403 }
      );
    }
    
    // Tokens match, allow request
    return null;
  };
};

// Synchronizer Token Pattern (more secure)
export const createSynchronizerCSRF = (config?: CSRFConfig) => {
  const finalConfig = { ...defaultConfig, ...config };
  
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const method = request.method.toUpperCase();
    const pathname = new URL(request.url).pathname;
    
    // Skip CSRF check for ignored methods
    if (finalConfig.ignoreMethods.includes(method)) {
      return null;
    }
    
    // Skip CSRF check for ignored routes
    if (finalConfig.ignoreRoutes.some(route => pathname.startsWith(route))) {
      return null;
    }
    
    const sessionId = finalConfig.sessionIdExtractor(request);
    
    // Get stored token for this session
    const storedToken = csrfTokenStore.get(sessionId);
    
    if (!storedToken) {
      // Generate new token for this session
      const newToken = generateCSRFToken(sessionId, finalConfig.secret);
      csrfTokenStore.set(sessionId, newToken);
      
      if (finalConfig.onError) {
        finalConfig.onError(request, 'No CSRF token for session');
      }
      
      return NextResponse.json(
        {
          error: 'CSRF validation failed',
          message: 'No CSRF token found for session',
          csrfToken: newToken, // Send new token to client
        },
        { status: 403 }
      );
    }
    
    // Get submitted token
    let submittedToken: string | null = null;
    
    // Check header
    submittedToken = request.headers.get(finalConfig.headerName);
    
    // Check body if not in header
    if (!submittedToken && request.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await request.clone().json();
        submittedToken = body[finalConfig.paramName];
      } catch {
        // Body parsing failed, continue without body token
      }
    }
    
    if (!submittedToken) {
      if (finalConfig.onError) {
        finalConfig.onError(request, 'Missing CSRF token in request');
      }
      
      return NextResponse.json(
        {
          error: 'CSRF validation failed',
          message: 'Missing CSRF token in request',
        },
        { status: 403 }
      );
    }
    
    // Verify token
    if (!verifyCSRFToken(submittedToken, sessionId, finalConfig.secret)) {
      if (finalConfig.onError) {
        finalConfig.onError(request, 'Invalid CSRF token');
      }
      
      return NextResponse.json(
        {
          error: 'CSRF validation failed',
          message: 'Invalid CSRF token',
        },
        { status: 403 }
      );
    }
    
    // Token is valid, allow request
    return null;
  };
};

// Helper to add CSRF token to response
export const addCSRFToken = (
  response: NextResponse,
  sessionId: string,
  config?: Partial<CSRFConfig>
): NextResponse => {
  const finalConfig = { ...defaultConfig, ...config };
  const token = generateCSRFToken(sessionId, finalConfig.secret);
  
  // Store token for session
  csrfTokenStore.set(sessionId, token);
  
  // Add token to response header
  response.headers.set('X-CSRF-Token', token);
  
  // Add token to cookie
  response.headers.append(
    'Set-Cookie',
    `${finalConfig.cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`
  );
  
  return response;
};

// Helper to get CSRF token for a session
export const getCSRFToken = (sessionId: string): string => {
  let token = csrfTokenStore.get(sessionId);
  
  if (!token) {
    token = generateCSRFToken(sessionId);
    csrfTokenStore.set(sessionId, token);
  }
  
  return token;
};

// Helper to invalidate CSRF token
export const invalidateCSRFToken = (sessionId: string): void => {
  csrfTokenStore.delete(sessionId);
};

// Export stores for testing or manual management
export { csrfTokenStore };