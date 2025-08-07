import mongoose from 'mongoose';
import { ProductType, ProductStatus } from '../models/Product';
import { OrderStatus, PaymentStatus, PaymentMethod, ShippingMethod } from '../models/Order';

// Migration configuration
const MIGRATION_CONFIG = {
  batchSize: 100,
  dryRun: false, // Set to true for testing
  backupCollections: true,
  logLevel: 'info' // 'debug', 'info', 'warn', 'error'
};

// Logger utility
class Logger {
  static log(level: string, message: string, data?: any) {
    if (this.shouldLog(level)) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
      if (data && MIGRATION_CONFIG.logLevel === 'debug') {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  }

  private static shouldLog(level: string): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[MIGRATION_CONFIG.logLevel as keyof typeof levels] || 1;
    const messageLevel = levels[level as keyof typeof levels] || 1;
    return messageLevel >= currentLevel;
  }
}

// Migration Statistics
interface MigrationStats {
  bundlesProcessed: number;
  bundlesConverted: number;
  bundlesSkipped: number;
  ordersProcessed: number;
  ordersConverted: number;
  ordersSkipped: number;
  membersUpdated: number;
  errors: string[];
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

/**
 * Main Migration Class
 * Handles the migration from Bundle model to flexible Product model
 */
class DataMigration {
  private stats: MigrationStats;
  
  constructor() {
    this.stats = {
      bundlesProcessed: 0,
      bundlesConverted: 0,
      bundlesSkipped: 0,
      ordersProcessed: 0,
      ordersConverted: 0,
      ordersSkipped: 0,
      membersUpdated: 0,
      errors: [],
      startTime: new Date()
    };
  }

  /**
   * Execute complete data migration
   */
  async executeMigration(): Promise<MigrationStats> {
    Logger.log('info', 'Starting data migration process...');
    
    try {
      // Step 1: Backup existing data
      if (MIGRATION_CONFIG.backupCollections) {
        await this.backupCollections();
      }

      // Step 2: Migrate bundles to products
      await this.migrateBundlesToProducts();

      // Step 3: Update member data structure
      await this.updateMemberStructure();

      // Step 4: Migrate existing orders (if any reference bundles)
      await this.migrateOrderReferences();

      // Step 5: Update product review statistics
      await this.updateProductReviewStats();

      // Step 6: Clean up old bundle collection
      if (!MIGRATION_CONFIG.dryRun) {
        await this.cleanupBundleCollection();
      }

      this.stats.endTime = new Date();
      this.stats.duration = this.stats.endTime.getTime() - this.stats.startTime.getTime();

      Logger.log('info', 'Migration completed successfully', this.stats);
      return this.stats;

    } catch (error) {
      Logger.log('error', 'Migration failed', error);
      this.stats.errors.push(`Migration failed: ${error}`);
      throw error;
    }
  }

  /**
   * Backup existing collections
   */
  private async backupCollections(): Promise<void> {
    Logger.log('info', 'Creating backups of existing collections...');
    
    const collections = ['bundles', 'products', 'members'];
    const backupSuffix = `_backup_${Date.now()}`;

    for (const collection of collections) {
      try {
        const sourceCollection = mongoose.connection.db.collection(collection);
        const backupCollection = mongoose.connection.db.collection(`${collection}${backupSuffix}`);
        
        const cursor = sourceCollection.find({});
        const documents = await cursor.toArray();
        
        if (documents.length > 0) {
          await backupCollection.insertMany(documents);
          Logger.log('info', `Backed up ${documents.length} documents from ${collection}`);
        }
      } catch (error) {
        Logger.log('warn', `Failed to backup ${collection}: ${error}`);
      }
    }
  }

