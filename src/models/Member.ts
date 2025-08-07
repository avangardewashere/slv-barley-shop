import mongoose, { Document, Schema } from 'mongoose';

// Member Address Interface (Enhanced)
export interface IMemberAddress {
  type: 'shipping' | 'billing';
  label?: string;
  firstName: string;
  lastName: string;
  company?: string;
  street: string;
  apartment?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
}

// Member Preferences Interface (Enhanced)
export interface IMemberPreferences {
  categories: string[];
  brands: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    promotions: boolean;
    orderUpdates: boolean;
    reviewRequests: boolean;
    restock: boolean;
  };
  communication: {
    language: string;
    timezone: string;
    currency: string;
  };
  privacy: {
    shareReviews: boolean;
    shareWishlist: boolean;
    marketingEmails: boolean;
    dataCollection: boolean;
  };
}

// Member Statistics Interface
export interface IMemberStats {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  totalReviews: number;
  averageRating: number;
  loyaltyPoints: number;
  referralCount: number;
  wishlistItems: number;
  lastOrderDate?: Date;
  lastLoginDate?: Date;
  accountValue: number;
}

// Member Activity Interface
export interface IMemberActivity {
  loginCount: number;
  pageViews: number;
  searchCount: number;
  cartAbandonments: number;
  supportTickets: number;
  referralsSent: number;
  referralsSuccessful: number;
}

// Enhanced Member Interface
export interface IMember extends Document {
  // Basic Information
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  
  // Multiple Addresses Support
  addresses: IMemberAddress[];
  
  // Membership Information
  membershipTier: 'basic' | 'premium' | 'vip';
  membershipStatus: 'active' | 'inactive' | 'suspended' | 'pending';
  joinDate: Date;
  membershipExpiryDate?: Date;
  
  // Enhanced Preferences
  preferences: IMemberPreferences;
  
  // Statistics and Analytics
  stats: IMemberStats;
  activity: IMemberActivity;
  
  // Verification Status
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  emailVerificationToken?: string;
  phoneVerificationToken?: string;
  
  // Security
  password?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  
  // Account Status
  isActive: boolean;
  isBanned: boolean;
  banReason?: string;
  bannedAt?: Date;
  suspensionEndDate?: Date;
  
  // Wishlist and Cart
  wishlist: mongoose.Types.ObjectId[];
  cartItems: Array<{
    productId: mongoose.Types.ObjectId;
    variantSku: string;
    quantity: number;
    addedAt: Date;
  }>;
  
  // Social and Referrals
  referralCode: string;
  referredBy?: mongoose.Types.ObjectId;
  socialProfiles?: {
    facebook?: string;
    google?: string;
    instagram?: string;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date;
}

// Member Address Schema
const MemberAddressSchema: Schema = new Schema({
  type: {
    type: String,
    enum: ['shipping', 'billing'],
    required: [true, 'Address type is required']
  },
  label: {
    type: String,
    trim: true,
    maxlength: [50, 'Address label must be less than 50 characters']
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name must be less than 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name must be less than 50 characters']
  },
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name must be less than 100 characters']
  },
  street: {
    type: String,
    required: [true, 'Street address is required'],
    trim: true,
    maxlength: [200, 'Street address must be less than 200 characters']
  },
  apartment: {
    type: String,
    trim: true,
    maxlength: [50, 'Apartment must be less than 50 characters']
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    maxlength: [100, 'City must be less than 100 characters']
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
    maxlength: [100, 'State must be less than 100 characters']
  },
  zipCode: {
    type: String,
    required: [true, 'ZIP code is required'],
    trim: true,
    maxlength: [20, 'ZIP code must be less than 20 characters']
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    default: 'Philippines',
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone must be less than 20 characters']
  },
  isDefault: {
    type: Boolean,
    default: false
  }
});

