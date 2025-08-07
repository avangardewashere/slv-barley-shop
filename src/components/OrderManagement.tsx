'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Eye, Edit, Package, Truck, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Order {
  _id: string;
  orderNumber: string;
  customerEmail: string;
  customerName?: string;
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
    type: string;
  }>;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  trackingNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export default function OrderManagement() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [currentPage, searchTerm, statusFilter, paymentFilter]);

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });

      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (paymentFilter) params.append('paymentStatus', paymentFilter);

      const response = await fetch(`/api/orders?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setTotalPages(Math.ceil((data.pagination?.total || 0) / 10));
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchOrders();
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-warning-500" />;
      case 'processing':
        return <Package className="h-4 w-4 text-primary-500" />;
      case 'shipped':
        return <Truck className="h-4 w-4 text-accent-500" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-success-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-danger-500" />;
      default:
        return <Clock className="h-4 w-4 text-neutral-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-warning-100 text-warning-700 border-warning-200';
      case 'processing':
        return 'bg-primary-100 text-primary-700 border-primary-200';
      case 'shipped':
        return 'bg-accent-100 text-accent-700 border-accent-200';
      case 'delivered':
        return 'bg-success-100 text-success-700 border-success-200';
      case 'cancelled':
        return 'bg-danger-100 text-danger-700 border-danger-200';
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-success-100 text-success-700 border-success-200';
      case 'pending':
        return 'bg-warning-100 text-warning-700 border-warning-200';
      case 'failed':
      case 'refunded':
        return 'bg-danger-100 text-danger-700 border-danger-200';
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-200 rounded mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-neutral-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-brand-900 font-display mb-2">Order Management</h1>
          <p className="text-lg text-brand-600">Track and manage customer orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card-premium rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-premium pl-10 w-full"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-premium w-full"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="input-premium w-full"
          >
            <option value="">All Payment Status</option>
            <option value="pending">Payment Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Payment Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
              setPaymentFilter('');
            }}
            className="btn-secondary"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card-premium rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full table-premium">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="px-6 py-4 text-left text-sm font-semibold text-brand-700">Order #</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-brand-700">Customer</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-brand-700">Items</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-brand-700">Total</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-brand-700">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-brand-700">Payment</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-brand-700">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-brand-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {orders.map((order) => (
                <tr key={order._id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm text-primary-600">
                      #{order.orderNumber}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-brand-900">
                        {order.customerName || 'Guest'}
                      </div>
                      <div className="text-sm text-brand-500">{order.customerEmail}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-brand-700">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-brand-900">
                      {order.currency} {order.total.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(order.status)}
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getPaymentStatusColor(order.paymentStatus)}`}>
                      {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderDetails(true);
                        }}
                        className="text-primary-600 hover:text-primary-800 transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                        className="text-xs border rounded px-2 py-1"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-brand-600">
          Showing {orders.length} orders
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-brand-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-brand-900 font-display">
                  Order #{selectedOrder.orderNumber}
                </h2>
                <button
                  onClick={() => setShowOrderDetails(false)}
                  className="text-neutral-500 hover:text-neutral-700"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Order Info */}
                <div>
                  <h3 className="text-lg font-semibold text-brand-900 mb-4">Order Information</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-brand-600">Status:</span>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(selectedOrder.status)}
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedOrder.status)}`}>
                          {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-brand-600">Payment Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getPaymentStatusColor(selectedOrder.paymentStatus)}`}>
                        {selectedOrder.paymentStatus.charAt(0).toUpperCase() + selectedOrder.paymentStatus.slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-brand-600">Order Date:</span>
                      <span>{new Date(selectedOrder.createdAt).toLocaleDateString()}</span>
                    </div>
                    {selectedOrder.trackingNumber && (
                      <div className="flex justify-between">
                        <span className="text-brand-600">Tracking Number:</span>
                        <span className="font-mono">{selectedOrder.trackingNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Info */}
                <div>
                  <h3 className="text-lg font-semibold text-brand-900 mb-4">Customer Information</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-brand-600">Name:</span> {selectedOrder.customerName || 'Guest'}
                    </div>
                    <div>
                      <span className="text-brand-600">Email:</span> {selectedOrder.customerEmail}
                    </div>
                    <div>
                      <span className="text-brand-600">Shipping Address:</span>
                      <div className="mt-1 text-brand-700">
                        {selectedOrder.shippingAddress.street}<br />
                        {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zipCode}<br />
                        {selectedOrder.shippingAddress.country}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-brand-900 mb-4">Order Items</h3>
                <div className="border border-neutral-200 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-brand-700">Product</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-brand-700">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-brand-700">Quantity</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-brand-700">Price</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-brand-700">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {selectedOrder.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-brand-900">{item.productName}</td>
                          <td className="px-4 py-3 text-sm text-brand-600">{item.type}</td>
                          <td className="px-4 py-3 text-sm text-brand-600">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-brand-600">{selectedOrder.currency} {item.price.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm font-medium text-brand-900">
                            {selectedOrder.currency} {(item.quantity * item.price).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order Summary */}
              <div className="mt-8 bg-neutral-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-brand-900 mb-4">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{selectedOrder.currency} {selectedOrder.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>{selectedOrder.currency} {selectedOrder.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping:</span>
                    <span>{selectedOrder.currency} {selectedOrder.shipping.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-neutral-300">
                    <span>Total:</span>
                    <span>{selectedOrder.currency} {selectedOrder.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}