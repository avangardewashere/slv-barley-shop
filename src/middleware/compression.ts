import { NextRequest, NextResponse } from 'next/server';
import { gzip, deflate, brotliCompress } from 'zlib';
import { promisify } from 'util';

// Compression configuration
export interface CompressionConfig {
  threshold?: number; // Minimum size to compress (bytes)
  level?: number; // Compression level (1-9)
  chunkSize?: number; // Chunk size for streaming
  windowBits?: number; // Window size for gzip/deflate
  memLevel?: number; // Memory level for deflate
  strategy?: number; // Strategy for deflate
  filter?: (req: NextRequest, res: NextResponse) => boolean; // Custom filter
  encodings?: ('gzip' | 'deflate' | 'br')[]; // Supported encodings in priority order
}

// Default configuration
const defaultConfig: Required<CompressionConfig> = {
  threshold: parseInt(process.env.COMPRESSION_THRESHOLD || '1024'), // 1KB
  level: parseInt(process.env.COMPRESSION_LEVEL || '6'), // Balanced compression
  chunkSize: 16384, // 16KB chunks
  windowBits: 15,
  memLevel: 8,
  strategy: 0, // Default strategy
  filter: (req: NextRequest, res: NextResponse) => {
    const contentType = res.headers.get('content-type') || '';
    
    // Compress text-based content types
    return /^(text\/|application\/(json|javascript|xml|rss\+xml|atom\+xml)|image\/svg\+xml)/.test(contentType);
  },
  encodings: ['br', 'gzip', 'deflate'], // Brotli preferred, then gzip, then deflate
};

// Promisify compression functions
const gzipAsync = promisify(gzip);
const deflateAsync = promisify(deflate);
const brotliCompressAsync = promisify(brotliCompress);

// MIME types that should be compressed
const COMPRESSIBLE_TYPES = [
  'text/html',
  'text/plain',
  'text/css',
  'text/javascript',
  'text/xml',
  'application/json',
  'application/javascript',
  'application/xml',
  'application/rss+xml',
  'application/atom+xml',
  'image/svg+xml',
  'application/x-font-ttf',
  'font/opentype',
];

// MIME types that should NOT be compressed (already compressed)
const NON_COMPRESSIBLE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/',
  'audio/',
  'application/zip',
  'application/gzip',
  'application/x-rar-compressed',
  'application/pdf',
  'application/octet-stream',
];

// Check if content should be compressed
export const shouldCompress = (
  contentType: string,
  contentLength?: number,
  threshold: number = defaultConfig.threshold
): boolean => {
  // Check content length threshold
  if (contentLength && contentLength < threshold) {
    return false;
  }
  
  // Check if type is explicitly non-compressible
  if (NON_COMPRESSIBLE_TYPES.some(type => contentType.startsWith(type))) {
    return false;
  }
  
  // Check if type is compressible
  return COMPRESSIBLE_TYPES.some(type => contentType.startsWith(type));
};

// Parse Accept-Encoding header
export const parseAcceptEncoding = (
  acceptEncoding: string | null
): { encoding: string; quality: number }[] => {
  if (!acceptEncoding) {
    return [];
  }
  
  return acceptEncoding
    .split(',')
    .map(encoding => {
      const parts = encoding.trim().split(';');
      const name = parts[0];
      const qValue = parts[1];
      
      let quality = 1.0;
      if (qValue && qValue.startsWith('q=')) {
        quality = parseFloat(qValue.substring(2)) || 0;
      }
      
      return { encoding: name, quality };
    })
    .filter(item => item.quality > 0)
    .sort((a, b) => b.quality - a.quality);
};

// Select best encoding
export const selectEncoding = (
  acceptEncoding: string | null,
  supportedEncodings: string[] = defaultConfig.encodings
): string | null => {
  const accepted = parseAcceptEncoding(acceptEncoding);
  
  // Find the first supported encoding
  for (const supported of supportedEncodings) {
    for (const accepted_item of accepted) {
      if (accepted_item.encoding === supported || accepted_item.encoding === '*') {
        return supported;
      }
    }
  }
  
  return null;
};

