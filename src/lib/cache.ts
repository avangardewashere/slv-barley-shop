import Redis from 'ioredis';
import { logError, logInfo, logPerformance } from './logger';

// Cache configuration
export interface CacheConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  maxRetriesPerRequest?: number;
  retryDelayOnFailover?: number;
  enableReadyCheck?: boolean;
  lazyConnect?: boolean;
}

// Cache item with metadata
export interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  tags?: string[];
  version?: string;
}

// Cache operation result
export interface CacheResult<T = any> {
  hit: boolean;
  data: T | null;
  age?: number; // Age in milliseconds
}

class CacheManager {
  private redis: Redis | null = null;
  private fallbackCache: Map<string, CacheItem> = new Map();
  private isConnected = false;
  private config: CacheConfig;

  constructor(config?: CacheConfig) {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: 'slv-barley:',
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      lazyConnect: true,
      ...config,
    };

    this.initializeRedis();
  }

  private initializeRedis(): void {
    try {
      this.redis = new Redis(this.config);

      this.redis.on('connect', () => {
        this.isConnected = true;
        logInfo('Connected to Redis cache');
      });

      this.redis.on('error', (error) => {
        this.isConnected = false;
        logError(error, { component: 'Redis Cache' });
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        logInfo('Redis connection closed');
      });

      this.redis.on('reconnecting', () => {
        logInfo('Reconnecting to Redis...');
      });

    } catch (error) {
      logError(error as Error, { component: 'Redis Cache Initialization' });
      this.fallbackToMemory();
    }
  }

  private fallbackToMemory(): void {
    logInfo('Falling back to in-memory cache');
    
    // Clean up expired entries periodically
    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.fallbackCache.entries()) {
        if (item.timestamp + item.ttl < now) {
          this.fallbackCache.delete(key);
        }
      }
    }, 60000); // Clean every minute
  }

  private buildKey(key: string, namespace?: string): string {
    const prefix = this.config.keyPrefix || '';
    const ns = namespace ? `${namespace}:` : '';
    return `${prefix}${ns}${key}`;
  }

  // Get item from cache
  async get<T = any>(key: string, namespace?: string): Promise<CacheResult<T>> {
    const startTime = Date.now();
    const fullKey = this.buildKey(key, namespace);

    try {
      if (this.redis && this.isConnected) {
        const data = await this.redis.get(fullKey);
        const duration = Date.now() - startTime;
        
        logPerformance(`Cache GET ${fullKey}`, duration);

        if (data) {
          const item: CacheItem<T> = JSON.parse(data);
          const age = Date.now() - item.timestamp;
          
          return {
            hit: true,
            data: item.data,
            age,
          };
        }
      } else {
        // Fallback to memory cache
        const item = this.fallbackCache.get(fullKey);
        
        if (item && item.timestamp + item.ttl > Date.now()) {
          const age = Date.now() - item.timestamp;
          
          return {
            hit: true,
            data: item.data as T,
            age,
          };
        } else if (item) {
          // Expired, remove it
          this.fallbackCache.delete(fullKey);
        }
      }

      return { hit: false, data: null };
    } catch (error) {
      logError(error as Error, { component: 'Cache GET', key: fullKey });
      return { hit: false, data: null };
    }
  }

  // Set item in cache
  async set<T = any>(
    key: string,
    data: T,
    ttl: number = 3600000, // 1 hour default
    options?: {
      namespace?: string;
      tags?: string[];
      version?: string;
    }
  ): Promise<boolean> {
    const startTime = Date.now();
    const fullKey = this.buildKey(key, options?.namespace);
    
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      tags: options?.tags,
      version: options?.version,
    };

    try {
      if (this.redis && this.isConnected) {
        await this.redis.setex(fullKey, Math.ceil(ttl / 1000), JSON.stringify(item));
        
        // Store tags for cache invalidation
        if (options?.tags) {
          for (const tag of options.tags) {
            await this.redis.sadd(`tag:${tag}`, fullKey);
            await this.redis.expire(`tag:${tag}`, Math.ceil(ttl / 1000) + 60);
          }
        }
      } else {
        // Fallback to memory cache
        this.fallbackCache.set(fullKey, item);
      }

      const duration = Date.now() - startTime;
      logPerformance(`Cache SET ${fullKey}`, duration);

      return true;
    } catch (error) {
      logError(error as Error, { component: 'Cache SET', key: fullKey });
      return false;
    }
  }

  // Delete item from cache
  async delete(key: string, namespace?: string): Promise<boolean> {
    const fullKey = this.buildKey(key, namespace);

    try {
      if (this.redis && this.isConnected) {
        await this.redis.del(fullKey);
      } else {
        this.fallbackCache.delete(fullKey);
      }
      
      return true;
    } catch (error) {
      logError(error as Error, { component: 'Cache DELETE', key: fullKey });
      return false;
    }
  }

  // Invalidate by tags
  async invalidateByTags(tags: string[]): Promise<boolean> {
    try {
      if (this.redis && this.isConnected) {
        for (const tag of tags) {
          const keys = await this.redis.smembers(`tag:${tag}`);
          if (keys.length > 0) {
            await this.redis.del(...keys);
            await this.redis.del(`tag:${tag}`);
          }
        }
      } else {
        // For memory cache, iterate through all items
        for (const [key, item] of this.fallbackCache.entries()) {
          if (item.tags && item.tags.some(tag => tags.includes(tag))) {
            this.fallbackCache.delete(key);
          }
        }
      }
      
      return true;
    } catch (error) {
      logError(error as Error, { component: 'Cache Invalidate by Tags', tags });
      return false;
    }
  }

  // Clear all cache
  async clear(namespace?: string): Promise<boolean> {
    try {
      if (this.redis && this.isConnected) {
        if (namespace) {
          const pattern = this.buildKey('*', namespace);
          const keys = await this.redis.keys(pattern);
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
        } else {
          await this.redis.flushdb();
        }
      } else {
        if (namespace) {
          const prefix = this.buildKey('', namespace);
          for (const key of this.fallbackCache.keys()) {
            if (key.startsWith(prefix)) {
              this.fallbackCache.delete(key);
            }
          }
        } else {
          this.fallbackCache.clear();
        }
      }
      
      return true;
    } catch (error) {
      logError(error as Error, { component: 'Cache Clear', namespace });
      return false;
    }
  }

  // Get cache stats
  async getStats(): Promise<{
    connected: boolean;
    memory: boolean;
    itemCount: number;
  }> {
    let itemCount = 0;

    try {
      if (this.redis && this.isConnected) {
        const info = await this.redis.info('keyspace');
        const match = info.match(/keys=(\d+)/);
        itemCount = match ? parseInt(match[1]) : 0;
      } else {
        itemCount = this.fallbackCache.size;
      }
    } catch (error) {
      logError(error as Error, { component: 'Cache Stats' });
    }

    return {
      connected: this.isConnected,
      memory: !this.isConnected,
      itemCount,
    };
  }

  // Close connection
  async close(): Promise<void> {
    if (this.redis) {
      this.redis.disconnect();
    }
    this.fallbackCache.clear();
  }
}

