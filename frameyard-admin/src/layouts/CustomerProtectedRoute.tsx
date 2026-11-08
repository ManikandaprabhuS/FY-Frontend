import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import AuthPendingScreen from '../components/auth/AuthPendingScreen';
export default function CustomerProtectedRoute({ children }: { children: ReactNode }) {
  const { status, user, verificationError, checkAuth } = useAuthStore();
  const location = useLocation();
  if (status === 'checking') return <AuthPendingScreen error={verificationError} onRetry={() => { void checkAuth(); }} />;
  if (status !== 'authenticated') return <Navigate to="/profile" replace state={{ returnTo: location.pathname + location.search + location.hash }} />;
  if (user?.role !== 'CUSTOMER') return <Navigate to="/admin/overview" replace />;
  return children;
}
