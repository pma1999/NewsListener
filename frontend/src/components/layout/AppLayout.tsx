import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import { useAuthStore, SESSION_EXPIRED_MESSAGE } from '../../store/authStore'; // Import authStore and message

const AppLayout: React.FC = () => {
  const authError = useAuthStore((state) => state.error);
  const clearAuthError = useAuthStore((state) => state.clearError);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (authError === SESSION_EXPIRED_MESSAGE) {
      setNotification(authError);
      // Clear the notification after a few seconds
      const timer = setTimeout(() => {
        setNotification(null);
        // Optionally clear the error from the store if the toast is the primary display
        // and LoginPage shouldn't show it again. Or let LoginPage handle it.
        // For now, we let LoginPage also see it, so user knows why they landed there.
        // clearAuthError(); 
      }, 5000); // Display for 5 seconds

      return () => clearTimeout(timer);
    }
  }, [authError, clearAuthError]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-gray-100">
      <Header />
      {notification && (
        <div 
          role="alert"
          className="fixed top-4 right-4 z-50 bg-red-600 text-white p-3 rounded-md shadow-lg animate-pulse-once"
          style={{ animation: 'pulse-once 1s ease-in-out' }}
        >
          {notification}
        </div>
      )}
      <main className="flex-grow container mx-auto px-2 py-4 sm:px-4 sm:py-8">
        <Outlet /> {/* Child routes will render here */}
      </main>
      <footer className="bg-gray-800 text-center p-3 sm:p-4 text-xs sm:text-sm text-gray-400 shadow-inner">
        <p>&copy; {new Date().getFullYear()} NewsListener. All rights reserved.</p>
        <p>Crafted with &hearts; for personalized news.</p>
      </footer>
      {/* Basic keyframes for the pulse animation (could be in a global CSS file) */}
      <style>
        {`
          @keyframes pulse-once {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.9; transform: scale(1.05); }
          }
          .animate-pulse-once {
            animation: pulse-once 1s ease-out;
          }
        `}
      </style>
    </div>
  );
};

export default AppLayout; 