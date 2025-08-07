import mongoose from 'mongoose';
import { ProductType, ProductStatus } from '../models/Product';
import { OrderStatus, PaymentStatus, PaymentMethod, ShippingMethod } from '../models/Order';
import { ReviewStatus, ReviewType, ReviewSentiment } from '../models/Review';

/**
 * Sample data for seeding the database with the new schema
 */

// Sample Products Data
export const sampleProducts = [
  // Single Product Example
  {
    name: 'Premium Barley Grass Powder',
    description: 'Organic barley grass powder packed with nutrients, vitamins, and minerals. Perfect for daily health maintenance and energy boost.',
    shortDescription: 'Nutrient-rich organic barley grass powder for daily wellness.',
    productType: ProductType.SINGLE,
    status: ProductStatus.ACTIVE,
    category: 'Supplements',
    subcategory: 'Superfood Powders',
    brand: 'Salveo Organics',
    manufacturer: 'Salveo Manufacturing Inc.',
    images: [
      '/images/products/barley-grass-powder-main.jpg',
      '/images/products/barley-grass-powder-2.jpg',
      '/images/products/barley-grass-powder-3.jpg'
    ],
    variants: [
      {
        name: '100g Powder',
        price: 899,
        compareAtPrice: 1199,
        sku: 'SLV-BGP-100G',
        inventory: 150,
        weight: 0.12,
        dimensions: {
          length: 8,
          width: 8,
          height: 12
        },
        barcode: '1234567890123',
        isDefault: true,
        attributes: [
          { name: 'Size', value: '100g' },
          { name: 'Form', value: 'Powder' },
          { name: 'Certification', value: 'Organic' }
        ]
      },
      {
        name: '200g Powder',
        price: 1599,
        compareAtPrice: 2199,
        sku: 'SLV-BGP-200G',
        inventory: 100,
        weight: 0.22,
        dimensions: {
          length: 10,
          width: 10,
          height: 15
        },
        barcode: '1234567890124',
        isDefault: false,
        attributes: [
          { name: 'Size', value: '200g' },
          { name: 'Form', value: 'Powder' },
          { name: 'Certification', value: 'Organic' }
        ]
      }
    ],
    tags: ['organic', 'superfood', 'barley', 'powder', 'nutrients', 'energy'],
    isActive: true,
    isFeatured: true,
    seoTitle: 'Premium Organic Barley Grass Powder - Salveo Organics',
    seoDescription: 'Buy premium organic barley grass powder online. Rich in nutrients, vitamins and minerals for daily wellness. Free shipping on orders over ₱1500.',
    metaKeywords: ['barley grass', 'organic powder', 'superfood', 'health supplement'],
    ingredients: [
      '100% Organic Barley Grass Powder (Hordeum vulgare)',
      'No artificial additives',
      'No preservatives',
      'No fillers'
    ],
    benefits: [
      'Rich in vitamins A, C, E, and K',
      'High in antioxidants',
      'Supports immune system',
      'Natural energy booster',
      'Aids in detoxification',
      'Supports digestive health'
    ],
    howToUse: 'Mix 1-2 teaspoons (3-6g) with 200ml water, juice, or smoothie. Take once daily, preferably on an empty stomach in the morning.',
    warnings: [
      'Consult your physician before use if pregnant, nursing, or have medical conditions',
      'Keep out of reach of children',
      'Store in a cool, dry place'
    ],
    nutritionFacts: {
      servingSize: '3g (1 teaspoon)',
      servingsPerContainer: 33,
      nutrients: [
        { name: 'Calories', amount: '10', dailyValue: '<1%', unit: 'kcal' },
        { name: 'Protein', amount: '1.2g', dailyValue: '2%', unit: 'g' },
        { name: 'Vitamin A', amount: '450mcg', dailyValue: '50%', unit: 'mcg' },
        { name: 'Vitamin C', amount: '18mg', dailyValue: '20%', unit: 'mg' },
        { name: 'Iron', amount: '1.8mg', dailyValue: '10%', unit: 'mg' },
        { name: 'Calcium', amount: '30mg', dailyValue: '3%', unit: 'mg' }
      ]
    },
    certifications: ['Organic Certified', 'GMP Certified', 'FDA Registered'],
    regulatoryInfo: {
      fdaApproved: true,
      organicCertified: true,
      halalCertified: false,
      kosherCertified: false,
      gmpCertified: true
    },
    shipping: {
      weight: 0.12,
      dimensions: {
        length: 8,
        width: 8,
        height: 12
      },
      fragile: false,
      requiresSpecialHandling: false,
      shippingClass: 'standard',
      restrictions: []
    },
    lowStockThreshold: 20,
    trackInventory: true,
    allowBackorder: false,
    basePriceRange: {
      min: 899,
      max: 1599
    }
  },

  // Bundle Product Example
  {
    name: 'Complete Wellness Bundle',
    description: 'A comprehensive wellness package containing our top 3 superfood supplements for optimal health and vitality.',
    shortDescription: 'Complete wellness bundle with 3 premium superfood supplements.',
    productType: ProductType.BUNDLE,
    status: ProductStatus.ACTIVE,
    category: 'Supplements',
    subcategory: 'Bundles',
    brand: 'Salveo Organics',
    images: [
      '/images/products/wellness-bundle-main.jpg',
      '/images/products/wellness-bundle-contents.jpg'
    ],
    variants: [{
      name: 'Complete Bundle',
      price: 2499,
      compareAtPrice: 3297,
      sku: 'SLV-WB-001',
      inventory: 50,
      weight: 0.8,
      isDefault: true,
      attributes: [
        { name: 'Bundle Type', value: 'Wellness' },
        { name: 'Items Count', value: '3' },
        { name: 'Savings', value: '₱798' }
      ]
    }],
    tags: ['bundle', 'wellness', 'superfood', 'value pack', 'complete'],
    isActive: true,
    isFeatured: true,
    benefits: [
      'Complete nutrition support',
      '24% savings compared to individual purchase',
      'Convenient all-in-one package',
      'Perfect for beginners'
    ],
    shipping: {
      weight: 0.8,
      dimensions: {
        length: 25,
        width: 20,
        height: 15
      },
      fragile: false,
      requiresSpecialHandling: false,
      shippingClass: 'standard'
    },
    bundleConfig: {
      items: [
        {
          productId: new mongoose.Types.ObjectId(), // This would reference the actual product IDs
          variantSku: 'SLV-BGP-100G',
          quantity: 1,
          discountPercentage: 25
        },
        {
          productId: new mongoose.Types.ObjectId(),
          variantSku: 'SLV-SPR-100G',
          quantity: 1,
          discountPercentage: 25
        },
        {
          productId: new mongoose.Types.ObjectId(),
          variantSku: 'SLV-CHL-100G',
          quantity: 1,
          discountPercentage: 25
        }
      ],
      totalSavings: 798,
      savingsPercentage: 24.2
    },
    basePriceRange: {
      min: 2499,
      max: 2499
    }
  },

  // Membership Product Example
  {
    name: 'Premium Membership Annual',
    description: 'Annual premium membership with exclusive benefits, discounts, and priority support.',
    shortDescription: 'Annual premium membership with exclusive benefits and discounts.',
    productType: ProductType.MEMBERSHIP,
    status: ProductStatus.ACTIVE,
    category: 'Memberships',
    brand: 'Salveo Organics',
    images: [
      '/images/products/premium-membership.jpg'
    ],
    variants: [{
      name: 'Annual Membership',
      price: 2999,
      sku: 'SLV-PM-ANNUAL',
      inventory: 9999,
      weight: 0,
      isDefault: true,
      attributes: [
        { name: 'Duration', value: '12 Months' },
        { name: 'Tier', value: 'Premium' },
        { name: 'Auto-Renewal', value: 'Yes' }
      ]
    }],
    tags: ['membership', 'premium', 'annual', 'benefits', 'exclusive'],
    isActive: true,
    isFeatured: false,
    benefits: [
      '20% discount on all products',
      'Free shipping on all orders',
      'Priority customer support',
      'Early access to new products',
      'Monthly health newsletter',
      'Exclusive member-only products'
    ],
    shipping: {
      weight: 0,
      dimensions: { length: 0, width: 0, height: 0 },
      fragile: false,
      requiresSpecialHandling: false,
      shippingClass: 'standard'
    },
    membershipConfig: {
      duration: 12,
      durationType: 'months',
      benefits: [
        '20% discount on all products',
        'Free shipping on all orders',
        'Priority customer support',
        'Early access to new products'
      ],
      tier: 'premium',
      autoRenewal: true,
      renewalPrice: 2799
    },
    basePriceRange: {
      min: 2999,
      max: 2999
    }
  }
];

