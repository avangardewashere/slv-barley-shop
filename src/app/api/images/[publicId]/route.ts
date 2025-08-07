import { NextRequest, NextResponse } from 'next/server';
import { getImageMetadata } from '@/lib/cloudinary';
import { authRateLimiter } from '@/middleware/rate-limit';
import { logError } from '@/lib/logger';
import { VERSION_INFO } from '@/lib/version';
import { authenticateAdmin } from '@/middleware/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { publicId: string } }
) {
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

    const publicId = decodeURIComponent(params.publicId);

    if (!publicId) {
      return NextResponse.json(
        { error: 'Public ID is required' },
        { status: 400 }
      );
    }

    const metadata = await getImageMetadata(publicId);

    return NextResponse.json({
      message: 'Image metadata retrieved successfully',
      metadata,
      api: VERSION_INFO,
    });

  } catch (error) {
    logError(error as Error, {
      component: 'Image Metadata API',
      endpoint: '/api/images/[publicId]',
      publicId: params.publicId,
    });

    const errorMessage = (error as Error).message;
    const statusCode = errorMessage.includes('not found') ? 404 : 500;

    return NextResponse.json(
      { error: `Failed to retrieve image metadata: ${errorMessage}` },
      { status: statusCode }
    );
  }
}