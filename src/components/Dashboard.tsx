'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Package, ShoppingBag, Users, TrendingUp } from 'lucide-react';

interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  totalBundles: number;
  activeBundles: number;
}

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ setActiveTab }: DashboardProps) {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    activeProducts: 0,
    totalBundles: 0,
    activeBundles: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [token]);

  const fetchStats = async () => {
    try {
      const [productsRes, bundlesRes] = await Promise.all([
        fetch('/api/products?limit=1'),
        fetch('/api/bundles?limit=1'),
      ]);

      const [productsData, bundlesData] = await Promise.all([
        productsRes.json(),
        bundlesRes.json(),
      ]);

      // Fetch active counts
      const [activeProductsRes, activeBundlesRes] = await Promise.all([
        fetch('/api/products?limit=1&isActive=true'),
        fetch('/api/bundles?limit=1&isActive=true'),
      ]);

      const [activeProductsData, activeBundlesData] = await Promise.all([
        activeProductsRes.json(),
        activeBundlesRes.json(),
      ]);

      setStats({
        totalProducts: productsData.pagination?.total || 0,
        activeProducts: activeProductsData.pagination?.total || 0,
        totalBundles: bundlesData.pagination?.total || 0,
        activeBundles: activeBundlesData.pagination?.total || 0,
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
      color: 'bg-indigo-500',
      subtitle: `${stats.activeProducts} active`,
    },
    {
      title: 'Total Bundles',
      value: stats.totalBundles,
      icon: ShoppingBag,
      color: 'bg-teal-500',
      subtitle: `${stats.activeBundles} active`,
    },
    {
      title: 'Members',
      value: 0,
      icon: Users,
      color: 'bg-green-500',
      subtitle: 'Coming soon',
    },
    {
      title: 'Growth',
      value: '+0%',
      icon: TrendingUp,
      color: 'bg-indigo-600',
      subtitle: 'Analytics coming soon',
    },
  ];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-emerald-900">Dashboard</h1>
        <p className="text-emerald-700">Welcome to your admin dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`${card.color} p-3 rounded-full text-white mr-4`}>
                  <Icon size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600">{card.title}</h3>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-500">{card.subtitle}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg border border-emerald-100 p-6">
          <h2 className="text-lg font-semibold text-emerald-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button 
              onClick={() => setActiveTab('products')}
              className="w-full text-left p-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200"
            >
              <span className="font-medium text-emerald-900">Add New Product</span>
              <p className="text-sm text-emerald-600">Create a new product listing</p>
            </button>
            <button 
              onClick={() => setActiveTab('bundles')}
              className="w-full text-left p-3 rounded-lg bg-teal-50 hover:bg-teal-100 transition-colors border border-teal-200"
            >
              <span className="font-medium text-teal-900">Create Bundle</span>
              <p className="text-sm text-teal-600">Bundle products together</p>
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className="w-full text-left p-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-200"
            >
              <span className="font-medium text-indigo-900">View Analytics</span>
              <p className="text-sm text-indigo-600">Coming soon</p>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-emerald-100 p-6">
          <h2 className="text-lg font-semibold text-emerald-900 mb-4">Recent Activity</h2>
          <div className="space-y-3 text-sm text-emerald-700">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <p>System initialized</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
              <p>Admin dashboard ready</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p>Database connected</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-lime-500 rounded-full"></div>
              <p className="text-emerald-600 font-medium">Ready to manage products and bundles!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}