'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export default function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(formData.email, formData.password);
    
    if (!result.success) {
      setError(result.error || 'Login failed');
    }
    
    setIsLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-primary-50/30 to-secondary-50/20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-secondary-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-accent-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="relative z-10 max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-premium transform rotate-3 hover:rotate-0 transition-transform duration-300">
            <span className="text-2xl font-bold text-white font-display">SB</span>
          </div>
          <h2 className="text-4xl font-bold text-brand-900 font-display">
            Admin Login
          </h2>
          <p className="mt-3 text-lg text-brand-600">
            SLV Barley Shop Administration
          </p>
        </div>
        
        <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-xl backdrop-blur-sm animate-fade-in">
              {error}
            </div>
          )}
          
          <div className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-brand-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="input-premium w-full text-base focus:scale-105 transition-all duration-200"
                placeholder="Enter your email address"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-brand-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="input-premium w-full pr-12 text-base focus:scale-105 transition-all duration-200"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-brand-400 hover:text-brand-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
            >
              <span className="relative z-10">
                {isLoading ? 'Signing in...' : 'Sign in'}
              </span>
              {!isLoading && (
                <div className="absolute inset-0 bg-gradient-to-r from-secondary-600 to-accent-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline transition-all duration-200 transform hover:scale-105"
            >
              Need to register a new admin? Click here
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}