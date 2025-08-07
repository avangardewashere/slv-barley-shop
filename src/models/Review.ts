import mongoose, { Document, Schema } from 'mongoose';

// Review Status Enumeration
export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged',
  HIDDEN = 'hidden'
}

// Review Type Enumeration
export enum ReviewType {
  VERIFIED_PURCHASE = 'verified_purchase',
  UNVERIFIED = 'unverified',
  INCENTIVIZED = 'incentivized'
}

// Review Sentiment Enumeration
export enum ReviewSentiment {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative'
}

// Review Media Interface
export interface IReviewMedia {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  caption?: string;
  uploadedAt: Date;
}

// Review Response Interface (for admin/merchant responses)
export interface IReviewResponse {
  responderId: mongoose.Types.ObjectId;
  responderType: 'admin' | 'merchant';
  responderName: string;
  response: string;
  respondedAt: Date;
}

// Review Helpful Votes Interface
export interface IReviewVote {
  userId: mongoose.Types.ObjectId;
  type: 'helpful' | 'not_helpful';
  votedAt: Date;
}

// Review Moderation Interface
export interface IReviewModeration {
  moderatedBy: mongoose.Types.ObjectId;
  moderatedAt: Date;
  reason?: string;
  previousStatus?: ReviewStatus;
  notes?: string;
}

// Review Analytics Interface
export interface IReviewAnalytics {
  viewCount: number;
  helpfulVotes: number;
  notHelpfulVotes: number;
  reportCount: number;
  shareCount: number;
  lastViewedAt?: Date;
}

// Main Review Interface
export interface IReview extends Document {
  // Core Review Information
  productId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  orderItemId?: mongoose.Types.ObjectId;
  
  // Review Content
  rating: number; // 1-5 stars
  title: string;
  content: string;
  pros?: string[];
  cons?: string[];
  
  // Review Classification
  status: ReviewStatus;
  type: ReviewType;
  sentiment: ReviewSentiment;
  
  // Customer Information (cached for performance)
  customerName: string;
  customerEmail: string;
  customerAvatar?: string;
  customerMembershipTier?: string;
  
  // Product Information (cached for performance)
  productName: string;
  productVariantSku?: string;
  productVariantName?: string;
  
  // Media Attachments
  media: IReviewMedia[];
  
  // Interaction Data
  votes: IReviewVote[];
  analytics: IReviewAnalytics;
  
  // Responses
  responses: IReviewResponse[];
  
  // Verification
  isVerifiedPurchase: boolean;
  verificationToken?: string;
  verifiedAt?: Date;
  
  // Moderation
  moderation?: IReviewModeration;
  reportedBy?: mongoose.Types.ObjectId[];
  reportReasons?: string[];
  
  // Quality Indicators
  qualityScore: number; // 0-100 based on various factors
  languageCode: string;
  isTranslated: boolean;
  originalLanguage?: string;
  
  // Timing Information
  purchaseDate?: Date;
  reviewDate: Date;
  lastModifiedAt?: Date;
  
  // Feature Ratings (optional detailed ratings)
  featureRatings?: Array<{
    feature: string;
    rating: number;
    weight?: number;
  }>;
  
  // Review Context
  reviewSource: 'web' | 'mobile' | 'email' | 'sms';
  isIncentivized: boolean;
  incentiveType?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Review Media Schema
const ReviewMediaSchema: Schema = new Schema({
  type: {
    type: String,
    enum: ['image', 'video'],
    required: [true, 'Media type is required']
  },
  url: {
    type: String,
    required: [true, 'Media URL is required'],
    trim: true
  },
  thumbnail: {
    type: String,
    trim: true
  },
  caption: {
    type: String,
    trim: true,
    maxlength: [200, 'Caption must be less than 200 characters']
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

// Review Response Schema
const ReviewResponseSchema: Schema = new Schema({
  responderId: {
    type: Schema.Types.ObjectId,
    required: [true, 'Responder ID is required']
  },
  responderType: {
    type: String,
    enum: ['admin', 'merchant'],
    required: [true, 'Responder type is required']
  },
  responderName: {
    type: String,
    required: [true, 'Responder name is required'],
    trim: true,
    maxlength: [100, 'Responder name must be less than 100 characters']
  },
  response: {
    type: String,
    required: [true, 'Response is required'],
    trim: true,
    maxlength: [2000, 'Response must be less than 2000 characters']
  },
  respondedAt: {
    type: Date,
    default: Date.now
  }
});

// Review Vote Schema
const ReviewVoteSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'Member',
    required: [true, 'User ID is required']
  },
  type: {
    type: String,
    enum: ['helpful', 'not_helpful'],
    required: [true, 'Vote type is required']
  },
  votedAt: {
    type: Date,
    default: Date.now
  }
});

// Review Moderation Schema
const ReviewModerationSchema: Schema = new Schema({
  moderatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'Moderator ID is required']
  },
  moderatedAt: {
    type: Date,
    default: Date.now
  },
  reason: {
    type: String,
    trim: true,
    maxlength: [500, 'Reason must be less than 500 characters']
  },
  previousStatus: {
    type: String,
    enum: Object.values(ReviewStatus)
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes must be less than 1000 characters']
  }
});