// Compress content using specified encoding
export const compressContent = async (
  content: Buffer | string,
  encoding: string,
  level: number = defaultConfig.level
): Promise<Buffer> => {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  
  switch (encoding) {
    case 'gzip':
      return await gzipAsync(buffer, { level });
      
    case 'deflate':
      return await deflateAsync(buffer, { level });
      
    case 'br':
      return await brotliCompressAsync(buffer, {
        params: {
          [process.constants?.zlib?.constants?.BROTLI_PARAM_QUALITY || 0]: level,
        },
      });
      
    default:
      throw new Error(`Unsupported compression encoding: ${encoding}`);
  }
};

// Create compression middleware
export const createCompressionMiddleware = (config?: CompressionConfig) => {
  const finalConfig = { ...defaultConfig, ...config };
  
  return async (
    request: NextRequest,
    response: NextResponse
  ): Promise<NextResponse> => {
    // Check if compression should be skipped
    if (!finalConfig.filter(request, response)) {
      return response;
    }
    
    const contentType = response.headers.get('content-type') || '';
    const contentLength = parseInt(response.headers.get('content-length') || '0');
    
    // Check if content should be compressed
    if (!shouldCompress(contentType, contentLength, finalConfig.threshold)) {
      return response;
    }
    
    // Check if already compressed
    if (response.headers.get('content-encoding')) {
      return response;
    }
    
    // Select best encoding
    const acceptEncoding = request.headers.get('accept-encoding');
    const encoding = selectEncoding(acceptEncoding, finalConfig.encodings);
    
    if (!encoding) {
      return response;
    }
    
    try {
      // Get response body
      const originalBody = await response.arrayBuffer();
      const buffer = Buffer.from(originalBody);
      
      // Compress the content
      const compressed = await compressContent(buffer, encoding, finalConfig.level);
      
      // Calculate compression ratio
      const originalSize = buffer.length;
      const compressedSize = compressed.length;
      const ratio = ((originalSize - compressedSize) / originalSize) * 100;
      
      // Only use compression if it actually reduces size
      if (compressedSize >= originalSize) {
        return response;
      }
      
      // Create new response with compressed content
      const compressedResponse = new NextResponse(compressed, {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers),
      });
      
      // Update headers
      compressedResponse.headers.set('Content-Encoding', encoding);
      compressedResponse.headers.set('Content-Length', compressed.length.toString());
      compressedResponse.headers.set('X-Compression-Ratio', `${ratio.toFixed(2)}%`);
      compressedResponse.headers.set('X-Original-Size', originalSize.toString());
      compressedResponse.headers.set('X-Compressed-Size', compressedSize.toString());
      
      // Remove ETag if present (compressed content has different ETag)
      if (compressedResponse.headers.has('etag')) {
        const originalETag = compressedResponse.headers.get('etag');
        const compressedETag = `W/"${encoding}-${originalETag?.replace(/^W?\/?"?([^"]*)"?$/, '$1')}"`;
        compressedResponse.headers.set('etag', compressedETag);
      }
      
      return compressedResponse;
      
    } catch (error) {
      console.error('Compression error:', error);
      return response; // Return original response if compression fails
    }
  };
};

// Stream compression for large responses
export const createStreamCompressionMiddleware = (config?: CompressionConfig) => {
  const finalConfig = { ...defaultConfig, ...config };
  
  return async (
    request: NextRequest,
    response: NextResponse
  ): Promise<NextResponse> => {
    const contentType = response.headers.get('content-type') || '';
    
    if (!shouldCompress(contentType, undefined, finalConfig.threshold)) {
      return response;
    }
    
    const acceptEncoding = request.headers.get('accept-encoding');
    const encoding = selectEncoding(acceptEncoding, finalConfig.encodings);
    
    if (!encoding) {
      return response;
    }
    
    // For streaming, we need to use ReadableStream
    const readable = new ReadableStream({
      start(controller) {
        // This would need to be implemented with proper streaming compression
        // For now, fall back to regular compression
        controller.close();
      },
    });
    
    // Note: This is a simplified version. A full implementation would need
    // to handle streaming compression properly
    return response;
  };
};

