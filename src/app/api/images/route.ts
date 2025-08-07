import { NextRequest, NextResponse } from 'next/server';
import { searchImages, getImageMetadata, generateUploadSignature } from '@/lib/cloudinary';
import { authRateLimiter } from '@/middleware/rate-limit';
import { logError } from '@/lib/logger';
import { VERSION_INFO } from '@/lib/version';
import { authenticateAdmin } from '@/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await authRateLimiter(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Authenticate admin
    const authResult = await authenticateAdmin(request);
    if (!authResult.isAuthenticated) {
      return authResult.response!;
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || 'folder:slv-barley-shop/*';
    const maxResults = Math.min(parseInt(searchParams.get('maxResults') || '50'), 100);
    const folder = searchParams.get('folder');
    const tags = searchParams.get('tags');
    
    let searchQuery = query;
    
    // Build search query based on parameters
    if (folder && !query.includes('folder:')) {
      searchQuery = `folder:${folder}/*`;
    }
    
    if (tags && !query.includes('tags:')) {
      const tagList = tags.split(',').map(tag => `tags:${tag.trim()}`).join(' AND ');
      searchQuery = searchQuery ? `${searchQuery} AND (${tagList})` : tagList;
    }

    const result = await searchImages(searchQuery, maxResults);

    return NextResponse.json({
      message: 'Images retrieved successfully',
      images: result.resources,
      total: result.total_count,
      query: searchQuery,
      api: VERSION_INFO,
    });

  } catch (error) {
    logError(error as Error, {
      component: 'Images List API',
      endpoint: '/api/images',
    });

    return NextResponse.json(
      { error: 'Failed to retrieve images' },
      { status: 500 }
    );
  }
}

// Generate upload signature for client-side uploads
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await authRateLimiter(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Authenticate admin
    const authResult = await authenticateAdmin(request);
    if (!authResult.isAuthenticated) {
      return authResult.response!;
    }

    const { folder, tags, transformation } = await request.json();

    const uploadParams: Record<string, any> = {
      folder: folder || 'slv-barley-shop/products',
      tags: tags || ['product-image'],
      unique_filename: true,
      use_filename: true,
      overwrite: false,
    };

    if (transformation) {
      uploadParams.transformation = transformation;
    }

    const { signature, timestamp } = generateUploadSignature(uploadParams);

    return NextResponse.json({
      signature,
      timestamp,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      upload_params: uploadParams,
      api: VERSION_INFO,
    });

  } catch (error) {
    logError(error as Error, {
      component: 'Upload Signature API',
      endpoint: '/api/images',
    });

    return NextResponse.json(
      { error: 'Failed to generate upload signature' },
      { status: 500 }
    );
  }
}