// Review Analytics Schema
const ReviewAnalyticsSchema: Schema = new Schema({
  viewCount: {
    type: Number,
    default: 0,
    min: [0, 'View count cannot be negative']
  },
  helpfulVotes: {
    type: Number,
    default: 0,
    min: [0, 'Helpful votes cannot be negative']
  },
  notHelpfulVotes: {
    type: Number,
    default: 0,
    min: [0, 'Not helpful votes cannot be negative']
  },
  reportCount: {
    type: Number,
    default: 0,
    min: [0, 'Report count cannot be negative']
  },
  shareCount: {
    type: Number,
    default: 0,
    min: [0, 'Share count cannot be negative']
  },
  lastViewedAt: Date
});

// Feature Rating Schema
const FeatureRatingSchema: Schema = new Schema({
  feature: {
    type: String,
    required: [true, 'Feature name is required'],
    trim: true,
    maxlength: [50, 'Feature name must be less than 50 characters']
  },
  rating: {
    type: Number,
    required: [true, 'Feature rating is required'],
    min: [1, 'Feature rating must be at least 1'],
    max: [5, 'Feature rating cannot exceed 5']
  },
  weight: {
    type: Number,
    default: 1,
    min: [0, 'Weight cannot be negative'],
    max: [10, 'Weight cannot exceed 10']
  }
});

