import React from 'react';
import { Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import AuthPendingScreen from '../components/auth/AuthPendingScreen';
import RouteErrorPage from '../pages/errors/RouteErrorPage';

const AdminOnlyRoute: React.FC = () => {
  const { user, status, verificationError, checkAuth } = useAuth();
  if (status === 'checking') return <AuthPendingScreen error={verificationError} onRetry={() => { void checkAuth(); }} />;

  if (user?.role !== 'ADMIN') {
    return <RouteErrorPage homePath="/admin/overview" />;
  }

  return <Outlet />;
};

export default AdminOnlyRoute;
