import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Cache control configuration
export interface CacheControlConfig {
  maxAge?: number; // Cache max age in seconds
  sMaxAge?: number; // Shared cache max age in seconds
  staleWhileRevalidate?: number; // Stale while revalidate in seconds
  staleIfError?: number; // Stale if error in seconds
  public?: boolean; // Allow public caching
  private?: boolean; // Only private caching
  noCache?: boolean; // No caching
  noStore?: boolean; // No storing
  mustRevalidate?: boolean; // Must revalidate
  proxyRevalidate?: boolean; // Proxy must revalidate
  immutable?: boolean; // Content is immutable
}

// ETag configuration
export interface ETagConfig {
  weak?: boolean; // Use weak ETag
  algorithm?: 'md5' | 'sha1' | 'sha256';
}

// Cache strategy types
export type CacheStrategy = 
  | 'no-cache'        // No caching
  | 'short'          // 5 minutes
  | 'medium'         // 1 hour
  | 'long'           // 24 hours
  | 'static'         // 1 year for static assets
  | 'api-dynamic'    // 30 seconds for dynamic API data
  | 'api-static'     // 15 minutes for relatively static API data
  | 'user-specific'  // No public cache, private only
  | 'custom';        // Custom configuration

// Predefined cache strategies
const cacheStrategies: Record<Exclude<CacheStrategy, 'custom'>, CacheControlConfig> = {
  'no-cache': {
    noCache: true,
    noStore: true,
  },
  'short': {
    maxAge: 300, // 5 minutes
    public: true,
    staleWhileRevalidate: 60,
  },
  'medium': {
    maxAge: 3600, // 1 hour
    public: true,
    staleWhileRevalidate: 300,
  },
  'long': {
    maxAge: 86400, // 24 hours
    public: true,
    staleWhileRevalidate: 3600,
  },
  'static': {
    maxAge: 31536000, // 1 year
    public: true,
    immutable: true,
  },
  'api-dynamic': {
    maxAge: 30, // 30 seconds
    public: true,
    staleWhileRevalidate: 10,
    mustRevalidate: true,
  },
  'api-static': {
    maxAge: 900, // 15 minutes
    public: true,
    staleWhileRevalidate: 300,
  },
  'user-specific': {
    maxAge: 300, // 5 minutes
    private: true,
    mustRevalidate: true,
  },
};

// Environment-based defaults
const getDefaultCacheAge = (): number => {
  return parseInt(process.env.CACHE_CONTROL_MAX_AGE || '3600');
};

const getDefaultSMaxAge = (): number => {
  return parseInt(process.env.CACHE_CONTROL_S_MAX_AGE || '86400');
};

// Generate ETag from content
export const generateETag = (content: string | Buffer, config?: ETagConfig): string => {
  const algorithm = config?.algorithm || 'md5';
  const hash = crypto.createHash(algorithm);
  
  hash.update(content);
  const etag = hash.digest('hex');
  
  return config?.weak ? `W/"${etag}"` : `"${etag}"`;
};

// Generate ETag from object/data
export const generateDataETag = (data: any, config?: ETagConfig): string => {
  const content = JSON.stringify(data);
  return generateETag(content, config);
};

// Build Cache-Control header value
export const buildCacheControlHeader = (config: CacheControlConfig): string => {
  const directives: string[] = [];
  
  if (config.public) directives.push('public');
  if (config.private) directives.push('private');
  if (config.noCache) directives.push('no-cache');
  if (config.noStore) directives.push('no-store');
  if (config.mustRevalidate) directives.push('must-revalidate');
  if (config.proxyRevalidate) directives.push('proxy-revalidate');
  if (config.immutable) directives.push('immutable');
  
  if (config.maxAge !== undefined) {
    directives.push(`max-age=${config.maxAge}`);
  }
  
  if (config.sMaxAge !== undefined) {
    directives.push(`s-maxage=${config.sMaxAge}`);
  }
  
  if (config.staleWhileRevalidate !== undefined) {
    directives.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
  }
  
  if (config.staleIfError !== undefined) {
    directives.push(`stale-if-error=${config.staleIfError}`);
  }
  
  return directives.join(', ');
};

// Apply caching headers to response
export const applyCachingHeaders = (
  response: NextResponse,
  strategy: CacheStrategy,
  customConfig?: CacheControlConfig
): NextResponse => {
  let config: CacheControlConfig;
  
  if (strategy === 'custom' && customConfig) {
    config = customConfig;
  } else if (strategy !== 'custom') {
    config = cacheStrategies[strategy];
  } else {
    // Default fallback
    config = cacheStrategies.medium;
  }
  
  // Apply Cache-Control header
  const cacheControlValue = buildCacheControlHeader(config);
  response.headers.set('Cache-Control', cacheControlValue);
  
  // Add Vary header for content negotiation
  const existingVary = response.headers.get('Vary');
  const varyHeaders = ['Accept', 'Accept-Encoding', 'Accept-Language'];
  
  if (existingVary) {
    const existingVaryHeaders = existingVary.split(',').map(h => h.trim());
    varyHeaders.forEach(header => {
      if (!existingVaryHeaders.includes(header)) {
        existingVaryHeaders.push(header);
      }
    });
    response.headers.set('Vary', existingVaryHeaders.join(', '));
  } else {
    response.headers.set('Vary', varyHeaders.join(', '));
  }
  
  // Add Last-Modified header with current time
  response.headers.set('Last-Modified', new Date().toUTCString());
  
  return response;
};