// Main Review Schema
const ReviewSchema: Schema = new Schema({
  // Core Review Information
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required'],
    index: true
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Member',
    required: [true, 'Customer ID is required'],
    index: true
  },
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order'
  },
  orderItemId: {
    type: Schema.Types.ObjectId
  },
  
  // Review Content
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1 star'],
    max: [5, 'Rating cannot exceed 5 stars']
  },
  title: {
    type: String,
    required: [true, 'Review title is required'],
    trim: true,
    maxlength: [200, 'Title must be less than 200 characters'],
    minlength: [5, 'Title must be at least 5 characters']
  },
  content: {
    type: String,
    required: [true, 'Review content is required'],
    trim: true,
    maxlength: [5000, 'Content must be less than 5000 characters'],
    minlength: [20, 'Content must be at least 20 characters']
  },
  pros: [{
    type: String,
    trim: true,
    maxlength: [200, 'Each pro must be less than 200 characters']
  }],
  cons: [{
    type: String,
    trim: true,
    maxlength: [200, 'Each con must be less than 200 characters']
  }],
  
  // Review Classification
  status: {
    type: String,
    enum: Object.values(ReviewStatus),
    default: ReviewStatus.PENDING
  },
  type: {
    type: String,
    enum: Object.values(ReviewType),
    default: ReviewType.UNVERIFIED
  },
  sentiment: {
    type: String,
    enum: Object.values(ReviewSentiment),
    default: ReviewSentiment.NEUTRAL
  },
  
  // Customer Information (cached)
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Customer name must be less than 100 characters']
  },
  customerEmail: {
    type: String,
    required: [true, 'Customer email is required'],
    trim: true,
    lowercase: true
  },
  customerAvatar: {
    type: String,
    trim: true
  },
  customerMembershipTier: {
    type: String,
    enum: ['basic', 'premium', 'vip'],
    default: 'basic'
  },
  
  // Product Information (cached)
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name must be less than 200 characters']
  },
  productVariantSku: {
    type: String,
    trim: true,
    uppercase: true
  },
  productVariantName: {
    type: String,
    trim: true,
    maxlength: [100, 'Product variant name must be less than 100 characters']
  },
  
  // Media Attachments
  media: {
    type: [ReviewMediaSchema],
    validate: {
      validator: function(media: IReviewMedia[]) {
        return media.length <= 10; // Maximum 10 media files per review
      },
      message: 'Maximum 10 media files allowed per review'
    }
  },
  
  // Interaction Data
  votes: [ReviewVoteSchema],
  analytics: {
    type: ReviewAnalyticsSchema,
    default: () => ({})
  },
  
  // Responses
  responses: {
    type: [ReviewResponseSchema],
    validate: {
      validator: function(responses: IReviewResponse[]) {
        return responses.length <= 5; // Maximum 5 responses per review
      },
      message: 'Maximum 5 responses allowed per review'
    }
  },
  
  // Verification
  isVerifiedPurchase: {
    type: Boolean,
    default: false,
    index: true
  },
  verificationToken: {
    type: String,
    trim: true,
    select: false // Don't include in queries by default
  },
  verifiedAt: Date,
  
  // Moderation
  moderation: ReviewModerationSchema,
  reportedBy: [{
    type: Schema.Types.ObjectId,
    ref: 'Member'
  }],
  reportReasons: [{
    type: String,
    trim: true,
    enum: ['spam', 'inappropriate', 'fake', 'offensive', 'copyright', 'other']
  }],
  
  // Quality Indicators
  qualityScore: {
    type: Number,
    default: 50,
    min: [0, 'Quality score cannot be negative'],
    max: [100, 'Quality score cannot exceed 100'],
    index: true
  },
  languageCode: {
    type: String,
    default: 'en',
    trim: true,
    lowercase: true
  },
  isTranslated: {
    type: Boolean,
    default: false
  },
  originalLanguage: {
    type: String,
    trim: true,
    lowercase: true
  },
  
  // Timing Information
  purchaseDate: Date,
  reviewDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastModifiedAt: Date,
  
  // Feature Ratings
  featureRatings: {
    type: [FeatureRatingSchema],
    validate: {
      validator: function(ratings: Array<{feature: string; rating: number; weight?: number}>) {
        return ratings.length <= 10; // Maximum 10 feature ratings
      },
      message: 'Maximum 10 feature ratings allowed'
    }
  },
  
  // Review Context
  reviewSource: {
    type: String,
    enum: ['web', 'mobile', 'email', 'sms'],
    default: 'web'
  },
  isIncentivized: {
    type: Boolean,
    default: false
  },
  incentiveType: {
    type: String,
    trim: true,
    maxlength: [100, 'Incentive type must be less than 100 characters']
  }
}, {
  timestamps: true,
  versionKey: false
});

// Compound unique index to prevent duplicate reviews
ReviewSchema.index({ productId: 1, customerId: 1, orderId: 1 }, { unique: true });

// Pre-save middleware
ReviewSchema.pre('save', function(next) {
  // Update last modified date
  if (this.isModified() && !this.isNew) {
    this.lastModifiedAt = new Date();
  }
  
  // Determine sentiment based on rating
  if (this.rating >= 4) {
    this.sentiment = ReviewSentiment.POSITIVE;
  } else if (this.rating >= 3) {
    this.sentiment = ReviewSentiment.NEUTRAL;
  } else {
    this.sentiment = ReviewSentiment.NEGATIVE;
  }
  
  // Calculate quality score
  this.qualityScore = this.calculateQualityScore();
  
  // Update analytics from votes
  this.analytics.helpfulVotes = this.votes.filter(vote => vote.type === 'helpful').length;
  this.analytics.notHelpfulVotes = this.votes.filter(vote => vote.type === 'not_helpful').length;
  
  next();
});

// Post-save middleware to update product review stats
ReviewSchema.post('save', async function(doc) {
  try {
    const Product = mongoose.model('Product');
    const product = await Product.findById(doc.productId);
    
    if (product) {
      // Recalculate product review statistics
      const reviews = await mongoose.model('Review').find({
        productId: doc.productId,
        status: ReviewStatus.APPROVED
      });
      
      if (reviews.length > 0) {
        const totalRating = reviews.reduce((sum: number, review: any) => sum + review.rating, 0);
        const averageRating = totalRating / reviews.length;
        
        const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach((review: any) => {
          ratingDistribution[review.rating as keyof typeof ratingDistribution]++;
        });
        
        product.reviewStats = {
          averageRating: Math.round(averageRating * 100) / 100,
          totalReviews: reviews.length,
          ratingDistribution,
          lastUpdated: new Date()
        };
        
        await product.save();
      }
    }
  } catch (error) {
    console.error('Error updating product review stats:', error);
  }
});

