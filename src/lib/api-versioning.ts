import { NextRequest, NextResponse } from 'next/server';
import { logError, logInfo } from './logger';

// API version configuration
export interface ApiVersionConfig {
  defaultVersion: string;
  supportedVersions: string[];
  deprecatedVersions: DeprecatedVersion[];
  versioningStrategy: 'url' | 'header' | 'query' | 'media-type';
  headerName?: string;
  queryParam?: string;
  mediaTypePrefix?: string;
  strict?: boolean; // Reject unsupported versions
}

// Deprecated version information
export interface DeprecatedVersion {
  version: string;
  deprecationDate: Date;
  sunsetDate: Date;
  message?: string;
  migrationGuide?: string;
}

// Version request information
export interface VersionInfo {
  requested: string;
  resolved: string;
  isSupported: boolean;
  isDeprecated: boolean;
  deprecationInfo?: DeprecatedVersion;
  source: 'url' | 'header' | 'query' | 'media-type' | 'default';
}

// Default configuration
const defaultConfig: ApiVersionConfig = {
  defaultVersion: process.env.API_VERSION || 'v1',
  supportedVersions: ['v1'],
  deprecatedVersions: [],
  versioningStrategy: 'url',
  headerName: 'API-Version',
  queryParam: 'version',
  mediaTypePrefix: 'application/vnd.slv-barley-shop',
  strict: false,
};

// Semantic version comparison
export const compareVersions = (version1: string, version2: string): number => {
  // Remove 'v' prefix if present
  const v1 = version1.replace(/^v/, '');
  const v2 = version2.replace(/^v/, '');
  
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  // Pad arrays to same length
  const maxLength = Math.max(parts1.length, parts2.length);
  while (parts1.length < maxLength) parts1.push(0);
  while (parts2.length < maxLength) parts2.push(0);
  
  for (let i = 0; i < maxLength; i++) {
    if (parts1[i] < parts2[i]) return -1;
    if (parts1[i] > parts2[i]) return 1;
  }
  
  return 0;
};

