import mongoose, { Document, Schema } from 'mongoose';

// Order Status Enumeration
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  RETURNED = 'returned'
}

// Payment Status Enumeration
export enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  PARTIAL_REFUND = 'partial_refund',
  REFUNDED = 'refunded',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Payment Method Enumeration
export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PAYPAL = 'paypal',
  BANK_TRANSFER = 'bank_transfer',
  CASH_ON_DELIVERY = 'cash_on_delivery',
  GCASH = 'gcash',
  MAYA = 'maya'
}

// Shipping Method Enumeration
export enum ShippingMethod {
  STANDARD = 'standard',
  EXPRESS = 'express',
  OVERNIGHT = 'overnight',
  PICKUP = 'pickup',
  SAME_DAY = 'same_day'
}

// Order Item Interface
export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  productType: string;
  variantSku: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  weight: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  bundleItems?: Array<{
    productId: mongoose.Types.ObjectId;
    productName: string;
    variantSku: string;
    quantity: number;
  }>;
}

// Shipping Address Interface
export interface IShippingAddress {
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
  email?: string;
  isDefault?: boolean;
}

// Billing Address Interface (extends shipping address)
export interface IBillingAddress extends IShippingAddress {
  taxId?: string;
}

// Payment Information Interface
export interface IPaymentInfo {
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  paymentGateway?: string;
  gatewayResponse?: any;
  paidAt?: Date;
  authorizedAt?: Date;
  capturedAt?: Date;
  failureReason?: string;
  refundedAmount?: number;
  refundedAt?: Date;
}

// Shipping Information Interface
export interface IShippingInfo {
  method: ShippingMethod;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  shippedAt?: Date;
  cost: number;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  specialInstructions?: string;
}

// Order Timeline Event Interface
export interface IOrderEvent {
  status: OrderStatus;
  timestamp: Date;
  note?: string;
  updatedBy?: string;
  metadata?: any;
}

// Discount Information Interface
export interface IDiscountInfo {
  code?: string;
  type: 'percentage' | 'fixed' | 'shipping' | 'buy_x_get_y';
  amount: number;
  description: string;
  appliedTo: 'order' | 'shipping' | 'item';
}

// Tax Information Interface
export interface ITaxInfo {
  rate: number;
  amount: number;
  breakdown?: Array<{
    name: string;
    rate: number;
    amount: number;
  }>;
}

// Order Totals Interface
export interface IOrderTotals {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  total: number;
  paidAmount: number;
  refundedAmount: number;
  outstandingAmount: number;
}

// Main Order Interface
export interface IOrder extends Document {
  // Order Identification
  orderNumber: string;
  customerId: mongoose.Types.ObjectId;
  customerEmail: string;
  customerPhone?: string;
  
  // Order Status
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: string;
  
  // Order Items
  items: IOrderItem[];
  
  // Addresses
  shippingAddress: IShippingAddress;
  billingAddress: IBillingAddress;
  
  // Payment Information
  paymentInfo: IPaymentInfo;
  
  // Shipping Information
  shippingInfo: IShippingInfo;
  
  // Financial Details
  totals: IOrderTotals;
  discounts: IDiscountInfo[];
  taxes: ITaxInfo[];
  
  // Order Timeline
  timeline: IOrderEvent[];
  
  // Customer Notes
  customerNotes?: string;
  adminNotes?: string;
  
  // Metadata
  source: 'web' | 'mobile' | 'admin' | 'api';
  channel: 'online' | 'phone' | 'email' | 'social';
  currency: string;
  exchangeRate: number;
  
  // Fulfillment
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  
  // Related Orders
  parentOrderId?: mongoose.Types.ObjectId;
  relatedOrders?: mongoose.Types.ObjectId[];
  
