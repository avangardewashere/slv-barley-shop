#!/usr/bin/env node

/**
 * Database Migration Script
 * Migrates existing Bundle data to the new flexible Product schema
 * Run with: node scripts/migrate-database.js [--dry-run]
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Define old Bundle schema for migration
const BundleSchema = new mongoose.Schema({
  name: String,
  description: String,
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: Number,
    variantName: String
  }],
  price: Number,
  discount: Number,
  image: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}, { collection: 'bundles' });

const OldBundle = mongoose.model('OldBundle', BundleSchema);

// Define new Product schema (simplified for migration)
const ProductSchema = new mongoose.Schema({
  name: String,
  slug: String,
  brand: { type: String, default: 'Salveo' },
  category: [String],
  productType: {
    type: String,
    enum: ['single', 'bundle', 'membership', 'promotion', 'accessory'],
    required: true
  },
  pricing: {
    currency: { type: String, default: 'PHP' },
    regularPrice: Number,
    salePrice: Number,
    discountPercentage: Number
  },
  bundleDetails: {
    items: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      productName: String,
      quantity: Number,
      variantName: String
    }],
    totalValue: Number,
    savings: Number
  },
  availability: {
    inStock: { type: Boolean, default: true },
    stockLevel: Number
  },
  description: {
    short: String,
    long: String
  },
  images: [{
    url: String,
    alt: String,
    isPrimary: Boolean
  }],
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  seo: {
    metaTitle: String,
    metaDescription: String
  }
}, { timestamps: true });

const NewProduct = mongoose.model('NewProduct', ProductSchema);

// Migration functions
const createSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
};

const migrateBundleToProduct = (bundle) => {
  const slug = createSlug(bundle.name);
  
  return {
    name: bundle.name,
    slug,
    brand: 'Salveo',
    category: ['Bundle', 'Health Supplements'],
    productType: 'bundle',
    pricing: {
      currency: 'PHP',
      regularPrice: bundle.price,
      salePrice: bundle.discount > 0 ? bundle.price - bundle.discount : undefined,
      discountPercentage: bundle.discount > 0 ? Math.round((bundle.discount / bundle.price) * 100) : undefined
    },
    bundleDetails: {
      items: bundle.products.map(item => ({
        productId: item.productId,
        productName: `Product ${item.productId}`, // Will need to be populated with actual names
        quantity: item.quantity,
        variantName: item.variantName
      })),
      totalValue: bundle.price,
      savings: bundle.discount || 0
    },
    availability: {
      inStock: bundle.isActive,
      stockLevel: 100 // Default stock level
    },
    description: {
      short: bundle.description?.substring(0, 100) || `${bundle.name} - Premium bundle package`,
      long: bundle.description || `Complete ${bundle.name} package with multiple products for enhanced value.`
    },
    images: bundle.image ? [{
      url: bundle.image,
      alt: `${bundle.name} product image`,
      isPrimary: true
    }] : [],
    isActive: bundle.isActive !== false,
    isFeatured: false,
    seo: {
      metaTitle: `${bundle.name} - Premium Health Bundle | Salveo`,
      metaDescription: bundle.description?.substring(0, 160) || `Shop ${bundle.name} - premium health supplement bundle with multiple products for enhanced wellness benefits.`
    },
    // Keep original timestamps if they exist
    createdAt: bundle.createdAt,
    updatedAt: bundle.updatedAt
  };
};

const performMigration = async (isDryRun = false) => {
  console.log(`\n🔄 Starting migration${isDryRun ? ' (DRY RUN)' : ''}...`);
  
  try {
    // Get all bundles
    const bundles = await OldBundle.find({}).lean();
    console.log(`📦 Found ${bundles.length} bundles to migrate`);
    
    if (bundles.length === 0) {
      console.log('✅ No bundles found to migrate');
      return;
    }
    
    const migrationStats = {
      total: bundles.length,
      successful: 0,
      skipped: 0,
      errors: 0
    };
    
    for (const bundle of bundles) {
      try {
        const productData = migrateBundleToProduct(bundle);
        
        console.log(`\n📝 Processing: ${bundle.name}`);
        
        if (isDryRun) {
          console.log('   Preview:', {
            name: productData.name,
            slug: productData.slug,
            productType: productData.productType,
            price: productData.pricing.regularPrice,
            itemCount: productData.bundleDetails.items.length
          });
          migrationStats.successful++;
        } else {
          // Check if product with this slug already exists
          const existingProduct = await NewProduct.findOne({ slug: productData.slug });
          
          if (existingProduct) {
            console.log(`   ⚠️  Product with slug '${productData.slug}' already exists, skipping...`);
            migrationStats.skipped++;
            continue;
          }
          
          // Create new product
          const newProduct = new NewProduct(productData);
          await newProduct.save();
          
          console.log(`   ✅ Migrated successfully (ID: ${newProduct._id})`);
          migrationStats.successful++;
        }
      } catch (error) {
        console.error(`   ❌ Error processing ${bundle.name}:`, error.message);
        migrationStats.errors++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`   Total bundles: ${migrationStats.total}`);
    console.log(`   Successfully processed: ${migrationStats.successful}`);
    console.log(`   Skipped: ${migrationStats.skipped}`);
    console.log(`   Errors: ${migrationStats.errors}`);
    
    if (!isDryRun && migrationStats.successful > 0) {
      console.log('\n⚠️  IMPORTANT: After migration, you should:');
      console.log('   1. Update frontend components to use the new product API');
      console.log('   2. Test all product-related functionality');
      console.log('   3. Consider backing up and removing the old bundles collection');
      console.log('   4. Update product names in bundleDetails.items by running product population');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
};

const populateProductNames = async () => {
  console.log('\n🔄 Populating product names in bundle details...');
  
  try {
    const bundleProducts = await NewProduct.find({ productType: 'bundle' });
    
    for (const bundleProduct of bundleProducts) {
      let hasUpdates = false;
      
      for (const item of bundleProduct.bundleDetails.items) {
        if (!item.productName || item.productName.startsWith('Product ')) {
          try {
            const referencedProduct = await NewProduct.findById(item.productId);
            if (referencedProduct) {
              item.productName = referencedProduct.name;
              hasUpdates = true;
              console.log(`   ✅ Updated product name: ${referencedProduct.name}`);
            }
          } catch (error) {
            console.log(`   ⚠️  Could not find product with ID: ${item.productId}`);
          }
        }
      }
      
      if (hasUpdates) {
        await bundleProduct.save();
        console.log(`📦 Updated bundle: ${bundleProduct.name}`);
      }
    }
    
    console.log('✅ Product name population completed');
  } catch (error) {
    console.error('❌ Error populating product names:', error.message);
  }
};

// Main execution
const main = async () => {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const populateNames = args.includes('--populate-names');
  
  console.log('🚀 SLV Barley Shop - Database Migration Tool');
  console.log('============================================');
  
  await connectDB();
  
  try {
    if (populateNames) {
      await populateProductNames();
    } else {
      await performMigration(isDryRun);
    }
    
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
  }
};

// Error handling
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Run the migration
if (require.main === module) {
  main();
}

module.exports = { migrateBundleToProduct, createSlug };