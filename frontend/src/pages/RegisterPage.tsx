import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const { register, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/generate');
    }
    clearError();
  }, [isAuthenticated, navigate, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setRegistrationSuccess(false);

    if (password !== confirmPassword) {
      useAuthStore.setState({ error: 'Passwords do not match' });
      return;
    }

    try {
      await register({ email, password, full_name: fullName || undefined });
      setRegistrationSuccess(true);
    } catch (err) {
      setRegistrationSuccess(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 bg-gray-900 text-gray-100">
      <div className="w-full max-w-sm sm:max-w-md bg-gray-800 p-6 sm:p-8 rounded-lg shadow-xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-purple-400 mb-6 sm:mb-8">Register</h2>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-purple-300 mb-1">Full Name (Optional):</label>
            <input 
              type="text" 
              id="fullName" 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400"
              placeholder="John Doe"
            />
          </div>
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
              placeholder="Minimum 6 characters"
              minLength={6}
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-purple-300 mb-1">Confirm Password:</label>
            <input 
              type="password" 
              id="confirmPassword" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              required 
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400"
              placeholder="Repeat password"
              minLength={6}
            />
          </div>
          {error && !registrationSuccess && <p className="text-sm text-red-400 text-center py-2 px-3 bg-red-900/30 border border-red-700 rounded-md">{error}</p>}
          {registrationSuccess && <p className="text-sm text-green-400 text-center py-2 px-3 bg-green-900/30 border border-green-700 rounded-md">Registration successful! You can now <Link to="/login" className="font-medium text-purple-400 hover:text-purple-300">login</Link>.</p>}
          <button 
            type="submit" 
            disabled={isLoading || registrationSuccess} 
            className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="mt-6 sm:mt-8 text-sm text-center text-gray-400">
          Already have an account? <Link to="/login" className="font-medium text-purple-400 hover:text-purple-300">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage; 