// Check if request is cacheable
export const isRequestCacheable = (request: NextRequest): boolean => {
  const method = request.method.toUpperCase();
  
  // Only cache GET and HEAD requests
  if (!['GET', 'HEAD'].includes(method)) {
    return false;
  }
  
  // Check for cache-busting parameters
  const url = new URL(request.url);
  if (url.searchParams.has('no-cache') || url.searchParams.has('_t')) {
    return false;
  }
  
  // Check for bypass headers
  const cacheControl = request.headers.get('cache-control');
  if (cacheControl?.includes('no-cache') || cacheControl?.includes('no-store')) {
    return false;
  }
  
  return true;
};

// Check if content is modified based on ETag/Last-Modified
export const isContentModified = (
  request: NextRequest,
  etag?: string,
  lastModified?: Date
): boolean => {
  // Check If-None-Match header (ETag)
  if (etag) {
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch) {
      const requestETags = ifNoneMatch.split(',').map(tag => tag.trim());
      if (requestETags.includes(etag) || requestETags.includes('*')) {
        return false; // Not modified
      }
    }
  }
  
  // Check If-Modified-Since header
  if (lastModified) {
    const ifModifiedSince = request.headers.get('if-modified-since');
    if (ifModifiedSince) {
      const requestDate = new Date(ifModifiedSince);
      if (requestDate.getTime() >= lastModified.getTime()) {
        return false; // Not modified
      }
    }
  }
  
  return true; // Content is modified or no conditional headers present
};

// Create caching middleware
export const createCachingMiddleware = (
  strategy: CacheStrategy,
  customConfig?: CacheControlConfig
) => {
  return (response: NextResponse): NextResponse => {
    return applyCachingHeaders(response, strategy, customConfig);
  };
};

// Specific caching middlewares for common use cases
export const cacheStatic = createCachingMiddleware('static');
export const cacheMedium = createCachingMiddleware('medium');
export const cacheShort = createCachingMiddleware('short');
export const cacheApiDynamic = createCachingMiddleware('api-dynamic');
export const cacheApiStatic = createCachingMiddleware('api-static');
export const cacheUserSpecific = createCachingMiddleware('user-specific');
export const noCache = createCachingMiddleware('no-cache');

// Content-based caching with ETag
export const createContentBasedCache = (
  data: any,
  strategy: CacheStrategy = 'medium',
  etagConfig?: ETagConfig
) => {
  return (response: NextResponse): NextResponse => {
    // Generate ETag
    const etag = generateDataETag(data, etagConfig);
    response.headers.set('ETag', etag);
    
    // Apply caching strategy
    return applyCachingHeaders(response, strategy);
  };
};

// API response caching with automatic ETag generation
export const createApiCacheResponse = (
  data: any,
  request: NextRequest,
  strategy: CacheStrategy = 'api-static'
): NextResponse => {
  // Generate ETag for the data
  const etag = generateDataETag(data);
  
  // Check if content is modified
  if (!isContentModified(request, etag)) {
    // Return 304 Not Modified
    const notModifiedResponse = new NextResponse(null, { status: 304 });
    notModifiedResponse.headers.set('ETag', etag);
    return applyCachingHeaders(notModifiedResponse, strategy);
  }
  
  // Content is modified, return full response
  const response = NextResponse.json(data);
  response.headers.set('ETag', etag);
  
  return applyCachingHeaders(response, strategy);
};

// File-based caching with proper headers
export const createFileCacheResponse = (
  fileContent: Buffer,
  contentType: string,
  filename?: string,
  strategy: CacheStrategy = 'static'
): NextResponse => {
  const etag = generateETag(fileContent);
  
  const response = new NextResponse(fileContent, {
    headers: {
      'Content-Type': contentType,
      'ETag': etag,
      ...(filename && { 'Content-Disposition': `inline; filename="${filename}"` }),
    },
  });
  
  return applyCachingHeaders(response, strategy);
};

// Cache warming utilities
export const warmupCache = async (
  urls: string[],
  options?: RequestInit
): Promise<void> => {
  const promises = urls.map(url =>
    fetch(url, { ...options, method: 'GET' })
      .then(response => response.ok ? response : null)
      .catch(() => null)
  );
  
  await Promise.allSettled(promises);
};

// Cache invalidation patterns
export const createCacheInvalidationKey = (
  pattern: string,
  ...args: any[]
): string => {
  return pattern.replace(/{(\d+)}/g, (match, index) => {
    const argIndex = parseInt(index, 10);
    return args[argIndex] !== undefined ? String(args[argIndex]) : match;
  });
};

// Cache key generation for consistent caching
export const generateCacheKey = (
  prefix: string,
  ...parts: (string | number | boolean)[]
): string => {
  const keyParts = [prefix, ...parts.map(part => String(part))];
  return keyParts.join(':');
};

// Response transformation with caching
export const createCachedResponse = <T>(
  data: T,
  transform?: (data: T) => any,
  cacheConfig?: {
    strategy?: CacheStrategy;
    customConfig?: CacheControlConfig;
    etagConfig?: ETagConfig;
  }
) => {
  return (request: NextRequest): NextResponse => {
    const transformedData = transform ? transform(data) : data;
    const strategy = cacheConfig?.strategy || 'medium';
    
    return createApiCacheResponse(transformedData, request, strategy);
  };
};