// Member Preferences Schema
const MemberPreferencesSchema: Schema = new Schema({
  categories: [{
    type: String,
    trim: true
  }],
  brands: [{
    type: String,
    trim: true
  }],
  priceRange: {
    min: {
      type: Number,
      min: [0, 'Minimum price cannot be negative'],
      default: 0
    },
    max: {
      type: Number,
      min: [0, 'Maximum price cannot be negative'],
      default: 100000
    }
  },
  notifications: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true },
    promotions: { type: Boolean, default: true },
    orderUpdates: { type: Boolean, default: true },
    reviewRequests: { type: Boolean, default: true },
    restock: { type: Boolean, default: false }
  },
  communication: {
    language: {
      type: String,
      default: 'en',
      trim: true,
      lowercase: true
    },
    timezone: {
      type: String,
      default: 'Asia/Manila',
      trim: true
    },
    currency: {
      type: String,
      default: 'PHP',
      uppercase: true,
      trim: true
    }
  },
  privacy: {
    shareReviews: { type: Boolean, default: true },
    shareWishlist: { type: Boolean, default: false },
    marketingEmails: { type: Boolean, default: true },
    dataCollection: { type: Boolean, default: true }
  }
});

// Member Statistics Schema
const MemberStatsSchema: Schema = new Schema({
  totalOrders: {
    type: Number,
    default: 0,
    min: [0, 'Total orders cannot be negative']
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: [0, 'Total spent cannot be negative']
  },
  averageOrderValue: {
    type: Number,
    default: 0,
    min: [0, 'Average order value cannot be negative']
  },
  totalReviews: {
    type: Number,
    default: 0,
    min: [0, 'Total reviews cannot be negative']
  },
  averageRating: {
    type: Number,
    default: 0,
    min: [0, 'Average rating cannot be negative'],
    max: [5, 'Average rating cannot exceed 5']
  },
  loyaltyPoints: {
    type: Number,
    default: 0,
    min: [0, 'Loyalty points cannot be negative']
  },
  referralCount: {
    type: Number,
    default: 0,
    min: [0, 'Referral count cannot be negative']
  },
  wishlistItems: {
    type: Number,
    default: 0,
    min: [0, 'Wishlist items cannot be negative']
  },
  lastOrderDate: Date,
  lastLoginDate: Date,
  accountValue: {
    type: Number,
    default: 0,
    min: [0, 'Account value cannot be negative']
  }
});

// Member Activity Schema
const MemberActivitySchema: Schema = new Schema({
  loginCount: {
    type: Number,
    default: 0,
    min: [0, 'Login count cannot be negative']
  },
  pageViews: {
    type: Number,
    default: 0,
    min: [0, 'Page views cannot be negative']
  },
  searchCount: {
    type: Number,
    default: 0,
    min: [0, 'Search count cannot be negative']
  },
  cartAbandonments: {
    type: Number,
    default: 0,
    min: [0, 'Cart abandonments cannot be negative']
  },
  supportTickets: {
    type: Number,
    default: 0,
    min: [0, 'Support tickets cannot be negative']
  },
  referralsSent: {
    type: Number,
    default: 0,
    min: [0, 'Referrals sent cannot be negative']
  },
  referralsSuccessful: {
    type: Number,
    default: 0,
    min: [0, 'Successful referrals cannot be negative']
  }
});

