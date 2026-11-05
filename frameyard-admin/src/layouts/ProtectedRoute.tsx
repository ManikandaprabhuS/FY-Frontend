import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import RouteErrorPage from '../pages/errors/RouteErrorPage';

export const ProtectedRoute: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loading = useAuthStore((state) => state.loading);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-outline-variant bg-white shadow-sm">
          <LoaderCircle aria-label="Loading" className="h-7 w-7 animate-spin text-black" />
        </div>
        <p className="mt-4 text-sm font-medium text-secondary animate-pulse">Checking credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/fyadminlogin" replace />;
  }

  if (user?.role !== 'ADMIN' && user?.role !== 'EMPLOYEE') {
    return <RouteErrorPage />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