// Create global cache instance
const cache = new CacheManager();

// Cache decorator for methods
export function cached(
  keyGenerator: (...args: any[]) => string,
  ttl: number = 3600000,
  namespace?: string
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = keyGenerator(...args);
      
      // Try to get from cache first
      const result = await cache.get(cacheKey, namespace);
      if (result.hit) {
        return result.data;
      }

      // Execute original method
      const data = await method.apply(this, args);
      
      // Store in cache
      await cache.set(cacheKey, data, ttl, { namespace });
      
      return data;
    };

    return descriptor;
  };
}

// Cache-aside pattern helper
export async function cacheAside<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 3600000,
  namespace?: string
): Promise<T> {
  // Try cache first
  const cached = await cache.get<T>(key, namespace);
  if (cached.hit) {
    return cached.data!;
  }

  // Fetch data
  const data = await fetchFn();
  
  // Store in cache
  await cache.set(key, data, ttl, { namespace });
  
  return data;
}

// Write-through cache helper
export async function writeThrough<T>(
  key: string,
  data: T,
  writeFn: (data: T) => Promise<void>,
  ttl: number = 3600000,
  namespace?: string
): Promise<void> {
  // Write to storage
  await writeFn(data);
  
  // Write to cache
  await cache.set(key, data, ttl, { namespace });
}

// Write-behind cache helper
export async function writeBehind<T>(
  key: string,
  data: T,
  ttl: number = 3600000,
  namespace?: string
): Promise<void> {
  // Write to cache immediately
  await cache.set(key, data, ttl, { namespace });
  
  // Note: In a real implementation, you would queue the write operation
  // for later execution using a job queue like Bull or Agenda
}

export default cache;
export { CacheManager };