  // Timestamps
  placedAt: Date;
  confirmedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Order Item Schema
const OrderItemSchema: Schema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required']
  },
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  productType: {
    type: String,
    required: [true, 'Product type is required']
  },
  variantSku: {
    type: String,
    required: [true, 'Variant SKU is required'],
    trim: true
  },
  variantName: {
    type: String,
    required: [true, 'Variant name is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price must be positive']
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total price must be positive']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'fixed'
  },
  weight: {
    type: Number,
    required: [true, 'Weight is required'],
    min: [0, 'Weight must be positive']
  },
  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 }
  },
  bundleItems: [{
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    productName: {
      type: String,
      required: true,
      trim: true
    },
    variantSku: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  }]
});

// Address Schemas
const AddressSchema: Schema = new Schema({
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
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
});

// Payment Information Schema
const PaymentInfoSchema: Schema = new Schema({
  method: {
    type: String,
    enum: Object.values(PaymentMethod),
    required: [true, 'Payment method is required']
  },
  status: {
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING
  },
  transactionId: {
    type: String,
    trim: true
  },
  paymentGateway: {
    type: String,
    trim: true
  },
  gatewayResponse: Schema.Types.Mixed,
  paidAt: Date,
  authorizedAt: Date,
  capturedAt: Date,
  failureReason: {
    type: String,
    trim: true
  },
  refundedAmount: {
    type: Number,
    default: 0,
    min: [0, 'Refunded amount cannot be negative']
  },
  refundedAt: Date
});

// Shipping Information Schema
const ShippingInfoSchema: Schema = new Schema({
  method: {
    type: String,
    enum: Object.values(ShippingMethod),
    required: [true, 'Shipping method is required']
  },
  carrier: {
    type: String,
    trim: true
  },
  trackingNumber: {
    type: String,
    trim: true
  },
  trackingUrl: {
    type: String,
    trim: true
  },
  estimatedDelivery: Date,
  actualDelivery: Date,
  shippedAt: Date,
  cost: {
    type: Number,
    required: [true, 'Shipping cost is required'],
    min: [0, 'Shipping cost must be positive']
  },
  weight: {
    type: Number,
    required: [true, 'Total weight is required'],
    min: [0, 'Weight must be positive']
  },
  dimensions: {
    length: {
      type: Number,
      required: [true, 'Length is required'],
      min: [0, 'Length must be positive']
    },
    width: {
      type: Number,
      required: [true, 'Width is required'],
      min: [0, 'Width must be positive']
    },
    height: {
      type: Number,
      required: [true, 'Height is required'],
      min: [0, 'Height must be positive']
    }
  },
  specialInstructions: {
    type: String,
    trim: true,
    maxlength: [500, 'Special instructions must be less than 500 characters']
  }
});

// Order Timeline Event Schema
const OrderEventSchema: Schema = new Schema({
  status: {
    type: String,
    enum: Object.values(OrderStatus),
    required: [true, 'Status is required']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: [true, 'Timestamp is required']
  },
  note: {
    type: String,
    trim: true,
    maxlength: [500, 'Note must be less than 500 characters']
  },
  updatedBy: {
    type: String,
    trim: true
  },
  metadata: Schema.Types.Mixed
});

// Discount Information Schema
const DiscountInfoSchema: Schema = new Schema({
  code: {
    type: String,
    trim: true,
    uppercase: true
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed', 'shipping', 'buy_x_get_y'],
    required: [true, 'Discount type is required']
  },
  amount: {
    type: Number,
    required: [true, 'Discount amount is required'],
    min: [0, 'Discount amount must be positive']
  },
  description: {
    type: String,
    required: [true, 'Discount description is required'],
    trim: true
  },
  appliedTo: {
    type: String,
    enum: ['order', 'shipping', 'item'],
    required: [true, 'Applied to field is required']
  }
});

