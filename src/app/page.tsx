'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/LoginForm';
import RegisterForm from '@/components/RegisterForm';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import ProductManagement from '@/components/ProductManagement';
import BundleManagement from '@/components/BundleManagement';
import ApiDocumentation from '@/components/ApiDocumentation';

export default function Home() {
  const { admin, isLoading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
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
      case 'bundles':
        return <BundleManagement />;
      case 'api-docs':
        return <ApiDocumentation />;
      case 'members':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Member Management</h1>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600">Member management features coming soon!</p>
              <p className="text-sm text-gray-500 mt-2">
                The member schema is already prepared for future implementation.
              </p>
            </div>
          </div>
        );
      case 'analytics':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Analytics</h1>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600">Analytics dashboard coming soon!</p>
              <p className="text-sm text-gray-500 mt-2">
                This will include sales data, product performance, and customer insights.
              </p>
            </div>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
      <main className="flex-1 overflow-y-auto">
        {renderActiveTab()}
      </main>
    </div>
  );
}