// Cart Item Schema
const CartItemSchema: Schema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required']
  },
  variantSku: {
    type: String,
    required: [true, 'Variant SKU is required'],
    trim: true,
    uppercase: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

// Enhanced Member Schema
const MemberSchema: Schema = new Schema({
  // Basic Information
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Invalid email format'
    }
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name must be less than 100 characters']
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: [50, 'First name must be less than 50 characters']
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Last name must be less than 50 characters']
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone must be less than 20 characters']
  },
  avatar: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(date: Date) {
        return date < new Date();
      },
      message: 'Date of birth must be in the past'
    }
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say']
  },
  
  // Multiple Addresses Support
  addresses: {
    type: [MemberAddressSchema],
    validate: {
      validator: function(addresses: IMemberAddress[]) {
        return addresses.length <= 10; // Maximum 10 addresses
      },
      message: 'Maximum 10 addresses allowed'
    }
  },
  
  // Membership Information
  membershipTier: {
    type: String,
    enum: ['basic', 'premium', 'vip'],
    default: 'basic'
  },
  membershipStatus: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'active'
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  membershipExpiryDate: Date,
  
  // Enhanced Preferences
  preferences: {
    type: MemberPreferencesSchema,
    default: () => ({})
  },
  
  // Statistics and Analytics
  stats: {
    type: MemberStatsSchema,
    default: () => ({})
  },
  activity: {
    type: MemberActivitySchema,
    default: () => ({})
  },
  
  // Verification Status
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false // Don't include in queries by default
  },
  phoneVerificationToken: {
    type: String,
    select: false
  },
  
  // Security
  password: {
    type: String,
    select: false,
    minlength: [8, 'Password must be at least 8 characters']
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  banReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Ban reason must be less than 500 characters']
  },
  bannedAt: Date,
  suspensionEndDate: Date,
  
  // Wishlist and Cart
  wishlist: [{
    type: Schema.Types.ObjectId,
    ref: 'Product'
  }],
  cartItems: {
    type: [CartItemSchema],
    validate: {
      validator: function(items: any[]) {
        return items.length <= 50; // Maximum 50 items in cart
      },
      message: 'Maximum 50 items allowed in cart'
    }
  },
  
  // Social and Referrals
  referralCode: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
    default: function() {
      return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
  },
  referredBy: {
    type: Schema.Types.ObjectId,
    ref: 'Member'
  },
  socialProfiles: {
    facebook: {
      type: String,
      trim: true
    },
    google: {
      type: String,
      trim: true
    },
    instagram: {
      type: String,
      trim: true
    }
  },
  
  // Timestamps
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  versionKey: false
});

// Pre-save middleware
MemberSchema.pre('save', function(next) {
  // Ensure only one default address per type
  const shippingAddresses = this.addresses.filter((addr: IMemberAddress) => addr.type === 'shipping');
  const billingAddresses = this.addresses.filter((addr: IMemberAddress) => addr.type === 'billing');
  
  const defaultShipping = shippingAddresses.filter((addr: IMemberAddress) => addr.isDefault);
  const defaultBilling = billingAddresses.filter((addr: IMemberAddress) => addr.isDefault);
  
  if (defaultShipping.length > 1) {
    return next(new Error('Only one default shipping address is allowed'));
  }
  if (defaultBilling.length > 1) {
    return next(new Error('Only one default billing address is allowed'));
  }
  
  // Set first address as default if none is set
  if (shippingAddresses.length > 0 && defaultShipping.length === 0) {
    shippingAddresses[0].isDefault = true;
  }
  if (billingAddresses.length > 0 && defaultBilling.length === 0) {
    billingAddresses[0].isDefault = true;
  }
  
  // Calculate account value and average order value
  if (this.stats.totalOrders > 0) {
    this.stats.averageOrderValue = this.stats.totalSpent / this.stats.totalOrders;
  }
  
  // Update wishlist count
  this.stats.wishlistItems = this.wishlist.length;
  
  next();
});

// Instance Methods
MemberSchema.methods.addToWishlist = function(productId: mongoose.Types.ObjectId) {
  if (!this.wishlist.includes(productId)) {
    this.wishlist.push(productId);
    this.stats.wishlistItems += 1;
    this.markModified('wishlist');
    this.markModified('stats');
  }
};

MemberSchema.methods.removeFromWishlist = function(productId: mongoose.Types.ObjectId) {
  const index = this.wishlist.indexOf(productId);
  if (index > -1) {
    this.wishlist.splice(index, 1);
    this.stats.wishlistItems -= 1;
    this.markModified('wishlist');
    this.markModified('stats');
  }
};

MemberSchema.methods.addToCart = function(productId: mongoose.Types.ObjectId, variantSku: string, quantity: number) {
  const existingItem = this.cartItems.find((item: any) => 
    item.productId.equals(productId) && item.variantSku === variantSku
  );
  
  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.addedAt = new Date();
  } else {
    this.cartItems.push({
      productId,
      variantSku,
      quantity,
      addedAt: new Date()
    });
  }
  
  this.markModified('cartItems');
};