// Sample Members Data
export const sampleMembers = [
  {
    email: 'juan.dela.cruz@email.com',
    name: 'Juan Dela Cruz',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    phone: '+639171234567',
    avatar: '/images/avatars/default-male.jpg',
    dateOfBirth: new Date('1985-05-15'),
    gender: 'male',
    addresses: [
      {
        type: 'shipping',
        label: 'Home',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        street: '123 Rizal Street',
        city: 'Quezon City',
        state: 'Metro Manila',
        zipCode: '1101',
        country: 'Philippines',
        phone: '+639171234567',
        isDefault: true
      },
      {
        type: 'billing',
        label: 'Office',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        company: 'ABC Corporation',
        street: '456 Business Ave',
        city: 'Makati City',
        state: 'Metro Manila',
        zipCode: '1226',
        country: 'Philippines',
        isDefault: true
      }
    ],
    membershipTier: 'premium',
    membershipStatus: 'active',
    stats: {
      totalOrders: 5,
      totalSpent: 8500,
      averageOrderValue: 1700,
      totalReviews: 3,
      averageRating: 4.7,
      loyaltyPoints: 850,
      referralCount: 2,
      wishlistItems: 0,
      accountValue: 850
    },
    activity: {
      loginCount: 25,
      pageViews: 150,
      searchCount: 35,
      cartAbandonments: 2,
      supportTickets: 1,
      referralsSent: 3,
      referralsSuccessful: 2
    },
    preferences: {
      categories: ['Supplements', 'Wellness'],
      brands: ['Salveo Organics'],
      priceRange: { min: 500, max: 5000 },
      notifications: {
        email: true,
        sms: false,
        push: true,
        promotions: true,
        orderUpdates: true,
        reviewRequests: true,
        restock: false
      },
      communication: {
        language: 'en',
        timezone: 'Asia/Manila',
        currency: 'PHP'
      },
      privacy: {
        shareReviews: true,
        shareWishlist: false,
        marketingEmails: true,
        dataCollection: true
      }
    },
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
    referralCode: 'JUAN2024'
  },

  {
    email: 'maria.santos@email.com',
    name: 'Maria Santos',
    firstName: 'Maria',
    lastName: 'Santos',
    phone: '+639187654321',
    avatar: '/images/avatars/default-female.jpg',
    gender: 'female',
    addresses: [
      {
        type: 'shipping',
        firstName: 'Maria',
        lastName: 'Santos',
        street: '789 Health Street',
        city: 'Manila',
        state: 'Metro Manila',
        zipCode: '1000',
        country: 'Philippines',
        phone: '+639187654321',
        isDefault: true
      }
    ],
    membershipTier: 'basic',
    membershipStatus: 'active',
    stats: {
      totalOrders: 2,
      totalSpent: 2200,
      averageOrderValue: 1100,
      totalReviews: 1,
      averageRating: 5.0,
      loyaltyPoints: 220,
      referralCount: 0,
      wishlistItems: 3,
      accountValue: 220
    },
    preferences: {
      categories: ['Skincare', 'Beauty'],
      notifications: {
        email: true,
        sms: true,
        promotions: false,
        orderUpdates: true
      }
    },
    isEmailVerified: true,
    isActive: true,
    referralCode: 'MARIA2024',
    wishlist: [] // Would contain actual product ObjectIds
  }
];