  /**
   * Migrate bundles to products with bundle type
   */
  private async migrateBundlesToProducts(): Promise<void> {
    Logger.log('info', 'Starting bundle to product migration...');

    try {
      const Bundle = mongoose.model('Bundle');
      const Product = mongoose.model('Product');

      const totalBundles = await Bundle.countDocuments();
      Logger.log('info', `Found ${totalBundles} bundles to migrate`);

      let processed = 0;
      const cursor = Bundle.find({}).cursor();

      for (let bundle = await cursor.next(); bundle != null; bundle = await cursor.next()) {
        this.stats.bundlesProcessed++;
        processed++;

        try {
          // Convert bundle to product format
          const productData = await this.convertBundleToProduct(bundle);

          if (MIGRATION_CONFIG.dryRun) {
            Logger.log('debug', `[DRY RUN] Would create product from bundle: ${bundle.name}`);
            this.stats.bundlesConverted++;
          } else {
            // Check if product already exists
            const existingProduct = await Product.findOne({ 
              name: bundle.name,
              productType: ProductType.BUNDLE 
            });

            if (!existingProduct) {
              await Product.create(productData);
              this.stats.bundlesConverted++;
              Logger.log('debug', `Converted bundle to product: ${bundle.name}`);
            } else {
              this.stats.bundlesSkipped++;
              Logger.log('debug', `Skipped existing bundle product: ${bundle.name}`);
            }
          }

          // Log progress every 10 items
          if (processed % 10 === 0) {
            Logger.log('info', `Bundle migration progress: ${processed}/${totalBundles}`);
          }

        } catch (error) {
          Logger.log('error', `Failed to convert bundle ${bundle._id}: ${error}`);
          this.stats.errors.push(`Bundle ${bundle._id}: ${error}`);
        }
      }

      Logger.log('info', `Bundle migration completed. Converted: ${this.stats.bundlesConverted}, Skipped: ${this.stats.bundlesSkipped}`);

    } catch (error) {
      Logger.log('error', `Bundle migration failed: ${error}`);
      throw error;
    }
  }

  /**
   * Convert bundle document to product document
   */
  private async convertBundleToProduct(bundle: any): Promise<any> {
    // Get product information for bundle items
    const Product = mongoose.model('Product');
    const bundleItems = [];
    let totalWeight = 0;
    let maxDimensions = { length: 0, width: 0, height: 0 };

    for (const item of bundle.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        // Find the specific variant
        const variant = product.variants.find((v: any) => v.name === item.variantName);
        if (variant) {
          bundleItems.push({
            productId: item.productId,
            variantSku: variant.sku,
            quantity: item.quantity,
            discountPercentage: 0 // Can be calculated based on bundle discount
          });

          // Calculate shipping info
          if (variant.weight) {
            totalWeight += variant.weight * item.quantity;
          }
          if (variant.dimensions) {
            maxDimensions.length = Math.max(maxDimensions.length, variant.dimensions.length || 0);
            maxDimensions.width = Math.max(maxDimensions.width, variant.dimensions.width || 0);
            maxDimensions.height = Math.max(maxDimensions.height, variant.dimensions.height || 0);
          }
        }
      }
    }

    // Create product data
    return {
      name: bundle.name,
      description: bundle.description,
      shortDescription: bundle.shortDescription,
      productType: ProductType.BUNDLE,
      status: bundle.isActive ? ProductStatus.ACTIVE : ProductStatus.INACTIVE,
      category: 'Supplements', // Default category, can be updated later
      brand: 'Salveo Organics',
      images: bundle.images,
      variants: [{
        name: 'Default Bundle',
        price: bundle.bundlePrice,
        compareAtPrice: bundle.originalPrice,
        sku: `BUNDLE-${bundle._id.toString().substr(-6).toUpperCase()}`,
        inventory: bundle.inventory,
        weight: totalWeight,
        dimensions: maxDimensions,
        barcode: '',
        isDefault: true,
        attributes: []
      }],
      tags: bundle.tags || [],
      isActive: bundle.isActive,
      isFeatured: bundle.isFeatured,
      seoTitle: bundle.seoTitle,
      seoDescription: bundle.seoDescription,
      benefits: bundle.benefits,
      shipping: {
        weight: totalWeight || 1,
        dimensions: {
          length: maxDimensions.length || 20,
          width: maxDimensions.width || 15,
          height: maxDimensions.height || 10
        },
        fragile: false,
        requiresSpecialHandling: false,
        shippingClass: 'standard',
        restrictions: []
      },
      bundleConfig: {
        items: bundleItems,
        totalSavings: bundle.originalPrice - bundle.bundlePrice,
        savingsPercentage: bundle.discount
      },
      reviewStats: {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        lastUpdated: new Date()
      },
      lowStockThreshold: 10,
      trackInventory: true,
      allowBackorder: false,
      basePriceRange: {
        min: bundle.bundlePrice,
        max: bundle.bundlePrice
      },
      viewCount: 0,
      purchaseCount: 0,
      wishlistCount: 0
    };
  }

