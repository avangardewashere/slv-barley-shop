import mongoose, { Document, Schema } from 'mongoose';

export interface IProductVariant {
  name: string;
  price: number;
  compareAtPrice?: number;
  sku?: string;
  inventory: number;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
}

export interface IProduct extends Document {
  name: string;
  description: string;
  shortDescription?: string;
  category: string;
  subcategory?: string;
  brand: string;
  images: string[];
  variants: IProductVariant[];
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  ingredients?: string[];
  benefits?: string[];
  howToUse?: string;
  warnings?: string[];
  nutritionFacts?: {
    servingSize?: string;
    servingsPerContainer?: number;
    nutrients?: Array<{
      name: string;
      amount: string;
      dailyValue?: string;
    }>;
  };
  certifications?: string[];
  createdAt: Date;
  updatedAt: Date;
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

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);