// Instance Methods
ReviewSchema.methods.calculateQualityScore = function(): number {
  let score = 50; // Base score
  
  // Content length bonus (up to +20)
  const contentLength = this.content.length;
  if (contentLength > 100) score += Math.min(20, (contentLength - 100) / 50);
  
  // Title quality bonus (up to +10)
  if (this.title.length >= 20) score += 10;
  
  // Media bonus (up to +15)
  score += Math.min(15, this.media.length * 5);
  
  // Pros/Cons bonus (up to +10)
  if (this.pros && this.pros.length > 0) score += 5;
  if (this.cons && this.cons.length > 0) score += 5;
  
  // Feature ratings bonus (up to +10)
  if (this.featureRatings && this.featureRatings.length > 0) score += Math.min(10, this.featureRatings.length * 2);
  
  // Verification bonus (+15)
  if (this.isVerifiedPurchase) score += 15;
  
  // Helpful votes bonus (up to +10)
  const helpfulRatio = this.analytics.helpfulVotes / Math.max(1, this.analytics.helpfulVotes + this.analytics.notHelpfulVotes);
  score += Math.min(10, helpfulRatio * 10);
  
  // Report penalty (up to -30)
  score -= Math.min(30, this.analytics.reportCount * 10);
  
  return Math.max(0, Math.min(100, Math.round(score)));
};

ReviewSchema.methods.addVote = function(userId: mongoose.Types.ObjectId, voteType: 'helpful' | 'not_helpful') {
  // Remove existing vote from this user
  this.votes = this.votes.filter((vote: IReviewVote) => !vote.userId.equals(userId));
  
  // Add new vote
  this.votes.push({
    userId,
    type: voteType,
    votedAt: new Date()
  });
  
  this.markModified('votes');
};

ReviewSchema.methods.addResponse = function(responderId: mongoose.Types.ObjectId, responderType: 'admin' | 'merchant', responderName: string, response: string) {
  this.responses.push({
    responderId,
    responderType,
    responderName,
    response,
    respondedAt: new Date()
  });
  
  this.markModified('responses');
};

ReviewSchema.methods.moderate = function(moderatorId: mongoose.Types.ObjectId, newStatus: ReviewStatus, reason?: string, notes?: string) {
  const previousStatus = this.status;
  
  this.moderation = {
    moderatedBy: moderatorId,
    moderatedAt: new Date(),
    reason,
    previousStatus,
    notes
  };
  
  this.status = newStatus;
};

ReviewSchema.methods.incrementView = function() {
  this.analytics.viewCount += 1;
  this.analytics.lastViewedAt = new Date();
  this.markModified('analytics');
};

ReviewSchema.methods.reportReview = function(reporterId: mongoose.Types.ObjectId, reason: string) {
  if (!this.reportedBy.includes(reporterId)) {
    this.reportedBy.push(reporterId);
    this.reportReasons.push(reason);
    this.analytics.reportCount += 1;
    this.markModified('reportedBy');
    this.markModified('reportReasons');
    this.markModified('analytics');
  }
};

// Static Methods
ReviewSchema.statics.findByProduct = function(productId: string, status: ReviewStatus = ReviewStatus.APPROVED, limit: number = 20, skip: number = 0) {
  return this.find({ productId, status })
             .sort({ createdAt: -1 })
             .limit(limit)
             .skip(skip)
             .populate('customerId', 'name membershipTier');
};

ReviewSchema.statics.findByCustomer = function(customerId: string, limit: number = 10, skip: number = 0) {
  return this.find({ customerId })
             .sort({ createdAt: -1 })
             .limit(limit)
             .skip(skip)
             .populate('productId', 'name images');
};

ReviewSchema.statics.findTopRated = function(minRating: number = 4, limit: number = 10) {
  return this.find({
    rating: { $gte: minRating },
    status: ReviewStatus.APPROVED
  })
  .sort({ qualityScore: -1, 'analytics.helpfulVotes': -1 })
  .limit(limit);
};

ReviewSchema.statics.findPendingModeration = function(limit: number = 50) {
  return this.find({ status: ReviewStatus.PENDING })
             .sort({ createdAt: 1 })
             .limit(limit);
};

ReviewSchema.statics.getReviewStats = function(productId?: string, startDate?: Date, endDate?: Date) {
  const matchStage: any = { status: ReviewStatus.APPROVED };
  
  if (productId) matchStage.productId = new mongoose.Types.ObjectId(productId);
  if (startDate && endDate) matchStage.createdAt = { $gte: startDate, $lte: endDate };
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        ratingDistribution: {
          $push: '$rating'
        },
        sentimentBreakdown: {
          $push: '$sentiment'
        },
        verifiedPurchases: {
          $sum: { $cond: ['$isVerifiedPurchase', 1, 0] }
        }
      }
    }
  ]);
};

