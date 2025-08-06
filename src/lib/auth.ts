import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';

export interface JWTPayload {
  adminId: string;
  email: string;
  role: string;
}

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcryptjs.genSalt(12);
  return bcryptjs.hash(password, salt);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcryptjs.compare(password, hashedPassword);
};

export const generateToken = (payload: JWTPayload): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }
    return jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
};

export const extractTokenFromHeader = (authHeader: string | null): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};