// Sample Orders Data
export const sampleOrders = [
  {
    orderNumber: 'SO-240101001',
    customerId: new mongoose.Types.ObjectId(), // Would reference actual customer
    customerEmail: 'juan.dela.cruz@email.com',
    customerPhone: '+639171234567',
    status: OrderStatus.DELIVERED,
    paymentStatus: PaymentStatus.CAPTURED,
    fulfillmentStatus: 'fulfilled',
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        productName: 'Premium Barley Grass Powder',
        productType: 'single',
        variantSku: 'SLV-BGP-200G',
        variantName: '200g Powder',
        quantity: 2,
        unitPrice: 1599,
        totalPrice: 3198,
        discount: 0,
        weight: 0.44
      },
      {
        productId: new mongoose.Types.ObjectId(),
        productName: 'Complete Wellness Bundle',
        productType: 'bundle',
        variantSku: 'SLV-WB-001',
        variantName: 'Complete Bundle',
        quantity: 1,
        unitPrice: 2499,
        totalPrice: 2499,
        discount: 798,
        weight: 0.8,
        bundleItems: [
          {
            productId: new mongoose.Types.ObjectId(),
            productName: 'Premium Barley Grass Powder',
            variantSku: 'SLV-BGP-100G',
            quantity: 1
          },
          {
            productId: new mongoose.Types.ObjectId(),
            productName: 'Spirulina Powder',
            variantSku: 'SLV-SPR-100G',
            quantity: 1
          },
          {
            productId: new mongoose.Types.ObjectId(),
            productName: 'Chlorella Tablets',
            variantSku: 'SLV-CHL-100G',
            quantity: 1
          }
        ]
      }
    ],
    shippingAddress: {
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      street: '123 Rizal Street',
      city: 'Quezon City',
      state: 'Metro Manila',
      zipCode: '1101',
      country: 'Philippines',
      phone: '+639171234567'
    },
    billingAddress: {
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      street: '123 Rizal Street',
      city: 'Quezon City',
      state: 'Metro Manila',
      zipCode: '1101',
      country: 'Philippines',
      phone: '+639171234567'
    },
    paymentInfo: {
      method: PaymentMethod.CREDIT_CARD,
      status: PaymentStatus.CAPTURED,
      transactionId: 'TXN_20240101_001',
      paymentGateway: 'PayMongo',
      paidAt: new Date('2024-01-01T10:30:00Z'),
      capturedAt: new Date('2024-01-01T10:30:30Z')
    },
    shippingInfo: {
      method: ShippingMethod.STANDARD,
      carrier: 'LBC',
      trackingNumber: 'LBC123456789',
      trackingUrl: 'https://lbc.ph/track/LBC123456789',
      cost: 150,
      weight: 1.24,
      dimensions: {
        length: 30,
        width: 25,
        height: 20
      },
      estimatedDelivery: new Date('2024-01-05'),
      actualDelivery: new Date('2024-01-04'),
      shippedAt: new Date('2024-01-02')
    },
    totals: {
      subtotal: 5697,
      discountTotal: 0,
      taxTotal: 0,
      shippingTotal: 150,
      total: 5847,
      paidAmount: 5847,
      refundedAmount: 0,
      outstandingAmount: 0
    },
    timeline: [
      {
        status: OrderStatus.PENDING,
        timestamp: new Date('2024-01-01T10:00:00Z'),
        note: 'Order placed'
      },
      {
        status: OrderStatus.CONFIRMED,
        timestamp: new Date('2024-01-01T10:30:00Z'),
        note: 'Payment confirmed'
      },
      {
        status: OrderStatus.PROCESSING,
        timestamp: new Date('2024-01-01T14:00:00Z'),
        note: 'Order being prepared'
      },
      {
        status: OrderStatus.SHIPPED,
        timestamp: new Date('2024-01-02T09:00:00Z'),
        note: 'Order shipped via LBC'
      },
      {
        status: OrderStatus.DELIVERED,
        timestamp: new Date('2024-01-04T16:30:00Z'),
        note: 'Order delivered successfully'
      }
    ],
    source: 'web',
    channel: 'online',
    currency: 'PHP',
    placedAt: new Date('2024-01-01T10:00:00Z'),
    confirmedAt: new Date('2024-01-01T10:30:00Z'),
    shippedAt: new Date('2024-01-02T09:00:00Z'),
    deliveredAt: new Date('2024-01-04T16:30:00Z')
  }
];