// Comprehensive Indexing Strategy
// Core identification indexes
ReviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ customerId: 1, createdAt: -1 });
ReviewSchema.index({ orderId: 1 }, { sparse: true });

// Status and moderation indexes
ReviewSchema.index({ status: 1 });
ReviewSchema.index({ status: 1, createdAt: 1 });

// Rating and quality indexes
ReviewSchema.index({ rating: -1 });
ReviewSchema.index({ qualityScore: -1 });
ReviewSchema.index({ rating: -1, qualityScore: -1 });

// Verification and type indexes
ReviewSchema.index({ isVerifiedPurchase: 1, status: 1 });
ReviewSchema.index({ type: 1 });
ReviewSchema.index({ sentiment: 1 });

// Analytics indexes
ReviewSchema.index({ 'analytics.helpfulVotes': -1 });
ReviewSchema.index({ 'analytics.viewCount': -1 });

// Time-based indexes
ReviewSchema.index({ reviewDate: -1 });
ReviewSchema.index({ createdAt: -1 });
ReviewSchema.index({ verifiedAt: -1 }, { sparse: true });

// Feature and search indexes
ReviewSchema.index({ languageCode: 1 });
ReviewSchema.index({ reviewSource: 1 });

// Text search index
ReviewSchema.index({
  title: 'text',
  content: 'text',
  'pros': 'text',
  'cons': 'text'
}, {
  weights: {
    title: 10,
    content: 5,
    pros: 3,
    cons: 3
  }
});

// Compound indexes for complex queries
ReviewSchema.index({ productId: 1, rating: -1, status: 1 });
ReviewSchema.index({ productId: 1, isVerifiedPurchase: 1, status: 1 });
ReviewSchema.index({ customerId: 1, rating: -1, status: 1 });
ReviewSchema.index({ status: 1, qualityScore: -1 });

export default mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);

// Export utility functions for review management
export const ReviewUtils = {
  // Generate verification token
  generateVerificationToken: () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  },
  
  // Calculate average rating from reviews
  calculateAverageRating: (reviews: IReview[]) => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return Math.round((total / reviews.length) * 100) / 100;
  },
  
  // Get rating distribution
  getRatingDistribution: (reviews: IReview[]) => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(review => {
      distribution[review.rating as keyof typeof distribution]++;
    });
    return distribution;
  },
  
  // Validate review data
  validateReviewData: (reviewData: Partial<IReview>) => {
    const errors: string[] = [];
    
    if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
      errors.push('Rating must be between 1 and 5');
    }
    
    if (!reviewData.title || reviewData.title.length < 5) {
      errors.push('Title must be at least 5 characters long');
    }
    
    if (!reviewData.content || reviewData.content.length < 20) {
      errors.push('Content must be at least 20 characters long');
    }
    
    if (reviewData.media && reviewData.media.length > 10) {
      errors.push('Maximum 10 media files allowed per review');
    }
    
    return errors;
  },
  
  // Check if customer can review product
  canCustomerReviewProduct: async (customerId: string, productId: string, orderId?: string) => {
    const Order = mongoose.model('Order');
    const Review = mongoose.model('Review');
    
    // Check if customer has purchased the product
    const purchaseQuery: any = {
      customerId: new mongoose.Types.ObjectId(customerId),
      'items.productId': new mongoose.Types.ObjectId(productId),
      status: { $in: ['delivered', 'completed'] }
    };
    
    if (orderId) {
      purchaseQuery._id = new mongoose.Types.ObjectId(orderId);
    }
    
    const hasPurchased = await Order.findOne(purchaseQuery);
    
    if (!hasPurchased) {
      return { canReview: false, reason: 'Product not purchased or order not delivered' };
    }
    
    // Check if review already exists
    const existingReview = await Review.findOne({
      customerId: new mongoose.Types.ObjectId(customerId),
      productId: new mongoose.Types.ObjectId(productId),
      orderId: orderId ? new mongoose.Types.ObjectId(orderId) : undefined
    });
    
    if (existingReview) {
      return { canReview: false, reason: 'Review already exists for this product' };
    }
    
    return { canReview: true, verifiedPurchase: true };
  }
};