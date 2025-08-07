import mongoose, { Document, Schema } from 'mongoose';

// Product Type Enumeration
export enum ProductType {
  SINGLE = 'single',
  BUNDLE = 'bundle',
  MEMBERSHIP = 'membership',
  PROMOTION = 'promotion',
  ACCESSORY = 'accessory'
}

// Product Status Enumeration
export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued',
  OUT_OF_STOCK = 'out_of_stock'
}

// Shipping Information Interface
export interface IShippingInfo {
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  fragile: boolean;
  requiresSpecialHandling: boolean;
  shippingClass: 'standard' | 'express' | 'overnight' | 'freight';
  restrictions?: string[];
}

// Product Variant Interface (Enhanced)
export interface IProductVariant {
  name: string;
  price: number;
  compareAtPrice?: number;
  sku: string;
  inventory: number;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  barcode?: string;
  isDefault: boolean;
  attributes: Array<{
    name: string;
    value: string;
  }>;
}

// Bundle Item Interface (for bundle type products)
export interface IBundleItem {
  productId: mongoose.Types.ObjectId;
  variantSku: string;
  quantity: number;
  discountPercentage?: number;
}

// Membership Configuration Interface
export interface IMembershipConfig {
  duration: number; // in months
  durationType: 'months' | 'years' | 'lifetime';
  benefits: string[];
  tier: 'basic' | 'premium' | 'vip';
  autoRenewal: boolean;
  renewalPrice?: number;
}

// Promotion Configuration Interface
export interface IPromotionConfig {
  validFrom: Date;
  validTo: Date;
  discountType: 'percentage' | 'fixed' | 'buy_x_get_y';
  discountValue: number;
  minOrderValue?: number;
  maxDiscount?: number;
  applicableProducts?: mongoose.Types.ObjectId[];
  stackable: boolean;
}

// Review Aggregation Interface
export interface IReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  lastUpdated: Date;
}

// Enhanced Product Interface
export interface IProduct extends Document {
  name: string;
  description: string;
  shortDescription?: string;
  productType: ProductType;
  status: ProductStatus;
  category: string;
  subcategory?: string;
  brand: string;
  manufacturer?: string;
  images: string[];
  variants: IProductVariant[];
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  
  // SEO Fields
  seoTitle?: string;
  seoDescription?: string;
  metaKeywords?: string[];
  canonicalUrl?: string;
  
  // Product Details
  ingredients?: string[];
  benefits?: string[];
  howToUse?: string;
  warnings?: string[];
  sideEffects?: string[];
  contraindications?: string[];
  
  // Nutrition Information
  nutritionFacts?: {
    servingSize?: string;
    servingsPerContainer?: number;
    nutrients?: Array<{
      name: string;
      amount: string;
      dailyValue?: string;
      unit: string;
    }>;
  };
  
  // Certifications and Compliance
  certifications?: string[];
  regulatoryInfo?: {
    fdaApproved?: boolean;
    organicCertified?: boolean;
    halalCertified?: boolean;
    kosherCertified?: boolean;
    gmpCertified?: boolean;
  };
  
  // Shipping Information
  shipping: IShippingInfo;
  
  // Bundle Configuration (only for bundle type)
  bundleConfig?: {
    items: IBundleItem[];
    totalSavings: number;
    savingsPercentage: number;
  };
  
  // Membership Configuration (only for membership type)
  membershipConfig?: IMembershipConfig;
  
  // Promotion Configuration (only for promotion type)
  promotionConfig?: IPromotionConfig;
  
  // Related Products
  relatedProducts?: mongoose.Types.ObjectId[];
  crossSellProducts?: mongoose.Types.ObjectId[];
  upSellProducts?: mongoose.Types.ObjectId[];
  
  // Review Statistics
  reviewStats: IReviewStats;
  
  // Inventory Management
  lowStockThreshold: number;
  trackInventory: boolean;
  allowBackorder: boolean;
  
  // Pricing
  basePriceRange: {
    min: number;
    max: number;
  };
  
  // Analytics
  viewCount: number;
  purchaseCount: number;
  wishlistCount: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  discontinuedAt?: Date;
}

const ProductVariantSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Variant name is required'],
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price must be positive'],
  },
  compareAtPrice: {
    type: Number,
    min: [0, 'Compare at price must be positive'],
  },
  sku: {
    type: String,
    unique: true,
    sparse: true,
  },
  inventory: {
    type: Number,
    required: [true, 'Inventory is required'],
    min: [0, 'Inventory cannot be negative'],
    default: 0,
  },
  weight: {
    type: Number,
    min: [0, 'Weight must be positive'],
  },
  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
  },
});

const ProductSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
  },
  shortDescription: {
    type: String,
    maxlength: [200, 'Short description must be less than 200 characters'],
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Supplements', 'Skincare', 'Food & Beverage', 'Wellness', 'Beauty'],
  },
  subcategory: String,
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    default: 'Salveo Organics',
  },
  images: [{
    type: String,
    required: [true, 'At least one image is required'],
  }],
  variants: {
    type: [ProductVariantSchema],
    validate: {
      validator: function(variants: IProductVariant[]) {
        return variants && variants.length > 0;
      },
      message: 'At least one variant is required',
    },
  },
  tags: [String],
  isActive: {
    type: Boolean,
    default: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  seoTitle: String,
  seoDescription: String,
  ingredients: [String],
  benefits: [String],
  howToUse: String,
  warnings: [String],
  nutritionFacts: {
    servingSize: String,
    servingsPerContainer: Number,
    nutrients: [{
      name: String,
      amount: String,
      dailyValue: String,
    }],
  },
  certifications: [String],
}, {
  timestamps: true,
});

// Create index for search functionality
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ brand: 1, isActive: 1 });

// Export the enhanced Product model
export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

// Export utility functions for product management
export const ProductUtils = {
  // Calculate bundle savings
  calculateBundleSavings: (originalPrices: number[], bundlePrice: number) => {
    const totalOriginal = originalPrices.reduce((sum, price) => sum + price, 0);
    const savings = totalOriginal - bundlePrice;
    const percentage = (savings / totalOriginal) * 100;
    return { savings, percentage: Math.round(percentage * 100) / 100 };
  },
  
  // Generate SKU
  generateSKU: (productName: string, variantName: string, category: string) => {
    const cleanName = productName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
    const cleanVariant = variantName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
    const cleanCategory = category.replace(/[^a-zA-Z0-9]/g, '').substring(0, 2).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `${cleanCategory}-${cleanName}-${cleanVariant}-${timestamp}`;
  },
  
  // Validate product data
  validateProductData: (productData: Partial<IProduct>) => {
    const errors: string[] = [];
    
    if (productData.productType === ProductType.BUNDLE && (!productData.bundleConfig?.items || productData.bundleConfig.items.length < 2)) {
      errors.push('Bundle products must have at least 2 items');
    }
    
    if (productData.productType === ProductType.MEMBERSHIP && !productData.membershipConfig) {
      errors.push('Membership products must have membership configuration');
    }
    
    if (productData.productType === ProductType.PROMOTION && !productData.promotionConfig) {
      errors.push('Promotion products must have promotion configuration');
    }
    
    if (productData.variants && productData.variants.length > 0) {
      const skus = productData.variants.map(v => v.sku);
      const uniqueSkus = new Set(skus);
      if (skus.length !== uniqueSkus.size) {
        errors.push('All variant SKUs must be unique');
      }
    }
    
    return errors;
  }
};