// Tax Information Schema
const TaxInfoSchema: Schema = new Schema({
  rate: {
    type: Number,
    required: [true, 'Tax rate is required'],
    min: [0, 'Tax rate cannot be negative'],
    max: [100, 'Tax rate cannot exceed 100%']
  },
  amount: {
    type: Number,
    required: [true, 'Tax amount is required'],
    min: [0, 'Tax amount must be positive']
  },
  breakdown: [{
    name: {
      type: String,
      required: [true, 'Tax name is required'],
      trim: true
    },
    rate: {
      type: Number,
      required: [true, 'Tax rate is required'],
      min: [0, 'Tax rate cannot be negative']
    },
    amount: {
      type: Number,
      required: [true, 'Tax amount is required'],
      min: [0, 'Tax amount must be positive']
    }
  }]
});

// Order Totals Schema
const OrderTotalsSchema: Schema = new Schema({
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal must be positive']
  },
  discountTotal: {
    type: Number,
    default: 0,
    min: [0, 'Discount total cannot be negative']
  },
  taxTotal: {
    type: Number,
    default: 0,
    min: [0, 'Tax total cannot be negative']
  },
  shippingTotal: {
    type: Number,
    default: 0,
    min: [0, 'Shipping total cannot be negative']
  },
  total: {
    type: Number,
    required: [true, 'Total is required'],
    min: [0, 'Total must be positive']
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'Paid amount cannot be negative']
  },
  refundedAmount: {
    type: Number,
    default: 0,
    min: [0, 'Refunded amount cannot be negative']
  },
  outstandingAmount: {
    type: Number,
    default: 0,
    min: [0, 'Outstanding amount cannot be negative']
  }
});

// Main Order Schema
const OrderSchema: Schema = new Schema({
  // Order Identification
  orderNumber: {
    type: String,
    required: [true, 'Order number is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Member',
    required: [true, 'Customer ID is required']
  },
  customerEmail: {
    type: String,
    required: [true, 'Customer email is required'],
    trim: true,
    lowercase: true
  },
  customerPhone: {
    type: String,
    trim: true
  },
  
  // Order Status
  status: {
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING
  },
  paymentStatus: {
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING
  },
  fulfillmentStatus: {
    type: String,
    default: 'unfulfilled'
  },
  
  // Order Items
  items: {
    type: [OrderItemSchema],
    validate: {
      validator: function(items: IOrderItem[]) {
        return items && items.length > 0;
      },
      message: 'Order must contain at least one item'
    }
  },
  
  // Addresses
  shippingAddress: {
    type: AddressSchema,
    required: [true, 'Shipping address is required']
  },
  billingAddress: {
    type: AddressSchema,
    required: [true, 'Billing address is required']
  },
  
  // Payment Information
  paymentInfo: {
    type: PaymentInfoSchema,
    required: [true, 'Payment information is required']
  },
  
  // Shipping Information
  shippingInfo: {
    type: ShippingInfoSchema,
    required: [true, 'Shipping information is required']
  },
  
  // Financial Details
  totals: {
    type: OrderTotalsSchema,
    required: [true, 'Order totals are required']
  },
  discounts: [DiscountInfoSchema],
  taxes: [TaxInfoSchema],
  
  // Order Timeline
  timeline: {
    type: [OrderEventSchema],
    default: function() {
      return [{
        status: OrderStatus.PENDING,
        timestamp: new Date(),
        note: 'Order created'
      }];
    }
  },
  
  // Customer Notes
  customerNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Customer notes must be less than 1000 characters']
  },
  adminNotes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Admin notes must be less than 2000 characters']
  },
  
  // Metadata
  source: {
    type: String,
    enum: ['web', 'mobile', 'admin', 'api'],
    default: 'web'
  },
  channel: {
    type: String,
    enum: ['online', 'phone', 'email', 'social'],
    default: 'online'
  },
  currency: {
    type: String,
    default: 'PHP',
    uppercase: true
  },
  exchangeRate: {
    type: Number,
    default: 1.0,
    min: [0, 'Exchange rate must be positive']
  },
  
  // Fulfillment
  expectedDeliveryDate: Date,
  actualDeliveryDate: Date,
  
  // Related Orders
  parentOrderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order'
  },
  relatedOrders: [{
    type: Schema.Types.ObjectId,
    ref: 'Order'
  }],
  
  // Timestamps
  placedAt: {
    type: Date,
    default: Date.now
  },
  confirmedAt: Date,
  shippedAt: Date,
  deliveredAt: Date,
  cancelledAt: Date
}, {
  timestamps: true,
  versionKey: false
});

