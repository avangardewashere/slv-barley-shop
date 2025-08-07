import { NextRequest, NextResponse } from 'next/server';
import { deleteImage, deleteMultipleImages, extractPublicIdFromUrl } from '@/lib/cloudinary';
import { authRateLimiter } from '@/middleware/rate-limit';
import { logError, logAudit } from '@/lib/logger';
import { VERSION_INFO } from '@/lib/version';
import { authenticateAdmin } from '@/middleware/auth';

export async function DELETE(request: NextRequest) {
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
    const { publicId, publicIds, url, urls } = await request.json();

    // Handle single image deletion
    if (publicId || url) {
      const idToDelete = publicId || extractPublicIdFromUrl(url);
      
      if (!idToDelete) {
        return NextResponse.json(
          { error: 'Invalid public ID or URL provided' },
          { status: 400 }
        );
      }

      const result = await deleteImage(idToDelete);

      // Log audit
      logAudit(
        'image_delete',
        admin._id.toString(),
        'admin',
        admin._id.toString(),
        undefined,
        {
          publicId: idToDelete,
          result: result.result,
        }
      );

      return NextResponse.json({
        message: 'Image deleted successfully',
        result: result.result,
        publicId: idToDelete,
        api: VERSION_INFO,
      });
    }

    // Handle multiple image deletion
    if (publicIds || urls) {
      let idsToDelete: string[] = [];

      if (publicIds && Array.isArray(publicIds)) {
        idsToDelete = publicIds;
      } else if (urls && Array.isArray(urls)) {
        idsToDelete = urls
          .map((url: string) => extractPublicIdFromUrl(url))
          .filter((id: string | null) => id !== null) as string[];
      }

      if (idsToDelete.length === 0) {
        return NextResponse.json(
          { error: 'No valid public IDs or URLs provided' },
          { status: 400 }
        );
      }

      const result = await deleteMultipleImages(idsToDelete);
      const deletedCount = Object.keys(result.deleted).length;

      // Log audit
      logAudit(
        'multiple_images_delete',
        admin._id.toString(),
        'admin',
        admin._id.toString(),
        undefined,
        {
          publicIds: idsToDelete,
          deletedCount,
          result: result.deleted,
        }
      );

      return NextResponse.json({
        message: `${deletedCount} images deleted successfully`,
        deleted: result.deleted,
        deletedCount,
        api: VERSION_INFO,
      });
    }

    return NextResponse.json(
      { error: 'No public ID, URL, or arrays provided' },
      { status: 400 }
    );

  } catch (error) {
    logError(error as Error, {
      component: 'Image Delete API',
      endpoint: '/api/upload/delete',
    });

    return NextResponse.json(
      { error: 'Failed to delete image(s)' },
      { status: 500 }
    );
  }
}