import { create } from 'zustand';
import { showApiError, showError, showWarning, dismissToast } from '../utils/toast';
import axios from 'axios';
import { User } from '../types';
import { authService, type CustomerRegistrationInput } from '../services/auth.service';
import { useCustomerCommerceStore } from './customerCommerceStore';

const AUTH_TOKEN_KEY = 'fy_auth_token';

const getStoredAuthToken = () => {
  const sessionToken = sessionStorage.getItem(AUTH_TOKEN_KEY);
  const legacyLocalToken = localStorage.getItem(AUTH_TOKEN_KEY);

  if (!sessionToken && legacyLocalToken) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, legacyLocalToken);
  }

  if (legacyLocalToken) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }

  return sessionToken || legacyLocalToken;
};

const setStoredAuthToken = (token: string) => {
  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

const clearStoredAuthToken = () => {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

const getAuthErrorMessage = (error: unknown, fallback: string): string => {
  if (!axios.isAxiosError<{ message?: string; error?: { code?: string; message?: string } }>(error)) return fallback;
  if (!error.response) {
    return error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
      ? 'The login request timed out. Please try again.'
      : 'Unable to connect to the server. Please check your connection and try again.';
  }
  if (error.response?.data?.error?.code === 'EMAIL_NOT_VERIFIED') {
    return 'Please verify your email to continue';
  }
  return error.response?.data?.error?.message ?? error.response?.data?.message ?? fallback;
};

export type CustomerRegistrationResult = {
  success: boolean;
  confirmationRequired: boolean;
};

interface AuthState {
  status: 'checking' | 'authenticated' | 'unauthenticated';
  verificationError: string | null;
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  authChecked: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginCustomer: (email: string, password: string) => Promise<boolean>;
  registerCustomer: (input: CustomerRegistrationInput) => Promise<CustomerRegistrationResult>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (profileData: Partial<User>) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  clearError: () => void;
}

let authCheckPromise: Promise<void> | null = null;

const initialToken = getStoredAuthToken();
export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'checking',
  verificationError: null,
  user: null,
  token: initialToken,
  isAuthenticated: false,
  loading: false,
  authChecked: false,
  error: null,

 login: async (email, password) => {
  set({
    loading: true,
    error: null,
  });

  try {
    const response = await authService.login(
        email,
        password
      );

const user = response.user;
const token = response.accessToken;

if (user?.role === 'CUSTOMER') {
  showError('Access Denied: customers cannot access the admin dashboard.');
  clearStoredAuthToken();
  set({
    user: null,
    token: null,
    isAuthenticated: false, status: 'unauthenticated', verificationError: null,
    error: 'Access Denied: customers cannot access the admin dashboard.',
    loading: false,
  });
  return false;
}

if (token) {
  setStoredAuthToken(token);
}

    set({
      user,
      token,
      isAuthenticated: true, status: 'authenticated', verificationError: null,
      loading: false,
      authChecked: true,
    });
    return true;
  } catch (err: unknown) {
    const errMsg = getAuthErrorMessage(err, 'Login failed');
    showApiError(err, errMsg);
    set({
      error: errMsg,
      loading: false,
    });
    return false;
  }
},

  loginCustomer: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await authService.customerLogin(email, password);
      if (response.user.role !== 'CUSTOMER') {
        showError('This account is not a customer account.');
        clearStoredAuthToken();
        set({ user: null, token: null, isAuthenticated: false, status: 'unauthenticated', verificationError: null, loading: false, error: 'This account is not a customer account.' });
        return false;
      }
      setStoredAuthToken(response.accessToken);
      useCustomerCommerceStore.getState().setCartOwner(response.user.id, true);
      set({
        user: response.user,
        token: response.accessToken,
        isAuthenticated: true, status: 'authenticated', verificationError: null,
        loading: false,
        authChecked: true,
        error: null,
      });
      return true;
    } catch (err: unknown) {
      clearStoredAuthToken();
      set({
        user: null,
        token: null,
        isAuthenticated: false, status: 'unauthenticated', verificationError: null,
        loading: false,
        authChecked: true,
        error: getAuthErrorMessage(err, 'Unable to log in right now. Please try again.'),
      });
      showApiError(err, getAuthErrorMessage(err, 'Unable to log in right now. Please try again.'));
      return false;
    }
  },

  registerCustomer: async (input) => {
    set({ loading: true, error: null });
    try {
      const registration = await authService.registerCustomer(input);
      if (registration.emailConfirmationRequired) {
        clearStoredAuthToken();
        set({ user: null, token: null, isAuthenticated: false, status: 'unauthenticated', verificationError: null, loading: false, error: null });
        return { success: true, confirmationRequired: true };
      }

      const login = await authService.customerLogin(input.email, input.password);
      setStoredAuthToken(login.accessToken);
      useCustomerCommerceStore.getState().setCartOwner(login.user.id, true);
      set({
        user: login.user,
        token: login.accessToken,
        isAuthenticated: true, status: 'authenticated', verificationError: null,
        loading: false,
        error: null,
      });
      return { success: true, confirmationRequired: false };
    } catch (err: unknown) {
      clearStoredAuthToken();
      set({
        user: null,
        token: null,
        isAuthenticated: false, status: 'unauthenticated', verificationError: null,
        loading: false,
        error: getAuthErrorMessage(err, 'Registration failed'),
      });
      showApiError(err, getAuthErrorMessage(err, 'Registration failed'));
      return { success: false, confirmationRequired: false };
    }
  },

  logout: async () => {
  set({ loading: true });

  try {
    await authService.logout();

    clearStoredAuthToken();
    useCustomerCommerceStore.getState().setCartOwner(null);

    set({
      user: null,
      token: null,
      isAuthenticated: false, status: 'unauthenticated', verificationError: null,
      loading: false,
      authChecked: true,
    });

  } catch {

    clearStoredAuthToken();
    useCustomerCommerceStore.getState().setCartOwner(null);

    set({
      user: null,
      token: null,
      isAuthenticated: false, status: 'unauthenticated', verificationError: null,
      loading: false,
      authChecked: true,
    });
  }
},
  checkAuth: async () => {
    if (authCheckPromise) return authCheckPromise;
    const checkingToken = getStoredAuthToken();
    if (!checkingToken) {
      if (get().isAuthenticated || get().user) useCustomerCommerceStore.getState().setCartOwner(null);
      if (get().status !== 'unauthenticated' || get().isAuthenticated) set({ user: null, token: null, isAuthenticated: false, status: 'unauthenticated', verificationError: null, loading: false, authChecked: true });
      return;
    }
    authCheckPromise = (async () => {
      dismissToast('auth-session-check');
      set({ status: 'checking', verificationError: null, authChecked: false });
      try {
        const user = await authService.me();
        if (getStoredAuthToken() !== checkingToken) return;
        useCustomerCommerceStore.getState().setCartOwner(user.role === 'CUSTOMER' ? user.id : null, user.role === 'CUSTOMER');
        set({ user, token: checkingToken, isAuthenticated: true, status: 'authenticated', verificationError: null, loading: false, authChecked: true });
      } catch (error: unknown) {
        if (getStoredAuthToken() !== checkingToken) return;
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          clearStoredAuthToken();
          useCustomerCommerceStore.getState().setCartOwner(null);
          set({ user: null, token: null, isAuthenticated: false, status: 'unauthenticated', verificationError: null, loading: false, authChecked: true });
          showWarning('Your session expired. Please login again.', { id: 'auth-session-expired' });
        } else {
          const message = 'Unable to verify your session. Check your connection and try again.';
          set({ status: 'checking', verificationError: message, loading: false, authChecked: false });
          showError(message, { id: 'auth-session-check', retry: () => { void get().checkAuth(); } });
        }
      } finally { authCheckPromise = null; }
    })();
    return authCheckPromise;
  },


  updateProfile: async (profileData) => {
    set({ loading: true, error: null });
    try {
      const updatedUser = await authService.updateProfile(profileData);
      set({ user: updatedUser, loading: false });
      return true;
    } catch (err: unknown) {
      set({ error: getAuthErrorMessage(err, 'Update failed'), loading: false });
      return false;
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    set({ loading: true, error: null });
    try {
      await authService.changePassword(currentPassword, newPassword);
      clearStoredAuthToken();
      useCustomerCommerceStore.getState().setCartOwner(null);
      set({ user: null, token: null, isAuthenticated: false, status: 'unauthenticated', verificationError: null, loading: false });
      return true;
    } catch (err: unknown) {
      set({ error: getAuthErrorMessage(err, 'Password update failed'), loading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
