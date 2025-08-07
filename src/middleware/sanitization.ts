import { NextRequest } from 'next/server';
import xss from 'xss';
import { logSecurityEvent } from '@/lib/logger';

// XSS filter options
const xssOptions = {
  whiteList: {}, // No HTML tags allowed by default
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script'],
};

// SQL injection patterns to detect
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|FROM|WHERE|JOIN|ORDER BY|GROUP BY|HAVING)\b)/gi,
  /(--|#|\/\*|\*\/)/g,
  /(\bOR\b\s*\d+\s*=\s*\d+)/gi,
  /(\bAND\b\s*\d+\s*=\s*\d+)/gi,
  /('|(\')|"|(\"))\s*;\s*(SELECT|INSERT|UPDATE|DELETE|DROP)/gi,
];

// NoSQL injection patterns
const NOSQL_INJECTION_PATTERNS = [
  /\$where/gi,
  /\$regex/gi,
  /\$ne/gi,
  /\$gt/gi,
  /\$lt/gi,
  /\$gte/gi,
  /\$lte/gi,
  /\$in/gi,
  /\$nin/gi,
  /\$exists/gi,
  /\$type/gi,
  /\$mod/gi,
  /\$text/gi,
  /\$where.*function/gi,
];

// Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.\\/, 
  /%2e%2e%2f/gi,
  /%2e%2e\//gi,
  /\.\.%2f/gi,
  /%2e%2e%5c/gi,
];

