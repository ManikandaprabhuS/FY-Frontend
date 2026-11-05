import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useNotifications from '../hooks/useNotifications';
import { customerService } from '../services/customer.service';
import fyLogoIcon from '../assets/fy-logo-icon.jpeg';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Bell, 
  User, 
  Settings, 
  Menu, 
  X, 
  Search, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  IdCard,
  Heart,
  TicketPercent,
  BadgePercent,
  Mail,
  CalendarDays,
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { notifications, toggleNotificationRead } = useNotifications(true);
  const avatarInitial = user?.name?.charAt(0) || 'U';

  // Close mobile drawer on route change
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setMobileMenuOpen(false);
      setNotifDropdownOpen(false);
      setMobileSearchOpen(false);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/fyadminlogin');
  };

  const isLikelyPhoneNumber = (value: string) => {
    const compactValue = value.replace(/\s+/g, '');
    const digitsOnly = compactValue.replace(/\D/g, '');

    return (
      /^[+\d][\d\s()-]+$/.test(value) &&
      digitsOnly.length >= 10 &&
      digitsOnly.length <= 15 &&
      !/^FY-/i.test(compactValue)
    );
  };

  const isLikelyOrderNumber = (value: string) => /^FY-\d{4}$/i.test(value.trim());

  const handleGlobalSearch = async (rawValue: string) => {
    const value = rawValue.trim();

    if (!value) {
      return;
    }

    if (isLikelyPhoneNumber(value)) {
      try {
        const customer = await customerService.lookupCustomerByPhoneNumber(value);
        navigate(`/admin/customers/${customer.id}`);
        return;
      } catch (error) {
        console.error('Customer lookup failed', error);
        window.alert('No customer found for that phone number.');
        return;
      }
    }

    if (isLikelyOrderNumber(value)) {
      navigate(`/admin/orders?search=${encodeURIComponent(value)}`);
      return;
    }

    navigate(`/admin/customers?search=${encodeURIComponent(value)}`);
  };

  const submitGlobalSearch = async (value: string) => {
    await handleGlobalSearch(value);
    setMobileSearchOpen(false);
  };

  const navLinks = [
    { name: 'Overview', path: '/admin/overview', icon: LayoutDashboard },
    { name: 'Products', path: '/admin/products', icon: Package },
    { name: 'Orders', path: '/admin/orders', icon: ShoppingCart },
    { name: 'Customers', path: '/admin/customers', icon: Users },
    { name: 'Wishlists', path: '/admin/wishlists', icon: Heart },
    { name: 'Coupons', path: '/admin/marketing/coupons', icon: TicketPercent, adminOnly: true },
    { name: 'Product Discounts', path: '/admin/marketing/product-discounts', icon: BadgePercent, adminOnly: true },
    { name: 'Newsletter', path: '/admin/newsletter', icon: Mail },
    { name: 'Appointments', path: '/admin/appointments', icon: CalendarDays },
    { name: 'Notifications', path: '/admin/notifications', icon: Bell },
    { name: 'Employees', path: '/admin/employees', icon: IdCard, adminOnly: true },
    { name: 'Profile', path: '/admin/profile', icon: User },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ].filter((link) => !link.adminOnly || user?.role === 'ADMIN');

  // Breadcrumb generator
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    return paths.map((path, idx) => {
      const isLast = idx === paths.length - 1;
      const formatted = path.charAt(0).toUpperCase() + path.slice(1);
      return (
        <React.Fragment key={path}>
          {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant/40" />}
          <span className={`${isLast ? 'text-primary font-semibold' : 'text-on-surface-variant'}`}>
            {formatted}
          </span>
        </React.Fragment>
      );
    });
  };

  const unreadCount = useMemo(() => notifications.reduce((count, notification) => count + (notification.read ? 0 : 1), 0), [notifications]);

  return (
    <div className="admin-monochrome min-h-screen bg-background flex text-on-background">
      
      {/* ------------------------------------------------------------- */}
      {/* DESKTOP SIDEBAR */}
      {/* ------------------------------------------------------------- */}
      <aside 
        className="hidden md:flex h-screen fixed left-0 top-0 w-[72px] bg-surface-container-lowest border-r border-outline-variant flex-col px-3 py-stack-lg z-50 transition-all duration-300"
      >
        <Link
          to="/admin/overview"
          className="mb-8 flex items-center justify-center gap-3 flex-shrink-0 rounded-xl transition-transform hover:scale-105"
          title="FrameYaad Admin"
        >
          <img src={fyLogoIcon} alt="FrameYaad logo" className="h-9 w-9 rounded-xl object-contain p-1" />
        </Link>
        
        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center rounded-lg text-sm transition-all duration-200 relative ${
                  isActive
                    ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-sm'
                    : 'text-secondary hover:bg-surface-container-high hover:text-on-surface'
                } p-2.5 justify-center`}
                title={link.name}
              >
                <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-primary' : 'text-secondary'}`} />
                {link.name === 'Notifications' && unreadCount > 0 && (
                  <span className="absolute right-2 top-2 w-2 h-2 bg-error rounded-full animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Card bottom */}
        {user && (
          <div className="mt-auto border-t border-outline-variant flex-shrink-0 pt-4 px-3">
            <div className="flex flex-col items-center justify-between gap-3">
              <Link 
                to="/admin/profile" 
                className="flex items-center gap-3 py-1 group"
                title={`${user.name} (${user.role})`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex-shrink-0 flex items-center justify-center font-bold border border-outline-variant group-hover:ring-2 group-hover:ring-primary transition-all duration-200">
                  {avatarInitial}
                </div>
              </Link>
              <button 
                onClick={handleLogout}
                className="p-1.5 hover:bg-error/10 hover:text-error text-on-surface-variant rounded-lg transition-colors flex-shrink-0"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE DRAWER */}
      {/* ------------------------------------------------------------- */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-50 md:hidden transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      <aside className={`fixed top-0 bottom-0 left-0 w-sidebar-width bg-surface border-r border-outline-variant flex flex-col py-stack-lg px-stack-md z-50 md:hidden transition-transform duration-300 transform ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between mb-8 px-4">
          <Link to="/admin/overview" className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
            <img src={fyLogoIcon} alt="FrameYaad logo" className="h-9 w-9 rounded-xl object-contain p-1" />
            <div>
              <h1 className="font-sans text-lg font-bold text-on-surface">FrameYard</h1>
              <p className="text-[10px] font-semibold text-secondary tracking-wider uppercase">Admin</p>
            </div>
          </Link>
          <button 
            className="p-1.5 hover:bg-surface-container rounded-lg text-on-surface"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-sm'
                    : 'text-secondary hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-primary' : 'text-secondary'}`} />
                <span>{link.name}</span>
                {link.name === 'Notifications' && unreadCount > 0 && (
                  <span className="ml-auto w-5 h-5 bg-error text-on-error text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="mt-auto px-4 pt-4 border-t border-outline-variant flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold border border-outline-variant">
                {avatarInitial}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-on-surface leading-none">{user.name}</p>
                <p className="text-[11px] text-on-surface-variant mt-1">{user.role}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 hover:bg-error/10 hover:text-error text-on-surface-variant rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* MAIN VIEWPORT WRAPPER */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col w-full max-w-full min-h-screen transition-all duration-300 md:ml-[72px]">
        
        {/* Sticky Header */}
        <header className="sticky top-0 z-40 bg-surface-container-lowest border-b border-outline-variant shadow-sm transition-all">
          <div className="h-topbar-height flex items-center justify-between px-margin-mobile md:px-margin-desktop">
          
          {/* Mobile hamburger menu & logo */}
          <div className="md:hidden flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-all scale-95 duration-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-sans text-md font-bold text-on-surface">FrameYard</span>
          </div>

          {/* Breadcrumbs (Desktop) */}
          <div className="hidden md:flex items-center gap-2 text-on-surface-variant font-medium text-sm">
            {getBreadcrumbs()}
          </div>

          {/* Search, Notifications & Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Search (Desktop) */}
            <div className="hidden lg:flex items-center bg-surface px-3 py-1.5 rounded-full border border-outline-variant focus-within:border-primary focus-within:bg-surface-container-lowest transition-colors w-64">
              <Search className="w-4 h-4 text-outline-variant mr-2" />
              <input
                className="bg-transparent border-none focus:ring-0 text-xs text-on-surface w-full p-0 placeholder-on-surface-variant/60 focus:outline-none"
                placeholder="Search orders, customers..."
                type="text"
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void submitGlobalSearch(e.currentTarget.value);
                  }
                }}
              />
              {globalSearch && (
                <button
                  type="button"
                  onClick={() => setGlobalSearch('')}
                  className="ml-2 rounded-full p-0.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setMobileSearchOpen((prev) => !prev)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-all hover:bg-surface-container lg:hidden"
              title="Search"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>

            {/* Notification drop */}
            <div className="relative">
              <button 
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all relative"
              >
                <Bell className="w-[18px] h-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-error text-on-error text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-surface-container-lowest shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifDropdownOpen(false)} />
                  <div className="fixed left-3 right-3 top-[calc(var(--spacing-topbar-height)+8px)] max-h-[70vh] bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-50 overflow-hidden md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:w-80 md:max-h-none transform origin-top-right">
                    <div className="p-3 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
                      <span className="text-xs font-bold text-on-surface">Recent Notifications</span>
                      <Link to="/admin/notifications" className="text-[11px] text-primary hover:underline">View All</Link>
                    </div>
                    <div className="max-h-[calc(70vh-48px)] overflow-y-auto divide-y divide-outline-variant/30 custom-scrollbar md:max-h-64">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-xs text-on-surface-variant">No alerts.</div>
                      ) : (
                        notifications.slice(0, 4).map((notif) => (
                          <div 
                            key={notif.id} 
                            onClick={() => {
                              toggleNotificationRead(notif.id);
                              setNotifDropdownOpen(false);
                            }}
                            className={`p-3 text-left hover:bg-surface transition-colors cursor-pointer ${!notif.read ? 'bg-primary/5' : ''}`}
                          >
                            <p className="text-xs font-semibold text-on-surface">{notif.title}</p>
                            <p className="text-[11px] text-on-surface-variant mt-0.5 line-clamp-2">{notif.message}</p>
                            <span className="text-[9px] text-on-surface-variant/60 mt-1 block">
                              {new Date(notif.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all">
              <HelpCircle className="w-[18px] h-[18px]" />
            </button>

            <div className="h-6 w-px bg-outline-variant mx-1" />

            {/* Profile Avatar click */}
            {user && (
              <Link to="/admin/profile" className="w-8 h-8 rounded-full bg-surface-variant border border-outline-variant overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all flex items-center justify-center text-xs font-bold text-primary">
                {avatarInitial}
              </Link>
            )}

          </div>
          </div>

          {mobileSearchOpen && (
            <div className="border-t border-outline-variant bg-surface-container-lowest px-margin-mobile py-3 lg:hidden">
              <div className="flex items-center rounded-xl border border-outline-variant bg-surface px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                <Search className="mr-2 h-4 w-4 flex-shrink-0 text-outline-variant" />
                <input
                  autoFocus
                  className="w-full border-none bg-transparent p-0 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-0"
                  placeholder="Search orders, customers..."
                  type="search"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void submitGlobalSearch(e.currentTarget.value);
                    }
                    if (e.key === 'Escape') {
                      setMobileSearchOpen(false);
                    }
                  }}
                />
                <button
                  onClick={() => setMobileSearchOpen(false)}
                  className="ml-2 rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container"
                  title="Close search"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Viewport content */}
        <main className="flex-1 p-margin-mobile md:p-margin-desktop bg-surface w-full max-w-container-max mx-auto">
          <Outlet />
        </main>
      </div>

    </div>
  );
};

export default AdminLayout;
