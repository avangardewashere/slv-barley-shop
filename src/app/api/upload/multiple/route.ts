import { NextRequest, NextResponse } from 'next/server';
import { uploadMultipleImages, validateImageFile, createProductImageObject } from '@/lib/cloudinary';
import { authRateLimiter } from '@/middleware/rate-limit';
import { logError, logAudit } from '@/lib/logger';
import { VERSION_INFO } from '@/lib/version';
import { authenticateAdmin } from '@/middleware/auth';

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

    const admin = authResult.admin!;

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll('images') as File[];
    const folder = formData.get('folder') as string;
    const maxImages = parseInt(process.env.MAX_IMAGES_PER_PRODUCT || '10');

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No image files provided' },
        { status: 400 }
      );
    }

    if (files.length > maxImages) {
      return NextResponse.json(
        { error: `Maximum ${maxImages} images allowed per upload` },
        { status: 400 }
      );
    }

    // Validate all files
    const validationErrors: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const validation = validateImageFile(files[i]);
      if (!validation.valid) {
        validationErrors.push(`File ${i + 1}: ${validation.error}`);
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    // Convert files to buffers
    const fileBuffers: string[] = [];
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      fileBuffers.push(`data:${file.type};base64,${buffer.toString('base64')}`);
    }

    // Upload to Cloudinary
    const uploadResults = await uploadMultipleImages(fileBuffers, {
      folder: folder || 'products',
      tags: ['product-image'],
    });

    // Create image objects
    const imageObjects = uploadResults.map((result, index) => 
      createProductImageObject(
        result,
        `Product image ${index + 1}`,
        index === 0 // First image is primary by default
      )
    );

    // Log audit
    logAudit(
      'multiple_images_upload',
      admin._id.toString(),
      'admin',
      admin._id.toString(),
      undefined,
      {
        count: uploadResults.length,
        totalSize: uploadResults.reduce((sum, r) => sum + r.bytes, 0),
        publicIds: uploadResults.map(r => r.public_id),
        folder: folder || 'products',
      }
    );

    return NextResponse.json({
      message: `${uploadResults.length} images uploaded successfully`,
      images: imageObjects,
      count: uploadResults.length,
      api: VERSION_INFO,
    });

  } catch (error) {
    logError(error as Error, {
      component: 'Multiple Images Upload API',
      endpoint: '/api/upload/multiple',
    });

    return NextResponse.json(
      { error: 'Failed to upload images' },
      { status: 500 }
    );
  }
}