// Command injection patterns
const COMMAND_INJECTION_PATTERNS = [
  /;|\||&|`|\$\(|<|>|\n|\r/g,
  /\b(cat|ls|echo|pwd|whoami|id|uname|ps|kill|rm|mv|cp|chmod|chown|wget|curl|bash|sh|cmd|powershell)\b/gi,
];

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// URL validation regex
const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

// Sanitize string input
export const sanitizeString = (input: string, options?: {
  allowHtml?: boolean;
  maxLength?: number;
  trim?: boolean;
}): string => {
  if (typeof input !== 'string') {
    return '';
  }
  
  let sanitized = input;
  
  // Trim whitespace
  if (options?.trim !== false) {
    sanitized = sanitized.trim();
  }
  
  // Enforce max length
  if (options?.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // XSS protection
  if (!options?.allowHtml) {
    sanitized = xss(sanitized, xssOptions);
  }
  
  return sanitized;
};

// Sanitize email
export const sanitizeEmail = (email: string): string | null => {
  const sanitized = sanitizeString(email, { maxLength: 254, trim: true }).toLowerCase();
  
  if (!EMAIL_REGEX.test(sanitized)) {
    return null;
  }
  
  return sanitized;
};

// Sanitize URL
export const sanitizeUrl = (url: string): string | null => {
  const sanitized = sanitizeString(url, { maxLength: 2048, trim: true });
  
  if (!URL_REGEX.test(sanitized)) {
    return null;
  }
  
  return sanitized;
};

// Sanitize number
export const sanitizeNumber = (input: any, options?: {
  min?: number;
  max?: number;
  integer?: boolean;
}): number | null => {
  const num = Number(input);
  
  if (isNaN(num)) {
    return null;
  }
  
  if (options?.integer && !Number.isInteger(num)) {
    return null;
  }
  
  if (options?.min !== undefined && num < options.min) {
    return null;
  }
  
  if (options?.max !== undefined && num > options.max) {
    return null;
  }
  
  return num;
};

// Sanitize boolean
export const sanitizeBoolean = (input: any): boolean => {
  if (typeof input === 'boolean') {
    return input;
  }
  
  if (typeof input === 'string') {
    return input.toLowerCase() === 'true' || input === '1';
  }
  
  if (typeof input === 'number') {
    return input === 1;
  }
  
  return false;
};

// Sanitize array
export const sanitizeArray = <T>(
  input: any,
  itemSanitizer: (item: any) => T | null,
  options?: {
    maxLength?: number;
    unique?: boolean;
  }
): T[] => {
  if (!Array.isArray(input)) {
    return [];
  }
  
  let sanitized = input
    .map(itemSanitizer)
    .filter(item => item !== null) as T[];
  
  if (options?.unique) {
    sanitized = [...new Set(sanitized)];
  }
  
  if (options?.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.slice(0, options.maxLength);
  }
  
  return sanitized;
};

// Sanitize object
export const sanitizeObject = <T extends Record<string, any>>(
  input: any,
  schema: Record<keyof T, (value: any) => any>
): Partial<T> => {
  if (typeof input !== 'object' || input === null) {
    return {};
  }
  
  const sanitized: Partial<T> = {};
  
  for (const key in schema) {
    if (key in input) {
      const sanitizedValue = schema[key](input[key]);
      if (sanitizedValue !== null && sanitizedValue !== undefined) {
        sanitized[key] = sanitizedValue;
      }
    }
  }
  
  return sanitized;
};

// Check for injection attempts
export const detectInjection = (input: string): {
  isSuspicious: boolean;
  types: string[];
} => {
  const types: string[] = [];
  
  // Check for SQL injection
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      types.push('SQL Injection');
      break;
    }
  }
  
  // Check for NoSQL injection
  for (const pattern of NOSQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      types.push('NoSQL Injection');
      break;
    }
  }
  
  // Check for path traversal
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(input)) {
      types.push('Path Traversal');
      break;
    }
  }
  
  // Check for command injection
  for (const pattern of COMMAND_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      types.push('Command Injection');
      break;
    }
  }
  
  return {
    isSuspicious: types.length > 0,
    types,
  };
};

// Middleware to sanitize request body
export const sanitizeRequestBody = (body: any, schema?: Record<string, any>): any => {
  if (!body || typeof body !== 'object') {
    return {};
  }
  
  const sanitized: any = {};
  
  for (const key in body) {
    const value = body[key];
    
    // Check for injection attempts
    if (typeof value === 'string') {
      const detection = detectInjection(value);
      if (detection.isSuspicious) {
        logSecurityEvent('Potential injection attempt detected', 'medium', {
          field: key,
          types: detection.types,
          value: value.substring(0, 100), // Log only first 100 chars
        });
      }
    }
    
    // Apply schema-based sanitization if provided
    if (schema && schema[key]) {
      sanitized[key] = schema[key](value);
    } else {
      // Default sanitization based on type
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'number') {
        sanitized[key] = sanitizeNumber(value);
      } else if (typeof value === 'boolean') {
        sanitized[key] = sanitizeBoolean(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? sanitizeString(item) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeRequestBody(value);
      }
    }
  }
  
  return sanitized;
};

// Sanitize file upload
export const sanitizeFileUpload = (file: {
  name: string;
  type: string;
  size: number;
}, options?: {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}): {
  isValid: boolean;
  errors: string[];
  sanitizedName: string;
} => {
  const errors: string[] = [];
  
  // Sanitize filename
  let sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Check file size
  if (options?.maxSize && file.size > options.maxSize) {
    errors.push(`File size exceeds maximum of ${options.maxSize} bytes`);
  }
  
  // Check file type
  if (options?.allowedTypes && !options.allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }
  
  // Check file extension
  if (options?.allowedExtensions) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !options.allowedExtensions.includes(ext)) {
      errors.push(`File extension .${ext} is not allowed`);
    }
  }
  
  // Check for double extensions (potential attack)
  if (/\.(php|asp|aspx|jsp|cgi|exe|sh|bat|cmd|com|pif|scr)\./i.test(file.name)) {
    errors.push('Suspicious double extension detected');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedName,
  };
};

// Create sanitization middleware for Next.js API routes
export const createSanitizationMiddleware = (schema?: Record<string, any>) => {
  return async (request: NextRequest) => {
    try {
      const contentType = request.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        const body = await request.json();
        const sanitizedBody = sanitizeRequestBody(body, schema);
        
        // Log if significant changes were made
        if (JSON.stringify(body) !== JSON.stringify(sanitizedBody)) {
          logSecurityEvent('Request body sanitized', 'low', {
            url: request.url,
            method: request.method,
            changes: true,
          });
        }
        
        // Return sanitized body
        return sanitizedBody;
      }
      
      return null;
    } catch (error) {
      logSecurityEvent('Sanitization error', 'medium', {
        url: request.url,
        method: request.method,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return null;
    }
  };
};