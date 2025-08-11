import { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter } from './rate-limit';
import { createDoubleSubmitCSRF } from './csrf';
import { createSanitizationMiddleware } from './sanitization';
import { createCompressionMiddleware } from './compression';
import { applyCachingHeaders } from './caching';
import { logSecurityEvent, logHttpRequest } from '@/lib/logger';

export interface SecurityConfig {
  rateLimiting?: boolean;
  csrf?: boolean;
  sanitization?: boolean;
  compression?: boolean;
  caching?: boolean;
  securityHeaders?: boolean;
  logging?: boolean;
  customHeaders?: Record<string, string>;
}

// Security headers to apply by default
const DEFAULT_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export const applySecurityHeaders = (
  response: NextResponse,
  customHeaders?: Record<string, string>
): NextResponse => {
  // Apply default security headers
  Object.entries(DEFAULT_SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Apply custom headers if provided
  if (customHeaders) {
    Object.entries(customHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  return response;
};

// Main security middleware factory
export const createSecurityMiddleware = (config: SecurityConfig = {}) => {
  const {
    rateLimiting = false,
    csrf = false,
    sanitization = true,
    compression = false,
    caching = false,
    securityHeaders = true,
    logging = true,
  } = config;

  // Create middleware instances
  const rateLimiter = rateLimiting ? createRateLimiter() : null;
  const csrfProtection = csrf ? createDoubleSubmitCSRF() : null;
  const sanitizer = sanitization ? createSanitizationMiddleware() : null;
  const compressor = compression ? createCompressionMiddleware() : null;

  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    let response: NextResponse;

    try {
      // Apply rate limiting
      if (rateLimiter) {
        const rateLimitResult = await rateLimiter(request);
        if (rateLimitResult) {
          return rateLimitResult;
        }
      }

      // Apply input sanitization
      if (sanitizer) {
        const sanitizationResult = await sanitizer(request);
        if (sanitizationResult) {
          return sanitizationResult;
        }
      }

      // Apply CSRF protection
      if (csrfProtection) {
        const csrfResult = await csrfProtection(request);
        if (csrfResult) {
          return csrfResult;
        }
      }

      // Continue with the request (this would be handled by the actual route)
      response = NextResponse.next();

      // Apply compression
      if (compressor) {
        response = await compressor(request, response);
      }

      // Apply caching headers
      if (caching) {
        response = applyCachingHeaders(response, 'medium');
      }

      // Apply security headers
      if (securityHeaders) {
        response = applySecurityHeaders(response, config.customHeaders);
      }

      // Log request
      if (logging) {
        const duration = Date.now() - startTime;
        logHttpRequest(
          request.method,
          request.url,
          response.status,
          duration,
          {
            userAgent: request.headers.get('user-agent'),
            ip: request.headers.get('x-forwarded-for') || 'unknown',
          }
        );
      }

      return response;

    } catch (error) {
      logSecurityEvent('Security middleware error', 'high', {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: request.url,
        method: request.method,
      });

      const errorResponse = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );

      // Still apply security headers to error responses
      if (securityHeaders) {
        return applySecurityHeaders(errorResponse, config.customHeaders);
      }

      return errorResponse;
    }
  };
};