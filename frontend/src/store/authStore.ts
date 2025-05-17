import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserResponseData, LoginCredentials, UserCreateData } from '../types/authTypes';
import { loginUser, fetchCurrentUser, registerUser } from '../services/authService';

export const SESSION_EXPIRED_MESSAGE = "Your session has expired. Please log in again.";

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
  logoutAndMarkSessionExpired: (message?: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const tokenResponse = await loginUser(credentials);
          set({ token: tokenResponse.access_token, isAuthenticated: true });
          await get().loadUser();
          set({ isLoading: false });
        } catch (err: any) {
          const errorMessage = err.response?.data?.detail || 'Login failed. Please check your credentials.';
          set({ error: errorMessage, isAuthenticated: false, isLoading: false, token: null, user: null });
          throw err;
        }
      },
      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          await registerUser(userData);
          set({ isLoading: false });
        } catch (err: any) {
          const errorMessage = err.response?.data?.detail || 'Registration failed. Please try again.';
          set({ error: errorMessage, isLoading: false });
          throw err;
        }
      },
      logout: () => {
        set({ token: null, user: null, isAuthenticated: false, error: null, isLoading: false });
      },
      logoutAndMarkSessionExpired: (message?: string) => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: message || SESSION_EXPIRED_MESSAGE,
        });
      },
      loadUser: async () => {
        const token = get().token;
        if (token && !get().user && !get().isLoading) {
          set({ isLoading: true, error: null });
          try {
            const userData = await fetchCurrentUser();
            set({ user: userData, isAuthenticated: true, isLoading: false });
          } catch (err: any) {
            if (get().error === SESSION_EXPIRED_MESSAGE) {
              set({ isLoading: false });
            } else {
              console.error("Error loading user, potentially invalid token:", err);
              get().logoutAndMarkSessionExpired("Could not refresh session. Please log in again.");
            }
          }
        } else if (!token) {
            set({ user: null, isAuthenticated: false, isLoading: false, error: null });
        }
      },
      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token }),
    }
  )
);

// Attempt to load user when the store is initialized if a token exists
// This helps in rehydrating the user state on app refresh
// Removing this call as it's better handled in App.tsx useEffect
// if (useAuthStore.getState().token) {
//     useAuthStore.getState().loadUser();
// } 