MemberSchema.methods.removeFromCart = function(productId: mongoose.Types.ObjectId, variantSku?: string) {
  if (variantSku) {
    this.cartItems = this.cartItems.filter((item: any) => 
      !(item.productId.equals(productId) && item.variantSku === variantSku)
    );
  } else {
    this.cartItems = this.cartItems.filter((item: any) => !item.productId.equals(productId));
  }
  
  this.markModified('cartItems');
};

MemberSchema.methods.clearCart = function() {
  this.cartItems = [];
  this.markModified('cartItems');
};

MemberSchema.methods.getDefaultAddress = function(type: 'shipping' | 'billing'): IMemberAddress | null {
  return this.addresses.find((addr: IMemberAddress) => addr.type === type && addr.isDefault) || null;
};

MemberSchema.methods.updateStats = function(orderData: { total: number; itemCount: number }) {
  this.stats.totalOrders += 1;
  this.stats.totalSpent += orderData.total;
  this.stats.lastOrderDate = new Date();
  this.stats.averageOrderValue = this.stats.totalSpent / this.stats.totalOrders;
  this.stats.accountValue = this.stats.totalSpent * 0.1; // 10% of total spent
  this.markModified('stats');
};

MemberSchema.methods.addLoyaltyPoints = function(points: number, reason?: string) {
  this.stats.loyaltyPoints += points;
  this.markModified('stats');
};

MemberSchema.methods.redeemLoyaltyPoints = function(points: number): boolean {
  if (this.stats.loyaltyPoints >= points) {
    this.stats.loyaltyPoints -= points;
    this.markModified('stats');
    return true;
  }
  return false;
};

MemberSchema.methods.updateActivity = function(activityType: string, increment: number = 1) {
  this.lastActiveAt = new Date();
  
  switch (activityType) {
    case 'login':
      this.activity.loginCount += increment;
      this.stats.lastLoginDate = new Date();
      break;
    case 'page_view':
      this.activity.pageViews += increment;
      break;
    case 'search':
      this.activity.searchCount += increment;
      break;
    case 'cart_abandonment':
      this.activity.cartAbandonments += increment;
      break;
    case 'support_ticket':
      this.activity.supportTickets += increment;
      break;
    case 'referral_sent':
      this.activity.referralsSent += increment;
      break;
    case 'referral_successful':
      this.activity.referralsSuccessful += increment;
      break;
  }
  
  this.markModified('activity');
  this.markModified('stats');
};

// Static Methods
MemberSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

MemberSchema.statics.findByReferralCode = function(code: string) {
  return this.findOne({ referralCode: code.toUpperCase() });
};

MemberSchema.statics.findByTier = function(tier: string, isActive: boolean = true) {
  return this.find({ membershipTier: tier, isActive });
};

MemberSchema.statics.findTopCustomers = function(limit: number = 10, sortBy: 'totalSpent' | 'totalOrders' | 'loyaltyPoints' = 'totalSpent') {
  const sortField = `stats.${sortBy}`;
  return this.find({ isActive: true })
             .sort({ [sortField]: -1 })
             .limit(limit);
};

MemberSchema.statics.findRecentlyActive = function(days: number = 30, limit: number = 50) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.find({
    lastActiveAt: { $gte: cutoffDate },
    isActive: true
  })
  .sort({ lastActiveAt: -1 })
  .limit(limit);
};

MemberSchema.statics.getMembershipStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$membershipTier',
        count: { $sum: 1 },
        totalSpent: { $sum: '$stats.totalSpent' },
        averageOrderValue: { $avg: '$stats.averageOrderValue' },
        totalOrders: { $sum: '$stats.totalOrders' }
      }
    }
  ]);
};

// Comprehensive Indexing Strategy
// Core identification indexes
// Email and referralCode indexes are automatically created from the unique: true in schema
MemberSchema.index({ phone: 1 }, { sparse: true });

// Membership and status indexes
MemberSchema.index({ membershipTier: 1, membershipStatus: 1 });
MemberSchema.index({ isActive: 1, membershipStatus: 1 });
MemberSchema.index({ isBanned: 1 });

