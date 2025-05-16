import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserResponseData, LoginCredentials, UserCreateData } from '../types/authTypes';
import { loginUser, fetchCurrentUser, registerUser } from '../services/authService';

interface AuthState {
  token: string | null;
  user: UserResponseData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  register: (userData: UserCreateData) => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false, // Initialize isLoading to false
      error: null,
      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const tokenResponse = await loginUser(credentials);
          set({ token: tokenResponse.access_token, isAuthenticated: true });
          await get().loadUser(); // Load user details after getting token
          set({ isLoading: false });
        } catch (err: any) {
          const errorMessage = err.response?.data?.detail || 'Login failed. Please check your credentials.';
          set({ error: errorMessage, isAuthenticated: false, isLoading: false, token: null, user: null });
          throw err; // Re-throw to allow components to catch it if needed
        }
      },
      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          await registerUser(userData); // Assuming register doesn't auto-login
          set({ isLoading: false });
          // Optionally, redirect to login or display a success message
        } catch (err: any) {
          const errorMessage = err.response?.data?.detail || 'Registration failed. Please try again.';
          set({ error: errorMessage, isLoading: false });
          throw err; // Re-throw to allow components to catch it if needed
        }
      },
      logout: () => {
        set({ token: null, user: null, isAuthenticated: false, error: null, isLoading: false });
      },
      loadUser: async () => {
        const token = get().token;
        if (token && !get().user) { // Only load if token exists and user not already loaded
          set({ isLoading: true, error: null });
          try {
            const userData = await fetchCurrentUser(token);
            set({ user: userData, isAuthenticated: true, isLoading: false });
          } catch (err) {
            // Token might be invalid/expired
            set({ token: null, user: null, isAuthenticated: false, isLoading: false, error: 'Session expired. Please log in again.' });
          }
        } else if (!token) {
            // Ensure consistent state if no token (e.g. after logout or initial load without token)
            set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'auth-storage', // key in localStorage
      storage: createJSONStorage(() => localStorage), // use localStorage
      partialize: (state) => ({ token: state.token }), // only persist token
    }
  )
);

// Attempt to load user when the store is initialized if a token exists
// This helps in rehydrating the user state on app refresh
// Removing this call as it's better handled in App.tsx useEffect
// if (useAuthStore.getState().token) {
//     useAuthStore.getState().loadUser();
// } 