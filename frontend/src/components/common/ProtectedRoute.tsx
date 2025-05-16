import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const ProtectedRoute: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading); // To show loading or prevent premature redirect
  const token = useAuthStore((state) => state.token); // Check token presence as well
  const location = useLocation();

  // If still loading auth status OR if there's a token but user is not yet authenticated (still loading user details)
  if (isLoading || (token && !isAuthenticated)) {
    // You can replace this with a more sophisticated loading spinner component
    return (
        <div className="flex justify-center items-center h-screen bg-gray-900 text-gray-300">
            <p className="text-lg">Loading authentication status...</p>
        </div>
    );
  }

  if (!isAuthenticated && !token) { // Check both isAuthenticated and token to be sure
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />; // Renders the child route's element
};

export default ProtectedRoute; 