  /**
   * Update member data structure to new enhanced format
   */
  private async updateMemberStructure(): Promise<void> {
    Logger.log('info', 'Updating member data structure...');

    try {
      const Member = mongoose.model('Member');
      const totalMembers = await Member.countDocuments();
      Logger.log('info', `Found ${totalMembers} members to update`);

      const cursor = Member.find({}).cursor();
      let processed = 0;

      for (let member = await cursor.next(); member != null; member = await cursor.next()) {
        processed++;

        try {
          const updateData = this.convertMemberStructure(member);

          if (MIGRATION_CONFIG.dryRun) {
            Logger.log('debug', `[DRY RUN] Would update member: ${member.email}`);
          } else {
            await Member.updateOne({ _id: member._id }, { $set: updateData });
            this.stats.membersUpdated++;
          }

          if (processed % 50 === 0) {
            Logger.log('info', `Member update progress: ${processed}/${totalMembers}`);
          }

        } catch (error) {
          Logger.log('error', `Failed to update member ${member._id}: ${error}`);
          this.stats.errors.push(`Member ${member._id}: ${error}`);
        }
      }

      Logger.log('info', `Member structure update completed. Updated: ${this.stats.membersUpdated} members`);

    } catch (error) {
      Logger.log('error', `Member structure update failed: ${error}`);
      throw error;
    }
  }

