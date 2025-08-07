import mongoose, { Model, Document, Query, Aggregate } from 'mongoose';
import { logDatabaseQuery, logPerformance, logError } from './logger';
import cache from './cache';

// Query optimization configuration
export interface QueryOptimizationConfig {
  cacheEnabled?: boolean;
  cacheTTL?: number;
  slowQueryThreshold?: number;
  enableQueryLogging?: boolean;
  enableExplain?: boolean;
  maxDocuments?: number;
  timeout?: number;
}

// Default configuration
const defaultConfig: Required<QueryOptimizationConfig> = {
  cacheEnabled: true,
  cacheTTL: 300000, // 5 minutes
  slowQueryThreshold: 100, // 100ms
  enableQueryLogging: process.env.NODE_ENV !== 'production',
  enableExplain: process.env.NODE_ENV === 'development',
  maxDocuments: 1000,
  timeout: 30000, // 30 seconds
};

// Query performance metrics
export interface QueryMetrics {
  collection: string;
  operation: string;
  duration: number;
  documentsExamined?: number;
  documentsReturned?: number;
  indexUsed?: boolean;
  cacheHit?: boolean;
  executionStats?: any;
}

// Aggregation pipeline optimization helpers
export class PipelineOptimizer {
  private pipeline: any[];
  
  constructor(pipeline: any[] = []) {
    this.pipeline = [...pipeline];
  }
  
  // Move $match stages early in the pipeline
  optimizeMatches(): this {
    const matches: any[] = [];
    const others: any[] = [];
    
    for (const stage of this.pipeline) {
      if (stage.$match) {
        matches.push(stage);
      } else {
        others.push(stage);
      }
    }
    
    this.pipeline = [...matches, ...others];
    return this;
  }
  
  // Move $sort before $limit if possible
  optimizeSortLimit(): this {
    const optimized: any[] = [];
    let sortStage: any = null;
    let limitStage: any = null;
    
    for (const stage of this.pipeline) {
      if (stage.$sort && !sortStage) {
        sortStage = stage;
      } else if (stage.$limit && !limitStage) {
        limitStage = stage;
      } else {
        if (sortStage && limitStage) {
          optimized.push(sortStage, limitStage);
          sortStage = null;
          limitStage = null;
        } else if (sortStage) {
          optimized.push(sortStage);
          sortStage = null;
        } else if (limitStage) {
          optimized.push(limitStage);
          limitStage = null;
        }
        optimized.push(stage);
      }
    }
    
    // Add remaining stages
    if (sortStage && limitStage) {
      optimized.push(sortStage, limitStage);
    } else if (sortStage) {
      optimized.push(sortStage);
    } else if (limitStage) {
      optimized.push(limitStage);
    }
    
    this.pipeline = optimized;
    return this;
  }
  
  // Add index hints for better performance
  addIndexHints(hints: Record<string, any>): this {
    const hintStages = Object.entries(hints).map(([collection, hint]) => ({
      $addFields: { [`__hint_${collection}`]: hint }
    }));
    
    this.pipeline.unshift(...hintStages);
    return this;
  }
  
  // Get optimized pipeline
  build(): any[] {
    return this.pipeline;
  }
}

// Enhanced model with caching and optimization
export class OptimizedModel<T extends Document> {
  private model: Model<T>;
  private config: Required<QueryOptimizationConfig>;
  private collectionName: string;
  
  constructor(model: Model<T>, config?: QueryOptimizationConfig) {
    this.model = model;
    this.config = { ...defaultConfig, ...config };
    this.collectionName = model.collection.name;
  }
  
