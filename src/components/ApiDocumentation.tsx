'use client';

import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Code2, 
  Lock,
  Unlock,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

interface ApiEndpoint {
  method: string;
  path: string;
  title: string;
  description: string;
  requiresAuth: boolean;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
    location: 'query' | 'body' | 'header';
  }>;
  requestExample?: string;
  responseExample: string;
  statusCodes: Array<{
    code: number;
    description: string;
  }>;
}

const API_ENDPOINTS: Record<string, ApiEndpoint[]> = {
  Authentication: [
    {
      method: 'POST',
      path: '/api/auth/register',
      title: 'Register Admin',
      description: 'Register a new admin user (limited to 2 superadmins)',
      requiresAuth: false,
      parameters: [
        { name: 'email', type: 'string', required: true, description: 'Admin email address', location: 'body' },
        { name: 'password', type: 'string', required: true, description: 'Password (minimum 8 characters)', location: 'body' },
        { name: 'name', type: 'string', required: true, description: 'Admin full name', location: 'body' },
      ],
      requestExample: `{
  "email": "admin@slvbarley.com",
  "password": "securePassword123",
  "name": "John Admin"
}`,
      responseExample: `{
  "message": "Admin registered successfully",
  "admin": {
    "id": "64f123...",
    "email": "admin@slvbarley.com",
    "name": "John Admin",
    "role": "superadmin"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}`,
      statusCodes: [
        { code: 201, description: 'Admin created successfully' },
        { code: 400, description: 'Validation error (missing fields or weak password)' },
        { code: 403, description: 'Maximum admin limit reached' },
        { code: 409, description: 'Admin already exists' },
        { code: 500, description: 'Internal server error' }
      ]
    },
    {
      method: 'POST',
      path: '/api/auth/login',
      title: 'Admin Login',
      description: 'Authenticate admin user and receive JWT token',
      requiresAuth: false,
      parameters: [
        { name: 'email', type: 'string', required: true, description: 'Admin email address', location: 'body' },
        { name: 'password', type: 'string', required: true, description: 'Admin password', location: 'body' },
      ],
      requestExample: `{
  "email": "admin@slvbarley.com",
  "password": "securePassword123"
}`,
      responseExample: `{
  "message": "Login successful",
  "admin": {
    "id": "64f123...",
    "email": "admin@slvbarley.com",
    "name": "John Admin",
    "role": "superadmin"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}`,
      statusCodes: [
        { code: 200, description: 'Login successful' },
        { code: 400, description: 'Missing email or password' },
        { code: 401, description: 'Invalid credentials' },
        { code: 500, description: 'Internal server error' }
      ]
    },
    {
      method: 'GET',
      path: '/api/auth/me',
      title: 'Get Current User',
      description: 'Get currently authenticated admin details',
      requiresAuth: true,
      parameters: [
        { name: 'Authorization', type: 'string', required: true, description: 'Bearer {token}', location: 'header' },
      ],
      responseExample: `{
  "admin": {
    "id": "64f123...",
    "email": "admin@slvbarley.com",
    "name": "John Admin",
    "role": "superadmin"
  }
}`,
      statusCodes: [
        { code: 200, description: 'User details retrieved' },
        { code: 401, description: 'Unauthorized - invalid or missing token' },
        { code: 500, description: 'Internal server error' }
      ]
    }
  ],
  Products: [
    {
      method: 'GET',
      path: '/api/products',
      title: 'Get Products',
      description: 'Retrieve paginated list of products with optional filtering',
      requiresAuth: false,
      parameters: [
        { name: 'page', type: 'number', required: false, description: 'Page number (default: 1)', location: 'query' },
        { name: 'limit', type: 'number', required: false, description: 'Items per page (default: 10)', location: 'query' },
        { name: 'category', type: 'string', required: false, description: 'Filter by category', location: 'query' },
        { name: 'brand', type: 'string', required: false, description: 'Filter by brand', location: 'query' },
        { name: 'search', type: 'string', required: false, description: 'Search in product names and descriptions', location: 'query' },
        { name: 'isActive', type: 'boolean', required: false, description: 'Filter by active status', location: 'query' },
        { name: 'productType', type: 'string', required: false, description: 'Filter by product type (single, bundle, membership, promotion, accessory)', location: 'query' },
      ],
      responseExample: `{
  "products": [
    {
      "_id": "64f123...",
      "name": "Premium Barley Grass Powder",
      "description": "Organic barley grass powder rich in nutrients",
      "productType": "single",
      "status": "active",
      "category": "Supplements",
      "brand": "Salveo Organics",
      "images": ["https://example.com/image1.jpg"],
      "variants": [
        {
          "name": "250g",
          "price": 29.99,
          "sku": "SUP-PRE-250-1234",
          "inventory": 50
        }
      ],
      "isActive": true,
      "isFeatured": false,
      "reviewStats": {
        "averageRating": 4.5,
        "totalReviews": 23
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}`,
      statusCodes: [
        { code: 200, description: 'Products retrieved successfully' },
        { code: 500, description: 'Internal server error' }
      ]
    },
    {
      method: 'POST',
      path: '/api/products',
      title: 'Create Product',
      description: 'Create a new product',
      requiresAuth: true,
      parameters: [
        { name: 'Authorization', type: 'string', required: true, description: 'Bearer {token}', location: 'header' },
        { name: 'name', type: 'string', required: true, description: 'Product name', location: 'body' },
        { name: 'description', type: 'string', required: true, description: 'Product description', location: 'body' },
        { name: 'productType', type: 'string', required: true, description: 'Product type (single, bundle, membership, promotion, accessory)', location: 'body' },
        { name: 'category', type: 'string', required: true, description: 'Product category', location: 'body' },
        { name: 'brand', type: 'string', required: true, description: 'Product brand', location: 'body' },
        { name: 'images', type: 'string[]', required: true, description: 'Array of image URLs', location: 'body' },
        { name: 'variants', type: 'object[]', required: true, description: 'Product variants with name, price, sku, inventory', location: 'body' },
        { name: 'tags', type: 'string[]', required: false, description: 'Product tags', location: 'body' },
        { name: 'isActive', type: 'boolean', required: false, description: 'Product status (default: true)', location: 'body' },
        { name: 'isFeatured', type: 'boolean', required: false, description: 'Featured status (default: false)', location: 'body' },
        { name: 'bundleConfig', type: 'object', required: false, description: 'Bundle configuration (only for bundle type)', location: 'body' },
        { name: 'membershipConfig', type: 'object', required: false, description: 'Membership configuration (only for membership type)', location: 'body' },
        { name: 'promotionConfig', type: 'object', required: false, description: 'Promotion configuration (only for promotion type)', location: 'body' },
      ],
      requestExample: `{
  "name": "Premium Barley Grass Powder",
  "description": "Organic barley grass powder rich in nutrients",
  "productType": "single",
  "category": "Supplements",
  "brand": "Salveo Organics",
  "images": ["https://example.com/image1.jpg"],
  "variants": [
    {
      "name": "250g",
      "price": 29.99,
      "sku": "SUP-PRE-250-1234",
      "inventory": 50,
      "isDefault": true
    },
    {
      "name": "500g",
      "price": 49.99,
      "sku": "SUP-PRE-500-1235",
      "inventory": 30,
      "isDefault": false
    }
  ],
  "tags": ["organic", "superfood", "barley"],
  "isActive": true,
  "isFeatured": false
}`,
      responseExample: `{
  "message": "Product created successfully",
  "product": {
    "_id": "64f123...",
    "name": "Premium Barley Grass Powder",
    "description": "Organic barley grass powder rich in nutrients",
    "productType": "single",
    "status": "active",
    "category": "Supplements",
    "brand": "Salveo Organics",
    "images": ["https://example.com/image1.jpg"],
    "variants": [
      {
        "name": "250g",
        "price": 29.99,
        "sku": "SUP-PRE-250-1234",
        "inventory": 50,
        "isDefault": true
      }
    ],
    "isActive": true,
    "isFeatured": false,
    "reviewStats": {
      "averageRating": 0,
      "totalReviews": 0
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
}`,
      statusCodes: [
        { code: 201, description: 'Product created successfully' },
        { code: 400, description: 'Validation error - missing required fields' },
        { code: 401, description: 'Unauthorized' },
        { code: 500, description: 'Internal server error' }
      ]
    },
    {
      method: 'PUT',
      path: '/api/products/{id}',
      title: 'Update Product',
      description: 'Update an existing product',
      requiresAuth: true,
      parameters: [
        { name: 'Authorization', type: 'string', required: true, description: 'Bearer {token}', location: 'header' },
        { name: 'id', type: 'string', required: true, description: 'Product ID', location: 'query' },
      ],
      requestExample: `{
  "name": "Updated Product Name",
  "isActive": false
}`,
      responseExample: `{
  "message": "Product updated successfully",
  "product": {
    "_id": "64f123...",
    "name": "Updated Product Name",
    "isActive": false,
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}`,
      statusCodes: [
        { code: 200, description: 'Product updated successfully' },
        { code: 400, description: 'Validation error' },
        { code: 401, description: 'Unauthorized' },
        { code: 404, description: 'Product not found' },
        { code: 500, description: 'Internal server error' }
      ]
    },
    {
      method: 'DELETE',
      path: '/api/products/{id}',
      title: 'Delete Product',
      description: 'Delete a product',
      requiresAuth: true,
      parameters: [
        { name: 'Authorization', type: 'string', required: true, description: 'Bearer {token}', location: 'header' },
        { name: 'id', type: 'string', required: true, description: 'Product ID', location: 'query' },
      ],
      responseExample: `{
  "message": "Product deleted successfully"
}`,
      statusCodes: [
        { code: 200, description: 'Product deleted successfully' },
        { code: 401, description: 'Unauthorized' },
        { code: 404, description: 'Product not found' },
        { code: 500, description: 'Internal server error' }
      ]
    }
  ],
  Orders: [
    {
      method: 'GET',
      path: '/api/orders',
      title: 'Get Orders',
      description: 'Retrieve paginated list of orders with filtering options',
      requiresAuth: true,
      parameters: [
        { name: 'Authorization', type: 'string', required: true, description: 'Bearer {token}', location: 'header' },
        { name: 'page', type: 'number', required: false, description: 'Page number (default: 1)', location: 'query' },
        { name: 'limit', type: 'number', required: false, description: 'Items per page (default: 10)', location: 'query' },
        { name: 'status', type: 'string', required: false, description: 'Filter by order status', location: 'query' },
        { name: 'customerId', type: 'string', required: false, description: 'Filter by customer ID', location: 'query' },
        { name: 'startDate', type: 'string', required: false, description: 'Start date filter (ISO format)', location: 'query' },
        { name: 'endDate', type: 'string', required: false, description: 'End date filter (ISO format)', location: 'query' },
      ],
      responseExample: `{
  "orders": [
    {
      "_id": "64f456...",
      "orderNumber": "SO-123456ABC",
      "customerId": "64f789...",
      "customerEmail": "customer@example.com",
      "status": "shipped",
      "paymentStatus": "captured",
      "items": [
        {
          "productId": "64f123...",
          "productName": "Premium Barley Grass Powder",
          "variantSku": "SUP-PRE-250-1234",
          "quantity": 2,
          "unitPrice": 29.99,
          "totalPrice": 59.98
        }
      ],
      "totals": {
        "subtotal": 59.98,
        "taxTotal": 7.20,
        "shippingTotal": 50.00,
        "total": 117.18
      },
      "shippingInfo": {
        "method": "standard",
        "trackingNumber": "TN123456789"
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}`,
      statusCodes: [
        { code: 200, description: 'Orders retrieved successfully' },
        { code: 401, description: 'Unauthorized' },
        { code: 500, description: 'Internal server error' }
      ]
    },
    {
      method: 'GET',
      path: '/api/orders/{id}',
      title: 'Get Order Details',
      description: 'Retrieve detailed information about a specific order',
      requiresAuth: true,
      parameters: [
        { name: 'Authorization', type: 'string', required: true, description: 'Bearer {token}', location: 'header' },
        { name: 'id', type: 'string', required: true, description: 'Order ID', location: 'query' },
      ],
      responseExample: `{
  "order": {
    "_id": "64f456...",
    "orderNumber": "SO-123456ABC",
    "customerId": "64f789...",
    "customerEmail": "customer@example.com",
    "status": "shipped",
    "paymentStatus": "captured",
    "items": [
      {
        "productId": "64f123...",
        "productName": "Premium Barley Grass Powder",
        "productType": "single",
        "variantSku": "SUP-PRE-250-1234",
        "quantity": 2,
        "unitPrice": 29.99,
        "totalPrice": 59.98
      }
    ],
    "shippingAddress": {
      "firstName": "John",
      "lastName": "Doe",
      "street": "123 Main St",
      "city": "Manila",
      "zipCode": "1000",
      "country": "Philippines"
    },
    "totals": {
      "subtotal": 59.98,
      "taxTotal": 7.20,
      "shippingTotal": 50.00,
      "total": 117.18
    },
    "timeline": [
      {
        "status": "pending",
        "timestamp": "2024-01-15T10:30:00Z",
        "note": "Order created"
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}`,
      statusCodes: [
        { code: 200, description: 'Order retrieved successfully' },
        { code: 401, description: 'Unauthorized' },
        { code: 404, description: 'Order not found' },
        { code: 500, description: 'Internal server error' }
      ]
    },
    {
      method: 'PUT',
      path: '/api/orders/{id}/status',
      title: 'Update Order Status',
      description: 'Update the status of an order and add timeline event',
      requiresAuth: true,
      parameters: [
        { name: 'Authorization', type: 'string', required: true, description: 'Bearer {token}', location: 'header' },
        { name: 'id', type: 'string', required: true, description: 'Order ID', location: 'query' },
        { name: 'status', type: 'string', required: true, description: 'New order status', location: 'body' },
        { name: 'note', type: 'string', required: false, description: 'Optional status update note', location: 'body' },
        { name: 'trackingNumber', type: 'string', required: false, description: 'Tracking number (for shipped status)', location: 'body' },
      ],
      requestExample: `{
  "status": "shipped",
  "note": "Order shipped via LBC",
  "trackingNumber": "TN123456789"
}`,
      responseExample: `{
  "message": "Order status updated successfully",
  "order": {
    "_id": "64f456...",
    "orderNumber": "SO-123456ABC",
    "status": "shipped",
    "shippingInfo": {
      "trackingNumber": "TN123456789",
      "shippedAt": "2024-01-15T10:30:00Z"
    },
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}`,
      statusCodes: [
        { code: 200, description: 'Order status updated successfully' },
        { code: 400, description: 'Invalid status or validation error' },
        { code: 401, description: 'Unauthorized' },
        { code: 404, description: 'Order not found' },
        { code: 500, description: 'Internal server error' }
      ]
    }
  ],
  Reviews: [
    {
      method: 'GET',
      path: '/api/reviews',
      title: 'Get Reviews',
      description: 'Retrieve paginated list of reviews with filtering options',
      requiresAuth: false,
      parameters: [
        { name: 'page', type: 'number', required: false, description: 'Page number (default: 1)', location: 'query' },
        { name: 'limit', type: 'number', required: false, description: 'Items per page (default: 10)', location: 'query' },
        { name: 'productId', type: 'string', required: false, description: 'Filter by product ID', location: 'query' },
        { name: 'customerId', type: 'string', required: false, description: 'Filter by customer ID', location: 'query' },
        { name: 'status', type: 'string', required: false, description: 'Filter by review status', location: 'query' },
        { name: 'rating', type: 'number', required: false, description: 'Filter by rating (1-5)', location: 'query' },
        { name: 'isVerified', type: 'boolean', required: false, description: 'Filter by verified purchase', location: 'query' },
      ],
      responseExample: `{
  "reviews": [
    {
      "_id": "64f456...",
      "productId": "64f123...",
      "productName": "Premium Barley Grass Powder",
      "customerId": "64f789...",
      "customerName": "John Doe",
      "rating": 5,
      "title": "Excellent product!",
      "content": "This barley grass powder has improved my energy levels significantly.",
      "status": "approved",
      "isVerifiedPurchase": true,
      "analytics": {
        "helpfulVotes": 12,
        "viewCount": 156
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 34,
    "pages": 4
  }
}`,
      statusCodes: [
        { code: 200, description: 'Reviews retrieved successfully' },
        { code: 500, description: 'Internal server error' }
      ]
    },
    {
      method: 'POST',
      path: '/api/reviews',
      title: 'Create Review',
      description: 'Create a new product review',
      requiresAuth: true,
      parameters: [
        { name: 'Authorization', type: 'string', required: true, description: 'Bearer {token}', location: 'header' },
        { name: 'productId', type: 'string', required: true, description: 'Product ID', location: 'body' },
        { name: 'orderId', type: 'string', required: false, description: 'Order ID (for verified purchases)', location: 'body' },
        { name: 'rating', type: 'number', required: true, description: 'Rating (1-5 stars)', location: 'body' },
        { name: 'title', type: 'string', required: true, description: 'Review title', location: 'body' },
        { name: 'content', type: 'string', required: true, description: 'Review content', location: 'body' },
        { name: 'pros', type: 'string[]', required: false, description: 'Product pros', location: 'body' },
        { name: 'cons', type: 'string[]', required: false, description: 'Product cons', location: 'body' },
        { name: 'media', type: 'object[]', required: false, description: 'Review media (images/videos)', location: 'body' },
      ],
      requestExample: `{
  "productId": "64f123...",
  "orderId": "64f456...",
  "rating": 5,
  "title": "Excellent product!",
  "content": "This barley grass powder has improved my energy levels significantly. Highly recommend!",
  "pros": ["Great taste", "Noticeable energy boost"],
  "cons": ["A bit expensive"],
  "media": [
    {
      "type": "image",
      "url": "https://example.com/review-image.jpg",
      "caption": "Product packaging"
    }
  ]
}`,
      responseExample: `{
  "message": "Review created successfully",
  "review": {
    "_id": "64f456...",
    "productId": "64f123...",
    "customerId": "64f789...",
    "rating": 5,
    "title": "Excellent product!",
    "content": "This barley grass powder has improved my energy levels significantly.",
    "status": "pending",
    "isVerifiedPurchase": true,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}`,
      statusCodes: [
        { code: 201, description: 'Review created successfully' },
        { code: 400, description: 'Validation error or duplicate review' },
        { code: 401, description: 'Unauthorized' },
        { code: 404, description: 'Product or order not found' },
        { code: 500, description: 'Internal server error' }
      ]
    },
    {
      method: 'PUT',
      path: '/api/reviews/{id}/approve',
      title: 'Approve Review',
      description: 'Approve a pending review for public display',
      requiresAuth: true,
      parameters: [
        { name: 'Authorization', type: 'string', required: true, description: 'Bearer {token}', location: 'header' },
        { name: 'id', type: 'string', required: true, description: 'Review ID', location: 'query' },
        { name: 'note', type: 'string', required: false, description: 'Moderation note', location: 'body' },
      ],
      requestExample: `{
  "note": "Review approved - meets community guidelines"
}`,
      responseExample: `{
  "message": "Review approved successfully",
  "review": {
    "_id": "64f456...",
    "status": "approved",
    "moderation": {
      "moderatedBy": "64f000...",
      "moderatedAt": "2024-01-15T10:30:00Z",
      "note": "Review approved - meets community guidelines"
    }
  }
}`,
      statusCodes: [
        { code: 200, description: 'Review approved successfully' },
        { code: 401, description: 'Unauthorized' },
        { code: 404, description: 'Review not found' },
        { code: 500, description: 'Internal server error' }
      ]
    },
    {
      method: 'PUT',
      path: '/api/reviews/{id}/reject',
      title: 'Reject Review',
      description: 'Reject a pending review and prevent public display',
      requiresAuth: true,
      parameters: [
        { name: 'Authorization', type: 'string', required: true, description: 'Bearer {token}', location: 'header' },
        { name: 'id', type: 'string', required: true, description: 'Review ID', location: 'query' },
        { name: 'reason', type: 'string', required: true, description: 'Rejection reason', location: 'body' },
        { name: 'note', type: 'string', required: false, description: 'Additional moderation note', location: 'body' },
      ],
      requestExample: `{
  "reason": "Inappropriate content",
  "note": "Review contains offensive language"
}`,
      responseExample: `{
  "message": "Review rejected successfully",
  "review": {
    "_id": "64f456...",
    "status": "rejected",
    "moderation": {
      "moderatedBy": "64f000...",
      "moderatedAt": "2024-01-15T10:30:00Z",
      "reason": "Inappropriate content"
    }
  }
}`,
      statusCodes: [
        { code: 200, description: 'Review rejected successfully' },
        { code: 401, description: 'Unauthorized' },
        { code: 404, description: 'Review not found' },
        { code: 500, description: 'Internal server error' }
      ]
    }
  ],
  Members: [
    {
      method: 'GET',
      path: '/api/members',
      title: 'Get Members',
      description: 'Retrieve paginated list of members with filtering options',
      requiresAuth: true,
      parameters: [
        { name: 'Authorization', type: 'string', required: true, description: 'Bearer {token}', location: 'header' },
        { name: 'page', type: 'number', required: false, description: 'Page number (default: 1)', location: 'query' },
        { name: 'limit', type: 'number', required: false, description: 'Items per page (default: 10)', location: 'query' },
        { name: 'search', type: 'string', required: false, description: 'Search by name or email', location: 'query' },
        { name: 'membershipTier', type: 'string', required: false, description: 'Filter by membership tier', location: 'query' },
        { name: 'isActive', type: 'boolean', required: false, description: 'Filter by active status', location: 'query' },
        { name: 'sortBy', type: 'string', required: false, description: 'Sort by field (totalSpent, totalOrders, joinDate)', location: 'query' },
      ],
      responseExample: `{
  "members": [
    {
      "_id": "64f789...",
      "email": "john.doe@example.com",
      "name": "John Doe",
      "phone": "+63912345678",
      "membershipTier": "premium",
      "membershipStatus": "active",
      "isActive": true,
      "isEmailVerified": true,
      "stats": {
        "totalOrders": 15,
        "totalSpent": 12500.50,
        "averageOrderValue": 833.37,
        "loyaltyPoints": 1250
      },
      "joinDate": "2024-01-01T00:00:00Z",
      "lastActiveAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 156,
    "pages": 16
  }
}`,
      statusCodes: [
        { code: 200, description: 'Members retrieved successfully' },
        { code: 401, description: 'Unauthorized' },
        { code: 500, description: 'Internal server error' }
      ]
    },
    {
      method: 'GET',
      path: '/api/members/{id}',
      title: 'Get Member Details',
      description: 'Retrieve detailed information about a specific member',
      requiresAuth: true,
      parameters: [
        { name: 'Authorization', type: 'string', required: true, description: 'Bearer {token}', location: 'header' },
        { name: 'id', type: 'string', required: true, description: 'Member ID', location: 'query' },
      ],
      responseExample: `{
  "member": {
    "_id": "64f789...",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+63912345678",
    "membershipTier": "premium",
    "membershipStatus": "active",
    "addresses": [
      {
        "type": "shipping",
        "firstName": "John",
        "lastName": "Doe",
        "street": "123 Main St",
        "city": "Manila",
        "zipCode": "1000",
        "country": "Philippines",
        "isDefault": true
      }
    ],
    "preferences": {
      "categories": ["Supplements", "Skincare"],
      "notifications": {
        "email": true,
        "promotions": true
      }
    },
    "stats": {
      "totalOrders": 15,
      "totalSpent": 12500.50,
      "averageOrderValue": 833.37,
      "loyaltyPoints": 1250,
      "lastOrderDate": "2024-01-10T00:00:00Z"
    },
    "activity": {
      "loginCount": 45,
      "pageViews": 234
    },
    "createdAt": "2024-01-01T00:00:00Z"
  }
}`,
      statusCodes: [
        { code: 200, description: 'Member retrieved successfully' },
        { code: 401, description: 'Unauthorized' },
        { code: 404, description: 'Member not found' },
        { code: 500, description: 'Internal server error' }
      ]
    },
    {
      method: 'PUT',
      path: '/api/members/{id}',
      title: 'Update Member',
      description: 'Update member information and settings',
      requiresAuth: true,
      parameters: [
        { name: 'Authorization', type: 'string', required: true, description: 'Bearer {token}', location: 'header' },
        { name: 'id', type: 'string', required: true, description: 'Member ID', location: 'query' },
        { name: 'membershipTier', type: 'string', required: false, description: 'Update membership tier', location: 'body' },
        { name: 'isActive', type: 'boolean', required: false, description: 'Update active status', location: 'body' },
        { name: 'membershipStatus', type: 'string', required: false, description: 'Update membership status', location: 'body' },
      ],
      requestExample: `{
  "membershipTier": "vip",
  "isActive": true,
  "membershipStatus": "active"
}`,
      responseExample: `{
  "message": "Member updated successfully",
  "member": {
    "_id": "64f789...",
    "membershipTier": "vip",
    "isActive": true,
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}`,
      statusCodes: [
        { code: 200, description: 'Member updated successfully' },
        { code: 400, description: 'Validation error' },
        { code: 401, description: 'Unauthorized' },
        { code: 404, description: 'Member not found' },
        { code: 500, description: 'Internal server error' }
      ]
    }
  ]
};

