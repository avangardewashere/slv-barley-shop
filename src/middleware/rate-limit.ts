import { NextRequest, NextResponse } from 'next/server';
import { logSecurityEvent } from '@/lib/logger';

// In-memory store for rate limiting (use Redis in production)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.resetTime < now) {
          this.store.delete(key);
        }
      }
    }, 60000);
  }

  get(key: string): RateLimitEntry | undefined {
    const entry = this.store.get(key);
    if (entry && entry.resetTime < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry);
  }

  increment(key: string, windowMs: number): number {
    const now = Date.now();
    const entry = this.get(key);
    
    if (!entry) {
      this.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return 1;
    }
    
    entry.count++;
    return entry.count;
  }

  reset(key: string): void {
    this.store.delete(key);
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Global rate limit store
const rateLimitStore = new RateLimitStore();

// Rate limit configuration
export interface RateLimitConfig {
  windowMs?: number; // Time window in milliseconds
  maxRequests?: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
  handler?: (req: NextRequest) => NextResponse; // Custom response handler
  onLimitReached?: (req: NextRequest, key: string) => void; // Callback when limit reached
  message?: string; // Error message
  statusCode?: number; // HTTP status code
  headers?: boolean; // Send rate limit headers
  skipList?: string[]; // IP addresses or keys to skip
}

// Default configuration
const defaultConfig: Required<RateLimitConfig> = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  keyGenerator: (req: NextRequest) => {
    // Use IP address as key
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
    return ip;
  },
  handler: (req: NextRequest) => {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please try again later.',
      },
      { status: 429 }
    );
  },
  onLimitReached: (req: NextRequest, key: string) => {
    logSecurityEvent('Rate limit exceeded', 'medium', {
      key,
      url: req.url,
      method: req.method,
    });
  },
  message: 'Too many requests, please try again later.',
  statusCode: 429,
  headers: true,
  skipList: [],
};

// Create rate limiter middleware
export const createRateLimiter = (config?: RateLimitConfig) => {
  const finalConfig = { ...defaultConfig, ...config };
  
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const key = finalConfig.keyGenerator(request);
    
    // Skip if in skip list
    if (finalConfig.skipList.includes(key)) {
      return null;
    }
    
    // Get current count
    const count = rateLimitStore.increment(key, finalConfig.windowMs);
    
    // Calculate remaining requests
    const remaining = Math.max(0, finalConfig.maxRequests - count);
    const resetTime = Date.now() + finalConfig.windowMs;
    
    // Add rate limit headers if enabled
    const headers = new Headers();
    if (finalConfig.headers) {
      headers.set('X-RateLimit-Limit', finalConfig.maxRequests.toString());
      headers.set('X-RateLimit-Remaining', remaining.toString());
      headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString());
    }
    
    // Check if limit exceeded
    if (count > finalConfig.maxRequests) {
      if (finalConfig.onLimitReached) {
        finalConfig.onLimitReached(request, key);
      }
      
      // Add Retry-After header
      headers.set('Retry-After', Math.ceil(finalConfig.windowMs / 1000).toString());
      
      const response = finalConfig.handler(request);
      
      // Apply headers to response
      headers.forEach((value, key) => {
        response.headers.set(key, value);
      });
      
      return response;
    }
    
    // Request is allowed, return null to continue
    return null;
  };
};

// Specific rate limiters for different endpoints
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 requests per window
  message: 'Too many authentication attempts. Please try again later.',
  onLimitReached: (req, key) => {
    logSecurityEvent('Excessive authentication attempts', 'high', {
      key,
      url: req.url,
    });
  },
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per window
});

export const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
  message: 'Rate limit exceeded. Please slow down your requests.',
});

// Distributed rate limiting with Redis (for production)
export class RedisRateLimiter {
  private redis: any; // Import Redis client type
  private prefix: string;

  constructor(redisClient: any, prefix: string = 'rate_limit:') {
    this.redis = redisClient;
    this.prefix = prefix;
  }

  async isAllowed(
    key: string,
    maxRequests: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const fullKey = `${this.prefix}${key}`;
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const windowKey = `${fullKey}:${window}`;
    
    const multi = this.redis.multi();
    multi.incr(windowKey);
    multi.expire(windowKey, Math.ceil(windowMs / 1000));
    
    const results = await multi.exec();
    const count = results[0][1];
    
    const allowed = count <= maxRequests;
    const remaining = Math.max(0, maxRequests - count);
    const resetTime = (window + 1) * windowMs;
    
    return { allowed, remaining, resetTime };
  }

  async reset(key: string): Promise<void> {
    const fullKey = `${this.prefix}${key}`;
    await this.redis.del(fullKey);
  }
}

// Sliding window rate limiter for more accurate limiting
export class SlidingWindowRateLimiter {
  private store: Map<string, number[]> = new Map();

  isAllowed(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get or create request timestamps for this key
    let timestamps = this.store.get(key) || [];
    
    // Remove expired timestamps
    timestamps = timestamps.filter(t => t > windowStart);
    
    // Check if limit exceeded
    if (timestamps.length >= maxRequests) {
      this.store.set(key, timestamps);
      return false;
    }
    
    // Add current timestamp
    timestamps.push(now);
    this.store.set(key, timestamps);
    
    return true;
  }

  reset(key: string): void {
    this.store.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, timestamps] of this.store.entries()) {
      const filtered = timestamps.filter(t => t > now - 3600000); // Keep last hour
      if (filtered.length === 0) {
        this.store.delete(key);
      } else {
        this.store.set(key, filtered);
      }
    }
  }
}

// IP-based rate limiting with different tiers
export const createTieredRateLimiter = (tiers: {
  authenticated: RateLimitConfig;
  unauthenticated: RateLimitConfig;
  suspicious: RateLimitConfig;
}) => {
  return async (request: NextRequest, isAuthenticated: boolean, isSuspicious: boolean) => {
    let config: RateLimitConfig;
    
    if (isSuspicious) {
      config = tiers.suspicious;
    } else if (isAuthenticated) {
      config = tiers.authenticated;
    } else {
      config = tiers.unauthenticated;
    }
    
    const limiter = createRateLimiter(config);
    return limiter(request);
  };
};

// Export the rate limit store for testing or manual management
export { rateLimitStore };