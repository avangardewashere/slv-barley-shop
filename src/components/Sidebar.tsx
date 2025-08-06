'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { VERSION } from '@/lib/version';
import { 
  Package, 
  ShoppingBag, 
  Users, 
  LogOut, 
  Home,
  BarChart3,
  Menu,
  X,
  FileText
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'bundles', label: 'Bundles', icon: ShoppingBag },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'api-docs', label: 'API Docs', icon: FileText },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export default function Sidebar({ activeTab, setActiveTab, isCollapsed, setIsCollapsed }: SidebarProps) {
  const { admin, logout } = useAuth();

  return (
    <div className={`bg-gradient-to-b from-emerald-800 to-emerald-900 text-white transition-all duration-300 min-h-screen relative ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-1.5 shadow-lg transition-colors z-10 border-2 border-white"
      >
        {isCollapsed ? <Menu size={16} /> : <X size={16} />}
      </button>

      <div className="p-4">
        {/* Header */}
        <div className="mb-8">
          {!isCollapsed ? (
            <>
              <h1 className="text-xl font-bold text-emerald-100">SLV Barley Shop</h1>
              <p className="text-sm text-emerald-300">Admin Dashboard</p>
              <div className="mt-2 px-2 py-1 bg-indigo-600/30 rounded-md border border-indigo-500/50">
                <span className="text-xs text-indigo-200">{VERSION}</span>
              </div>
            </>
          ) : (
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mx-auto shadow-lg">
              <span className="text-sm font-bold">SB</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center transition-all duration-200 rounded-lg group relative ${
                  isCollapsed ? 'px-2 py-3 justify-center' : 'px-3 py-2.5 space-x-3'
                } ${
                  activeTab === item.id
                    ? 'bg-indigo-600 text-white shadow-lg border-r-2 border-indigo-400'
                    : 'text-emerald-200 hover:bg-emerald-700/50 hover:text-white hover:border-r-2 hover:border-indigo-400/50'
                }`}
                title={isCollapsed ? item.label : ''}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!isCollapsed && <span className="font-medium">{item.label}</span>}
                
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-14 bg-indigo-700 text-indigo-100 px-2 py-1 rounded text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 border border-indigo-500">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className={`absolute bottom-4 left-4 ${isCollapsed ? 'right-4' : 'right-4'}`}>
          <div className="border-t border-emerald-700 pt-4">
            {!isCollapsed && (
              <div className="mb-4">
                <p className="text-sm font-medium text-emerald-100 truncate">{admin?.name}</p>
                <p className="text-xs text-emerald-300 truncate">{admin?.email}</p>
              </div>
            )}
            <button
              onClick={logout}
              className={`w-full flex items-center text-emerald-200 hover:bg-emerald-700/50 hover:text-white rounded-lg transition-all duration-200 group relative ${
                isCollapsed ? 'px-2 py-3 justify-center' : 'px-3 py-2.5 space-x-3'
              }`}
              title={isCollapsed ? 'Logout' : ''}
            >
              <LogOut size={20} className="flex-shrink-0" />
              {!isCollapsed && <span className="font-medium">Logout</span>}
              
              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-14 bg-indigo-700 text-indigo-100 px-2 py-1 rounded text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 border border-indigo-500">
                  Logout
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}