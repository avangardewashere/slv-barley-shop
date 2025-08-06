import { NextResponse } from 'next/server';
import { VERSION_INFO } from './version';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export class AppError extends Error implements ApiError {
  statusCode: number;
  isOperational: boolean;
  code?: string;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true, code?: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export function createErrorResponse(error: any, defaultMessage: string = 'Internal server error'): NextResponse {
  let statusCode = 500;
  let message = defaultMessage;
  let code: string | undefined;

  // Handle known error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(error.errors).map((err: any) => err.message).join(', ');
    code = 'VALIDATION_ERROR';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    code = 'INVALID_ID';
  } else if (error.code === 11000) {
    statusCode = 409;
    message = 'Duplicate entry found';
    code = 'DUPLICATE_ENTRY';
  } else if (error.message && process.env.NODE_ENV !== 'production') {
    // Only expose error messages in development
    message = error.message;
  }

  // Log error for monitoring (you can integrate with logging service)
  console.error('API Error:', {
    message: error.message,
    stack: error.stack,
    statusCode,
    code,
    timestamp: new Date().toISOString(),
    version: VERSION_INFO.version,
  });

  return NextResponse.json(
    {
      error: message,
      code,
      api: VERSION_INFO,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    },
    { status: statusCode }
  );
}

// Common error types
export const ErrorCodes = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

export const CommonErrors = {
  INVALID_CREDENTIALS: new AppError('Invalid credentials', 401, true, ErrorCodes.INVALID_CREDENTIALS),
  UNAUTHORIZED: new AppError('Unauthorized access', 401, true, ErrorCodes.UNAUTHORIZED),
  FORBIDDEN: new AppError('Access forbidden', 403, true, ErrorCodes.FORBIDDEN),
  NOT_FOUND: new AppError('Resource not found', 404, true, ErrorCodes.NOT_FOUND),
  RATE_LIMITED: new AppError('Rate limit exceeded', 429, true, ErrorCodes.RATE_LIMITED),
  SERVER_ERROR: new AppError('Internal server error', 500, false, ErrorCodes.SERVER_ERROR),
};