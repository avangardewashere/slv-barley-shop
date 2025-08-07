# Database Schema Migration Guide

## Overview

This guide covers the complete migration from the old bundle-based system to the new flexible product schema for the Salveo Barley Shop ecommerce platform.

## Migration Summary

### What's Changed

1. **Bundle Model Removed**: The separate `Bundle` model has been completely replaced
2. **Product Model Enhanced**: Now supports multiple product types including bundles, memberships, promotions, and accessories
3. **Order Model Added**: Comprehensive order tracking and management system
4. **Review Model Added**: Complete customer review and rating system
5. **Member Model Enhanced**: Extended with addresses, preferences, statistics, and activity tracking

### New Product Types

- **Single**: Traditional individual products
- **Bundle**: Product bundles with multiple items and discounts
- **Membership**: Subscription-based memberships with tiers and benefits
- **Promotion**: Time-limited promotional offers
- **Accessory**: Add-on or complementary products

## Pre-Migration Checklist

### 1. Environment Preparation

```bash
# Ensure you have backups
mongodump --db your-database-name --out ./backup-$(date +%Y%m%d)

# Check current data integrity
npm run db:verify

# Stop application servers
pm2 stop all
```

### 2. Dependencies Update

Update your package.json dependencies if needed:

```json
{
  "dependencies": {
    "mongoose": "^7.0.0",
    "@types/mongoose": "^5.11.97"
  }
}
```

### 3. Environment Variables

Ensure these variables are set:

```env
MONGODB_URI=mongodb://localhost:27017/your-database
MIGRATION_DRY_RUN=false
MIGRATION_BATCH_SIZE=100
MIGRATION_LOG_LEVEL=info
```

## Migration Process

### Step 1: Dry Run Migration

Always start with a dry run to preview changes:

```typescript
import { MigrationUtils } from './src/migrations/data-migration';

// Run dry migration
const stats = await MigrationUtils.dryRunMigration();
console.log('Migration preview:', stats);
```

### Step 2: Execute Migration

```typescript
import { MigrationUtils } from './src/migrations/data-migration';

// Execute full migration
try {
  const stats = await MigrationUtils.runMigration();
  console.log('Migration completed:', stats);
} catch (error) {
  console.error('Migration failed:', error);
  // Consider rollback if needed
}
```

### Step 3: Verify Migration

```typescript
import { MigrationUtils } from './src/migrations/data-migration';

// Verify migration integrity
const verification = await MigrationUtils.verifyMigration();
if (!verification.isValid) {
  console.error('Migration issues found:', verification.issues);
}
```

### Step 4: Seed Sample Data (Optional)

```typescript
import { SeedUtils } from './src/seeds/seed-data';

// Seed sample data for testing
await SeedUtils.seedDatabase();
```

## Schema Changes Details

### Product Model Changes

#### Before (Old Product + Bundle)
```typescript
// Product.ts
interface IProduct {
  name: string;
  description: string;
  category: string;
  variants: IProductVariant[];
  // ... basic fields
}

// Bundle.ts (REMOVED)
interface IBundle {
  name: string;
  items: IBundleItem[];
  bundlePrice: number;
  // ... bundle-specific fields
}
```

#### After (Enhanced Product)
```typescript
interface IProduct {
  // Core fields remain the same
  name: string;
  description: string;
  
  // NEW: Product type system
  productType: ProductType; // single, bundle, membership, promotion, accessory
  status: ProductStatus;
  
  // NEW: Enhanced fields
  shipping: IShippingInfo;
  bundleConfig?: IBundleConfig;
  membershipConfig?: IMembershipConfig;
  promotionConfig?: IPromotionConfig;
  reviewStats: IReviewStats;
  
  // NEW: Analytics
  viewCount: number;
  purchaseCount: number;
  wishlistCount: number;
}
```

### Member Model Changes

