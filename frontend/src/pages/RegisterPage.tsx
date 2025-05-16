import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// Basic styling (can be shared with LoginPage or moved to a CSS file)
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
  backgroundColor: '#28a745', // Green for registration
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

const successStyle: React.CSSProperties = {
  color: 'green',
  marginTop: '10px',
  textAlign: 'center' as 'center',
};

const linkStyle: React.CSSProperties = {
  marginTop: '15px',
  textAlign: 'center' as 'center',
};

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const { register, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is already authenticated, redirect them from register page
    if (isAuthenticated) {
      navigate('/generate');
    }
    // Clear any previous errors when the component mounts
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
      // Optionally navigate to login after a delay or let user click a link
      // setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      // Error is set in the store
      setRegistrationSuccess(false);
    }
  };

  return (
    <div style={pageStyle}>
      <h2>Register</h2>
      <form onSubmit={handleSubmit} style={formStyle}>
        <div>
          <label htmlFor="fullName">Full Name (Optional):</label>
          <input 
            type="text" 
            id="fullName" 
            value={fullName} 
            onChange={(e) => setFullName(e.target.value)} 
            style={inputStyle}
            placeholder="John Doe"
          />
        </div>
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
            placeholder="Minimum 6 characters"
            minLength={6}
          />
        </div>
        <div>
          <label htmlFor="confirmPassword">Confirm Password:</label>
          <input 
            type="password" 
            id="confirmPassword" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            required 
            style={inputStyle}
            placeholder="Repeat password"
            minLength={6}
          />
        </div>
        {error && !registrationSuccess && <p style={errorStyle}>{error}</p>}
        {registrationSuccess && <p style={successStyle}>Registration successful! You can now <Link to="/login">login</Link>.</p>}
        <button 
          type="submit" 
          disabled={isLoading || registrationSuccess} 
          style={{...buttonStyle, backgroundColor: isLoading || registrationSuccess ? '#1e7e34' : '#28a745'}}
        >
          {isLoading ? 'Registering...' : 'Register'}
        </button>
      </form>
      <p style={linkStyle}>
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
};

export default RegisterPage; 