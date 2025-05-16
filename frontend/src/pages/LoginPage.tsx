import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// Basic styling for centering
const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '80vh',
  padding: '20px',
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '15px',
  padding: '30px',
  border: '1px solid #ccc',
  borderRadius: '8px',
  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  backgroundColor: '#f9f9f9',
  width: '100%',
  maxWidth: '400px',
};

const inputStyle: React.CSSProperties = {
  padding: '10px',
  borderRadius: '4px',
  border: '1px solid #ddd',
  fontSize: '16px',
};

const buttonStyle: React.CSSProperties = {
  padding: '12px 20px',
  borderRadius: '4px',
  border: 'none',
  backgroundColor: '#007bff',
  color: 'white',
  fontSize: '16px',
  cursor: 'pointer',
  transition: 'background-color 0.3s ease',
};

const errorStyle: React.CSSProperties = {
  color: 'red',
  marginTop: '10px',
  textAlign: 'center' as 'center',
};

const linkStyle: React.CSSProperties = {
  marginTop: '15px',
  textAlign: 'center' as 'center',
};

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/generate';

  useEffect(() => {
    // Clear any previous errors when the component mounts or when email/password changes
    clearError();
  }, [email, password, clearError]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError(); // Clear previous errors before attempting login
    try {
      await login({ email, password });
      // Navigation is handled by the useEffect above
    } catch (err) {
      // Error is set in the store, no need to console.error here unless for additional debugging
    }
  };

  return (
    <div style={pageStyle}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit} style={formStyle}>
        <div>
          <label htmlFor="email">Email:</label>
          <input 
            type="email" 
            id="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            style={inputStyle}
            placeholder="user@example.com"
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input 
            type="password" 
            id="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            style={inputStyle}
            placeholder="********"
          />
        </div>
        {error && <p style={errorStyle}>{error}</p>}
        <button 
          type="submit" 
          disabled={isLoading} 
          style={{...buttonStyle, backgroundColor: isLoading ? '#0056b3' : '#007bff'}}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p style={linkStyle}>
        Don't have an account? <Link to="/register">Register here</Link>
      </p>
    </div>
  );
};

export default LoginPage; 