#### Before
```typescript
interface IMember {
  email: string;
  name: string;
  address?: IAddress; // Single address
  totalOrders: number;
  totalSpent: number;
  loyaltyPoints: number;
}
```

#### After
```typescript
interface IMember {
  // Enhanced personal info
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  
  // Multiple addresses support
  addresses: IMemberAddress[];
  
  // Enhanced statistics
  stats: IMemberStats;
  activity: IMemberActivity;
  
  // Enhanced preferences
  preferences: IMemberPreferences;
  
  // Security and verification
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  
  // Shopping features
  wishlist: ObjectId[];
  cartItems: ICartItem[];
}
```

## Data Transformation Examples

### Bundle to Product Conversion

```typescript
// Old Bundle
const oldBundle = {
  name: "Wellness Bundle",
  items: [
    { productId: "prod1", variantName: "100g", quantity: 1 },
    { productId: "prod2", variantName: "200g", quantity: 1 }
  ],
  originalPrice: 2000,
  bundlePrice: 1500,
  discount: 25,
  discountType: "percentage"
};

// New Product (Bundle Type)
const newProduct = {
  name: "Wellness Bundle",
  productType: ProductType.BUNDLE,
  variants: [{
    name: "Complete Bundle",
    price: 1500,
    compareAtPrice: 2000,
    sku: "BUNDLE-WB-001"
  }],
  bundleConfig: {
    items: [
      { productId: "prod1", variantSku: "SKU1", quantity: 1 },
      { productId: "prod2", variantSku: "SKU2", quantity: 1 }
    ],
    totalSavings: 500,
    savingsPercentage: 25
  }
};
```

### Member Address Migration

```typescript
// Old Member
const oldMember = {
  email: "user@example.com",
  address: {
    street: "123 Main St",
    city: "Manila",
    zipCode: "1000"
  }
};

// New Member
const newMember = {
  email: "user@example.com",
  addresses: [{
    type: "shipping",
    firstName: "John",
    lastName: "Doe",
    street: "123 Main St",
    city: "Manila",
    zipCode: "1000",
    country: "Philippines",
    isDefault: true
  }],
  stats: {
    totalOrders: 0,
    totalSpent: 0,
    loyaltyPoints: 0
  },
  preferences: {
    notifications: {
      email: true,
      sms: false,
      promotions: true
    }
  }
};
```

## API Changes Required

### Product API Updates

```typescript
// Before: Separate endpoints
GET /api/products
GET /api/bundles

// After: Unified endpoint with filtering
GET /api/products?type=single
GET /api/products?type=bundle
GET /api/products?type=membership
```

### Order API Updates

```typescript
// New comprehensive order API
POST /api/orders
GET /api/orders/:id
PUT /api/orders/:id/status
GET /api/orders/customer/:customerId
```

### Review API (New)

```typescript
// New review endpoints
POST /api/reviews
GET /api/reviews/product/:productId
PUT /api/reviews/:id/vote
POST /api/reviews/:id/response
```

## Frontend Updates Required

### Component Updates

1. **ProductCard Component**
   - Add support for different product types
   - Show bundle savings and items
   - Display membership benefits
   - Show promotion validity

2. **ProductDetail Component**
   - Bundle item display
   - Membership feature list
   - Review section integration
   - Related products carousel

3. **Cart Component**
   - Handle bundle items properly
   - Show individual bundle components
   - Membership subscription flow

### State Management Updates

```typescript
// Update product state structure
interface ProductState {
  products: Product[];
  bundles: Product[]; // Now filtered products
  memberships: Product[];
  promotions: Product[];
}

// New order state
interface OrderState {
  orders: Order[];
  currentOrder?: Order;
  orderHistory: Order[];
}

// New review state
interface ReviewState {
  reviews: Review[];
  productReviews: { [productId: string]: Review[] };
}
```

## Testing Strategy

### 1. Unit Tests

