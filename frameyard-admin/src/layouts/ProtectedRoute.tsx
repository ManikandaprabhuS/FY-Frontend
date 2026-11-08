import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import RouteErrorPage from '../pages/errors/RouteErrorPage';
import AuthPendingScreen from '../components/auth/AuthPendingScreen';

export const ProtectedRoute: React.FC = () => {
  const { status, user, verificationError, checkAuth } = useAuthStore();
  const location = useLocation();
  if (status === 'checking') return <AuthPendingScreen error={verificationError} onRetry={() => { void checkAuth(); }} />;
  if (status === 'unauthenticated') return <Navigate to="/fyadminlogin" replace state={{ returnTo: location.pathname + location.search + location.hash }} />;
  if (user?.role !== 'ADMIN' && user?.role !== 'EMPLOYEE') return <RouteErrorPage />;
  return <Outlet />;
};
export default ProtectedRoute;
