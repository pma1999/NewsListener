import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/generate';

  useEffect(() => {
    clearError();
  }, [email, password, clearError]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login({ email, password });
    } catch (err) {
      // Error is set in the store
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 bg-gray-900 text-gray-100">
      <div className="w-full max-w-sm sm:max-w-md bg-gray-800 p-6 sm:p-8 rounded-lg shadow-xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-purple-400 mb-6 sm:mb-8">Login</h2>
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-purple-300 mb-1">Email:</label>
            <input 
              type="email" 
              id="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-purple-300 mb-1">Password:</label>
            <input 
              type="password" 
              id="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400"
              placeholder="********"
            />
          </div>
          {error && <p className="text-sm text-red-400 text-center py-2 px-3 bg-red-900/30 border border-red-700 rounded-md">{error}</p>}
          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="mt-6 sm:mt-8 text-sm text-center text-gray-400">
          Don't have an account? <Link to="/register" className="font-medium text-purple-400 hover:text-purple-300">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage; 