// Pre-save middleware
OrderSchema.pre('save', async function(next) {
  // Generate order number if not exists
  if (this.isNew && !this.orderNumber) {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    this.orderNumber = `SO-${timestamp.slice(-6)}${random}`;
  }
  
  // Calculate totals
  this.totals.subtotal = this.items.reduce((sum: number, item: IOrderItem) => sum + item.totalPrice, 0);
  this.totals.discountTotal = this.discounts.reduce((sum: number, discount: IDiscountInfo) => sum + discount.amount, 0);
  this.totals.taxTotal = this.taxes.reduce((sum: number, tax: ITaxInfo) => sum + tax.amount, 0);
  this.totals.shippingTotal = this.shippingInfo.cost;
  this.totals.total = this.totals.subtotal - this.totals.discountTotal + this.totals.taxTotal + this.totals.shippingTotal;
  this.totals.outstandingAmount = this.totals.total - this.totals.paidAmount + this.totals.refundedAmount;
  
  // Calculate total weight and dimensions
  const totalWeight = this.items.reduce((sum: number, item: IOrderItem) => sum + (item.weight * item.quantity), 0);
  this.shippingInfo.weight = totalWeight;
  
  next();
});

// Instance Methods
OrderSchema.methods.addTimelineEvent = function(status: OrderStatus, note?: string, updatedBy?: string, metadata?: any) {
  this.timeline.push({
    status,
    timestamp: new Date(),
    note,
    updatedBy,
    metadata
  });
  
  // Update main status
  this.status = status;
  
  // Update specific timestamps
  const now = new Date();
  switch (status) {
    case OrderStatus.CONFIRMED:
      this.confirmedAt = now;
      break;
    case OrderStatus.SHIPPED:
      this.shippedAt = now;
      break;
    case OrderStatus.DELIVERED:
      this.deliveredAt = now;
      break;
    case OrderStatus.CANCELLED:
      this.cancelledAt = now;
      break;
  }
};

OrderSchema.methods.calculateShipping = function(shippingRates: any) {
  // Implement shipping calculation logic based on weight, dimensions, and destination
  // This is a placeholder implementation
  const baseRate = 50; // Base shipping rate in PHP
  const weightRate = this.shippingInfo.weight * 10; // 10 PHP per kg
  return Math.max(baseRate, weightRate);
};

OrderSchema.methods.applyDiscount = function(discountCode: string, discountAmount: number, discountType: 'percentage' | 'fixed') {
  const discount: IDiscountInfo = {
    code: discountCode,
    type: discountType,
    amount: discountAmount,
    description: `Applied discount code: ${discountCode}`,
    appliedTo: 'order'
  };
  
  this.discounts.push(discount);
  this.markModified('discounts');
};

OrderSchema.methods.canBeCancelled = function(): boolean {
  return [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING].includes(this.status);
};

OrderSchema.methods.canBeReturned = function(): boolean {
  return this.status === OrderStatus.DELIVERED && 
         this.deliveredAt && 
         (Date.now() - this.deliveredAt.getTime()) <= (30 * 24 * 60 * 60 * 1000); // 30 days
};

// Static Methods
OrderSchema.statics.findByCustomer = function(customerId: string, limit: number = 10, skip: number = 0) {
  return this.find({ customerId })
             .sort({ createdAt: -1 })
             .limit(limit)
             .skip(skip)
             .populate('customerId', 'name email');
};

OrderSchema.statics.findByStatus = function(status: OrderStatus, limit: number = 50) {
  return this.find({ status }).limit(limit).sort({ createdAt: -1 });
};

