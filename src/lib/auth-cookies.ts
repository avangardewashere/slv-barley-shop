import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { serialize, parse } from 'cookie';

// Constants for cookie names
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
export const CSRF_TOKEN_COOKIE = 'csrf_token';

// Token expiry times
const ACCESS_TOKEN_EXPIRES = process.env.JWT_ACCESS_TOKEN_EXPIRES || '15m';
const REFRESH_TOKEN_EXPIRES = process.env.JWT_REFRESH_TOKEN_EXPIRES || '7d';

export interface JWTPayload {
  adminId: string;
  email: string;
  role: string;
  type?: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
}

// Generate CSRF token
export const generateCSRFToken = (): string => {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return Buffer.from(randomBytes).toString('base64');
};

// Generate access token
export const generateAccessToken = (payload: Omit<JWTPayload, 'type'>): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }
  
  return jwt.sign(
    { ...payload, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES }
  );
};

// Generate refresh token
export const generateRefreshToken = (payload: Omit<JWTPayload, 'type'>): string => {
  const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!refreshSecret) {
    throw new Error('JWT_REFRESH_SECRET is not defined');
  }
  
  return jwt.sign(
    { ...payload, type: 'refresh' },
    refreshSecret,
    { expiresIn: REFRESH_TOKEN_EXPIRES }
  );
};

// Generate both tokens
export const generateTokenPair = (payload: Omit<JWTPayload, 'type'>): TokenPair => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
    csrfToken: generateCSRFToken(),
  };
};

// Verify access token
export const verifyAccessToken = (token: string): JWTPayload | null => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
    if (decoded.type !== 'access') {
      return null;
    }
    
    return decoded;
  } catch (error) {
    return null;
  }
};

// Verify refresh token
export const verifyRefreshToken = (token: string): JWTPayload | null => {
  try {
    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is not defined');
    }
    
    const decoded = jwt.verify(token, refreshSecret) as JWTPayload;
    if (decoded.type !== 'refresh') {
      return null;
    }
    
    return decoded;
  } catch (error) {
    return null;
  }
};

// Cookie options for production
const getCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge,
  path: '/',
});

// Set auth cookies in response
export const setAuthCookies = (
  response: NextResponse,
  tokens: TokenPair
): NextResponse => {
  // Access token cookie (15 minutes)
  response.headers.append(
    'Set-Cookie',
    serialize(ACCESS_TOKEN_COOKIE, tokens.accessToken, getCookieOptions(15 * 60))
  );
  
  // Refresh token cookie (7 days)
  response.headers.append(
    'Set-Cookie',
    serialize(REFRESH_TOKEN_COOKIE, tokens.refreshToken, getCookieOptions(7 * 24 * 60 * 60))
  );
  
  // CSRF token cookie (not httpOnly so JS can read it)
  response.headers.append(
    'Set-Cookie',
    serialize(CSRF_TOKEN_COOKIE, tokens.csrfToken, {
      ...getCookieOptions(7 * 24 * 60 * 60),
      httpOnly: false, // Allow JS to read for inclusion in requests
    })
  );
  
  return response;
};

// Clear auth cookies
export const clearAuthCookies = (response: NextResponse): NextResponse => {
  response.headers.append(
    'Set-Cookie',
    serialize(ACCESS_TOKEN_COOKIE, '', { maxAge: 0, path: '/' })
  );
  
  response.headers.append(
    'Set-Cookie',
    serialize(REFRESH_TOKEN_COOKIE, '', { maxAge: 0, path: '/' })
  );
  
  response.headers.append(
    'Set-Cookie',
    serialize(CSRF_TOKEN_COOKIE, '', { maxAge: 0, path: '/' })
  );
  
  return response;
};

// Extract tokens from request cookies
export const extractTokensFromCookies = (request: NextRequest): {
  accessToken: string | null;
  refreshToken: string | null;
  csrfToken: string | null;
} => {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return { accessToken: null, refreshToken: null, csrfToken: null };
  }
  
  const cookies = parse(cookieHeader);
  
  return {
    accessToken: cookies[ACCESS_TOKEN_COOKIE] || null,
    refreshToken: cookies[REFRESH_TOKEN_COOKIE] || null,
    csrfToken: cookies[CSRF_TOKEN_COOKIE] || null,
  };
};

// Verify CSRF token
export const verifyCSRFToken = (request: NextRequest): boolean => {
  const { csrfToken: cookieToken } = extractTokensFromCookies(request);
  const headerToken = request.headers.get('x-csrf-token');
  
  if (!cookieToken || !headerToken) {
    return false;
  }
  
  return cookieToken === headerToken;
};

// Refresh access token using refresh token
export const refreshAccessToken = async (
  refreshToken: string
): Promise<{ accessToken: string; newRefreshToken: string } | null> => {
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    return null;
  }
  
  // Generate new token pair
  const newAccessToken = generateAccessToken({
    adminId: payload.adminId,
    email: payload.email,
    role: payload.role,
  });
  
  const newRefreshToken = generateRefreshToken({
    adminId: payload.adminId,
    email: payload.email,
    role: payload.role,
  });
  
  return {
    accessToken: newAccessToken,
    newRefreshToken,
  };
};