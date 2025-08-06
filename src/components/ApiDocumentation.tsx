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
      ],
      responseExample: `{
  "products": [
    {
      "_id": "64f123...",
      "name": "Premium Barley Grass Powder",
      "description": "Organic barley grass powder rich in nutrients",
      "category": "Supplements",
      "brand": "Salveo Organics",
      "images": ["https://example.com/image1.jpg"],
      "variants": [
        {
          "name": "250g",
          "price": 29.99,
          "inventory": 50
        }
      ],
      "isActive": true,
      "isFeatured": false,
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
        { name: 'category', type: 'string', required: true, description: 'Product category', location: 'body' },
        { name: 'brand', type: 'string', required: true, description: 'Product brand', location: 'body' },
        { name: 'images', type: 'string[]', required: true, description: 'Array of image URLs', location: 'body' },
        { name: 'variants', type: 'object[]', required: true, description: 'Product variants with name, price, inventory', location: 'body' },
        { name: 'tags', type: 'string[]', required: false, description: 'Product tags', location: 'body' },
        { name: 'isActive', type: 'boolean', required: false, description: 'Product status (default: true)', location: 'body' },
        { name: 'isFeatured', type: 'boolean', required: false, description: 'Featured status (default: false)', location: 'body' },
      ],
      requestExample: `{
  "name": "Premium Barley Grass Powder",
  "description": "Organic barley grass powder rich in nutrients",
  "category": "Supplements",
  "brand": "Salveo Organics",
  "images": ["https://example.com/image1.jpg"],
  "variants": [
    {
      "name": "250g",
      "price": 29.99,
      "inventory": 50
    },
    {
      "name": "500g",
      "price": 49.99,
      "inventory": 30
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
    "category": "Supplements",
    "brand": "Salveo Organics",
    "images": ["https://example.com/image1.jpg"],
    "variants": [
      {
        "name": "250g",
        "price": 29.99,
        "inventory": 50
      }
    ],
    "isActive": true,
    "isFeatured": false,
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
  Bundles: [
    {
      method: 'GET',
      path: '/api/bundles',
      title: 'Get Bundles',
      description: 'Retrieve paginated list of bundles with populated product details',
      requiresAuth: false,
      parameters: [
        { name: 'page', type: 'number', required: false, description: 'Page number (default: 1)', location: 'query' },
        { name: 'limit', type: 'number', required: false, description: 'Items per page (default: 10)', location: 'query' },
        { name: 'search', type: 'string', required: false, description: 'Search in bundle names and descriptions', location: 'query' },
        { name: 'isActive', type: 'boolean', required: false, description: 'Filter by active status', location: 'query' },
      ],
      responseExample: `{
  "bundles": [
    {
      "_id": "64f456...",
      "name": "Complete Wellness Bundle",
      "description": "Everything you need for daily wellness",
      "images": ["https://example.com/bundle1.jpg"],
      "items": [
        {
          "productId": {
            "_id": "64f123...",
            "name": "Premium Barley Grass Powder",
            "images": ["https://example.com/image1.jpg"],
            "category": "Supplements",
            "brand": "Salveo Organics"
          },
          "variantName": "250g",
          "quantity": 2
        }
      ],
      "originalPrice": 79.98,
      "bundlePrice": 64.98,
      "discount": 15,
      "discountType": "fixed",
      "isActive": true,
      "inventory": 25,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 12,
    "pages": 2
  }
}`,
      statusCodes: [
        { code: 200, description: 'Bundles retrieved successfully' },
        { code: 500, description: 'Internal server error' }
      ]
    },
    {
      method: 'POST',
      path: '/api/bundles',
      title: 'Create Bundle',
      description: 'Create a new product bundle',
      requiresAuth: true,
      parameters: [
        { name: 'Authorization', type: 'string', required: true, description: 'Bearer {token}', location: 'header' },
        { name: 'name', type: 'string', required: true, description: 'Bundle name', location: 'body' },
        { name: 'description', type: 'string', required: true, description: 'Bundle description', location: 'body' },
        { name: 'images', type: 'string[]', required: true, description: 'Array of image URLs', location: 'body' },
        { name: 'items', type: 'object[]', required: true, description: 'Bundle items with productId, variantName, quantity', location: 'body' },
        { name: 'originalPrice', type: 'number', required: true, description: 'Total original price', location: 'body' },
        { name: 'discount', type: 'number', required: true, description: 'Discount value', location: 'body' },
        { name: 'discountType', type: 'string', required: true, description: 'Either "percentage" or "fixed"', location: 'body' },
        { name: 'inventory', type: 'number', required: false, description: 'Bundle inventory (default: 0)', location: 'body' },
      ],
      requestExample: `{
  "name": "Complete Wellness Bundle",
  "description": "Everything you need for daily wellness",
  "images": ["https://example.com/bundle1.jpg"],
  "items": [
    {
      "productId": "64f123...",
      "variantName": "250g",
      "quantity": 2
    },
    {
      "productId": "64f456...",
      "variantName": "100ml",
      "quantity": 1
    }
  ],
  "originalPrice": 79.98,
  "discount": 15,
  "discountType": "fixed",
  "inventory": 25,
  "isActive": true,
  "isFeatured": true
}`,
      responseExample: `{
  "message": "Bundle created successfully",
  "bundle": {
    "_id": "64f789...",
    "name": "Complete Wellness Bundle",
    "description": "Everything you need for daily wellness",
    "images": ["https://example.com/bundle1.jpg"],
    "items": [
      {
        "productId": {
          "_id": "64f123...",
          "name": "Premium Barley Grass Powder",
          "images": ["https://example.com/image1.jpg"]
        },
        "variantName": "250g",
        "quantity": 2
      }
    ],
    "originalPrice": 79.98,
    "bundlePrice": 64.98,
    "discount": 15,
    "discountType": "fixed",
    "inventory": 25,
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}`,
      statusCodes: [
        { code: 201, description: 'Bundle created successfully' },
        { code: 400, description: 'Validation error - missing fields or invalid products/variants' },
        { code: 401, description: 'Unauthorized' },
        { code: 500, description: 'Internal server error' }
      ]
    },
    {
      method: 'PUT',
      path: '/api/bundles/{id}',
      title: 'Update Bundle',
      description: 'Update an existing bundle',
      requiresAuth: true,
      parameters: [
        { name: 'Authorization', type: 'string', required: true, description: 'Bearer {token}', location: 'header' },
        { name: 'id', type: 'string', required: true, description: 'Bundle ID', location: 'query' },
      ],
      requestExample: `{
  "name": "Updated Bundle Name",
  "isActive": false
}`,
      responseExample: `{
  "message": "Bundle updated successfully",
  "bundle": {
    "_id": "64f789...",
    "name": "Updated Bundle Name",
    "isActive": false,
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}`,
      statusCodes: [
        { code: 200, description: 'Bundle updated successfully' },
        { code: 400, description: 'Validation error' },
        { code: 401, description: 'Unauthorized' },
        { code: 404, description: 'Bundle not found' },
        { code: 500, description: 'Internal server error' }
      ]
    },
    {
      method: 'DELETE',
      path: '/api/bundles/{id}',
      title: 'Delete Bundle',
      description: 'Delete a bundle',
      requiresAuth: true,
      parameters: [
        { name: 'Authorization', type: 'string', required: true, description: 'Bearer {token}', location: 'header' },
        { name: 'id', type: 'string', required: true, description: 'Bundle ID', location: 'query' },
      ],
      responseExample: `{
  "message": "Bundle deleted successfully"
}`,
      statusCodes: [
        { code: 200, description: 'Bundle deleted successfully' },
        { code: 401, description: 'Unauthorized' },
        { code: 404, description: 'Bundle not found' },
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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-emerald-900 mb-2">API Documentation</h1>
        <p className="text-emerald-700 mb-4">
          Complete documentation for the SLV Barley Shop Admin API endpoints
        </p>
        
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Code2 className="text-indigo-600 mt-0.5" size={20} />
            <div>
              <h3 className="font-medium text-indigo-800">Base URL</h3>
              <p className="text-indigo-700 font-mono text-sm">{typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Authentication Info */}
      <div className="bg-white rounded-xl shadow-lg border border-emerald-100 p-6 mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <Lock className="text-emerald-600" size={24} />
          <h2 className="text-xl font-semibold text-emerald-900">Authentication</h2>
        </div>
        <p className="text-gray-700 mb-4">
          Endpoints marked with <Lock className="inline w-4 h-4 text-red-500" /> require authentication. 
          Include the JWT token in the Authorization header:
        </p>
        <div className="bg-gray-50 rounded-lg p-4">
          <code className="text-sm font-mono text-gray-800">
            Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
          </code>
        </div>
      </div>

      {/* API Endpoints */}
      <div className="space-y-6">
        {Object.entries(API_ENDPOINTS).map(([section, endpoints]) => (
          <div key={section} className="bg-white rounded-xl shadow-lg border border-emerald-100">
            <button
              onClick={() => toggleSection(section)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-emerald-50 transition-colors rounded-t-xl"
            >
              <h2 className="text-xl font-semibold text-emerald-900">{section}</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                  {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}
                </span>
                {expandedSections.has(section) ? (
                  <ChevronDown className="text-emerald-600" size={20} />
                ) : (
                  <ChevronRight className="text-emerald-600" size={20} />
                )}
              </div>
            </button>

            {expandedSections.has(section) && (
              <div className="border-t border-emerald-100">
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