  /**
   * Convert old member structure to new enhanced structure
   */
  private convertMemberStructure(member: any): any {
    const updateData: any = {};

    // Convert single address to addresses array
    if (member.address && !member.addresses) {
      updateData.addresses = [{
        type: 'shipping',
        label: 'Default Address',
        firstName: member.name.split(' ')[0] || member.name,
        lastName: member.name.split(' ').slice(1).join(' ') || '',
        street: member.address.street,
        city: member.address.city,
        state: member.address.state,
        zipCode: member.address.zipCode,
        country: member.address.country || 'Philippines',
        phone: member.phone,
        isDefault: true
      }];
    }

    // Initialize stats if not exists
    if (!member.stats) {
      updateData.stats = {
        totalOrders: member.totalOrders || 0,
        totalSpent: member.totalSpent || 0,
        averageOrderValue: member.totalOrders > 0 ? (member.totalSpent / member.totalOrders) : 0,
        totalReviews: 0,
        averageRating: 0,
        loyaltyPoints: member.loyaltyPoints || 0,
        referralCount: 0,
        wishlistItems: 0,
        lastOrderDate: member.lastOrderDate,
        lastLoginDate: new Date(),
        accountValue: (member.totalSpent || 0) * 0.1
      };
    }

    // Initialize activity if not exists
    if (!member.activity) {
      updateData.activity = {
        loginCount: 1,
        pageViews: 0,
        searchCount: 0,
        cartAbandonments: 0,
        supportTickets: 0,
        referralsSent: 0,
        referralsSuccessful: 0
      };
    }

    // Initialize preferences if not exists or update structure
    if (!member.preferences || !member.preferences.notifications?.email) {
      updateData.preferences = {
        categories: member.preferences?.categories || [],
        brands: member.preferences?.brands || [],
        priceRange: {
          min: 0,
          max: 100000
        },
        notifications: {
          email: member.preferences?.notifications?.email ?? true,
          sms: member.preferences?.notifications?.sms ?? false,
          push: true,
          promotions: member.preferences?.notifications?.promotions ?? true,
          orderUpdates: true,
          reviewRequests: true,
          restock: false
        },
        communication: {
          language: 'en',
          timezone: 'Asia/Manila',
          currency: 'PHP'
        },
        privacy: {
          shareReviews: true,
          shareWishlist: false,
          marketingEmails: true,
          dataCollection: true
        }
      };
    }

    // Initialize verification flags
    updateData.isEmailVerified = false;
    updateData.isPhoneVerified = false;
    updateData.twoFactorEnabled = false;
    updateData.isBanned = false;

    // Initialize empty arrays
    updateData.wishlist = [];
    updateData.cartItems = [];

    // Generate referral code if not exists
    if (!member.referralCode) {
      updateData.referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    // Set last active time
    updateData.lastActiveAt = new Date();

    return updateData;
  }

  /**
   * Migrate order references from bundles to products
   */
  private async migrateOrderReferences(): Promise<void> {
    Logger.log('info', 'Migrating order references...');

    // This is a placeholder for order migration
    // Since we don't have existing orders in the current schema,
    // this would be implemented if there were orders referencing bundles
    Logger.log('info', 'No order references to migrate in current schema');
  }

  /**
   * Update product review statistics
   */
  private async updateProductReviewStats(): Promise<void> {
    Logger.log('info', 'Updating product review statistics...');

    try {
      const Product = mongoose.model('Product');
      const Review = mongoose.model('Review');

      const products = await Product.find({});
      
      for (const product of products) {
        const reviews = await Review.find({ 
          productId: product._id,
          status: 'approved'
        });

        if (reviews.length > 0) {
          const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
          const averageRating = totalRating / reviews.length;

          const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
          reviews.forEach(review => {
            ratingDistribution[review.rating as keyof typeof ratingDistribution]++;
          });

          const updateData = {
            'reviewStats.averageRating': Math.round(averageRating * 100) / 100,
            'reviewStats.totalReviews': reviews.length,
            'reviewStats.ratingDistribution': ratingDistribution,
            'reviewStats.lastUpdated': new Date()
          };

          if (!MIGRATION_CONFIG.dryRun) {
            await Product.updateOne({ _id: product._id }, { $set: updateData });
          }
        }
      }

      Logger.log('info', 'Product review statistics updated');

    } catch (error) {
      Logger.log('error', `Failed to update product review stats: ${error}`);
    }
  }

  /**
   * Clean up the old bundle collection
   */
  private async cleanupBundleCollection(): Promise<void> {
    Logger.log('info', 'Cleaning up bundle collection...');

    try {
      const result = await mongoose.connection.db.collection('bundles').drop();
      Logger.log('info', 'Bundle collection dropped successfully');
    } catch (error) {
      Logger.log('warn', `Failed to drop bundle collection: ${error}`);
    }
  }
}

/**
 * Rollback Migration Class
 * Handles rollback of migration if needed
 */
class MigrationRollback {
  
  /**
   * Rollback the migration
   */
  async executeRollback(): Promise<void> {
    Logger.log('info', 'Starting migration rollback...');

    try {
      // Find the most recent backup
      const backupCollections = await this.findBackupCollections();
      
      if (backupCollections.length === 0) {
        throw new Error('No backup collections found for rollback');
      }

      // Restore from backups
      await this.restoreFromBackups(backupCollections);

      Logger.log('info', 'Migration rollback completed successfully');

    } catch (error) {
      Logger.log('error', `Migration rollback failed: ${error}`);
      throw error;
    }
  }

  private async findBackupCollections(): Promise<string[]> {
    const collections = await mongoose.connection.db.listCollections().toArray();
    return collections
      .map(col => col.name)
      .filter(name => name.includes('_backup_'))
      .sort()
      .reverse(); // Most recent first
  }

  private async restoreFromBackups(backupCollections: string[]): Promise<void> {
    for (const backupCollection of backupCollections) {
      const originalName = backupCollection.split('_backup_')[0];
      
      try {
        // Drop current collection
        await mongoose.connection.db.collection(originalName).drop();
        
        // Restore from backup
        const backup = mongoose.connection.db.collection(backupCollection);
        const original = mongoose.connection.db.collection(originalName);
        
        const documents = await backup.find({}).toArray();
        if (documents.length > 0) {
          await original.insertMany(documents);
        }
        
        Logger.log('info', `Restored ${originalName} from backup with ${documents.length} documents`);
        
      } catch (error) {
        Logger.log('error', `Failed to restore ${originalName}: ${error}`);
      }
    }
  }
}

/**
 * Migration Verification Class
 * Verifies the integrity of the migration
 */
class MigrationVerification {
  
