import { v2 as cloudinary } from 'cloudinary';
import { logError, logInfo } from './logger';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Use HTTPS URLs
});

export interface CloudinaryUploadOptions {
  folder?: string;
  public_id?: string;
  transformation?: any;
  tags?: string[];
  context?: Record<string, string>;
  overwrite?: boolean;
  unique_filename?: boolean;
  use_filename?: boolean;
}

export interface CloudinaryUploadResult {
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  folder: string;
  original_filename: string;
}

export interface OptimizedImageUrls {
  thumbnail: string;
  small: string;
  medium: string;
  large: string;
  original: string;
}

/**
 * Upload image to Cloudinary
 */
export const uploadImage = async (
  file: Buffer | string,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> => {
  try {
    const defaultOptions: CloudinaryUploadOptions = {
      folder: process.env.CLOUDINARY_FOLDER || 'slv-barley-shop',
      unique_filename: true,
      use_filename: true,
      overwrite: false,
      ...options,
    };

    const result = await cloudinary.uploader.upload(file, defaultOptions as any);
    
    logInfo('Image uploaded successfully', {
      publicId: result.public_id,
      url: result.secure_url,
      size: result.bytes,
    });

    return result;
  } catch (error) {
    logError(error as Error, {
      component: 'Cloudinary Upload',
      options,
    });
    throw new Error(`Image upload failed: ${(error as Error).message}`);
  }
};

/**
 * Upload multiple images to Cloudinary
 */
export const uploadMultipleImages = async (
  files: (Buffer | string)[],
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult[]> => {
  try {
    const uploadPromises = files.map((file, index) => 
      uploadImage(file, {
        ...options,
        public_id: options.public_id ? `${options.public_id}_${index + 1}` : undefined,
      })
    );

    const results = await Promise.all(uploadPromises);
    
    logInfo('Multiple images uploaded successfully', {
      count: results.length,
      totalSize: results.reduce((sum, r) => sum + r.bytes, 0),
    });

    return results;
  } catch (error) {
    logError(error as Error, {
      component: 'Cloudinary Multiple Upload',
      fileCount: files.length,
    });
    throw new Error(`Multiple image upload failed: ${(error as Error).message}`);
  }
};

/**
 * Delete image from Cloudinary
 */
export const deleteImage = async (publicId: string): Promise<{ result: string }> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    
    logInfo('Image deleted successfully', { publicId, result: result.result });
    
    return result;
  } catch (error) {
    logError(error as Error, {
      component: 'Cloudinary Delete',
      publicId,
    });
    throw new Error(`Image deletion failed: ${(error as Error).message}`);
  }
};

/**
 * Delete multiple images from Cloudinary
 */
export const deleteMultipleImages = async (publicIds: string[]): Promise<{ deleted: Record<string, string> }> => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds);
    
    logInfo('Multiple images deleted successfully', {
      count: publicIds.length,
      deleted: Object.keys(result.deleted).length,
    });
    
    return result;
  } catch (error) {
    logError(error as Error, {
      component: 'Cloudinary Multiple Delete',
      publicIds,
    });
    throw new Error(`Multiple image deletion failed: ${(error as Error).message}`);
  }
};

/**
 * Generate optimized image URLs for different sizes
 */
export const generateOptimizedUrls = (publicId: string): OptimizedImageUrls => {
  const baseUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;
  
  return {
    thumbnail: `${baseUrl}/c_fill,w_150,h_150,q_auto,f_auto/${publicId}`,
    small: `${baseUrl}/c_fill,w_300,h_300,q_auto,f_auto/${publicId}`,
    medium: `${baseUrl}/c_fill,w_600,h_600,q_auto,f_auto/${publicId}`,
    large: `${baseUrl}/c_fill,w_1200,h_1200,q_auto,f_auto/${publicId}`,
    original: `${baseUrl}/q_auto,f_auto/${publicId}`,
  };
};

/**
 * Generate responsive image URLs for different screen sizes
 */