// Extract version from URL path
const extractVersionFromUrl = (url: string): string | null => {
  const match = url.match(/\/api\/(v\d+(?:\.\d+)*)\//);
  return match ? match[1] : null;
};

// Extract version from header
const extractVersionFromHeader = (
  request: NextRequest,
  headerName: string
): string | null => {
  return request.headers.get(headerName);
};

// Extract version from query parameter
const extractVersionFromQuery = (
  request: NextRequest,
  queryParam: string
): string | null => {
  const url = new URL(request.url);
  return url.searchParams.get(queryParam);
};

// Extract version from media type
const extractVersionFromMediaType = (
  request: NextRequest,
  mediaTypePrefix: string
): string | null => {
  const accept = request.headers.get('accept');
  if (!accept) return null;
  
  const regex = new RegExp(`${mediaTypePrefix}\\.v(\\d+(?:\\.\\d+)*)`);
  const match = accept.match(regex);
  return match ? `v${match[1]}` : null;
};

// Parse API version from request
export const parseApiVersion = (
  request: NextRequest,
  config: ApiVersionConfig = defaultConfig
): VersionInfo => {
  let requestedVersion: string | null = null;
  let source: VersionInfo['source'] = 'default';
  
  // Extract version based on strategy
  switch (config.versioningStrategy) {
    case 'url':
      requestedVersion = extractVersionFromUrl(request.url);
      if (requestedVersion) source = 'url';
      break;
      
    case 'header':
      requestedVersion = extractVersionFromHeader(request, config.headerName!);
      if (requestedVersion) source = 'header';
      break;
      
    case 'query':
      requestedVersion = extractVersionFromQuery(request, config.queryParam!);
      if (requestedVersion) source = 'query';
      break;
      
    case 'media-type':
      requestedVersion = extractVersionFromMediaType(request, config.mediaTypePrefix!);
      if (requestedVersion) source = 'media-type';
      break;
  }
  
  // Use default if no version found
  const resolvedVersion = requestedVersion || config.defaultVersion;
  const isSupported = config.supportedVersions.includes(resolvedVersion);
  
  // Check for deprecation
  const deprecationInfo = config.deprecatedVersions.find(
    dep => dep.version === resolvedVersion
  );
  const isDeprecated = !!deprecationInfo;
  
  return {
    requested: requestedVersion || 'default',
    resolved: resolvedVersion,
    isSupported,
    isDeprecated,
    deprecationInfo,
    source,
  };
};

// Add version headers to response
export const addVersionHeaders = (
  response: NextResponse,
  versionInfo: VersionInfo,
  config: ApiVersionConfig = defaultConfig
): NextResponse => {
  // Add version header
  response.headers.set('API-Version', versionInfo.resolved);
  response.headers.set('API-Supported-Versions', config.supportedVersions.join(', '));
  
  // Add deprecation headers if applicable
  if (versionInfo.isDeprecated && versionInfo.deprecationInfo) {
    const dep = versionInfo.deprecationInfo;
    response.headers.set('Deprecation', dep.deprecationDate.toISOString());
    response.headers.set('Sunset', dep.sunsetDate.toISOString());
    
    if (dep.message) {
      response.headers.set('API-Deprecation-Message', dep.message);
    }
    
    if (dep.migrationGuide) {
      response.headers.set('API-Migration-Guide', dep.migrationGuide);
    }
  }
  
  return response;
};

// Create version validation middleware
export const createVersionMiddleware = (config?: Partial<ApiVersionConfig>) => {
  const finalConfig = { ...defaultConfig, ...config };
  
  return async (request: NextRequest): Promise<{
    versionInfo: VersionInfo;
    response?: NextResponse;
  }> => {
    const versionInfo = parseApiVersion(request, finalConfig);
    
    // Check if version is supported
    if (!versionInfo.isSupported) {
      if (finalConfig.strict) {
        logError(new Error(`Unsupported API version: ${versionInfo.resolved}`), {
          url: request.url,
          method: request.method,
          requestedVersion: versionInfo.requested,
          source: versionInfo.source,
        });
        
        return {
          versionInfo,
          response: NextResponse.json(
            {
              error: 'Unsupported API version',
              message: `Version ${versionInfo.resolved} is not supported`,
              supportedVersions: finalConfig.supportedVersions,
              currentVersion: finalConfig.defaultVersion,
            },
            { status: 400 }
          ),
        };
      }
      
      // Non-strict mode: use default version
      versionInfo.resolved = finalConfig.defaultVersion;
      versionInfo.isSupported = true;
    }
    
    // Log deprecation warning
    if (versionInfo.isDeprecated && versionInfo.deprecationInfo) {
      const dep = versionInfo.deprecationInfo;
      const daysUntilSunset = Math.ceil(
        (dep.sunsetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      logInfo(`Deprecated API version used: ${versionInfo.resolved}`, {
        url: request.url,
        method: request.method,
        deprecationDate: dep.deprecationDate.toISOString(),
        sunsetDate: dep.sunsetDate.toISOString(),
        daysUntilSunset,
        message: dep.message,
      });
    }
    
    return { versionInfo };
  };
};

// Version-specific route handler wrapper
export const versionedHandler = <T extends any[]>(
  handlers: Record<string, (...args: T) => Promise<NextResponse> | NextResponse>
) => {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const versionMiddleware = createVersionMiddleware();
    const { versionInfo, response } = await versionMiddleware(request);
    
    if (response) {
      return response; // Error response from middleware
    }
    
    // Find appropriate handler
    const handler = handlers[versionInfo.resolved] || handlers[defaultConfig.defaultVersion];
    
    if (!handler) {
      return NextResponse.json(
        {
          error: 'Version handler not found',
          message: `No handler available for version ${versionInfo.resolved}`,
        },
        { status: 501 }
      );
    }
    
    try {
      // Execute version-specific handler
      const result = await handler(request, ...args);
      
      // Add version headers to response
      return addVersionHeaders(result, versionInfo);
      
    } catch (error) {
      logError(error as Error, {
        component: 'Versioned Handler',
        version: versionInfo.resolved,
        url: request.url,
      });
      
      const errorResponse = NextResponse.json(
        {
          error: 'Internal server error',
          message: 'An error occurred processing your request',
        },
        { status: 500 }
      );
      
      return addVersionHeaders(errorResponse, versionInfo);
    }
  };
};

// Version-specific data transformer
export const createVersionTransformer = <TInput, TOutput>(
  transformers: Record<string, (data: TInput) => TOutput>
) => {
  return (data: TInput, version: string): TOutput => {
    const transformer = transformers[version] || transformers[defaultConfig.defaultVersion];
    
    if (!transformer) {
      throw new Error(`No transformer available for version ${version}`);
    }
    
    return transformer(data);
  };
};

// Database schema versioning support
export interface SchemaVersion {
  version: string;
  fields: string[];
  transforms?: Record<string, (value: any) => any>;
  deprecatedFields?: string[];
  newFields?: Record<string, any>; // Default values for new fields
}

export const transformDataForVersion = <T extends Record<string, any>>(
  data: T,
  fromVersion: string,
  toVersion: string,
  schemaVersions: Record<string, SchemaVersion>
): Partial<T> => {
  const targetSchema = schemaVersions[toVersion];
  if (!targetSchema) {
    return data;
  }
  
  const result: Partial<T> = {};
  
  // Include fields that exist in target version
  for (const field of targetSchema.fields) {
    if (data[field] !== undefined) {
      // Apply transformation if defined
      if (targetSchema.transforms?.[field]) {
        result[field as keyof T] = targetSchema.transforms[field](data[field]);
      } else {
        result[field as keyof T] = data[field];
      }
    } else if (targetSchema.newFields?.[field] !== undefined) {
      // Add default value for new fields
      result[field as keyof T] = targetSchema.newFields[field];
    }
  }
  
  return result;
};

// API version migration utilities
export const createMigrationGuide = (
  fromVersion: string,
  toVersion: string,
  changes: Array<{
    type: 'added' | 'removed' | 'changed' | 'deprecated';
    field?: string;
    description: string;
    example?: any;
  }>
): string => {
  const guide = [
    `Migration Guide: ${fromVersion} → ${toVersion}`,
    '=' + '='.repeat(40),
    '',
  ];
  
  const grouped = changes.reduce((acc, change) => {
    if (!acc[change.type]) acc[change.type] = [];
    acc[change.type].push(change);
    return acc;
  }, {} as Record<string, typeof changes>);
  
  for (const [type, typeChanges] of Object.entries(grouped)) {
    guide.push(`${type.toUpperCase()} CHANGES:`);
    guide.push('-'.repeat(20));
    
    for (const change of typeChanges) {
      guide.push(`• ${change.description}`);
      if (change.example) {
        guide.push(`  Example: ${JSON.stringify(change.example)}`);
      }
    }
    
    guide.push('');
  }
  
  return guide.join('\n');
};

// Export configuration and utilities
export { defaultConfig as defaultVersionConfig };

// Pre-configured version middlewares
export const urlVersionMiddleware = createVersionMiddleware({
  versioningStrategy: 'url',
});

export const headerVersionMiddleware = createVersionMiddleware({
  versioningStrategy: 'header',
});

export const strictVersionMiddleware = createVersionMiddleware({
  strict: true,
});