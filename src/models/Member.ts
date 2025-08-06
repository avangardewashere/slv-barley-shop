import mongoose, { Document, Schema } from 'mongoose';

export interface IMember extends Document {
  email: string;
  name: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  membershipTier: 'basic' | 'premium' | 'vip';
  membershipStatus: 'active' | 'inactive' | 'suspended';
  joinDate: Date;
  lastOrderDate?: Date;
  totalOrders: number;
  totalSpent: number;
  loyaltyPoints: number;
  preferences?: {
    categories: string[];
    brands: string[];
    notifications: {
      email: boolean;
      sms: boolean;
      promotions: boolean;
    };
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MemberSchema: Schema = new Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'Philippines' },
  },
  membershipTier: {
    type: String,
    enum: ['basic', 'premium', 'vip'],
    default: 'basic',
  },
  membershipStatus: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  },
  joinDate: {
    type: Date,
    default: Date.now,
  },
  lastOrderDate: Date,
  totalOrders: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0,
  },
  loyaltyPoints: {
    type: Number,
    default: 0,
    min: 0,
  },
  preferences: {
    categories: [String],
    brands: [String],
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      promotions: { type: Boolean, default: true },
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Create indexes
MemberSchema.index({ email: 1 });
MemberSchema.index({ membershipTier: 1, membershipStatus: 1 });
MemberSchema.index({ totalSpent: -1 });
MemberSchema.index({ createdAt: -1 });

export default mongoose.models.Member || mongoose.model<IMember>('Member', MemberSchema);