import { NextRequest, NextResponse } from 'next/server';
import Joi from 'joi';
import { z } from 'zod';
import { logError, logSecurityEvent } from '@/lib/logger';

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  data?: any;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
  value?: any;
}

// Validation schemas for common data types
export const commonSchemas = {
  // MongoDB ObjectId
  objectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
  
  // Email validation
  email: z.string().email('Invalid email format').max(254),
  
  // Password validation (basic)
  password: z.string().min(8).max(128),
  
  // URL validation
  url: z.string().url('Invalid URL format').max(2048),
  
  // Positive integer
  positiveInt: z.number().int().positive(),
  
  // Non-negative integer
  nonNegativeInt: z.number().int().min(0),
  
  // Pagination parameters
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(10),
  }),
  
  // Sort parameters
  sort: z.object({
    field: z.string(),
    order: z.enum(['asc', 'desc']).default('asc'),
  }),
  
  // Date range
  dateRange: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),
};

// Joi schemas for complex validation
export const joiSchemas = {
  // Product validation
  product: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(1000),
    price: Joi.number().positive().precision(2).required(),
    category: Joi.string().valid('grain', 'equipment', 'supplies').required(),
    stock: Joi.number().integer().min(0).required(),
    sku: Joi.string().alphanum().min(3).max(20).required(),
    weight: Joi.number().positive(),
    dimensions: Joi.object({
      length: Joi.number().positive(),
      width: Joi.number().positive(),
      height: Joi.number().positive(),
    }),
    tags: Joi.array().items(Joi.string().max(20)).max(10),
    isActive: Joi.boolean().default(true),
  }),
  
  // Bundle validation
  bundle: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(1000),
    products: Joi.array().items(
      Joi.object({
        productId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
        quantity: Joi.number().integer().positive().required(),
      })
    ).min(2).max(10).required(),
    discount: Joi.number().min(0).max(1),
    isActive: Joi.boolean().default(true),
  }),
  
  // User registration
  userRegistration: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required(),
    name: Joi.string().min(1).max(50).required(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/),
    address: Joi.object({
      street: Joi.string().max(100),
      city: Joi.string().max(50),
      state: Joi.string().max(50),
      zipCode: Joi.string().max(10),
      country: Joi.string().max(50),
    }),
  }),
  
  // Login validation
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    rememberMe: Joi.boolean().default(false),
  }),
};

// Zod to Joi error conversion
const convertZodError = (error: z.ZodError): ValidationError[] => {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
    value: err.received,
  }));
};

// Joi to ValidationError conversion
const convertJoiError = (error: Joi.ValidationError): ValidationError[] => {
  return error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    code: detail.type,
    value: detail.context?.value,
  }));
};

// Generic validation function for Zod schemas
export const validateWithZod = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult => {
  try {
    const result = schema.parse(data);
    return {
      isValid: true,
      data: result,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: convertZodError(error),
      };
    }
    
    return {
      isValid: false,
      errors: [{
        field: 'unknown',
        message: 'Validation failed with unknown error',
      }],
    };
  }
};

// Generic validation function for Joi schemas
export const validateWithJoi = <T>(
  schema: Joi.Schema,
  data: unknown,
  options?: Joi.ValidationOptions
): ValidationResult => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    ...options,
  });
  
  if (error) {
    return {
      isValid: false,
      errors: convertJoiError(error),
    };
  }
  
  return {
    isValid: true,
    data: value as T,
  };
};

