import React, { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AnnouncementBar from '../features/customer/components/AnnouncementBar';
import CustomerNavbar from '../features/customer/components/CustomerNavbar';
import Footer from '../features/customer/components/Footer';
import MobileDock from '../features/customer/components/MobileDock';
import { useStorefrontChrome } from '../features/customer/storefrontChrome';
import { isDockRoute } from '../features/customer/navigation';
import '../features/customer/styles/storefront.css';
import { useAuthStore } from '../store/authStore';
import {customerOrdersPage} from '../services/customer-orders.service';
import { useCustomerCommerceStore } from '../store/customerCommerceStore';

const CustomerLayout: React.FC = () => {

  const userId = useAuthStore((state) => state.user?.role === 'CUSTOMER' ? state.user.id : null);
  const loadWishlist = useCustomerCommerceStore((state) => state.loadWishlist);
  const { pathname } = useLocation();
  // Full-screen pages (log in / sign up) hide the banner, navbar, footer and dock.
  const bare = useStorefrontChrome((state) => state.bare);
  const showDock = isDockRoute(pathname) && !bare;



  useEffect(() => {
    if (userId) {void loadWishlist(userId);void customerOrdersPage(userId).catch(()=>undefined);}
  }, [loadWishlist, userId]);

  return (
    <div className="fy-store min-h-screen" data-dock={showDock ? 'visible' : 'hidden'} data-bare={bare || undefined}>
      {!bare && <AnnouncementBar />}
      {!bare && <CustomerNavbar />}

      <main>
        <Suspense fallback={<div className="min-h-[60vh] animate-pulse bg-mat/40" aria-label="Loading" />}>
          <Outlet />
        </Suspense>
      </main>

      {/* One footer for every storefront page, at every screen size. */}
      {!bare && <Footer />}
      {!bare && <MobileDock routeHidden={!showDock} />}
    </div>
  );
};

export default CustomerLayout;
