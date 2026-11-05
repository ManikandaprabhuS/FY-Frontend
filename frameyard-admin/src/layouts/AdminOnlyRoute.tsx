import React from 'react';
import { Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import RouteErrorPage from '../pages/errors/RouteErrorPage';

const AdminOnlyRoute: React.FC = () => {
  const { user } = useAuth();

  if (user?.role !== 'ADMIN') {
    return <RouteErrorPage homePath="/admin/overview" />;
  }

  return <Outlet />;
};

export default AdminOnlyRoute;