  async verifyMigration(): Promise<{ isValid: boolean; issues: string[] }> {
    Logger.log('info', 'Starting migration verification...');

    const issues: string[] = [];

    try {
      // Verify products
      await this.verifyProducts(issues);
      
      // Verify members
      await this.verifyMembers(issues);
      
      // Verify indexes
      await this.verifyIndexes(issues);

      const isValid = issues.length === 0;
      Logger.log('info', `Migration verification completed. Valid: ${isValid}, Issues: ${issues.length}`);

      return { isValid, issues };

    } catch (error) {
      Logger.log('error', `Migration verification failed: ${error}`);
      issues.push(`Verification error: ${error}`);
      return { isValid: false, issues };
    }
  }

  private async verifyProducts(issues: string[]): Promise<void> {
    const Product = mongoose.model('Product');
    
    // Check for products without required fields
    const invalidProducts = await Product.find({
      $or: [
        { name: { $exists: false } },
        { productType: { $exists: false } },
        { 'variants.0': { $exists: false } }
      ]
    });

    if (invalidProducts.length > 0) {
      issues.push(`Found ${invalidProducts.length} products with missing required fields`);
    }

    // Check bundle products have bundle config
    const bundleProducts = await Product.find({ productType: ProductType.BUNDLE });
    const bundlesWithoutConfig = bundleProducts.filter(p => !p.bundleConfig);
    
    if (bundlesWithoutConfig.length > 0) {
      issues.push(`Found ${bundlesWithoutConfig.length} bundle products without bundle config`);
    }
  }

  private async verifyMembers(issues: string[]): Promise<void> {
    const Member = mongoose.model('Member');
    
    // Check for members without required fields
    const invalidMembers = await Member.find({
      $or: [
        { stats: { $exists: false } },
        { activity: { $exists: false } },
        { preferences: { $exists: false } }
      ]
    });

    if (invalidMembers.length > 0) {
      issues.push(`Found ${invalidMembers.length} members with missing enhanced fields`);
    }
  }

  private async verifyIndexes(issues: string[]): Promise<void> {
    const collections = ['products', 'members', 'orders', 'reviews'];
    
    for (const collectionName of collections) {
      try {
        const collection = mongoose.connection.db.collection(collectionName);
        const indexes = await collection.listIndexes().toArray();
        
        if (indexes.length < 3) { // Should have at least _id + 2 custom indexes
          issues.push(`Collection ${collectionName} has insufficient indexes`);
        }
      } catch (error) {
        // Collection might not exist yet
        Logger.log('debug', `Could not verify indexes for ${collectionName}: ${error}`);
      }
    }
  }
}

// Export classes and utilities
export {
  DataMigration,
  MigrationRollback,
  MigrationVerification,
  MIGRATION_CONFIG,
  Logger
};

// Example usage functions
export const MigrationUtils = {
  // Execute full migration
  async runMigration(): Promise<MigrationStats> {
    const migration = new DataMigration();
    return await migration.executeMigration();
  },

  // Run migration rollback
  async rollbackMigration(): Promise<void> {
    const rollback = new MigrationRollback();
    return await rollback.executeRollback();
  },

  // Verify migration
  async verifyMigration(): Promise<{ isValid: boolean; issues: string[] }> {
    const verification = new MigrationVerification();
    return await verification.verifyMigration();
  },

  // Run dry run migration
  async dryRunMigration(): Promise<MigrationStats> {
    const originalDryRun = MIGRATION_CONFIG.dryRun;
    MIGRATION_CONFIG.dryRun = true;
    
    try {
      const migration = new DataMigration();
      const result = await migration.executeMigration();
      return result;
    } finally {
      MIGRATION_CONFIG.dryRun = originalDryRun;
    }
  }
};