OrderSchema.statics.findByDateRange = function(startDate: Date, endDate: Date) {
  return this.find({
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ createdAt: -1 });
};

OrderSchema.statics.getOrderStats = function(startDate?: Date, endDate?: Date) {
  const matchStage: any = {};
  if (startDate && endDate) {
    matchStage.createdAt = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totals.total' },
        averageOrderValue: { $avg: '$totals.total' },
        statusBreakdown: {
          $push: {
            status: '$status',
            total: '$totals.total'
          }
        }
      }
    }
  ]);
};

// Comprehensive Indexing Strategy
// Core identification indexes
// orderNumber index is automatically created from unique: true in schema
OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ customerEmail: 1 });

// Status tracking indexes
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ fulfillmentStatus: 1 });

// Financial indexes
OrderSchema.index({ 'totals.total': -1 });
OrderSchema.index({ 'paymentInfo.transactionId': 1 }, { sparse: true });

// Shipping and tracking indexes
OrderSchema.index({ 'shippingInfo.trackingNumber': 1 }, { sparse: true });
OrderSchema.index({ 'shippingInfo.method': 1 });
OrderSchema.index({ 'shippingAddress.zipCode': 1 });

// Timeline and date indexes
OrderSchema.index({ placedAt: -1 });
OrderSchema.index({ shippedAt: -1 }, { sparse: true });
OrderSchema.index({ deliveredAt: -1 }, { sparse: true });
OrderSchema.index({ expectedDeliveryDate: 1 }, { sparse: true });

// Product and inventory indexes
OrderSchema.index({ 'items.productId': 1 });
OrderSchema.index({ 'items.variantSku': 1 });

// Compound indexes for common queries
OrderSchema.index({ status: 1, customerId: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, status: 1 });
OrderSchema.index({ source: 1, createdAt: -1 });

export default mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

// Export utility functions for order management
export const OrderUtils = {
  // Generate unique order number
  generateOrderNumber: () => {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `SO-${timestamp.slice(-6)}${random}`;
  },
  
  // Calculate order totals
  calculateOrderTotals: (items: IOrderItem[], shippingCost: number = 0, discounts: IDiscountInfo[] = [], taxes: ITaxInfo[] = []) => {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const discountTotal = discounts.reduce((sum, discount) => sum + discount.amount, 0);
    const taxTotal = taxes.reduce((sum, tax) => sum + tax.amount, 0);
    const total = subtotal - discountTotal + taxTotal + shippingCost;
    
    return {
      subtotal,
      discountTotal,
      taxTotal,
      shippingTotal: shippingCost,
      total,
      paidAmount: 0,
      refundedAmount: 0,
      outstandingAmount: total
    };
  },
  
  // Validate order data
  validateOrderData: (orderData: Partial<IOrder>) => {
    const errors: string[] = [];
    
    if (!orderData.items || orderData.items.length === 0) {
      errors.push('Order must contain at least one item');
    }
    
    if (!orderData.shippingAddress) {
      errors.push('Shipping address is required');
    }
    
    if (!orderData.billingAddress) {
      errors.push('Billing address is required');
    }
    
    if (!orderData.paymentInfo) {
      errors.push('Payment information is required');
    }
    
    return errors;
  },
  
  // Calculate shipping based on weight and dimensions
  calculateShipping: (weight: number, dimensions: { length: number; width: number; height: number }, method: ShippingMethod) => {
    const baseRates = {
      [ShippingMethod.STANDARD]: 50,
      [ShippingMethod.EXPRESS]: 100,
      [ShippingMethod.OVERNIGHT]: 200,
      [ShippingMethod.SAME_DAY]: 300,
      [ShippingMethod.PICKUP]: 0
    };
    
    const weightCost = weight * 10; // 10 PHP per kg
    const volumeWeight = (dimensions.length * dimensions.width * dimensions.height) / 5000; // Dimensional weight
    const billableWeight = Math.max(weight, volumeWeight);
    
    return baseRates[method] + (billableWeight * 5);
  }
};