export const generateResponsiveUrls = (publicId: string) => {
  const baseUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;
  
  return {
    // For product cards
    card: `${baseUrl}/c_fill,w_400,h_400,q_auto,f_auto/${publicId}`,
    // For product detail pages
    detail: `${baseUrl}/c_fill,w_800,h_800,q_auto,f_auto/${publicId}`,
    // For hero banners
    hero: `${baseUrl}/c_fill,w_1920,h_800,q_auto,f_auto/${publicId}`,
    // For mobile devices
    mobile: `${baseUrl}/c_fill,w_600,h_600,q_auto,f_auto/${publicId}`,
  };
};

/**
 * Extract public_id from Cloudinary URL
 */
export const extractPublicIdFromUrl = (url: string): string | null => {
  try {
    // Handle both HTTP and HTTPS URLs
    const regex = /\/v\d+\/(.+)\.(jpg|jpeg|png|gif|webp|svg)$/i;
    const match = url.match(regex);
    
    if (match && match[1]) {
      return match[1];
    }
    
    // Alternative regex for URLs without version
    const altRegex = /\/upload\/(.+)\.(jpg|jpeg|png|gif|webp|svg)$/i;
    const altMatch = url.match(altRegex);
    
    return altMatch && altMatch[1] ? altMatch[1] : null;
  } catch (error) {
    logError(error as Error, {
      component: 'Extract Public ID',
      url,
    });
    return null;
  }
};

/**
 * Validate image file
 */
export const validateImageFile = (file: any): { valid: boolean; error?: string } => {
  const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default
  const allowedTypes = (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/jpg,image/png,image/webp').split(',');
  
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File size too large. Maximum allowed size is ${Math.round(maxSize / 1024 / 1024)}MB` 
    };
  }
  
  if (!allowedTypes.includes(file.type || file.mimetype)) {
    return { 
      valid: false, 
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` 
    };
  }
  
  return { valid: true };
};

/**
 * Create product image object for database storage
 */
export const createProductImageObject = (
  uploadResult: CloudinaryUploadResult,
  alt?: string,
  isPrimary: boolean = false
) => {
  return {
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    alt: alt || uploadResult.original_filename || 'Product image',
    isPrimary,
    width: uploadResult.width,
    height: uploadResult.height,
    format: uploadResult.format,
    size: uploadResult.bytes,
    optimizedUrls: generateOptimizedUrls(uploadResult.public_id),
    responsiveUrls: generateResponsiveUrls(uploadResult.public_id),
  };
};

/**
 * Transform product images for API response
 */
export const transformProductImages = (images: any[]) => {
  return images.map((image) => {
    if (typeof image.optimizedUrls === 'undefined' && image.publicId) {
      image.optimizedUrls = generateOptimizedUrls(image.publicId);
      image.responsiveUrls = generateResponsiveUrls(image.publicId);
    }
    return image;
  });
};

/**
 * Generate image upload signature for client-side uploads
 */
export const generateUploadSignature = (params: Record<string, any>) => {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const paramsWithTimestamp = { ...params, timestamp };
  
  return {
    signature: cloudinary.utils.api_sign_request(paramsWithTimestamp, process.env.CLOUDINARY_API_SECRET!),
    timestamp,
  };
};

/**
 * Search images in Cloudinary
 */
export const searchImages = async (query: string, maxResults: number = 50) => {
  try {
    const result = await cloudinary.search
      .expression(query)
      .max_results(maxResults)
      .sort_by([{ created_at: 'desc' }])
      .execute();
      
    return result;
  } catch (error) {
    logError(error as Error, {
      component: 'Cloudinary Search',
      query,
      maxResults,
    });
    throw new Error(`Image search failed: ${(error as Error).message}`);
  }
};

/**
 * Get image metadata from Cloudinary
 */
export const getImageMetadata = async (publicId: string) => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      image_metadata: true,
      colors: true,
      phash: true,
    });
    
    return result;
  } catch (error) {
    logError(error as Error, {
      component: 'Get Image Metadata',
      publicId,
    });
    throw new Error(`Failed to get image metadata: ${(error as Error).message}`);
  }
};

export default cloudinary;