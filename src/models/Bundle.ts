import mongoose, { Document, Schema } from 'mongoose';

export interface IBundleItem {
  productId: mongoose.Types.ObjectId;
  variantName: string;
  quantity: number;
}

export interface IBundle extends Document {
  name: string;
  description: string;
  shortDescription?: string;
  images: string[];
  items: IBundleItem[];
  originalPrice: number;
  bundlePrice: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  inventory: number;
  seoTitle?: string;
  seoDescription?: string;
  benefits?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const BundleItemSchema: Schema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required'],
  },
  variantName: {
    type: String,
    required: [true, 'Variant name is required'],
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
  },
});

const BundleSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Bundle name is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Bundle description is required'],
  },
  shortDescription: {
    type: String,
    maxlength: [200, 'Short description must be less than 200 characters'],
  },
  images: [{
    type: String,
    required: [true, 'At least one image is required'],
  }],
  items: {
    type: [BundleItemSchema],
    validate: {
      validator: function(items: IBundleItem[]) {
        return items && items.length >= 2;
      },
      message: 'Bundle must contain at least 2 items',
    },
  },
  originalPrice: {
    type: Number,
    required: [true, 'Original price is required'],
    min: [0, 'Original price must be positive'],
  },
  bundlePrice: {
    type: Number,
    required: [true, 'Bundle price is required'],
    min: [0, 'Bundle price must be positive'],
  },
  discount: {
    type: Number,
    required: [true, 'Discount is required'],
    min: [0, 'Discount cannot be negative'],
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: [true, 'Discount type is required'],
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
  inventory: {
    type: Number,
    required: [true, 'Inventory is required'],
    min: [0, 'Inventory cannot be negative'],
    default: 0,
  },
  seoTitle: String,
  seoDescription: String,
  benefits: [String],
}, {
  timestamps: true,
});

// Calculate discount and prices before saving
BundleSchema.pre('save', function(next) {
  if (this.discountType === 'percentage') {
    this.bundlePrice = this.originalPrice * (1 - this.discount / 100);
  } else {
    this.bundlePrice = Math.max(0, this.originalPrice - this.discount);
  }
  next();
});

// Create indexes
BundleSchema.index({ name: 'text', description: 'text', tags: 'text' });
BundleSchema.index({ isActive: 1, isFeatured: 1 });

export default mongoose.models.Bundle || mongoose.model<IBundle>('Bundle', BundleSchema);