// Specific compression middlewares
export const gzipMiddleware = createCompressionMiddleware({
  encodings: ['gzip'],
});

export const brotliMiddleware = createCompressionMiddleware({
  encodings: ['br'],
});

export const adaptiveCompressionMiddleware = createCompressionMiddleware({
  encodings: ['br', 'gzip', 'deflate'],
  level: 6,
  threshold: 1024,
});

// Helper to compress JSON responses
export const compressJsonResponse = async (
  data: any,
  request: NextRequest,
  config?: CompressionConfig
): Promise<NextResponse> => {
  const jsonString = JSON.stringify(data);
  const originalResponse = NextResponse.json(data);
  
  const compressionMiddleware = createCompressionMiddleware(config);
  return await compressionMiddleware(request, originalResponse);
};

// Helper to compress text responses
export const compressTextResponse = async (
  text: string,
  contentType: string,
  request: NextRequest,
  config?: CompressionConfig
): Promise<NextResponse> => {
  const originalResponse = new NextResponse(text, {
    headers: { 'Content-Type': contentType },
  });
  
  const compressionMiddleware = createCompressionMiddleware(config);
  return await compressionMiddleware(request, originalResponse);
};

// Compression statistics
export interface CompressionStats {
  requestsProcessed: number;
  bytesOriginal: number;
  bytesCompressed: number;
  averageRatio: number;
  encodingUsage: Record<string, number>;
}

class CompressionStatsCollector {
  private stats: CompressionStats = {
    requestsProcessed: 0,
    bytesOriginal: 0,
    bytesCompressed: 0,
    averageRatio: 0,
    encodingUsage: {},
  };

  addCompression(
    originalSize: number,
    compressedSize: number,
    encoding: string
  ): void {
    this.stats.requestsProcessed++;
    this.stats.bytesOriginal += originalSize;
    this.stats.bytesCompressed += compressedSize;
    
    this.stats.encodingUsage[encoding] = (this.stats.encodingUsage[encoding] || 0) + 1;
    
    // Recalculate average ratio
    this.stats.averageRatio = this.stats.bytesOriginal > 0 
      ? ((this.stats.bytesOriginal - this.stats.bytesCompressed) / this.stats.bytesOriginal) * 100
      : 0;
  }

  getStats(): CompressionStats {
    return { ...this.stats };
  }

  reset(): void {
    this.stats = {
      requestsProcessed: 0,
      bytesOriginal: 0,
      bytesCompressed: 0,
      averageRatio: 0,
      encodingUsage: {},
    };
  }
}

// Global stats collector
export const compressionStats = new CompressionStatsCollector();

// Middleware with stats collection
export const createCompressionMiddlewareWithStats = (config?: CompressionConfig) => {
  const compressionMiddleware = createCompressionMiddleware(config);
  
  return async (request: NextRequest, response: NextResponse): Promise<NextResponse> => {
    const result = await compressionMiddleware(request, response);
    
    // Collect stats if compression was applied
    const originalSizeHeader = result.headers.get('x-original-size');
    const compressedSizeHeader = result.headers.get('x-compressed-size');
    const encoding = result.headers.get('content-encoding');
    
    if (originalSizeHeader && compressedSizeHeader && encoding) {
      const originalSize = parseInt(originalSizeHeader);
      const compressedSize = parseInt(compressedSizeHeader);
      
      compressionStats.addCompression(originalSize, compressedSize, encoding);
    }
    
    return result;
  };
};