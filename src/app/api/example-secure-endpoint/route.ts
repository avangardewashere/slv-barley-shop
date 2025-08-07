/**
 * Example of a secure API endpoint implementing all security and performance enhancements
 * This file demonstrates how to use the comprehensive security middleware stack
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/middleware/authMiddleware';
import { apiRateLimiter } from '@/middleware/rate-limit';
import { validateProductData } from '@/middleware/validation';
import { createSanitizationMiddleware } from '@/middleware/sanitization';
import { createApiCacheResponse } from '@/middleware/caching';
import { compressJsonResponse } from '@/middleware/compression';
import { applySecurityHeaders } from '@/middleware/security';
import { asyncHandler, AppError, generateRequestId } from '@/lib/errorHandler';
import { logAudit, logSecurityEvent } from '@/lib/logger';
import { versionedHandler } from '@/lib/api-versioning';
import { cacheAside } from '@/lib/cache';
import { createOptimizedModel } from '@/lib/database-optimization';
import Product from '@/models/Product';
import { VERSION_INFO } from '@/lib/version';

// Create optimized model instance for products
const optimizedProduct = createOptimizedModel(Product, {
  cacheEnabled: true,
  cacheTTL: 300000, // 5 minutes
  slowQueryThreshold: 100, // 100ms
});

// GET endpoint - List products with comprehensive security and performance
export const GET = versionedHandler({
  v1: asyncHandler(async (request: NextRequest) => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    
    try {
      // Apply rate limiting
      const rateLimitResult = await apiRateLimiter(request);
      if (rateLimitResult) {
        return rateLimitResult;
      }

      // Parse and validate query parameters
      const url = new URL(request.url);
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
      const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '10')));
      const category = url.searchParams.get('category');
      const search = url.searchParams.get('search');
      const sort = url.searchParams.get('sort') || 'createdAt';
      const order = url.searchParams.get('order') === 'desc' ? -1 : 1;

      // Build query
      const query: any = { isActive: true };
      if (category) query.category = category;
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      // Generate cache key
      const cacheKey = `products:list:${JSON.stringify({
        page,
        limit,
        category,
        search,
        sort,
        order,
      })}`;

      // Use cache-aside pattern with optimized query
      const result = await cacheAside(
        cacheKey,
        async () => {
          return optimizedProduct.paginateOptimized(query, {
            page,
            limit,
            sort: { [sort]: order },
            select: 'name description price category stock sku isActive createdAt',
            lean: true,
            cache: true,
          });
        },
        300000 // 5 minutes cache
      );

      const duration = Date.now() - startTime;

      // Log performance if slow
      if (duration > 500) {
        logSecurityEvent('Slow API response', 'low', {
          endpoint: '/api/example-secure-endpoint',
          duration,
          requestId,
        });
      }

      // Create cached response with compression
      let response = createApiCacheResponse(
        {
          data: result.docs,
          pagination: {
            totalDocs: result.totalDocs,
            limit: result.limit,
            page: result.page,
            totalPages: result.totalPages,
            hasNextPage: result.hasNextPage,
            hasPrevPage: result.hasPrevPage,
          },
          meta: {
            requestId,
            duration,
            cached: false, // This would be determined by the cache hit
            api: VERSION_INFO,
          },
        },
        request,
        'api-static'
      );

      // Apply compression
      response = await compressJsonResponse(await response.json(), request);

      // Apply security headers
      response = applySecurityHeaders(response, {
        contentSecurityPolicy: "default-src 'none'",
        crossOriginResourcePolicy: 'cross-origin',
      });

      return response;

    } catch (error) {
      throw new AppError(
        error instanceof Error ? error.message : 'Failed to fetch products',
        500,
        false,
        'PRODUCT_FETCH_ERROR'
      ).setContext(undefined, requestId);
    }
  }, '/api/example-secure-endpoint'),
});

// POST endpoint - Create product with full security stack
export const POST = versionedHandler({
  v1: asyncHandler(async (request: NextRequest) => {
    const requestId = generateRequestId();
    
    try {
      // Apply rate limiting (stricter for POST requests)
      const rateLimitResult = await apiRateLimiter(request);
      if (rateLimitResult) {
        return rateLimitResult;
      }

      // Authenticate admin user with CSRF validation
      const admin = authenticateAdmin(request, true); // Require CSRF for POST
      if (!admin) {
        throw new AppError('Authentication required', 401, true, 'UNAUTHORIZED')
          .setContext(undefined, requestId);
      }

      // Validate and sanitize input data
      const validationResult = await validateProductData(request);
      if (!validationResult.isValid) {
        return validationResult.response!;
      }

      const productData = validationResult.data!;

      // Additional business logic validation
      const existingProduct = await optimizedProduct.findOneOptimized(
        { sku: productData.sku },
        { cache: false }
      );

      if (existingProduct) {
        throw new AppError(
          `Product with SKU ${productData.sku} already exists`,
          409,
          true,
          'DUPLICATE_SKU'
        ).setContext(admin.adminId, requestId);
      }

      // Create new product
      const newProduct = new Product({
        ...productData,
        createdBy: admin.adminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await newProduct.save();

      // Log audit trail
      logAudit(
        'product_created',
        admin.adminId,
        'product',
        newProduct._id.toString(),
        productData,
        {
          requestId,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        }
      );

      // Invalidate related caches
      await optimizedProduct.clearCache();

      // Create response
      const responseData = {
        message: 'Product created successfully',
        product: {
          id: newProduct._id,
          name: newProduct.name,
          sku: newProduct.sku,
          price: newProduct.price,
          category: newProduct.category,
          createdAt: newProduct.createdAt,
        },
        meta: {
          requestId,
          api: VERSION_INFO,
        },
      };

      let response = NextResponse.json(responseData, { status: 201 });

      // Apply compression
      response = await compressJsonResponse(responseData, request);

      // Apply security headers
      response = applySecurityHeaders(response, {
        contentSecurityPolicy: "default-src 'none'",
        crossOriginResourcePolicy: 'cross-origin',
      });

      return response;

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        'Failed to create product',
        500,
        false,
        'PRODUCT_CREATE_ERROR',
        { originalError: error instanceof Error ? error.message : 'Unknown error' }
      ).setContext(undefined, requestId);
    }
  }, '/api/example-secure-endpoint'),
});

// OPTIONS endpoint - Handle CORS preflight with security
export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 200 });
  
  // CORS headers
  response.headers.set('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, API-Version');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Apply security headers
  return applySecurityHeaders(response, {
    contentSecurityPolicy: "default-src 'none'",
  });
}

// Example of how to handle file uploads securely
export async function PUT(request: NextRequest) {
  return asyncHandler(async (request: NextRequest) => {
    const requestId = generateRequestId();
    
    // Rate limiting
    const rateLimitResult = await apiRateLimiter(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Authentication
    const admin = authenticateAdmin(request, true);
    if (!admin) {
      throw new AppError('Authentication required', 401, true, 'UNAUTHORIZED')
        .setContext(undefined, requestId);
    }

    // File validation (example)
    const contentType = request.headers.get('content-type');
    if (contentType?.startsWith('multipart/form-data')) {
      // Handle file upload with validation
      // This would use the file validation middleware
      const maxSize = 5 * 1024 * 1024; // 5MB
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      
      // Implementation would go here...
    }

    // Return response with security headers
    let response = NextResponse.json({
      message: 'Update successful',
      requestId,
      api: VERSION_INFO,
    });

    return applySecurityHeaders(response);
    
  }, '/api/example-secure-endpoint')();
}