'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Package, ShoppingCart, Users, TrendingUp, Star } from 'lucide-react';

interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  bundleProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalMembers: number;
  totalReviews: number;
  averageRating: number;
}

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ setActiveTab }: DashboardProps) {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    activeProducts: 0,
    bundleProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalMembers: 0,
    totalReviews: 0,
    averageRating: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [token]);

  const fetchStats = async () => {
    try {
      const [
        productsRes,
        activeProductsRes,
        bundleProductsRes,
        ordersRes,
        pendingOrdersRes,
        membersRes,
        reviewsRes
      ] = await Promise.all([
        fetch('/api/products?limit=1'),
        fetch('/api/products?limit=1&isActive=true'),
        fetch('/api/products?limit=1&productType=bundle'),
        fetch('/api/orders?limit=1'),
        fetch('/api/orders?limit=1&status=pending'),
        fetch('/api/members?limit=1'),
        fetch('/api/reviews?limit=1')
      ]);

      const [
        productsData,
        activeProductsData,
        bundleProductsData,
        ordersData,
        pendingOrdersData,
        membersData,
        reviewsData
      ] = await Promise.all([
        productsRes.json(),
        activeProductsRes.json(),
        bundleProductsRes.json(),
        ordersRes.json(),
        pendingOrdersRes.json(),
        membersRes.json(),
        reviewsRes.json()
      ]);

      setStats({
        totalProducts: productsData.pagination?.total || 0,
        activeProducts: activeProductsData.pagination?.total || 0,
        bundleProducts: bundleProductsData.pagination?.total || 0,
        totalOrders: ordersData.pagination?.total || 0,
        pendingOrders: pendingOrdersData.pagination?.total || 0,
        totalMembers: membersData.pagination?.total || 0,
        totalReviews: reviewsData.pagination?.total || 0,
        averageRating: reviewsData.averageRating || 0,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      gradient: 'from-primary-500 to-primary-600',
      bgGradient: 'from-primary-50 to-primary-100',
      subtitle: `${stats.activeProducts} active • ${stats.bundleProducts} bundles`,
      onClick: () => setActiveTab('products'),
    },
    {
      title: 'Orders',
      value: stats.totalOrders,
      icon: ShoppingCart,
      gradient: 'from-secondary-500 to-secondary-600',
      bgGradient: 'from-secondary-50 to-secondary-100',
      subtitle: `${stats.pendingOrders} pending`,
      onClick: () => setActiveTab('orders'),
    },
    {
      title: 'Members',
      value: stats.totalMembers,
      icon: Users,
      gradient: 'from-success-500 to-success-600',
      bgGradient: 'from-success-50 to-success-100',
      subtitle: 'Registered customers',
      onClick: () => setActiveTab('members'),
    },
    {
      title: 'Reviews',
      value: stats.totalReviews,
      icon: Star,
      gradient: 'from-accent-500 to-accent-600',
      bgGradient: 'from-accent-50 to-accent-100',
      subtitle: `${stats.averageRating.toFixed(1)} avg rating`,
      onClick: () => setActiveTab('reviews'),
    },
  ];

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card-premium rounded-2xl p-8 h-40 shimmer"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-brand-900 font-display mb-2">Dashboard</h1>
        <p className="text-lg text-brand-600">Welcome to your premium admin dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 mb-10">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div 
              key={index} 
              className="card-premium rounded-2xl p-6 hover:shadow-premium-lg transform hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
              onClick={card.onClick}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`bg-gradient-to-r ${card.gradient} p-4 rounded-xl text-white shadow-lg group-hover:shadow-xl transform group-hover:scale-110 transition-all duration-300`}>
                  <Icon size={28} />
                </div>
                <div className={`w-16 h-16 bg-gradient-to-br ${card.bgGradient} rounded-xl opacity-20 group-hover:opacity-30 transition-opacity duration-300`}></div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-brand-600 mb-1">{card.title}</h3>
                <p className="text-3xl font-bold text-brand-900 font-display mb-1">{card.value}</p>
                <p className="text-sm text-brand-500">{card.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card-premium rounded-2xl p-8">
          <h2 className="text-2xl font-semibold text-brand-900 font-display mb-6">Quick Actions</h2>
          <div className="space-y-4">
            <button 
              onClick={() => setActiveTab('products')}
              className="w-full text-left p-5 rounded-xl bg-gradient-to-r from-primary-50 to-primary-100 hover:from-primary-100 hover:to-primary-200 transition-all duration-300 border border-primary-200 group hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <div className="flex items-center space-x-4">
                <Package className="text-primary-600 group-hover:text-primary-700 transition-colors" size={24} />
                <div>
                  <span className="font-semibold text-primary-900 block">Manage Products</span>
                  <p className="text-sm text-primary-700 mt-1">Create and edit products (including bundles)</p>
                </div>
              </div>
            </button>
            <button 
              onClick={() => setActiveTab('orders')}
              className="w-full text-left p-5 rounded-xl bg-gradient-to-r from-secondary-50 to-secondary-100 hover:from-secondary-100 hover:to-secondary-200 transition-all duration-300 border border-secondary-200 group hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <div className="flex items-center space-x-4">
                <ShoppingCart className="text-secondary-600 group-hover:text-secondary-700 transition-colors" size={24} />
                <div>
                  <span className="font-semibold text-secondary-900 block">View Orders</span>
                  <p className="text-sm text-secondary-700 mt-1">Track and manage customer orders</p>
                </div>
              </div>
            </button>
            <button 
              onClick={() => setActiveTab('members')}
              className="w-full text-left p-5 rounded-xl bg-gradient-to-r from-success-50 to-success-100 hover:from-success-100 hover:to-success-200 transition-all duration-300 border border-success-200 group hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <div className="flex items-center space-x-4">
                <Users className="text-success-600 group-hover:text-success-700 transition-colors" size={24} />
                <div>
                  <span className="font-semibold text-success-900 block">Manage Members</span>
                  <p className="text-sm text-success-700 mt-1">View and manage customer accounts</p>
                </div>
              </div>
            </button>
            <button 
              onClick={() => setActiveTab('reviews')}
              className="w-full text-left p-5 rounded-xl bg-gradient-to-r from-accent-50 to-accent-100 hover:from-accent-100 hover:to-accent-200 transition-all duration-300 border border-accent-200 group hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <div className="flex items-center space-x-4">
                <Star className="text-accent-600 group-hover:text-accent-700 transition-colors" size={24} />
                <div>
                  <span className="font-semibold text-accent-900 block">Manage Reviews</span>
                  <p className="text-sm text-accent-700 mt-1">Moderate and respond to customer reviews</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="card-premium rounded-2xl p-8">
          <h2 className="text-2xl font-semibold text-brand-900 font-display mb-6">Recent Activity</h2>
          <div className="space-y-5">
            <div className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-success-50 to-success-100 border border-success-200">
              <div className="w-3 h-3 bg-success-500 rounded-full animate-pulse"></div>
              <p className="text-success-800 font-medium">System initialized</p>
            </div>
            <div className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200">
              <div className="w-3 h-3 bg-primary-500 rounded-full animate-pulse"></div>
              <p className="text-primary-800 font-medium">Admin dashboard ready</p>
            </div>
            <div className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-secondary-50 to-secondary-100 border border-secondary-200">
              <div className="w-3 h-3 bg-secondary-500 rounded-full animate-pulse"></div>
              <p className="text-secondary-800 font-medium">Database connected</p>
            </div>
            <div className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-accent-50 to-accent-100 border border-accent-200">
              <div className="w-3 h-3 bg-accent-500 rounded-full animate-pulse"></div>
              <p className="text-accent-800 font-semibold">Ready to manage products and bundles!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}