// Sample Reviews Data
export const sampleReviews = [
  {
    productId: new mongoose.Types.ObjectId(), // Would reference actual product
    customerId: new mongoose.Types.ObjectId(), // Would reference actual customer
    orderId: new mongoose.Types.ObjectId(), // Would reference actual order
    rating: 5,
    title: 'Excellent product, highly recommended!',
    content: 'I have been using this barley grass powder for 3 months now and I can definitely feel the difference in my energy levels. The taste is mild and mixes well with my morning smoothie. The packaging is also very good and keeps the powder fresh. Will definitely order again!',
    pros: [
      'Great taste and easy to mix',
      'Noticeable energy boost',
      'High quality packaging',
      'Fast delivery'
    ],
    cons: [
      'Could be slightly cheaper'
    ],
    status: ReviewStatus.APPROVED,
    type: ReviewType.VERIFIED_PURCHASE,
    sentiment: ReviewSentiment.POSITIVE,
    customerName: 'Juan D.',
    customerEmail: 'juan.dela.cruz@email.com',
    customerMembershipTier: 'premium',
    productName: 'Premium Barley Grass Powder',
    productVariantSku: 'SLV-BGP-200G',
    productVariantName: '200g Powder',
    media: [
      {
        type: 'image',
        url: '/images/reviews/review-1-photo.jpg',
        caption: 'Product after 1 month of use',
        uploadedAt: new Date()
      }
    ],
    isVerifiedPurchase: true,
    verifiedAt: new Date(),
    qualityScore: 92,
    reviewSource: 'web',
    featureRatings: [
      { feature: 'Taste', rating: 4, weight: 1 },
      { feature: 'Quality', rating: 5, weight: 2 },
      { feature: 'Value for Money', rating: 4, weight: 1 },
      { feature: 'Packaging', rating: 5, weight: 1 },
      { feature: 'Effectiveness', rating: 5, weight: 3 }
    ],
    analytics: {
      viewCount: 25,
      helpfulVotes: 8,
      notHelpfulVotes: 1,
      reportCount: 0,
      shareCount: 2
    }
  },

  {
    productId: new mongoose.Types.ObjectId(),
    customerId: new mongoose.Types.ObjectId(),
    rating: 4,
    title: 'Good product, will buy again',
    content: 'The wellness bundle is a great value for money. All three products work well together and I like the convenience of getting everything in one package. The only issue is that one of the containers was slightly damaged during shipping, but the product inside was fine.',
    pros: [
      'Great value bundle',
      'Convenient packaging',
      'Good quality products'
    ],
    cons: [
      'Container was damaged during shipping'
    ],
    status: ReviewStatus.APPROVED,
    type: ReviewType.VERIFIED_PURCHASE,
    sentiment: ReviewSentiment.POSITIVE,
    customerName: 'Maria S.',
    customerEmail: 'maria.santos@email.com',
    customerMembershipTier: 'basic',
    productName: 'Complete Wellness Bundle',
    productVariantSku: 'SLV-WB-001',
    productVariantName: 'Complete Bundle',
    isVerifiedPurchase: true,
    verifiedAt: new Date(),
    qualityScore: 78,
    reviewSource: 'web',
    responses: [
      {
        responderId: new mongoose.Types.ObjectId(),
        responderType: 'admin',
        responderName: 'Salveo Support Team',
        response: 'Thank you for your feedback! We apologize for the damaged container during shipping. We have improved our packaging process to prevent this in the future. Please contact us if you need a replacement.',
        respondedAt: new Date()
      }
    ],
    analytics: {
      viewCount: 12,
      helpfulVotes: 4,
      notHelpfulVotes: 0,
      reportCount: 0,
      shareCount: 1
    }
  }
];