export default function ApiDocumentation() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Authentication']));
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());
  const [copiedCode, setCopiedCode] = useState<string>('');

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const toggleEndpoint = (endpointId: string) => {
    const newExpanded = new Set(expandedEndpoints);
    if (newExpanded.has(endpointId)) {
      newExpanded.delete(endpointId);
    } else {
      newExpanded.add(endpointId);
    }
    setExpandedEndpoints(newExpanded);
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(''), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-emerald-100 text-emerald-800';
      case 'POST': return 'bg-indigo-100 text-indigo-800';
      case 'PUT': return 'bg-indigo-200 text-indigo-900';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-brand-900 font-display mb-3">API Documentation</h1>
        <p className="text-lg text-brand-600 mb-6">
          Complete documentation for the SLV Barley Shop Admin API endpoints
        </p>
        
        <div className="bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-2xl p-6">
          <div className="flex items-start space-x-4">
            <Code2 className="text-primary-600 mt-1" size={24} />
            <div>
              <h3 className="font-bold text-primary-900 text-lg">Base URL</h3>
              <p className="text-primary-800 font-mono text-base mt-1">{typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Authentication Info */}
      <div className="card-premium rounded-2xl p-8 mb-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="p-3 bg-gradient-to-r from-secondary-600 to-secondary-700 rounded-xl text-white">
            <Lock size={24} />
          </div>
          <h2 className="text-2xl font-semibold text-brand-900 font-display">Authentication</h2>
        </div>
        <p className="text-brand-700 mb-6 text-lg">
          Endpoints marked with <Lock className="inline w-5 h-5 text-danger-500" /> require authentication. 
          Include the JWT token in the Authorization header:
        </p>
        <div className="bg-gradient-to-r from-neutral-50 to-neutral-100 rounded-xl p-6 border border-neutral-200">
          <code className="text-base font-mono text-brand-800 break-all">
            Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
          </code>
        </div>
      </div>

      {/* API Endpoints */}
      <div className="space-y-8">
        {Object.entries(API_ENDPOINTS).map(([section, endpoints]) => (
          <div key={section} className="card-premium rounded-2xl shadow-premium-lg">
            <button
              onClick={() => toggleSection(section)}
              className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-primary-50/50 transition-colors rounded-t-2xl"
            >
              <h2 className="text-2xl font-semibold text-brand-900 font-display">{section}</h2>
              <div className="flex items-center space-x-3">
                <span className="text-sm font-semibold text-primary-700 bg-primary-100 px-3 py-1 rounded-xl border border-primary-200">
                  {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}
                </span>
                {expandedSections.has(section) ? (
                  <ChevronDown className="text-primary-600" size={24} />
                ) : (
                  <ChevronRight className="text-primary-600" size={24} />
                )}
              </div>
            </button>

            {expandedSections.has(section) && (
              <div className="border-t border-neutral-200">
                {endpoints.map((endpoint, index) => {
                  const endpointId = `${section}-${index}`;
                  const isExpanded = expandedEndpoints.has(endpointId);
                  
                  return (
                    <div key={endpointId} className="border-b border-gray-100 last:border-b-0">
                      <button
                        onClick={() => toggleEndpoint(endpointId)}
                        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getMethodColor(endpoint.method)}`}>
                            {endpoint.method}
                          </span>
                          <span className="font-mono text-sm text-gray-700">{endpoint.path}</span>
                          {endpoint.requiresAuth && <Lock className="text-red-500" size={16} />}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">{endpoint.title}</span>
                          {isExpanded ? (
                            <ChevronDown className="text-gray-400" size={16} />
                          ) : (
                            <ChevronRight className="text-gray-400" size={16} />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-6 pb-6 bg-gray-50">
                          <div className="space-y-6">
                            {/* Description */}
                            <div>
                              <p className="text-gray-700">{endpoint.description}</p>
                            </div>

                            {/* Parameters */}
                            {endpoint.parameters && endpoint.parameters.length > 0 && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-3">Parameters</h4>
                                <div className="space-y-3">
                                  {endpoint.parameters.map((param, paramIndex) => (
                                    <div key={paramIndex} className="bg-white rounded-lg p-4 border">
                                      <div className="flex items-center space-x-3 mb-2">
                                        <span className="font-mono text-sm font-medium text-gray-900">{param.name}</span>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                          param.required ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                          {param.required ? 'Required' : 'Optional'}
                                        </span>
                                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                          {param.type}
                                        </span>
                                        <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-full">
                                          {param.location}
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-600">{param.description}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Request Example */}
                            {endpoint.requestExample && (
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-medium text-gray-900">Request Example</h4>
                                  <button
                                    onClick={() => copyToClipboard(endpoint.requestExample!, `${endpointId}-request`)}
                                    className="flex items-center space-x-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors"
                                  >
                                    {copiedCode === `${endpointId}-request` ? (
                                      <Check size={14} className="text-green-500" />
                                    ) : (
                                      <Copy size={14} />
                                    )}
                                    <span>Copy</span>
                                  </button>
                                </div>
                                <pre className="bg-gray-900 text-green-400 rounded-lg p-4 overflow-x-auto text-sm">
                                  <code>{endpoint.requestExample}</code>
                                </pre>
                              </div>
                            )}

                            {/* Response Example */}
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-gray-900">Response Example</h4>
                                <button
                                  onClick={() => copyToClipboard(endpoint.responseExample, `${endpointId}-response`)}
                                  className="flex items-center space-x-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors"
                                >
                                  {copiedCode === `${endpointId}-response` ? (
                                    <Check size={14} className="text-green-500" />
                                  ) : (
                                    <Copy size={14} />
                                  )}
                                  <span>Copy</span>
                                </button>
                              </div>
                              <pre className="bg-gray-900 text-green-400 rounded-lg p-4 overflow-x-auto text-sm">
                                <code>{endpoint.responseExample}</code>
                              </pre>
                            </div>

                            {/* Status Codes */}
                            <div>
                              <h4 className="font-medium text-gray-900 mb-3">Status Codes</h4>
                              <div className="space-y-2">
                                {endpoint.statusCodes.map((status, statusIndex) => (
                                  <div key={statusIndex} className="flex items-center space-x-3 p-2 bg-white rounded border">
                                    <span className={`px-2 py-1 text-xs font-mono font-semibold rounded ${
                                      status.code < 300 
                                        ? 'bg-green-100 text-green-800' 
                                        : status.code < 400 
                                        ? 'bg-blue-100 text-blue-800'
                                        : status.code < 500
                                        ? 'bg-indigo-100 text-indigo-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {status.code}
                                    </span>
                                    <span className="text-sm text-gray-700">{status.description}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}