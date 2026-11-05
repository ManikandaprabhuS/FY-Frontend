import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../../../store/authStore';
import { showError } from '../../../utils/toast';

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    let active = true;
    void (async () => {
      const current = useAuthStore.getState();
      if (!current.isAuthenticated || current.user?.role !== 'CUSTOMER') await checkAuth();
      if (!active) return;
      const verified = useAuthStore.getState();
      if (!verified.isAuthenticated || verified.user?.role !== 'CUSTOMER') {
        showError('Please login to continue to checkout');
        navigate('/profile', { replace: true, state: { returnTo: '/checkout' } });
        return;
      }
      setChecking(false);
    })();
    return () => { active = false; };
  }, [checkAuth, navigate]);

  if (checking) return <div className="mx-auto my-12 h-52 max-w-4xl animate-pulse rounded-2xl bg-black/5" />;
  return <div className="mx-auto my-10 max-w-4xl rounded-2xl border border-black/10 bg-white p-8"><h1 className="text-3xl font-black text-black">Checkout</h1><p className="mt-2 text-sm text-black/55">You are signed in. Checkout will continue through the existing order flow.</p></div>;
};

export default CheckoutPage;
