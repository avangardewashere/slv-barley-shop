'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/LoginForm';
import RegisterForm from '@/components/RegisterForm';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import ProductManagement from '@/components/ProductManagement';
import OrderManagement from '@/components/OrderManagement';
import ReviewManagement from '@/components/ReviewManagement';
import ApiDocumentation from '@/components/ApiDocumentation';

export default function Home() {
  const { admin, isLoading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-primary-50/30 to-secondary-50/20">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600"></div>
      </div>
    );
  }

  if (!admin) {
    return showRegister ? (
      <RegisterForm onSwitchToLogin={() => setShowRegister(false)} />
    ) : (
      <LoginForm onSwitchToRegister={() => setShowRegister(true)} />
    );
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'products':
        return <ProductManagement />;
      case 'orders':
        return <OrderManagement />;
      case 'reviews':
        return <ReviewManagement />;
      case 'api-docs':
        return <ApiDocumentation />;
      case 'members':
        return (
          <div className="p-8">
            <h1 className="text-4xl font-bold text-brand-900 font-display mb-6">Member Management</h1>
            <div className="card-premium rounded-2xl p-8">
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-accent-500 to-accent-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-white">👥</span>
                </div>
                <p className="text-xl text-brand-700 font-semibold mb-2">Member management features coming soon!</p>
                <p className="text-brand-600">
                  The member schema is already prepared for future implementation.
                </p>
              </div>
            </div>
          </div>
        );
      case 'analytics':
        return (
          <div className="p-8">
            <h1 className="text-4xl font-bold text-brand-900 font-display mb-6">Analytics</h1>
            <div className="card-premium rounded-2xl p-8">
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-white">📊</span>
                </div>
                <p className="text-xl text-brand-700 font-semibold mb-2">Analytics dashboard coming soon!</p>
                <p className="text-brand-600">
                  This will include sales data, product performance, and customer insights.
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-brand-50/50 via-primary-50/20 to-secondary-50/10 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary-200/20 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-secondary-200/20 rounded-full filter blur-3xl"></div>
      </div>
      
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
      <main className="flex-1 overflow-y-auto relative z-10">
        {renderActiveTab()}
      </main>
    </div>
  );
}