  // Generate cache key for query
  private generateCacheKey(operation: string, query: any, options: any = {}): string {
    const keyData = {
      collection: this.collectionName,
      operation,
      query: JSON.stringify(query),
      options: JSON.stringify(options),
    };
    
    return `db:${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }
  
  // Execute query with optimization and caching
  private async executeWithOptimization<R>(
    operation: string,
    queryFn: () => Promise<R>,
    cacheKey?: string
  ): Promise<R> {
    const startTime = Date.now();
    
    // Try cache first if enabled
    if (this.config.cacheEnabled && cacheKey) {
      const cached = await cache.get(cacheKey);
      if (cached.hit) {
        const duration = Date.now() - startTime;
        
        if (this.config.enableQueryLogging) {
          logDatabaseQuery(this.collectionName, operation, duration, true, {
            cached: true,
          });
        }
        
        return cached.data as R;
      }
    }
    
    try {
      // Execute query
      const result = await queryFn();
      const duration = Date.now() - startTime;
      
      // Log performance
      if (this.config.enableQueryLogging) {
        logDatabaseQuery(this.collectionName, operation, duration, true, {
          cached: false,
        });
        
        if (duration > this.config.slowQueryThreshold) {
          logPerformance(`Slow query detected: ${this.collectionName}.${operation}`, duration);
        }
      }
      
      // Cache result if enabled
      if (this.config.cacheEnabled && cacheKey) {
        await cache.set(cacheKey, result, this.config.cacheTTL, {
          namespace: 'database',
          tags: [this.collectionName, operation],
        });
      }
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logDatabaseQuery(this.collectionName, operation, duration, false, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw error;
    }
  }
  
  // Optimized find operation
  async findOptimized(
    query: any,
    options: {
      select?: string | Record<string, any>;
      limit?: number;
      skip?: number;
      sort?: any;
      lean?: boolean;
      cache?: boolean;
    } = {}
  ): Promise<T[]> {
    const cacheKey = options.cache !== false && this.config.cacheEnabled
      ? this.generateCacheKey('find', query, options)
      : undefined;
    
    return this.executeWithOptimization(
      'find',
      () => {
        let mongoQuery = this.model.find(query);
        
        if (options.select) mongoQuery = mongoQuery.select(options.select);
        if (options.limit) mongoQuery = mongoQuery.limit(Math.min(options.limit, this.config.maxDocuments));
        if (options.skip) mongoQuery = mongoQuery.skip(options.skip);
        if (options.sort) mongoQuery = mongoQuery.sort(options.sort);
        if (options.lean !== false) mongoQuery = mongoQuery.lean();
        
        return mongoQuery.exec();
      },
      cacheKey
    );
  }
  
  // Optimized findOne operation
  async findOneOptimized(
    query: any,
    options: {
      select?: string | Record<string, any>;
      sort?: any;
      lean?: boolean;
      cache?: boolean;
    } = {}
  ): Promise<T | null> {
    const cacheKey = options.cache !== false && this.config.cacheEnabled
      ? this.generateCacheKey('findOne', query, options)
      : undefined;
    
    return this.executeWithOptimization(
      'findOne',
      () => {
        let mongoQuery = this.model.findOne(query);
        
        if (options.select) mongoQuery = mongoQuery.select(options.select);
        if (options.sort) mongoQuery = mongoQuery.sort(options.sort);
        if (options.lean !== false) mongoQuery = mongoQuery.lean();
        
        return mongoQuery.exec();
      },
      cacheKey
    );
  }
  
  // Optimized count operation
  async countOptimized(query: any, options: { cache?: boolean } = {}): Promise<number> {
    const cacheKey = options.cache !== false && this.config.cacheEnabled
      ? this.generateCacheKey('count', query)
      : undefined;
    
    return this.executeWithOptimization(
      'countDocuments',
      () => this.model.countDocuments(query),
      cacheKey
    );
  }
  
  // Optimized aggregation
  async aggregateOptimized(
    pipeline: any[],
    options: {
      cache?: boolean;
      optimize?: boolean;
      explain?: boolean;
    } = {}
  ): Promise<any[]> {
    let optimizedPipeline = pipeline;
    
    // Optimize pipeline if requested
    if (options.optimize !== false) {
      optimizedPipeline = new PipelineOptimizer(pipeline)
        .optimizeMatches()
        .optimizeSortLimit()
        .build();
    }
    
    const cacheKey = options.cache !== false && this.config.cacheEnabled
      ? this.generateCacheKey('aggregate', optimizedPipeline)
      : undefined;
    
    return this.executeWithOptimization(
      'aggregate',
      async () => {
        const aggregation = this.model.aggregate(optimizedPipeline);
        
        if (options.explain && this.config.enableExplain) {
          const explanation = await aggregation.explain();
          logPerformance(`Aggregation explanation for ${this.collectionName}`, 0, {
            explanation,
          });
        }
        
        return aggregation.exec();
      },
      cacheKey
    );
  }
  
  // Bulk operations with optimization
  async bulkWriteOptimized(
    operations: any[],
    options: {
      ordered?: boolean;
      bypassDocumentValidation?: boolean;
    } = {}
  ): Promise<any> {
    return this.executeWithOptimization(
      'bulkWrite',
      () => this.model.bulkWrite(operations, {
        ordered: options.ordered !== false,
        bypassDocumentValidation: options.bypassDocumentValidation,
      })
    );
  }
  
  // Paginated query with optimization
  async paginateOptimized(
    query: any,
    options: {
      page?: number;
      limit?: number;
      select?: string | Record<string, any>;
      sort?: any;
      lean?: boolean;
      cache?: boolean;
    } = {}
  ): Promise<{
    docs: T[];
    totalDocs: number;
    limit: number;
    page: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(options.limit || 10, this.config.maxDocuments);
    const skip = (page - 1) * limit;
    
    // Execute count and find in parallel
    const [docs, totalDocs] = await Promise.all([
      this.findOptimized(query, {
        ...options,
        limit,
        skip,
      }),
      this.countOptimized(query, { cache: options.cache }),
    ]);
    
    const totalPages = Math.ceil(totalDocs / limit);
    
    return {
      docs,
      totalDocs,
      limit,
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }
  
  // Clear cache for this model
  async clearCache(): Promise<void> {
    await cache.invalidateByTags([this.collectionName]);
  }
  
  // Get query execution stats
  async explainQuery(query: any, options: any = {}): Promise<any> {
    if (!this.config.enableExplain) {
      throw new Error('Query explanation is disabled');
    }
    
    const mongoQuery = this.model.find(query, null, options);
    return mongoQuery.explain('executionStats');
  }
}

// Index management utilities
export class IndexManager {
  private model: Model<any>;
  
  constructor(model: Model<any>) {
    this.model = model;
  }
  
  // Analyze query patterns and suggest indexes
  async suggestIndexes(queries: Array<{
    operation: string;
    query: any;
    sort?: any;
  }>): Promise<Array<{
    fields: Record<string, 1 | -1>;
    reason: string;
    queries: string[];
  }>> {
    const suggestions: Array<{
      fields: Record<string, 1 | -1>;
      reason: string;
      queries: string[];
    }> = [];
    
    // Analyze common query patterns
    const queryPatterns = new Map<string, string[]>();
    
    for (const { operation, query, sort } of queries) {
      // Extract query fields
      const queryFields = this.extractQueryFields(query);
      const sortFields = sort ? Object.keys(sort) : [];
      
      // Create index pattern
      const indexFields = [...queryFields, ...sortFields];
      const pattern = indexFields.join(',');
      
      if (!queryPatterns.has(pattern)) {
        queryPatterns.set(pattern, []);
      }
      queryPatterns.get(pattern)!.push(`${operation}: ${JSON.stringify(query)}`);
    }
    
    // Generate suggestions
    for (const [pattern, queryList] of queryPatterns.entries()) {
      const fields = pattern.split(',');
      const indexFields: Record<string, 1 | -1> = {};
      
      for (const field of fields) {
        if (field) {
          indexFields[field] = 1; // Default to ascending
        }
      }
      
      suggestions.push({
        fields: indexFields,
        reason: `Optimize queries on fields: ${fields.join(', ')}`,
        queries: queryList,
      });
    }
    
    return suggestions;
  }
  
  private extractQueryFields(query: any, prefix: string = ''): string[] {
    const fields: string[] = [];
    
    for (const [key, value] of Object.entries(query)) {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      
      if (key.startsWith('$')) {
        // Handle operators
        if (key === '$and' || key === '$or') {
          if (Array.isArray(value)) {
            for (const condition of value) {
              fields.push(...this.extractQueryFields(condition, prefix));
            }
          }
        }
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Nested object
        fields.push(...this.extractQueryFields(value, fieldName));
      } else {
        // Regular field
        fields.push(fieldName);
      }
    }
    
    return fields;
  }
  
  // Create indexes based on suggestions
  async createRecommendedIndexes(
    suggestions: Array<{
      fields: Record<string, 1 | -1>;
      reason: string;
    }>
  ): Promise<void> {
    for (const suggestion of suggestions) {
      try {
        await this.model.collection.createIndex(suggestion.fields);
        logPerformance(`Created index for ${this.model.collection.name}`, 0, {
          fields: suggestion.fields,
          reason: suggestion.reason,
        });
      } catch (error) {
        logError(error as Error, {
          component: 'Index Creation',
          collection: this.model.collection.name,
          fields: suggestion.fields,
        });
      }
    }
  }
  
  // List existing indexes
  async listIndexes(): Promise<any[]> {
    return this.model.collection.listIndexes().toArray();
  }
  
  // Drop unused indexes
  async dropUnusedIndexes(): Promise<void> {
    const stats = await this.model.db.collection(this.model.collection.name)
      .aggregate([{ $indexStats: {} }]).toArray();
    
    const unusedIndexes = stats
      .filter(stat => stat.accesses.ops === 0 && stat.name !== '_id_')
      .map(stat => stat.name);
    
    for (const indexName of unusedIndexes) {
      try {
        await this.model.collection.dropIndex(indexName);
        logPerformance(`Dropped unused index: ${indexName}`, 0, {
          collection: this.model.collection.name,
        });
      } catch (error) {
        logError(error as Error, {
          component: 'Index Cleanup',
          collection: this.model.collection.name,
          indexName,
        });
      }
    }
  }
}

// Connection optimization
export const optimizeConnection = (options?: {
  maxPoolSize?: number;
  minPoolSize?: number;
  maxIdleTimeMS?: number;
  serverSelectionTimeoutMS?: number;
  socketTimeoutMS?: number;
}): void => {
  const optimizedOptions = {
    maxPoolSize: 10,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    ...options,
  };
  
  mongoose.set('maxTimeMS', 30000); // Query timeout
  mongoose.set('bufferMaxEntries', 0); // Disable mongoose buffering
  mongoose.set('bufferCommands', false); // Disable mongoose buffering
};

// Export utility functions
export const createOptimizedModel = <T extends Document>(
  model: Model<T>,
  config?: QueryOptimizationConfig
): OptimizedModel<T> => {
  return new OptimizedModel(model, config);
};

export const createIndexManager = (model: Model<any>): IndexManager => {
  return new IndexManager(model);
};