/**
 * Database seeding functions
 */
export class DatabaseSeeder {
  
  async seedAll(): Promise<void> {
    console.log('Starting database seeding...');
    
    try {
      await this.seedProducts();
      await this.seedMembers();
      await this.seedOrders();
      await this.seedReviews();
      
      console.log('Database seeding completed successfully!');
    } catch (error) {
      console.error('Database seeding failed:', error);
      throw error;
    }
  }

  async seedProducts(): Promise<void> {
    const Product = mongoose.model('Product');
    
    console.log('Seeding products...');
    
    for (const productData of sampleProducts) {
      const existingProduct = await Product.findOne({ name: productData.name });
      
      if (!existingProduct) {
        await Product.create(productData);
        console.log(`Created product: ${productData.name}`);
      } else {
        console.log(`Skipped existing product: ${productData.name}`);
      }
    }
  }

  async seedMembers(): Promise<void> {
    const Member = mongoose.model('Member');
    
    console.log('Seeding members...');
    
    for (const memberData of sampleMembers) {
      const existingMember = await Member.findOne({ email: memberData.email });
      
      if (!existingMember) {
        await Member.create(memberData);
        console.log(`Created member: ${memberData.email}`);
      } else {
        console.log(`Skipped existing member: ${memberData.email}`);
      }
    }
  }

