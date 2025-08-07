'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { VERSION } from '@/lib/version';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  LogOut, 
  Home,
  Star,
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
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'api-docs', label: 'API Docs', icon: FileText },
];

export default function Sidebar({ activeTab, setActiveTab, isCollapsed, setIsCollapsed }: SidebarProps) {
  const { admin, logout } = useAuth();

  return (
    <div className={`bg-gradient-to-b from-primary-900 via-primary-800 to-primary-900 text-white transition-all duration-300 min-h-screen relative backdrop-blur-xl border-r border-white/10 ${
      isCollapsed ? 'w-20' : 'w-72'
    }`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-8 bg-gradient-to-r from-accent-600 to-accent-700 hover:from-accent-700 hover:to-accent-800 text-white rounded-full p-2.5 shadow-premium hover:shadow-premium-lg transition-all duration-200 z-20 border border-white/20 transform hover:scale-110"
      >
        {isCollapsed ? <Menu size={18} /> : <X size={18} />}
      </button>

      <div className={`transition-all duration-300 ${
        isCollapsed ? 'p-4' : 'p-6'
      }`}>
        {/* Header */}
        <div className={`transition-all duration-300 ${
          isCollapsed ? 'mb-8' : 'mb-10'
        }`}>
          {!isCollapsed ? (
            <>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-secondary-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-sm font-bold font-display">SB</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white font-display">SLV Barley Shop</h1>
                  <p className="text-xs text-primary-300 font-medium">Admin Dashboard</p>
                </div>
              </div>
              <div className="px-3 py-2 bg-gradient-to-r from-accent-600/20 to-secondary-600/20 rounded-xl border border-accent-400/30 backdrop-blur-sm">
                <span className="text-xs text-accent-200 font-medium">{VERSION}</span>
              </div>
            </>
          ) : (
            <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-secondary-500 rounded-xl flex items-center justify-center mx-auto shadow-premium">
              <span className="text-base font-bold font-display">SB</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={`transition-all duration-300 ${
          isCollapsed ? 'space-y-2' : 'space-y-3'
        }`}>
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center transition-all duration-300 rounded-2xl group relative overflow-hidden ${
                  isCollapsed ? 'px-4 py-4 justify-center' : 'px-4 py-3.5 space-x-4'
                } ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-accent-600 to-accent-700 text-white shadow-premium transform scale-105'
                    : 'text-primary-200 hover:bg-white/10 hover:text-white hover:shadow-lg hover:transform hover:scale-105 backdrop-blur-sm'
                }`}
                title={isCollapsed ? item.label : ''}
              >
                <Icon size={22} className="flex-shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="font-semibold text-base">{item.label}</span>
                    {activeTab === item.id && (
                      <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    )}
                  </>
                )}
                
                {/* Premium tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-20 bg-gradient-to-r from-primary-800 to-primary-900 text-white px-4 py-2 rounded-xl text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-50 border border-white/20 shadow-premium">
                    {item.label}
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-primary-800 rotate-45 border-l border-t border-white/20"></div>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className={`absolute bottom-6 transition-all duration-300 ${
          isCollapsed ? 'left-4 right-4' : 'left-6 right-6'
        }`}>
          <div className={`border-t border-white/10 transition-all duration-300 ${
            isCollapsed ? 'pt-4' : 'pt-6'
          }`}>
            {!isCollapsed && (
              <div className="mb-6 p-4 bg-gradient-to-r from-white/5 to-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-secondary-500 rounded-xl flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{admin?.name?.[0]?.toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{admin?.name}</p>
                    <p className="text-xs text-primary-300 truncate">{admin?.email}</p>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={logout}
              className={`w-full flex items-center text-primary-200 hover:bg-danger-600/20 hover:text-white rounded-2xl transition-all duration-300 group relative backdrop-blur-sm border border-transparent hover:border-danger-500/30 ${
                isCollapsed ? 'px-4 py-4 justify-center' : 'px-4 py-3.5 space-x-4'
              }`}
              title={isCollapsed ? 'Logout' : ''}
            >
              <LogOut size={22} className="flex-shrink-0" />
              {!isCollapsed && <span className="font-semibold text-base">Logout</span>}
              
              {/* Premium tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-20 bg-gradient-to-r from-danger-600 to-danger-700 text-white px-4 py-2 rounded-xl text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-50 border border-white/20 shadow-premium">
                  Logout
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-danger-600 rotate-45 border-l border-t border-white/20"></div>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Glass overlay effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/5 pointer-events-none"></div>
    </div>
  );
}