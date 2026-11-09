/* eslint-disable react-refresh/only-export-components -- This module exports router configuration with lazy component references. */
import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from '../layouts/ProtectedRoute';
import CustomerProtectedRoute from '../layouts/CustomerProtectedRoute';
import AuthPendingScreen from '../components/auth/AuthPendingScreen';
import AdminOnlyRoute from '../layouts/AdminOnlyRoute';
import RouteErrorPage from '../pages/errors/RouteErrorPage';
import RouterErrorBoundary from '../pages/errors/RouterErrorBoundary';
import ResourceRoute, { NotFoundRoute } from '../pages/errors/ResourceRoute';
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const AdminLayout = lazy(() => import('../layouts/AdminLayout'));
const CustomerLayout = lazy(() => import('../layouts/CustomerLayout'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'));
const OverviewPage = lazy(() => import('../pages/overview/OverviewPage'));
const ProductsPage = lazy(() => import('../pages/products/ProductsPage'));
const ProductDetailsPage = lazy(() => import('../pages/products/ProductDetailsPage'));
const OrdersPage = lazy(() => import('../pages/orders/OrdersPage'));
const CustomersPage = lazy(() => import('../pages/customers/CustomersPage'));
const CustomerDetailsPage = lazy(() => import('../pages/customers/CustomerDetailsPage'));
const ReviewsPage = lazy(() => import("../pages/reviews/ReviewsPage"));
const NotificationsPage = lazy(() => import('../pages/notifications/NotificationsPage'));
const ProfilePage = lazy(() => import('../pages/profile/ProfilePage'));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage'));
const EmployeesPage = lazy(() => import('../pages/employees/EmployeesPage'));
const WishlistAnalyticsPage = lazy(() => import('../pages/wishlist/WishlistAnalyticsPage'));
const NewsletterSubscribersPage = lazy(() => import('../pages/newsletter/NewsletterSubscribersPage'));
const AppointmentsPage = lazy(() => import('../pages/appointments/AppointmentsPage'));
const AppointmentDetailsPage = lazy(() => import('../pages/appointments/AppointmentDetailsPage'));
const CouponsPage = lazy(() => import('../pages/marketing/coupon/CouponReferencePages').then(module => ({ default: module.CouponReferenceList })));
const CouponDetails = lazy(() => import('../pages/marketing/coupon/CouponReferencePages').then(module => ({ default: module.CouponReferenceDetails })));
const CouponDynamicWizard = lazy(() => import('../pages/marketing/coupon/CouponDynamicWizard').then(module => ({ default: module.CouponDynamicWizard })));
const ProductDiscountsPage = lazy(() => import('../pages/marketing/product-discount/ProductDiscountPages').then(module => ({ default: module.ProductDiscountsPage })));
const ProductDiscountWizard = lazy(() => import('../pages/marketing/product-discount/ProductDiscountPages').then(module => ({ default: module.ProductDiscountWizard })));
const ProductDiscountDetails = lazy(() => import('../pages/marketing/product-discount/ProductDiscountPages').then(module => ({ default: module.ProductDiscountDetails })));
const CustomerHomePage = lazy(() => import('../features/customer/pages/CustomerHomePage'));
const CustomerProductsPage = lazy(() => import('../features/customer/pages/CustomerProductsPage'));
const CustomerProductDetailsPage = lazy(() => import('../features/customer/pages/CustomerProductDetailsPage'));
const CartPage = lazy(() => import('../features/customer/pages/CartPage'));
const CheckoutPage = lazy(() => import('../features/customer/pages/CheckoutPage'));
const CustomerProfilePage = lazy(() => import('../features/customer/pages/CustomerProfilePage'));
const CustomerOrdersPage = lazy(() => import('../features/customer/pages/CustomerOrdersPage'));
const BookAppointmentPage = lazy(() => import('../features/customer/pages/BookAppointmentPage'));
const ContactUsPage = lazy(() => import('../features/customer/pages/ContactUsPage'));
const StudioPage = lazy(() => import('../features/customer/pages/StudioPage'));
const LazyFallback = <AuthPendingScreen />;
const lazyElement = (element: React.ReactNode) => <Suspense fallback={LazyFallback}>{element}</Suspense>;

export const router = createBrowserRouter([
  { errorElement: <RouterErrorBoundary />, children: [
  {
    element: <Suspense fallback={LazyFallback}><CustomerLayout /></Suspense>,
    errorElement: <RouterErrorBoundary />,
    children: [
      { path: '/', element: <CustomerHomePage /> },
      { path: '/products', element: <CustomerProductsPage /> },
      { path: '/product/:slug', element: <ResourceRoute parameter="slug" apiRoot="/products/public"><CustomerProductDetailsPage /></ResourceRoute> },
      { path: '/cart', element: <CartPage /> },
      { path: '/checkout', element: <CustomerProtectedRoute><CheckoutPage /></CustomerProtectedRoute> },
      { path: '/profile', element: <CustomerProfilePage /> },
      { path: '/orders', element: <CustomerProtectedRoute><CustomerOrdersPage /></CustomerProtectedRoute> },
      { path: '/book-appointment', element: <BookAppointmentPage /> },
      { path: '/contact-us', element: <ContactUsPage /> },
      { path: '/studio', element: <StudioPage /> },
    ],
  },
  {path: '/fyadminlogin',element: lazyElement(<LoginPage />),},
  {path: '/forgot-password',element: lazyElement(<ForgotPasswordPage key="customer-recovery" portal="customer" />),},
  {path: '/fyadminlogin/forgot-password',element: lazyElement(<ForgotPasswordPage key="admin-recovery" portal="admin" />),},
  {path: '/login',element: <Navigate to="/fyadminlogin" replace />,},
  {path: '/admin',element: <ProtectedRoute />,
    children: [
      {
        element: <Suspense fallback={LazyFallback}><AdminLayout /></Suspense>,
        children: [
          {
            path: '',
            element: <Navigate to="overview" replace />,
          },
          {
            path: 'overview',
            element: <OverviewPage />,
          },
          {
            path: 'products',
            element: <ProductsPage />,
          },
          {
            path: 'products/:id',
            element: <ResourceRoute apiRoot="/products"><ProductDetailsPage /></ResourceRoute>,
          },
          {
            path: 'products/new',
            element: <ProductDetailsPage />,
          },
          {
            path: 'orders',
            element: <OrdersPage />,
          },
          {
            path: 'wishlists',
            element: <WishlistAnalyticsPage />,
          },
          {
            path: 'reviews',
            element: <ReviewsPage />,
          },
          {
            path: 'notifications',
            element: <NotificationsPage />,
          },
          {
            path: 'newsletter',
            element: <NewsletterSubscribersPage />,
          },
          {
            path: 'appointments',
            element: <AppointmentsPage />,
          },
          {
            path: 'appointments/:id',
            element: <ResourceRoute apiRoot="/appointments"><AppointmentDetailsPage /></ResourceRoute>,
          },
          {
            path: 'customers',
            element: <CustomersPage />,
          },
          {
            path: 'customers/:id',
            element: <ResourceRoute apiRoot="/users"><CustomerDetailsPage /></ResourceRoute>,
          },
          {
            element: <AdminOnlyRoute />,
            children: [
              {
                path: 'employees',
                element: <EmployeesPage />,
              },
              { path: 'marketing/coupons', element: <CouponsPage /> },
              { path: 'marketing/coupons/new', element: <CouponDynamicWizard /> },
              { path: 'marketing/coupons/:id', element: <ResourceRoute apiRoot="/coupons"><CouponDetails /></ResourceRoute> },
              { path: 'marketing/coupons/:id/edit', element: <ResourceRoute apiRoot="/coupons"><CouponDynamicWizard /></ResourceRoute> },
              { path: 'marketing/product-discounts', element: <ProductDiscountsPage /> },
              { path: 'marketing/product-discounts/new', element: <ProductDiscountWizard /> },
              { path: 'marketing/product-discounts/:id', element: <ResourceRoute apiRoot="/product-discounts"><ProductDiscountDetails /></ResourceRoute> },
              { path: 'marketing/product-discounts/:id/edit', element: <ResourceRoute apiRoot="/product-discounts"><ProductDiscountWizard /></ResourceRoute> },
            ],
          },
          {
            path: 'settings',
            element: <SettingsPage />,
          },
          {
            path: 'profile',
            element: <ProfilePage />,
          },
          {
            path: '*',
            element: <NotFoundRoute />,
          },
        ],
      },
    ],
  },
  {path: '*', element: <RouteErrorPage />,},
  ] },
]);

export default router;