  async seedOrders(): Promise<void> {
    const Order = mongoose.model('Order');
    const Member = mongoose.model('Member');
    const Product = mongoose.model('Product');
    
    console.log('Seeding orders...');
    
    // Get actual IDs from database
    const member = await Member.findOne({ email: 'juan.dela.cruz@email.com' });
    const barleyProduct = await Product.findOne({ name: 'Premium Barley Grass Powder' });
    const bundleProduct = await Product.findOne({ name: 'Complete Wellness Bundle' });
    
    if (member && barleyProduct && bundleProduct) {
      const orderData = { ...sampleOrders[0] };
      orderData.customerId = member._id;
      orderData.items[0].productId = barleyProduct._id;
      orderData.items[1].productId = bundleProduct._id;
      
      const existingOrder = await Order.findOne({ orderNumber: orderData.orderNumber });
      
      if (!existingOrder) {
        await Order.create(orderData);
        console.log(`Created order: ${orderData.orderNumber}`);
      } else {
        console.log(`Skipped existing order: ${orderData.orderNumber}`);
      }
    }
  }

  async seedReviews(): Promise<void> {
    const Review = mongoose.model('Review');
    const Member = mongoose.model('Member');
    const Product = mongoose.model('Product');
    const Order = mongoose.model('Order');
    
    console.log('Seeding reviews...');
    
    // Get actual IDs from database
    const juan = await Member.findOne({ email: 'juan.dela.cruz@email.com' });
    const maria = await Member.findOne({ email: 'maria.santos@email.com' });
    const barleyProduct = await Product.findOne({ name: 'Premium Barley Grass Powder' });
    const bundleProduct = await Product.findOne({ name: 'Complete Wellness Bundle' });
    const order = await Order.findOne({ orderNumber: 'SO-240101001' });
    
    if (juan && barleyProduct && order) {
      const reviewData1 = { ...sampleReviews[0] };
      reviewData1.productId = barleyProduct._id;
      reviewData1.customerId = juan._id;
      reviewData1.orderId = order._id;
      
      const existingReview1 = await Review.findOne({
        productId: barleyProduct._id,
        customerId: juan._id
      });
      
      if (!existingReview1) {
        await Review.create(reviewData1);
        console.log('Created review for barley product');
      }
    }
    
    if (maria && bundleProduct) {
      const reviewData2 = { ...sampleReviews[1] };
      reviewData2.productId = bundleProduct._id;
      reviewData2.customerId = maria._id;
      
      const existingReview2 = await Review.findOne({
        productId: bundleProduct._id,
        customerId: maria._id
      });
      
      if (!existingReview2) {
        await Review.create(reviewData2);
        console.log('Created review for bundle product');
      }
    }
  }

  async clearAll(): Promise<void> {
    console.log('Clearing all seeded data...');
    
    const collections = ['products', 'members', 'orders', 'reviews'];
    
    for (const collection of collections) {
      try {
        await mongoose.connection.db.collection(collection).deleteMany({});
        console.log(`Cleared ${collection} collection`);
      } catch (error) {
        console.log(`Could not clear ${collection}:`, error);
      }
    }
  }
}

// Export utility functions
export const SeedUtils = {
  async seedDatabase(): Promise<void> {
    const seeder = new DatabaseSeeder();
    await seeder.seedAll();
  },

  async clearDatabase(): Promise<void> {
    const seeder = new DatabaseSeeder();
    await seeder.clearAll();
  },

  async reseedDatabase(): Promise<void> {
    const seeder = new DatabaseSeeder();
    await seeder.clearAll();
    await seeder.seedAll();
  }
};