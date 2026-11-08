import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore(state => state.status);
  const verificationError = useAuthStore(state => state.verificationError);
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const changePassword = useAuthStore((state) => state.changePassword);
  const clearError = useAuthStore((state) => state.clearError);

  return {
    user,
    status,
    verificationError,
    token,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
    checkAuth,
    updateProfile,
    changePassword,
    clearError,
  };
};
export default useAuth;
