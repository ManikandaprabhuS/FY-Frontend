import React, { useEffect, useState } from 'react';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  Headphones,
  Heart,
  KeyRound,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  MapPinned,
  Pencil,
  Phone,
  Save,
  ShoppingBag,
  Trash2,
  UserRound,
} from 'lucide-react';

import femaleCustomerAvatar from '../../../assets/customer-avatar-female.svg';
import maleCustomerAvatar from '../../../assets/customer-avatar-male.svg';
import { orderService } from '../../../services/order.service';
import type { CustomerWishlistItem } from '../../../services/customer-wishlist.service';
import type { Order, User } from '../../../types';
import { useCustomerCommerceStore } from '../../../store/customerCommerceStore';
import { showError, showSuccess } from '../../../utils/toast';

type ProfileValues = {
  name: string;
  email: string;
  phoneNumber: string;
  addressLine: string;
  cityName: string;
  stateName: string;
  countryName: string;
  postalCode: string;
};

type PasswordValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type Props = {
  user: User;
  loading: boolean;
  error: string | null;
  onUpdate: (values: ProfileValues) => Promise<boolean>;
  onLogout: () => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
};

const CustomerAccountDashboard: React.FC<Props> = ({ user, loading, error, onUpdate, onLogout, onChangePassword }) => {
  const location = useLocation();
  const profileForm = useForm<ProfileValues>();
  const resetProfileForm = profileForm.reset;
  const passwordForm = useForm<PasswordValues>({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const wishlistItems = useCustomerCommerceStore((state) => state.wishlistItems);
  const wishlistLoading = useCustomerCommerceStore((state) => state.wishlistLoading);
  const loadWishlist = useCustomerCommerceStore((state) => state.loadWishlist);
  const toggleWishlist = useCustomerCommerceStore((state) => state.toggleWishlist);
  const addCartItem = useCustomerCommerceStore((state) => state.addCartItem);
  const [showAllWishlist, setShowAllWishlist] = useState(false);
  const activeSection = location.hash.slice(1) || 'orders-history';
  const genderAvatar = user.gender === 'FEMALE'
    ? femaleCustomerAvatar
    : user.gender === 'MALE'
      ? maleCustomerAvatar
      : null;

  useEffect(() => {
    resetProfileForm({
      name: user.name || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      addressLine: user.addressLine || '',
      cityName: user.cityName || '',
      stateName: user.stateName || '',
      countryName: user.countryName || '',
      postalCode: user.postalCode || '',
    });
  }, [resetProfileForm, user.addressLine, user.cityName, user.countryName, user.email, user.name, user.phoneNumber, user.postalCode, user.stateName]);

  useEffect(() => {
    let active = true;
    void orderService.getOrders({ page: 1, limit: 4 })
      .then((result) => {
        if (!active) return;
        setOrders(result.orders);
        setOrdersError(null);
      })
      .catch(() => {
        if (active) setOrdersError('Your orders could not be loaded.');
      })
      .finally(() => {
        if (active) setOrdersLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void loadWishlist(user.id);
  }, [loadWishlist, user.id]);

  useEffect(() => {
    const sectionId = location.hash.slice(1);
    if (!sectionId) return;
    const frame = window.requestAnimationFrame(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash]);

  const removeWishlistItem = async (productIdentifier: string) => {
    try {
      const removed = await toggleWishlist(productIdentifier);
      if (removed === null) return;
      showSuccess('Product removed from wishlist');
    } catch {
      showError('Wishlist could not be updated. Please try again.');
    }
  };

  const moveWishlistItemToCart = async (item: CustomerWishlistItem) => {
    const variant = item.product.variants?.find((entry) => entry.isActive !== false && Number(entry.stockQuantity ?? 0) > 0);
    if (!variant) {
      showError('This product is currently out of stock.');
      return;
    }

    try {
      const removed = await toggleWishlist(item.productIdentifier);
      if (removed === null) return;
      addCartItem({
        productId: item.product.id,
        productIdentifier: item.productIdentifier,
        variantId: variant.id,
        name: item.product.productName,
        imageUrl: item.product.images?.find((image) => image.isPrimary)?.imageUrl ?? item.product.images?.[0]?.imageUrl,
        material: item.product.material?.material || 'Frame',
        frameSize: variant.frameSize,
        color: variant.color,
        mountType: variant.mountType || 'NONE',
        glassType: variant.glassType || 'NONE',
        unitPrice: Number(variant.offerPrice ?? variant.price ?? 0),
        quantity: 1,
        stockQuantity: Number(variant.stockQuantity ?? 0),
      });
      showSuccess('Product moved to cart');
    } catch {
      showError('Product could not be moved to cart. Please try again.');
    }
  };

  return (
    <section className="bg-[#f7f7f5] px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-black/10 bg-white p-3 shadow-[0_12px_40px_rgba(0,0,0,0.04)] lg:sticky lg:top-20">
          <div className="flex flex-col items-center border-b border-black/10 px-3 py-5 text-center">
            {genderAvatar ? (
              <img src={genderAvatar} alt={`${user.gender === 'FEMALE' ? 'Female' : 'Male'} profile avatar`} className="h-20 w-20 rounded-full border border-black/10 bg-white object-cover" />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-full bg-black text-3xl font-black text-white">{user.name?.charAt(0).toUpperCase() || 'C'}</div>
            )}
            <h1 className="mt-3 text-base font-black">{user.name}</h1>
            <p className="mt-1 max-w-full truncate text-[11px] text-black/50">{user.email}</p>
          </div>

          <nav className="space-y-1 py-3" aria-label="Customer account">
            <AccountNavLink href="#orders-history" icon={<ShoppingBag />} label="Orders" description="View your order history" active={activeSection === 'orders-history'} />
            <AccountNavLink href="#profile-information" icon={<UserRound />} label="Profile" description="Manage your personal info" active={activeSection === 'profile-information'} />
            <AccountNavLink href="#addresses" icon={<MapPinned />} label="Addresses" description="Manage delivery addresses" active={activeSection === 'addresses'} />
            <AccountNavLink href="#wishlist" icon={<Heart />} label="Wishlist" description="Your saved items" active={activeSection === 'wishlist'} />
            <AccountNavLink href="#change-password" icon={<KeyRound />} label="Change Password" description="Update your password" active={activeSection === 'change-password'} />
            <button type="button" onClick={() => void onLogout()} disabled={loading} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-black/5 disabled:opacity-50">
              <LogOut className="h-4 w-4 shrink-0" />
              <span><strong className="block text-xs">Logout</strong><small className="mt-0.5 block text-[9px] text-black/45">Sign out from your account</small></span>
            </button>
          </nav>

          <div className="rounded-xl bg-[#f7f7f5] p-3">
            <p className="text-xs font-black">Need Help?</p>
            <p className="mt-1 text-[10px] text-black/45">We&apos;re here to help you</p>
            <p className="mt-3 flex items-center gap-2 text-[10px] font-semibold"><Headphones className="h-3.5 w-3.5" /> hello@frameyaad.com</p>
            <p className="mt-2 flex items-center gap-2 text-[10px] font-semibold"><Phone className="h-3.5 w-3.5" /> +91 98765 43210</p>
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <section id="orders-history" className="scroll-mt-24">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black sm:text-xl">Orders History</h2>
              <Link to="/orders" className="inline-flex items-center gap-1 text-[10px] font-bold underline underline-offset-4">View All Orders <ArrowRight className="h-3 w-3" /></Link>
            </div>
            <div className="space-y-3">
              {ordersLoading && Array.from({ length: 3 }, (_, index) => <OrderSkeleton key={index} />)}
              {!ordersLoading && ordersError && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">{ordersError}</div>}
              {!ordersLoading && !ordersError && orders.length === 0 && (
                <div className="rounded-xl border border-black/10 bg-white p-8 text-center"><ShoppingBag className="mx-auto h-7 w-7 text-black/35" /><p className="mt-3 text-sm font-bold">No orders yet</p><Link to="/products" className="mt-3 inline-flex rounded-lg bg-black px-4 py-2 text-xs font-bold text-white">Shop frames</Link></div>
              )}
              {!ordersLoading && orders.map((order) => <CustomerOrderCard key={order.id} order={order} />)}
            </div>
          </section>

          <section id="wishlist" className="scroll-mt-24">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black sm:text-xl">Wishlist</h2>
              {!wishlistLoading && (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-black/45">{wishlistItems.length} saved {wishlistItems.length === 1 ? 'item' : 'items'}</span>
                  {wishlistItems.length > 3 && !showAllWishlist && <button type="button" onClick={() => setShowAllWishlist(true)} className="inline-flex items-center gap-1 text-[10px] font-bold underline underline-offset-4">View All Wishlist <ArrowRight className="h-3 w-3" /></button>}
                </div>
              )}
            </div>
            {wishlistLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-44 animate-pulse rounded-2xl border border-black/5 bg-black/[0.04]" />)}</div>
            ) : wishlistItems.length === 0 ? (
              <div className="rounded-2xl border border-black/10 bg-white p-8 text-center shadow-[0_8px_28px_rgba(0,0,0,0.03)]">
                <Heart className="mx-auto h-7 w-7 text-black/30" />
                <p className="mt-3 text-sm font-bold">Your wishlist is empty</p>
                <p className="mt-1 text-xs text-black/45">Save frames you love and they will appear here.</p>
                <Link to="/products" className="mt-4 inline-flex rounded-lg bg-black px-4 py-2 text-xs font-bold text-white">Explore frames</Link>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {(showAllWishlist ? wishlistItems : wishlistItems.slice(0, 3)).map((item) => {
                  const image = item.product.images?.find((entry) => entry.isPrimary)?.imageUrl ?? item.product.images?.[0]?.imageUrl;
                  const activeVariants = item.product.variants?.filter((variant) => variant.isActive !== false) ?? [];
                  const price = activeVariants.length > 0 ? Math.min(...activeVariants.map((variant) => Number(variant.price))) : 0;
                  const canMoveToCart = activeVariants.some((variant) => Number(variant.stockQuantity ?? 0) > 0);
                  return (
                    <article key={item.id} className="group overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_8px_28px_rgba(0,0,0,0.03)]">
                      <Link to={`/product/${item.product.id}`} className="block aspect-[4/3] overflow-hidden bg-[#f4f1ed]">
                        {image ? <img src={image} alt={item.product.productName} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : <span className="grid h-full place-items-center text-xs font-semibold text-black/35">Image unavailable</span>}
                      </Link>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0"><Link to={`/product/${item.product.id}`} className="block truncate text-sm font-black hover:underline">{item.product.productName}</Link><p className="mt-1 truncate text-[10px] text-black/45">{item.product.material?.material || 'Frame'}{activeVariants[0]?.frameSize ? ` · ${activeVariants[0].frameSize}` : ''}</p></div>
                          <button type="button" onClick={() => void removeWishlistItem(item.productIdentifier)} aria-label={`Remove ${item.product.productName} from wishlist`} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-black/10 text-black/55 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          {price > 0 ? <p className="text-base font-black">₹{price.toLocaleString('en-IN')}</p> : <span />}
                          <button type="button" disabled={!canMoveToCart} onClick={() => void moveWishlistItemToCart(item)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-black px-3 text-[10px] font-bold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/25"><ShoppingBag className="h-3.5 w-3.5" />Move to Cart</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <div className="grid items-start gap-5 xl:grid-cols-2">
            <section id="profile-information" className="scroll-mt-24 rounded-2xl border border-black/10 bg-white p-4 shadow-[0_12px_40px_rgba(0,0,0,0.04)] sm:p-5">
              <div className="flex items-center justify-between border-b border-black/10 pb-4">
                <h2 className="text-base font-black">Profile Information</h2>
                <button type="button" onClick={() => setEditingProfile((value) => !value)} className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-2 text-[10px] font-bold text-white"><Pencil className="h-3 w-3" /> {editingProfile ? 'Cancel' : 'Edit'}</button>
              </div>
              <form onSubmit={profileForm.handleSubmit(async (values) => { const success = await onUpdate(values); if (success) { profileForm.reset(values); setEditingProfile(false); } })} className="mt-4" noValidate>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <DashboardInput label="Full name" icon={<UserRound />} disabled={!editingProfile} error={profileForm.formState.errors.name?.message} registration={profileForm.register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name must contain at least 2 characters' } })} />
                  <DashboardInput label="Email address" type="email" icon={<Mail />} disabled registration={profileForm.register('email')} />
                  <DashboardInput label="Phone number" type="tel" icon={<Phone />} disabled={!editingProfile} error={profileForm.formState.errors.phoneNumber?.message} registration={profileForm.register('phoneNumber', { validate: (value) => !value || (value.trim().length >= 7 && value.trim().length <= 20) || 'Phone number must contain 7–20 characters' })} />
                  <DashboardInput label="Postal code" icon={<MapPin />} disabled={!editingProfile} error={profileForm.formState.errors.postalCode?.message} registration={profileForm.register('postalCode', { maxLength: { value: 20, message: 'Postal code is too long' } })} />
                  <div id="addresses" className="scroll-mt-24"><DashboardInput label="Address" icon={<MapPin />} disabled={!editingProfile} error={profileForm.formState.errors.addressLine?.message} registration={profileForm.register('addressLine', { maxLength: { value: 255, message: 'Address cannot exceed 255 characters' } })} /></div>
                  <DashboardInput label="City" disabled={!editingProfile} registration={profileForm.register('cityName', { maxLength: { value: 100, message: 'City name is too long' } })} error={profileForm.formState.errors.cityName?.message} />
                  <DashboardInput label="State" disabled={!editingProfile} registration={profileForm.register('stateName', { maxLength: { value: 100, message: 'State name is too long' } })} error={profileForm.formState.errors.stateName?.message} />
                  <DashboardInput label="Country" disabled={!editingProfile} registration={profileForm.register('countryName', { maxLength: { value: 100, message: 'Country name is too long' } })} error={profileForm.formState.errors.countryName?.message} />
                </div>
                {editingProfile && <button type="submit" disabled={loading || !profileForm.formState.isDirty} className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-black px-5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-35"><Save className="h-4 w-4" />{loading ? 'Saving…' : 'Save profile'}</button>}
              </form>
            </section>

            <section id="change-password" className="scroll-mt-24 rounded-2xl border border-black/10 bg-white p-4 shadow-[0_12px_40px_rgba(0,0,0,0.04)] sm:p-5">
              <h2 className="border-b border-black/10 pb-4 text-base font-black">Change Password</h2>
              <form className="mt-4 space-y-4" noValidate onSubmit={passwordForm.handleSubmit(async (values) => {
                const success = await onChangePassword(values.currentPassword, values.newPassword);
                if (success) passwordForm.reset();
              })}>
                <DashboardInput label="Current password" type="password" icon={<LockKeyhole />} error={passwordForm.formState.errors.currentPassword?.message} registration={passwordForm.register('currentPassword', { required: 'Current password is required' })} />
                <DashboardInput label="New password" type="password" icon={<KeyRound />} error={passwordForm.formState.errors.newPassword?.message} registration={passwordForm.register('newPassword', { required: 'New password is required', minLength: { value: 8, message: 'Password must contain at least 8 characters' }, maxLength: { value: 72, message: 'Password cannot exceed 72 characters' } })} />
                <DashboardInput label="Confirm new password" type="password" icon={<KeyRound />} error={passwordForm.formState.errors.confirmPassword?.message} registration={passwordForm.register('confirmPassword', { required: 'Confirm your new password', validate: (value) => value === passwordForm.getValues('newPassword') || 'Passwords do not match' })} />
                {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">{error}</div>}
                <button type="submit" disabled={loading} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-black text-xs font-bold text-white disabled:opacity-45"><KeyRound className="h-4 w-4" />{loading ? 'Updating…' : 'Update Password'}</button>
              </form>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
};

const AccountNavLink: React.FC<{ href?: string; icon: React.ReactNode; label: string; description: string; active?: boolean; disabled?: boolean }> = ({ href, icon, label, description, active, disabled }) => {
  const content = <><span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span><span><strong className="block text-xs">{label}</strong><small className={`mt-0.5 block text-[9px] ${active ? 'text-white/60' : 'text-black/45'}`}>{description}</small></span></>;
  const className = `flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${active ? 'bg-black text-white' : 'text-black hover:bg-black/5'} ${disabled ? 'cursor-default opacity-55' : ''}`;
  return href ? <a href={href} className={className}>{content}</a> : <span className={className} aria-disabled={disabled}>{content}</span>;
};

const statusStyle: Record<Order['orderStatus'], string> = {
  PLACED: 'bg-amber-50 text-amber-700', CONFIRMED: 'bg-blue-50 text-blue-700', PROCESSING: 'bg-amber-50 text-amber-700', READY_TO_SHIP: 'bg-violet-50 text-violet-700', SHIPPED: 'bg-blue-50 text-blue-700', DELIVERED: 'bg-emerald-50 text-emerald-700', CANCELLED: 'bg-black/5 text-black/55',
};

const CustomerOrderCard: React.FC<{ order: Order }> = ({ order }) => {
  const item = order.orderItems[0];
  const extraItems = Math.max(order.orderItems.length - 1, 0);
  return (
    <article className="grid gap-4 rounded-2xl border border-black/10 bg-white p-3 shadow-[0_8px_28px_rgba(0,0,0,0.03)] sm:grid-cols-[82px_1fr_auto] sm:items-center sm:p-4">
      {item?.imageUrl ? <img src={item.imageUrl} alt={item.productName} className="h-20 w-full rounded-xl bg-[#f4f1ed] object-cover sm:w-20" /> : <div className="grid h-20 w-full place-items-center rounded-xl bg-[#f4f1ed] text-black/25 sm:w-20"><ShoppingBag className="h-6 w-6" /></div>}
      <div className="grid min-w-0 gap-3 text-[10px] sm:grid-cols-3">
        <div><span className="text-black/45">Order ID</span><strong className="mt-1 block text-xs">#{order.orderNumber}</strong><span className="mt-2 block text-black/45">Placed on</span><strong className="mt-1 block">{new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(order.createdAt))}</strong></div>
        <div className="min-w-0"><span className="text-black/45">Items</span><strong className="mt-1 block truncate text-xs">{item?.productName ?? 'Frame order'}</strong><span className="mt-1 block truncate text-black/50">{item ? `${item.frameSize} · ${item.mountType}` : 'Details unavailable'}</span><span className="mt-1 block text-black/50">Qty: {item?.quantity ?? 0}{extraItems > 0 ? ` · +${extraItems} more` : ''}</span></div>
        <div><span className="text-black/45">Amount</span><strong className="mt-1 block text-xs">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(order.totalAmount)}</strong></div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end"><span className={`rounded-full px-3 py-1 text-[9px] font-bold ${statusStyle[order.orderStatus]}`}>{order.orderStatus.replaceAll('_', ' ')}</span><Link to="/orders" className="rounded-lg bg-black px-4 py-2 text-[10px] font-bold text-white">View Details</Link></div>
    </article>
  );
};

const DashboardInput: React.FC<{ label: string; type?: string; icon?: React.ReactNode; disabled?: boolean; error?: string; registration: UseFormRegisterReturn }> = ({ label, type = 'text', icon, disabled, error, registration }) => (
  <label className="block text-[10px] font-bold text-black/65">{label}<span className="relative mt-1.5 block">{icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/35 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}<input {...registration} type={type} disabled={disabled} aria-invalid={Boolean(error)} className={`h-10 w-full rounded-lg border bg-[#fafafa] pr-3 text-xs outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 disabled:cursor-default disabled:bg-white disabled:text-black/75 ${icon ? 'pl-10' : 'pl-3'} ${error ? 'border-red-500' : 'border-black/15'}`} /></span>{error && <span className="mt-1 block text-[10px] font-semibold text-red-600">{error}</span>}</label>
);

const OrderSkeleton = () => <div className="h-28 animate-pulse rounded-2xl border border-black/5 bg-black/[0.04]" />;

export default CustomerAccountDashboard;
