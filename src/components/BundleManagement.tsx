'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Package } from 'lucide-react';

interface ProductImage {
  url: string;
  publicId: string;
  alt: string;
  isPrimary: boolean;
  width: number;
  height: number;
  format: string;
  size: number;
  optimizedUrls: {
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
    original: string;
  };
  responsiveUrls: {
    card: string;
    detail: string;
    hero: string;
    mobile: string;
  };
}

interface Product {
  _id: string;
  name: string;
  images: ProductImage[];
  category: string;
  brand: string;
  variants: Array<{
    name: string;
    price: number;
    inventory: number;
  }>;
}

interface Bundle {
  _id: string;
  name: string;
  description: string;
  images: ProductImage[];
  items: Array<{
    productId: {
      _id: string;
      name: string;
      images: ProductImage[];
      category: string;
      brand: string;
    };
    variantName: string;
    quantity: number;
  }>;
  originalPrice: number;
  bundlePrice: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  isActive: boolean;
  isFeatured: boolean;
  inventory: number;
  createdAt: string;
}

export default function BundleManagement() {
  const { token } = useAuth();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchBundles();
  }, [currentPage, searchTerm, isActiveFilter]);

  const fetchBundles = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });

      if (searchTerm) params.append('search', searchTerm);
      if (isActiveFilter) params.append('isActive', isActiveFilter);

      const response = await fetch(`/api/bundles?${params}`);
      const data = await response.json();

      setBundles(data.bundles || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      console.error('Failed to fetch bundles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (bundleId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/bundles/${bundleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        fetchBundles();
      }
    } catch (error) {
      console.error('Failed to update bundle status:', error);
    }
  };

  const handleDeleteBundle = async (bundleId: string) => {
    if (!confirm('Are you sure you want to delete this bundle?')) return;

    try {
      const response = await fetch(`/api/bundles/${bundleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchBundles();
      }
    } catch (error) {
      console.error('Failed to delete bundle:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-neutral-200 rounded-xl w-1/3 shimmer"></div>
          <div className="h-16 bg-neutral-200 rounded-2xl shimmer"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-neutral-200 rounded-xl shimmer"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-brand-900 font-display mb-2">Bundle Management</h1>
          <p className="text-lg text-brand-600">Create and manage product bundles</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center space-x-3 shadow-premium hover:shadow-premium-lg"
        >
          <Plus size={22} />
          <span className="font-semibold">Add Bundle</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card-premium rounded-2xl p-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-secondary-400" size={20} />
            <input
              type="text"
              placeholder="Search bundles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-premium pl-12 w-full"
            />
          </div>

          <select
            value={isActiveFilter}
            onChange={(e) => setIsActiveFilter(e.target.value)}
            className="input-premium"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          <div></div>

          <button
            onClick={fetchBundles}
            className="btn-secondary font-semibold"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Bundles Table */}
      <div className="table-premium rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="table-premium">
              <tr>
                <th className="px-8 py-5 text-left text-sm font-bold text-brand-700 uppercase tracking-wider">
                  Bundle
                </th>
                <th className="px-8 py-5 text-left text-sm font-bold text-brand-700 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-8 py-5 text-left text-sm font-bold text-brand-700 uppercase tracking-wider">
                  Pricing
                </th>
                <th className="px-8 py-5 text-left text-sm font-bold text-brand-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-8 py-5 text-left text-sm font-bold text-brand-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white/90 divide-y divide-neutral-100">
              {bundles.map((bundle) => (
                <tr key={bundle._id} className="table-premium hover:scale-[1.01] transition-all duration-200">
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="flex items-center space-x-4">
                      <div className="h-16 w-16 flex-shrink-0">
                        <img
                          className="h-16 w-16 rounded-2xl object-cover shadow-lg ring-2 ring-white"
                          src={bundle.images[0]?.optimizedUrls?.thumbnail || bundle.images[0]?.url || '/placeholder-image.jpg'}
                          alt={bundle.name}
                        />
                      </div>
                      <div>
                        <div className="text-base font-bold text-brand-900">
                          {bundle.name}
                        </div>
                        <div className="text-sm text-brand-600 font-medium">
                          Stock: {bundle.inventory}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="space-y-2">
                      {bundle.items.map((item, index) => (
                        <div key={index} className="flex items-center text-sm bg-gradient-to-r from-secondary-50 to-secondary-100 px-3 py-2 rounded-xl border border-secondary-200">
                          <Package size={16} className="mr-2 text-secondary-600" />
                          <span className="font-medium text-secondary-900">
                            {item.quantity}x {item.productId.name} ({item.variantName})
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-xl font-bold text-success-600">₱{bundle.bundlePrice.toFixed(2)}</div>
                      <div className="text-sm text-brand-500 line-through">₱{bundle.originalPrice.toFixed(2)}</div>
                      <div className="text-sm font-semibold text-danger-600">
                        {bundle.discountType === 'percentage' 
                          ? `-${bundle.discount}%`
                          : `-₱${bundle.discount}`
                        }
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex px-3 py-1.5 text-sm font-bold rounded-xl ${
                        bundle.isActive
                          ? 'bg-success-100 text-success-800 border border-success-200'
                          : 'bg-danger-100 text-danger-800 border border-danger-200'
                      }`}>
                        {bundle.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {bundle.isFeatured && (
                        <span className="inline-flex px-3 py-1.5 text-sm font-bold rounded-xl bg-accent-100 text-accent-800 border border-accent-200">
                          Featured
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleToggleActive(bundle._id, bundle.isActive)}
                        className={`p-2.5 rounded-xl transition-all duration-200 ${
                          bundle.isActive
                            ? 'text-danger-600 hover:text-danger-700 hover:bg-danger-50 border border-danger-200'
                            : 'text-success-600 hover:text-success-700 hover:bg-success-50 border border-success-200'
                        }`}
                        title={bundle.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {bundle.isActive ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <button
                        onClick={() => {
                          setEditingBundle(bundle);
                          setShowForm(true);
                        }}
                        className="p-2.5 rounded-xl text-primary-600 hover:text-primary-700 hover:bg-primary-50 border border-primary-200 transition-all duration-200"
                        title="Edit Bundle"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteBundle(bundle._id)}
                        className="p-2.5 rounded-xl text-danger-600 hover:text-danger-700 hover:bg-danger-50 border border-danger-200 transition-all duration-200"
                        title="Delete Bundle"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Page <span className="font-medium">{currentPage}</span> of{' '}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <BundleForm
          bundle={editingBundle}
          onClose={() => {
            setShowForm(false);
            setEditingBundle(null);
          }}
          onSuccess={() => {
            fetchBundles();
            setShowForm(false);
            setEditingBundle(null);
          }}
        />
      )}
    </div>
  );
}

interface BundleFormProps {
  bundle?: Bundle | null;
  onClose: () => void;
  onSuccess: () => void;
}

function BundleForm({ bundle, onClose, onSuccess }: BundleFormProps) {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    name: bundle?.name || '',
    description: bundle?.description || '',
    shortDescription: bundle?.shortDescription || '',
    images: bundle?.images || [''],
    items: bundle?.items.map(item => ({
      productId: item.productId._id,
      variantName: item.variantName,
      quantity: item.quantity
    })) || [{ productId: '', variantName: '', quantity: 1 }],
    originalPrice: bundle?.originalPrice || 0,
    discount: bundle?.discount || 0,
    discountType: bundle?.discountType || 'percentage' as 'percentage' | 'fixed',
    inventory: bundle?.inventory || 0,
    tags: bundle?.tags ? bundle.tags.join(', ') : '',
    isActive: bundle?.isActive ?? true,
    isFeatured: bundle?.isFeatured || false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products?limit=1000&isActive=true');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      };

      const url = bundle ? `/api/bundles/${bundle._id}` : '/api/bundles';
      const method = bundle ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save bundle');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', variantName: '', quantity: 1 }]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const getProductVariants = (productId: string) => {
    const product = products.find(p => p._id === productId);
    return product?.variants || [];
  };

  const calculateBundlePrice = () => {
    if (formData.discountType === 'percentage') {
      return formData.originalPrice * (1 - formData.discount / 100);
    } else {
      return Math.max(0, formData.originalPrice - formData.discount);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm" style={{backgroundColor: 'rgba(0, 0, 0, 0.3)'}}>
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-teal-100">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">
              {bundle ? 'Edit Bundle' : 'Add New Bundle'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bundle Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inventory *
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.inventory}
                onChange={(e) => setFormData(prev => ({ ...prev, inventory: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Original Price *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.originalPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, originalPrice: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Type *
              </label>
              <select
                required
                value={formData.discountType}
                onChange={(e) => setFormData(prev => ({ ...prev, discountType: e.target.value as 'percentage' | 'fixed' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₱)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Value *
              </label>
              <input
                type="number"
                step={formData.discountType === 'percentage' ? '1' : '0.01'}
                min="0"
                max={formData.discountType === 'percentage' ? '100' : undefined}
                required
                value={formData.discount}
                onChange={(e) => setFormData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={formData.discountType === 'percentage' ? 'e.g., 20' : 'e.g., 100.00'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bundle Price (Calculated)
              </label>
              <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 font-medium">
                ₱{calculateBundlePrice().toFixed(2)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="bundle, discount, combo"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bundle Image URL *
            </label>
            <input
              type="url"
              required
              value={formData.images[0]}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                images: [e.target.value, ...prev.images.slice(1)] 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              placeholder="https://example.com/bundle-image.jpg"
            />
          </div>

          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Bundle Items * (minimum 2)
              </label>
              <button
                type="button"
                onClick={addItem}
                className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
              >
                Add Item
              </button>
            </div>
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3 p-3 border border-gray-200 rounded">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Product</label>
                  <select
                    value={item.productId}
                    onChange={(e) => {
                      updateItem(index, 'productId', e.target.value);
                      updateItem(index, 'variantName', ''); // Reset variant when product changes
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    required
                  >
                    <option value="">Select Product</option>
                    {products.map(product => (
                      <option key={product._id} value={product._id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Variant</label>
                  <select
                    value={item.variantName}
                    onChange={(e) => updateItem(index, 'variantName', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    required
                    disabled={!item.productId}
                  >
                    <option value="">Select Variant</option>
                    {getProductVariants(item.productId).map(variant => (
                      <option key={variant.name} value={variant.name}>
                        {variant.name} - ₱{variant.price}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                
                <div className="flex items-end">
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center space-x-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                Bundle is active
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isFeatured"
                checked={formData.isFeatured}
                onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="isFeatured" className="ml-2 block text-sm text-gray-900">
                Featured bundle
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || formData.items.length < 2}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : (bundle ? 'Update Bundle' : 'Create Bundle')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}