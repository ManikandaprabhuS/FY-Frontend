import { cartStockIssue } from '../../../utils/stock';
import { useCustomerCommerceStore } from '../../../store/customerCommerceStore';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../../../store/authStore';
import { showWarning } from '../../../utils/toast';
import CheckoutOffers from '../components/CheckoutOffers';
import '../styles/checkout.css';

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(() => useAuthStore.getState().status !== 'authenticated');
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    let active = true;
    void (async () => {
      const current = useAuthStore.getState();
      if (!current.isAuthenticated || current.user?.role !== 'CUSTOMER') await checkAuth();
      if (!active) return;
      const verified = useAuthStore.getState();
      if (!verified.isAuthenticated || verified.user?.role !== 'CUSTOMER') {
        showWarning('Please login to continue to checkout');
        navigate('/profile', { replace: true, state: { returnTo: '/checkout' } });
        return;
      }
      const issue = cartStockIssue(useCustomerCommerceStore.getState().cartItems);
      if (issue) { showWarning(issue, { id: 'cart-stock' }); navigate('/cart', { replace: true }); return; }
      setChecking(false);
    })();
    return () => { active = false; };
  }, [checkAuth, navigate]);

  if (checking) return (
    <div className="fy-co fy-co--checking" role="status" aria-label="Preparing checkout">
      <div className="fy-co-skel fy-co-skel--title" />
      <div className="fy-co-skel fy-co-skel--steps" />
      <div className="fy-co-skel fy-co-skel--tall" />
    </div>
  );
  return <CheckoutOffers />;
};

export default CheckoutPage;
