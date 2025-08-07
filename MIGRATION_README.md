# Database Migration Guide

This guide will help you migrate from the old Bundle-based system to the new flexible Product schema.

## Overview

The migration converts:
- **Old System**: Separate Product and Bundle models
- **New System**: Unified Product model with ProductType enum (single, bundle, membership, promotion, accessory)

## Pre-Migration Checklist

1. **Backup Your Database** ⚠️
   ```bash
   mongodump --uri="your-mongodb-connection-string" --out backup-$(date +%Y%m%d)
   ```

2. **Stop Your Application**
   ```bash
   # Stop your development server
   npm run dev # Press Ctrl+C
   ```

3. **Install Dependencies** (if needed)
   ```bash
   npm install mongoose dotenv
   ```

## Migration Process

### Step 1: Dry Run (Recommended)
First, run a dry run to see what will be migrated:

```bash
cd /c/Users/GE/Documents/P/Personal/slv-barley-shop
node scripts/migrate-database.js --dry-run
```

This will show you:
- How many bundles will be converted
- Preview of the new product structure
- Any potential issues

### Step 2: Perform Migration
If the dry run looks good, perform the actual migration:

```bash
node scripts/migrate-database.js
```

### Step 3: Populate Product Names (Optional)
If bundle items reference other products, populate their names:

```bash
node scripts/migrate-database.js --populate-names
```

### Step 4: Verify Migration
Check your database to ensure the migration was successful:

1. **MongoDB Compass**: Connect and check the `products` collection
2. **Admin Dashboard**: Test the product management interface
3. **API Testing**: Test the `/api/products?productType=bundle` endpoint

## What Gets Migrated

### Bundle → Product Conversion

| Old Bundle Field | New Product Field | Notes |
|-----------------|-------------------|-------|
| `name` | `name` | Direct copy |
| `name` | `slug` | Auto-generated URL-friendly version |
| `description` | `description.short` & `description.long` | Split for better UX |
| `price` | `pricing.regularPrice` | Direct copy |
| `discount` | `pricing.salePrice` & `pricing.discountPercentage` | Calculated |
| `products` | `bundleDetails.items` | Restructured with more metadata |
| `image` | `images[0]` | Converted to image array |
| `isActive` | `isActive` | Direct copy |

### New Fields Added
- `productType: 'bundle'`
- `brand: 'Salveo'`
- `category: ['Bundle', 'Health Supplements']`
- SEO metadata
- Enhanced availability tracking
- Review system preparation

## Post-Migration Tasks

### 1. Update Frontend Components
The admin dashboard components need updates to handle the new schema:

```typescript
// Old: Separate bundle management
<BundleManagement />

// New: Unified product management with type filtering
<ProductManagement productTypes={['single', 'bundle', 'membership']} />
```

### 2. Update API Calls
```typescript
// Old bundle API calls
fetch('/api/bundles')

// New product API calls with type filtering
fetch('/api/products?productType=bundle')
```

### 3. Test Key Functionality
- [ ] Product listing shows both regular products and bundles
- [ ] Bundle products display correct pricing and items
- [ ] Product search works across all types
- [ ] Admin can create/edit/delete products of all types
- [ ] Bundle configuration is properly saved and retrieved

## Rollback Procedure

If you need to rollback the migration:

### 1. Restore Database Backup
```bash
mongorestore --uri="your-mongodb-connection-string" --drop backup-YYYYMMDD
```

### 2. Revert Code Changes
```bash
git checkout HEAD~1  # Go back one commit
# or restore the old Bundle model files
```

## Troubleshooting

### Common Issues

**Migration Script Won't Run**
```bash
# Make sure you're in the correct directory
cd /c/Users/GE/Documents/P/Personal/slv-barley-shop

# Check if .env.local exists and has MONGODB_URI
ls -la .env.local
```

**"Product with slug already exists"**
- This is normal for subsequent runs
- The script skips existing products to avoid duplicates
- If you need to re-migrate, delete the products first

**Bundle Items Show "Product [ID]"**
- Run the populate names command:
  ```bash
  node scripts/migrate-database.js --populate-names
  ```

**Frontend Shows Errors**
- Update your components to use the new API structure
- Check browser console for specific error messages
- Verify API responses match expected format

### Getting Help

If you encounter issues:

1. **Check the Migration Log**: The script provides detailed output
2. **Verify Database State**: Use MongoDB Compass to inspect data
3. **Test API Endpoints**: Use Postman or browser to test endpoints
4. **Check Application Logs**: Look for errors in your Next.js console

## Expected Results

After successful migration:

✅ **Database Structure**
- Old bundles are converted to products with `productType: 'bundle'`
- All bundle data is preserved in the new structure
- New products can be created with any supported type

✅ **API Functionality**
- `/api/products` returns all product types
- `/api/products?productType=bundle` returns only bundles
- Old `/api/bundles` endpoints still work (backward compatibility)

✅ **Admin Dashboard**
- Product management shows unified interface
- Can filter products by type
- Bundle configuration is preserved and editable

## Next Steps

After migration, consider:

1. **Implement Customer Storefront**: Use the new flexible product system
2. **Add Order Management**: Implement the new Order model
3. **Enable Reviews**: Set up the Review system
4. **Enhance Member Features**: Use the updated Member model

The new schema supports future growth and provides a solid foundation for your ecommerce platform expansion.