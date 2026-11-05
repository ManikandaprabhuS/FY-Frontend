import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import CustomerNavbar from '../features/customer/components/CustomerNavbar';
import Footer from '../features/customer/components/Footer';
import { useAuthStore } from '../store/authStore';
import { useCustomerCommerceStore } from '../store/customerCommerceStore';

const CustomerLayout: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const userId = useAuthStore((state) => state.user?.role === 'CUSTOMER' ? state.user.id : null);
  const loadWishlist = useCustomerCommerceStore((state) => state.loadWishlist);

  useEffect(() => {
    const hasStoredSession = Boolean(sessionStorage.getItem('fy_auth_token') || localStorage.getItem('fy_auth_token'));
    if (!isAuthenticated && hasStoredSession) void checkAuth();
  }, [checkAuth, isAuthenticated]);

  useEffect(() => {
    if (userId) void loadWishlist(userId);
  }, [loadWishlist, userId]);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <CustomerNavbar />

      <main>
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};

export default CustomerLayout;
