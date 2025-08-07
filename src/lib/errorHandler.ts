import { NextResponse } from 'next/server';
import { VERSION_INFO } from './version';
import { logError, logSecurityEvent, logApiError } from './logger';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
  timestamp?: Date;
  userId?: string;
  requestId?: string;
  details?: any;
}

export class AppError extends Error implements ApiError {
  statusCode: number;
  isOperational: boolean;
  code?: string;
  timestamp: Date;
  userId?: string;
  requestId?: string;
  details?: any;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true, code?: string, details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;
    this.timestamp = new Date();

    Error.captureStackTrace(this, this.constructor);
  }

  setContext(userId?: string, requestId?: string) {
    this.userId = userId;
    this.requestId = requestId;
    return this;
  }
}

export function createErrorResponse(error: any, defaultMessage: string = 'Internal server error', endpoint?: string, userId?: string): NextResponse {
  let statusCode = 500;
  let message = defaultMessage;
  let code: string | undefined;
  let requestId: string | undefined;

  // Handle known error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
    requestId = error.requestId;
    
    // Log structured error
    logApiError(
      endpoint || 'unknown',
      error,
      error.statusCode,
      error.userId || userId,
      {
        code: error.code,
        details: error.details,
        requestId: error.requestId,
      }
    );
    
    // Log security events for auth errors
    if (statusCode === 401 || statusCode === 403) {
      logSecurityEvent(
        'Authentication/Authorization error',
        'medium',
        {
          endpoint: endpoint || 'unknown',
          statusCode,
          userId: error.userId || userId,
          code: error.code,
        }
      );
    }
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(error.errors).map((err: any) => err.message).join(', ');
    code = 'VALIDATION_ERROR';
    logApiError(endpoint || 'unknown', error, statusCode, userId);
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    code = 'INVALID_ID';
    logApiError(endpoint || 'unknown', error, statusCode, userId);
  } else if (error.code === 11000) {
    statusCode = 409;
    message = 'Duplicate entry found';
    code = 'DUPLICATE_ENTRY';
    logApiError(endpoint || 'unknown', error, statusCode, userId);
  } else {
    // Generic error handling
    if (error.message && process.env.NODE_ENV !== 'production') {
      message = error.message;
    }
    logApiError(endpoint || 'unknown', error, statusCode, userId);
  }

  return NextResponse.json(
    {
      error: message,
      code,
      requestId,
      timestamp: new Date().toISOString(),
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

// Generate unique request ID
export const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Async handler with error catching
export const asyncHandler = <T extends any[]>(
  fn: (...args: T) => Promise<NextResponse>,
  endpoint?: string
) => {
  return async (...args: T): Promise<NextResponse> => {
    const requestId = generateRequestId();
    
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof AppError) {
        error.requestId = error.requestId || requestId;
      }
      
      return createErrorResponse(error, 'Internal server error', endpoint);
    }
  };
};

// Health check for error handling system
export const errorHandlerHealthCheck = (): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: Record<string, any>;
} => {
  try {
    const testError = new AppError('Test error', 400);
    const response = createErrorResponse(testError, 'Test', 'health-check');
    
    return {
      status: 'healthy',
      details: {
        errorCreation: 'ok',
        errorHandling: 'ok',
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
    };
  }
};