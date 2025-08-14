import { NextRequest, NextResponse } from 'next/server';
import { uploadImage, validateImageFile, createProductImageObject } from '@/lib/cloudinary';
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

    // Authenticate admin (disable CSRF check)
    const authResult = await authenticateAdmin(request, false);
    if (!authResult.isAuthenticated) {
      return authResult.response!;
    }

    const admin = authResult.admin!;

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const alt = formData.get('alt') as string;
    const folder = formData.get('folder') as string;
    const isPrimary = formData.get('isPrimary') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const uploadResult = await uploadImage(`data:${file.type};base64,${buffer.toString('base64')}`, {
      folder: folder || 'products',
      tags: ['product-image'],
      public_id: file.name.split('.')[0],
    });

    // Create image object
    const imageObject = createProductImageObject(uploadResult, alt, isPrimary);

    // Log audit
    logAudit(
      'image_upload',
      admin._id.toString(),
      'admin',
      admin._id.toString(),
      undefined,
      {
        publicId: uploadResult.public_id,
        url: uploadResult.secure_url,
        size: uploadResult.bytes,
        folder: folder || 'products',
      }
    );

    return NextResponse.json({
      message: 'Image uploaded successfully',
      image: imageObject,
      api: VERSION_INFO,
    });

  } catch (error) {
    logError(error as Error, {
      component: 'Image Upload API',
      endpoint: '/api/upload',
    });

    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}

// Handle image upload via URL
export async function PUT(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await authRateLimiter(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Authenticate admin (disable CSRF check)
    const authResult = await authenticateAdmin(request, false);
    if (!authResult.isAuthenticated) {
      return authResult.response!;
    }

    const admin = authResult.admin!;
    const { imageUrl, alt, folder, isPrimary } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'No image URL provided' },
        { status: 400 }
      );
    }

    // Upload from URL to Cloudinary
    const uploadResult = await uploadImage(imageUrl, {
      folder: folder || 'products',
      tags: ['product-image'],
    });

    // Create image object
    const imageObject = createProductImageObject(uploadResult, alt, isPrimary);

    // Log audit
    logAudit(
      'image_upload_from_url',
      admin._id.toString(),
      'admin',
      admin._id.toString(),
      undefined,
      {
        sourceUrl: imageUrl,
        publicId: uploadResult.public_id,
        url: uploadResult.secure_url,
        folder: folder || 'products',
      }
    );

    return NextResponse.json({
      message: 'Image uploaded from URL successfully',
      image: imageObject,
      api: VERSION_INFO,
    });

  } catch (error) {
    logError(error as Error, {
      component: 'Image Upload from URL API',
      endpoint: '/api/upload',
    });

    return NextResponse.json(
      { error: 'Failed to upload image from URL' },
      { status: 500 }
    );
  }
}