// Middleware creator for request validation
export const createValidationMiddleware = <T>(
  schema: z.ZodSchema<T> | Joi.Schema,
  target: 'body' | 'query' | 'params' = 'body'
) => {
  return async (request: NextRequest): Promise<{
    isValid: boolean;
    data?: T;
    response?: NextResponse;
  }> => {
    try {
      let dataToValidate: unknown;
      
      // Extract data based on target
      switch (target) {
        case 'body':
          if (request.headers.get('content-type')?.includes('application/json')) {
            try {
              // Clone the request to avoid consuming the body
              const clonedRequest = request.clone();
              dataToValidate = await clonedRequest.json();
            } catch (parseError) {
              return {
                isValid: false,
                response: NextResponse.json(
                  {
                    error: 'Invalid JSON in request body',
                    details: [{ field: 'body', message: 'Request body must be valid JSON' }],
                  },
                  { status: 400 }
                ),
              };
            }
          } else {
            return {
              isValid: false,
              response: NextResponse.json(
                {
                  error: 'Content-Type must be application/json',
                  details: [{ field: 'content-type', message: 'Expected application/json' }],
                },
                { status: 400 }
              ),
            };
          }
          break;
          
        case 'query':
          const url = new URL(request.url);
          const queryParams: Record<string, any> = {};
          
          for (const [key, value] of url.searchParams.entries()) {
            // Try to parse numbers and booleans
            if (value === 'true') {
              queryParams[key] = true;
            } else if (value === 'false') {
              queryParams[key] = false;
            } else if (/^\d+$/.test(value)) {
              queryParams[key] = parseInt(value, 10);
            } else if (/^\d*\.\d+$/.test(value)) {
              queryParams[key] = parseFloat(value);
            } else {
              queryParams[key] = value;
            }
          }
          
          dataToValidate = queryParams;
          break;
          
        case 'params':
          // For Next.js API routes, params are not easily accessible in middleware
          // This would need to be handled in the route handler
          dataToValidate = {};
          break;
      }
      
      // Validate data
      let result: ValidationResult;
      
      // Check if it's a Zod schema by checking for _def property
      if (schema && typeof schema === 'object' && '_def' in schema) {
        result = validateWithZod(schema as z.ZodSchema, dataToValidate);
      } else {
        result = validateWithJoi(schema as Joi.Schema, dataToValidate);
      }
      
      if (!result.isValid) {
        logSecurityEvent('Validation failed', 'low', {
          url: request.url,
          method: request.method,
          target,
          errors: result.errors,
        });
        
        return {
          isValid: false,
          response: NextResponse.json(
            {
              error: 'Validation failed',
              details: result.errors,
            },
            { status: 400 }
          ),
        };
      }
      
      return {
        isValid: true,
        data: result.data,
      };
      
    } catch (error) {
      logError(error as Error, {
        component: 'Validation Middleware',
        url: request.url,
        method: request.method,
      });
      
      return {
        isValid: false,
        response: NextResponse.json(
          {
            error: 'Validation error',
            message: 'An error occurred during validation',
          },
          { status: 500 }
        ),
      };
    }
  };
};

// Specific validation middlewares
export const validateProductData = createValidationMiddleware(
  joiSchemas.product,
  'body'
);

export const validateBundleData = createValidationMiddleware(
  joiSchemas.bundle,
  'body'
);

export const validateLoginData = createValidationMiddleware(
  joiSchemas.login,
  'body'
);

export const validateRegistrationData = createValidationMiddleware(
  joiSchemas.userRegistration,
  'body'
);

export const validatePagination = createValidationMiddleware(
  commonSchemas.pagination,
  'query'
);

// File validation middleware
export const validateFileUpload = (
  allowedTypes: string[],
  maxSize: number,
  required: boolean = true
) => {
  return async (request: NextRequest): Promise<{
    isValid: boolean;
    files?: File[];
    response?: NextResponse;
  }> => {
    try {
      const contentType = request.headers.get('content-type');
      
      if (!contentType?.startsWith('multipart/form-data')) {
        if (required) {
          return {
            isValid: false,
            response: NextResponse.json(
              {
                error: 'File upload required',
                message: 'Content-Type must be multipart/form-data',
              },
              { status: 400 }
            ),
          };
        }
        
        return { isValid: true };
      }
      
      const formData = await request.formData();
      const files: File[] = [];
      const errors: ValidationError[] = [];
      
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          // Validate file type
          if (!allowedTypes.includes(value.type)) {
            errors.push({
              field: key,
              message: `File type ${value.type} not allowed`,
              value: value.type,
            });
            continue;
          }
          
          // Validate file size
          if (value.size > maxSize) {
            errors.push({
              field: key,
              message: `File size ${value.size} exceeds maximum ${maxSize}`,
              value: value.size,
            });
            continue;
          }
          
          files.push(value);
        }
      }
      
      if (errors.length > 0) {
        return {
          isValid: false,
          response: NextResponse.json(
            {
              error: 'File validation failed',
              details: errors,
            },
            { status: 400 }
          ),
        };
      }
      
      if (required && files.length === 0) {
        return {
          isValid: false,
          response: NextResponse.json(
            {
              error: 'File required',
              message: 'At least one file must be provided',
            },
            { status: 400 }
          ),
        };
      }
      
      return {
        isValid: true,
        files,
      };
      
    } catch (error) {
      logError(error as Error, {
        component: 'File Validation Middleware',
        url: request.url,
      });
      
      return {
        isValid: false,
        response: NextResponse.json(
          {
            error: 'File validation error',
            message: 'An error occurred during file validation',
          },
          { status: 500 }
        ),
      };
    }
  };
};

// Composed validation middleware
export const createComposedValidation = (...validators: any[]) => {
  return async (request: NextRequest) => {
    const results: any[] = [];
    
    for (const validator of validators) {
      const result = await validator(request);
      if (!result.isValid) {
        return result;
      }
      results.push(result);
    }
    
    return {
      isValid: true,
      data: results.reduce((acc, result) => ({ ...acc, ...result.data }), {}),
    };
  };
};