```typescript
// Test product type validation
describe('Product Model', () => {
  it('should validate bundle configuration for bundle products', () => {
    const bundleProduct = new Product({
      productType: ProductType.BUNDLE,
      bundleConfig: {
        items: [/* bundle items */],
        totalSavings: 500
      }
    });
    expect(bundleProduct.validateSync()).toBeFalsy();
  });
});
```

### 2. Integration Tests

```typescript
// Test migration process
describe('Migration Process', () => {
  it('should convert bundles to products correctly', async () => {
    await seedOldBundles();
    const stats = await MigrationUtils.runMigration();
    expect(stats.bundlesConverted).toBeGreaterThan(0);
  });
});
```

### 3. Performance Tests

```typescript
// Test query performance
describe('Product Queries', () => {
  it('should perform well with large product datasets', async () => {
    const startTime = Date.now();
    const products = await Product.findByCategory('Supplements');
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(100); // Under 100ms
  });
});
```

## Rollback Plan

If migration fails or issues are discovered:

### 1. Immediate Rollback

```typescript
import { MigrationRollback } from './src/migrations/data-migration';

// Execute rollback
const rollback = new MigrationRollback();
await rollback.executeRollback();
```

### 2. Manual Rollback

```bash
# Restore from backup
mongorestore --db your-database-name ./backup-20240101/

# Restart services
pm2 start all
```

## Monitoring and Alerts

### Performance Metrics

- Query response times
- Database connection pool usage
- Memory consumption
- Error rates

### Business Metrics

- Order conversion rates
- Product view/purchase ratios
- Customer engagement with reviews
- Bundle vs individual product performance

## Post-Migration Tasks

### 1. Update Documentation

- [ ] API documentation
- [ ] Frontend component docs
- [ ] Database schema docs
- [ ] Admin user guides

### 2. Training

- [ ] Train admin users on new product management
- [ ] Update customer support scripts
- [ ] Brief development team on new schema

### 3. Monitoring Setup

- [ ] Set up performance monitoring
- [ ] Configure error tracking
- [ ] Implement business metrics dashboards

## Troubleshooting

### Common Issues

**Issue: Migration times out**
```typescript
// Solution: Increase batch size and add progress logging
MIGRATION_CONFIG.batchSize = 50; // Reduce batch size
MIGRATION_CONFIG.logLevel = 'debug'; // Increase logging
```

**Issue: Memory issues during migration**
```typescript
// Solution: Process in smaller chunks
for await (const batch of processBatches(data, 25)) {
  await processBatch(batch);
  // Force garbage collection
  if (global.gc) global.gc();
}
```

**Issue: Validation errors on new schema**
```typescript
// Solution: Add data cleaning step
const cleanData = await cleanAndValidateData(oldData);
const newDocument = new Model(cleanData);
```

## Success Criteria

Migration is considered successful when:

- [ ] All bundles converted to bundle-type products
- [ ] No data loss during migration
- [ ] All existing functionality works
- [ ] New features are accessible
- [ ] Performance is equal or better
- [ ] All tests pass
- [ ] No critical errors in logs

## Support and Resources

- **Documentation**: `/docs/` directory
- **Migration Scripts**: `/src/migrations/`
- **Seed Data**: `/src/seeds/`
- **Test Suite**: `/tests/migration/`
- **Issue Tracking**: GitHub Issues
- **Team Contact**: development@salveoorganics.com

## Next Steps

After successful migration:

1. **Phase 2 Features**
   - Advanced bundle builder UI
   - Membership tier automation
   - Promotional campaign management
   - Advanced review analytics

2. **Optimization**
   - Database query optimization
   - Caching implementation
   - Search enhancement
   - Mobile app integration

3. **Analytics Enhancement**
   - Customer behavior tracking
   - Product performance analytics
   - Revenue optimization tools
   - Predictive analytics

---

**Note**: This migration is a significant structural change. Always test thoroughly in a staging environment before applying to production.