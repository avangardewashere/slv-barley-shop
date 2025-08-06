import { NextRequest } from 'next/server';
import { verifyToken, extractTokenFromHeader, JWTPayload } from '@/lib/auth';

export interface AuthenticatedRequest extends NextRequest {
  admin?: JWTPayload;
}

export const authenticateAdmin = (request: NextRequest): JWTPayload | null => {
  const authHeader = request.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);
  
  if (!token) {
    return null;
  }

  const admin = verifyToken(token);
  if (!admin || admin.role !== 'superadmin') {
    return null;
  }

  return admin;
};

export const requireAuth = (handler: (req: AuthenticatedRequest) => Promise<Response>) => {
  return async (request: NextRequest): Promise<Response> => {
    const admin = authenticateAdmin(request);
    
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