// Statistics indexes
MemberSchema.index({ 'stats.totalSpent': -1 });
MemberSchema.index({ 'stats.totalOrders': -1 });
MemberSchema.index({ 'stats.loyaltyPoints': -1 });
MemberSchema.index({ 'stats.lastOrderDate': -1 });
MemberSchema.index({ 'stats.lastLoginDate': -1 });

// Activity and engagement indexes
MemberSchema.index({ lastActiveAt: -1 });
MemberSchema.index({ 'activity.loginCount': -1 });
MemberSchema.index({ createdAt: -1 });
MemberSchema.index({ joinDate: -1 });

// Verification indexes
MemberSchema.index({ isEmailVerified: 1 });
MemberSchema.index({ isPhoneVerified: 1 });

// Referral indexes
MemberSchema.index({ referredBy: 1 }, { sparse: true });
MemberSchema.index({ 'stats.referralCount': -1 });

// Address indexes
MemberSchema.index({ 'addresses.zipCode': 1 });
MemberSchema.index({ 'addresses.city': 1 });
MemberSchema.index({ 'addresses.country': 1 });

// Cart and wishlist indexes
MemberSchema.index({ 'wishlist': 1 }, { sparse: true });
MemberSchema.index({ 'cartItems.productId': 1 }, { sparse: true });

// Compound indexes for complex queries
MemberSchema.index({ membershipTier: 1, 'stats.totalSpent': -1, isActive: 1 });
MemberSchema.index({ isActive: 1, lastActiveAt: -1 });
MemberSchema.index({ membershipStatus: 1, createdAt: -1 });
MemberSchema.index({ 'stats.totalOrders': -1, membershipTier: 1 });

export default mongoose.models.Member || mongoose.model<IMember>('Member', MemberSchema);

// Export utility functions for member management
export const MemberUtils = {
  // Generate referral code
  generateReferralCode: () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  },
  
  // Calculate membership tier based on total spent
  calculateMembershipTier: (totalSpent: number) => {
    if (totalSpent >= 50000) return 'vip';
    if (totalSpent >= 20000) return 'premium';
    return 'basic';
  },
  
  // Calculate loyalty points for order
  calculateLoyaltyPoints: (orderTotal: number, membershipTier: string) => {
    const basePoints = Math.floor(orderTotal / 100); // 1 point per 100 PHP
    const multiplier = {
      basic: 1,
      premium: 1.5,
      vip: 2
    }[membershipTier] || 1;
    
    return Math.floor(basePoints * multiplier);
  },
  
  // Validate member data
  validateMemberData: (memberData: Partial<IMember>) => {
    const errors: string[] = [];
    
    if (!memberData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberData.email)) {
      errors.push('Valid email is required');
    }
    
    if (!memberData.name || memberData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }
    
    if (memberData.phone && !/^[+]?[0-9\s\-()]+$/.test(memberData.phone)) {
      errors.push('Invalid phone number format');
    }
    
    if (memberData.dateOfBirth && memberData.dateOfBirth >= new Date()) {
      errors.push('Date of birth must be in the past');
    }
    
    return errors;
  },
  
  // Check if member can place order
  canPlaceOrder: (member: IMember) => {
    return member.isActive && 
           member.membershipStatus === 'active' && 
           !member.isBanned;
  },
  
  // Get member tier benefits
  getTierBenefits: (tier: string) => {
    const benefits = {
      basic: {
        loyaltyMultiplier: 1,
        freeShippingThreshold: 2000,
        earlyAccess: false,
        prioritySupport: false,
        birthdayDiscount: 5
      },
      premium: {
        loyaltyMultiplier: 1.5,
        freeShippingThreshold: 1500,
        earlyAccess: true,
        prioritySupport: false,
        birthdayDiscount: 10
      },
      vip: {
        loyaltyMultiplier: 2,
        freeShippingThreshold: 1000,
        earlyAccess: true,
        prioritySupport: true,
        birthdayDiscount: 15
      }
    };
    
    return benefits[tier as keyof typeof benefits] || benefits.basic;
  }
};