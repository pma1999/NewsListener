import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import HomePage from './pages/HomePage';
import PreferencesPage from './pages/PreferencesPage';
import NotFoundPage from './pages/NotFoundPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';

function App() {
  // Select individual state slices for stability
  const loadUser = useAuthStore((state) => state.loadUser);
  const token = useAuthStore((state) => state.token);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    // Only attempt to load user details if a token exists,
    // we aren't already authenticated, and not currently loading.
    if (token && !isAuthenticated && !isLoading) {
      loadUser();
    }
    // If there's no token, ProtectedRoute will handle redirection.
    // The authStore's logout function (or initial state) ensures isAuthenticated is false.
    // No explicit loadUser() call needed here just for !token case, as that could contribute to loops.
  }, [token, isAuthenticated, isLoading, loadUser]); // useEffect dependencies

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/generate" replace />} />
          <Route path="generate" element={<HomePage />} />
          <Route path="preferences" element={<PreferencesPage />} />
          {/* Example for a future podcast details page if needed */}
          {/* <Route path="podcasts/:podcastId" element={<PodcastDetailsPage />} /> */}
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
