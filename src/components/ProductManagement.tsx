'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import ImageUpload from './ImageUpload';

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
}

interface Product {
  _id: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  images: ProductImage[];
  variants: Array<{
    name: string;
    price: number;
    inventory: number;
  }>;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
}

export default function ProductManagement() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const categories = ['Supplements', 'Skincare', 'Food & Beverage', 'Wellness', 'Beauty'];

  useEffect(() => {
    fetchProducts();
  }, [currentPage, searchTerm, categoryFilter, isActiveFilter]);

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });

      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter) params.append('category', categoryFilter);
      if (isActiveFilter) params.append('isActive', isActiveFilter);

      const response = await fetch(`/api/products?${params}`);
      const data = await response.json();

      setProducts(data.products || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (productId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error('Failed to update product status:', error);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
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
          <h1 className="text-4xl font-bold text-brand-900 font-display mb-2">Product Management</h1>
          <p className="text-lg text-brand-600">Manage your product catalog</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center space-x-3 shadow-premium hover:shadow-premium-lg"
        >
          <Plus size={22} />
          <span className="font-semibold">Add Product</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card-premium rounded-2xl p-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary-400" size={20} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-premium pl-12 w-full"
            />
          </div>
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-premium"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select
            value={isActiveFilter}
            onChange={(e) => setIsActiveFilter(e.target.value)}
            className="input-premium"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          <button
            onClick={fetchProducts}
            className="btn-secondary font-semibold"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="table-premium rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="table-premium">
              <tr>
                <th className="px-8 py-5 text-left text-sm font-bold text-brand-700 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-8 py-5 text-left text-sm font-bold text-brand-700 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-8 py-5 text-left text-sm font-bold text-brand-700 uppercase tracking-wider">
                  Variants
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
              {products.map((product) => (
                <tr key={product._id} className="table-premium hover:scale-[1.01] transition-all duration-200">
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="flex items-center space-x-4">
                      <div className="h-16 w-16 flex-shrink-0">
                        <img
                          className="h-16 w-16 rounded-2xl object-cover shadow-lg ring-2 ring-white"
                          src={product.images[0]?.optimizedUrls?.thumbnail || product.images[0]?.url || '/placeholder-image.jpg'}
                          alt={product.images[0]?.alt || product.name}
                        />
                      </div>
                      <div>
                        <div className="text-base font-bold text-brand-900">
                          {product.name}
                        </div>
                        <div className="text-sm text-brand-600 font-medium">
                          {product.brand}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-sm font-semibold text-brand-700">
                    {product.category}
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-sm font-semibold text-brand-700">
                    {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex px-3 py-1.5 text-sm font-bold rounded-xl ${
                        product.isActive
                          ? 'bg-success-100 text-success-800 border border-success-200'
                          : 'bg-danger-100 text-danger-800 border border-danger-200'
                      }`}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {product.isFeatured && (
                        <span className="inline-flex px-3 py-1.5 text-sm font-bold rounded-xl bg-accent-100 text-accent-800 border border-accent-200">
                          Featured
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleToggleActive(product._id, product.isActive)}
                        className={`p-2.5 rounded-xl transition-all duration-200 ${
                          product.isActive
                            ? 'text-danger-600 hover:text-danger-700 hover:bg-danger-50 border border-danger-200'
                            : 'text-success-600 hover:text-success-700 hover:bg-success-50 border border-success-200'
                        }`}
                        title={product.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {product.isActive ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <button
                        onClick={() => {
                          setEditingProduct(product);
                          setShowForm(true);
                        }}
                        className="p-2.5 rounded-xl text-primary-600 hover:text-primary-700 hover:bg-primary-50 border border-primary-200 transition-all duration-200"
                        title="Edit Product"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product._id)}
                        className="p-2.5 rounded-xl text-danger-600 hover:text-danger-700 hover:bg-danger-50 border border-danger-200 transition-all duration-200"
                        title="Delete Product"
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
          <div className="bg-white/90 backdrop-blur-sm px-8 py-6 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-6 py-3 border border-neutral-300 text-sm font-semibold rounded-xl text-brand-700 bg-white hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-4 relative inline-flex items-center px-6 py-3 border border-neutral-300 text-sm font-semibold rounded-xl text-brand-700 bg-white hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-brand-700 font-medium">
                    Page <span className="font-bold text-primary-600">{currentPage}</span> of{' '}
                    <span className="font-bold text-primary-600">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-2xl shadow-lg overflow-hidden">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-6 py-3 bg-white border-r border-neutral-200 text-sm font-semibold text-brand-600 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-6 py-3 bg-white text-sm font-semibold text-brand-600 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
        <ProductForm
          product={editingProduct}
          onClose={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
          onSuccess={() => {
            fetchProducts();
            setShowForm(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}

interface ProductFormProps {
  product?: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

function ProductForm({ product, onClose, onSuccess }: ProductFormProps) {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    shortDescription: product?.shortDescription || '',
    category: product?.category || '',
    brand: product?.brand || 'Salveo Organics',
    images: product?.images || [],
    variants: product?.variants || [{ name: '', price: 0, inventory: 0 }],
    tags: product?.tags ? product.tags.join(', ') : '',
    isActive: product?.isActive ?? true,
    isFeatured: product?.isFeatured || false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = ['Supplements', 'Skincare', 'Food & Beverage', 'Wellness', 'Beauty'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      };

      const url = product ? `/api/products/${product._id}` : '/api/products';
      const method = product ? 'PUT' : 'POST';

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
        setError(data.error || 'Failed to save product');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, { name: '', price: 0, inventory: 0 }]
    }));
  };

  const removeVariant = (index: number) => {
    if (formData.variants.length > 1) {
      setFormData(prev => ({
        ...prev,
        variants: prev.variants.filter((_, i) => i !== index)
      }));
    }
  };

  const updateVariant = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((variant, i) => 
        i === index ? { ...variant, [field]: value } : variant
      )
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="card-premium rounded-3xl shadow-premium-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-white/20 animate-scale-in">
        <form onSubmit={handleSubmit} className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-brand-900 font-display">
                {product ? 'Edit Product' : 'Add New Product'}
              </h2>
              <p className="text-lg text-brand-600 mt-1">
                {product ? 'Update product information' : 'Create a new product listing'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-brand-400 hover:text-brand-600 p-3 hover:bg-brand-50 rounded-xl transition-colors"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="bg-danger-50 border border-danger-200 text-danger-700 px-6 py-4 rounded-xl mb-6 animate-slide-in">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-bold text-brand-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="input-premium w-full"
                placeholder="Enter product name"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-brand-700 mb-2">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="input-premium w-full"
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-brand-700 mb-2">
                Brand
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                className="input-premium w-full"
                placeholder="Enter brand name"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-brand-700 mb-2">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                className="input-premium w-full"
                placeholder="organic, natural, supplement"
              />
            </div>
          </div>

          <div className="mt-8">
            <label className="block text-sm font-bold text-brand-700 mb-2">
              Description *
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="input-premium w-full resize-none"
              placeholder="Enter detailed product description"
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-bold text-brand-700 mb-2">
              Short Description
            </label>
            <textarea
              rows={2}
              value={formData.shortDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, shortDescription: e.target.value }))}
              className="input-premium w-full resize-none"
              maxLength={200}
              placeholder="Brief product summary (max 200 characters)"
            />
          </div>

          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-bold text-brand-700">
                Product Variants *
              </label>
              <button
                type="button"
                onClick={addVariant}
                className="px-4 py-2 bg-gradient-to-r from-secondary-600 to-secondary-700 hover:from-secondary-700 hover:to-secondary-800 text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Add Variant
              </button>
            </div>
            {formData.variants.map((variant, index) => (
              <div key={index} className="flex gap-4 mb-4 items-end p-4 bg-gradient-to-r from-neutral-50 to-neutral-100 rounded-xl border border-neutral-200">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-brand-600 mb-1">Variant Name</label>
                  <input
                    type="text"
                    placeholder="e.g., 500g Powder"
                    value={variant.name}
                    onChange={(e) => updateVariant(index, 'name', e.target.value)}
                    className="input-premium w-full text-sm"
                    required
                  />
                </div>
                <div className="w-36">
                  <label className="block text-xs font-semibold text-brand-600 mb-1">Price (₱)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    value={variant.price}
                    onChange={(e) => updateVariant(index, 'price', parseFloat(e.target.value) || 0)}
                    className="input-premium w-full text-sm"
                    required
                  />
                </div>
                <div className="w-28">
                  <label className="block text-xs font-semibold text-brand-600 mb-1">Stock</label>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    value={variant.inventory}
                    onChange={(e) => updateVariant(index, 'inventory', parseInt(e.target.value) || 0)}
                    className="input-premium w-full text-sm"
                    required
                  />
                </div>
                {formData.variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVariant(index)}
                    className="px-4 py-2 bg-gradient-to-r from-danger-600 to-danger-700 hover:from-danger-700 hover:to-danger-800 text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8">
            <label className="block text-sm font-bold text-brand-700 mb-2">
              Product Images *
            </label>
            <ImageUpload
              onImagesChange={(images) => setFormData(prev => ({ ...prev, images }))}
              existingImages={formData.images}
              maxImages={10}
              folder="products"
              className="mt-2"
            />
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center p-4 rounded-xl bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-primary-300 rounded-lg"
              />
              <label htmlFor="isActive" className="ml-3 block text-sm font-semibold text-primary-900">
                Product is active
              </label>
            </div>

            <div className="flex items-center p-4 rounded-xl bg-gradient-to-r from-accent-50 to-accent-100 border border-accent-200">
              <input
                type="checkbox"
                id="isFeatured"
                checked={formData.isFeatured}
                onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                className="h-5 w-5 text-accent-600 focus:ring-accent-500 border-accent-300 rounded-lg"
              />
              <label htmlFor="isFeatured" className="ml-3 block text-sm font-semibold text-accent-900">
                Featured product
              </label>
            </div>
          </div>

          <div className="mt-10 flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 border border-neutral-300 rounded-xl text-brand-700 font-semibold hover:bg-neutral-50 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}