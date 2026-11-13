import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import {
  LogOut,
  Mail,
  MapPin,
  Phone,
  Save,
  UserRound,
} from 'lucide-react';

import { useAuthStore } from '../../../store/authStore';
import type { User } from '../../../types';
import { showError, showSuccess } from '../../../utils/toast';
import femaleCustomerAvatar from '../../../assets/customer-avatar-female.svg';
import maleCustomerAvatar from '../../../assets/customer-avatar-male.svg';
import CustomerAccountDashboard from '../components/CustomerAccountDashboard';
import { AuthCelebration, CustomerAuthScreen, type AuthMode, type Celebration } from '../components/CustomerAuth';
import { Navigate, useLocation } from 'react-router-dom';
import AuthPendingScreen from '../../../components/auth/AuthPendingScreen';
import { useStorefrontChrome } from '../storefrontChrome';
import { safeAuthReturnPath } from '../../../utils/auth-return-path';

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

const CustomerProfilePage: React.FC = () => {
  const location = useLocation();

  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loading = useAuthStore((state) => state.loading);
  const authError = useAuthStore((state) => state.error);
  const loginCustomer = useAuthStore((state) => state.loginCustomer);
  const registerCustomer = useAuthStore((state) => state.registerCustomer);
  const status = useAuthStore(state => state.status);
  const verificationError = useAuthStore(state => state.verificationError);
  const checkAuth = useAuthStore(state => state.checkAuth);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const changePassword = useAuthStore((state) => state.changePassword);
  const logout = useAuthStore((state) => state.logout);
  const clearError = useAuthStore((state) => state.clearError);
  const [mode, setMode] = useState<AuthMode>('login');
  // A short welcome / account-created moment after success; the usual next page (the
  // account, or where the customer came from) follows once it ends.
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  // While a log in or sign up is in flight the form stays up, even though the store marks
  // the session signed in a moment before the call returns; the celebration (then the
  // usual redirect) takes over once the result is known.
  const [submitting, setSubmitting] = useState(false);
  const endCelebration = useCallback(() => setCelebration(null), []);
  const customerAuthenticated = isAuthenticated && user?.role === 'CUSTOMER';
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;

  // The log in / sign up screen (and its celebration) stands alone: no banner, navbar,
  // footer or dock. Set before paint so the chrome never flashes in or out.
  const setBare = useStorefrontChrome((state) => state.setBare);
  const authScreen = Boolean(celebration) || submitting || (status !== 'checking' && !customerAuthenticated);
  useLayoutEffect(() => {
    setBare(authScreen);
    return () => setBare(false);
  }, [authScreen, setBare]);

  if (celebration) {
    return (
      <AuthCelebration
        celebration={celebration}
        onDone={endCelebration}
        onReturnToLogin={() => { clearError(); setMode('login'); setCelebration(null); }}
      />
    );
  }
  if (status === 'checking' && !submitting) return <AuthPendingScreen error={verificationError} onRetry={() => { void checkAuth(); }} />;
  if (!submitting && status === 'authenticated' && user?.role !== 'CUSTOMER') return <Navigate to="/admin/overview" replace />;
  if (!submitting && customerAuthenticated && returnTo) { const target = safeAuthReturnPath(returnTo, 'customer'); if (target !== location.pathname + location.search + location.hash) return <Navigate to={target} replace />; }

  if (submitting || !customerAuthenticated || !user) {
    return (
      <CustomerAuthScreen
        mode={mode}
        loading={loading}
        error={authError}
        onModeChange={(nextMode) => {
          clearError();
          setMode(nextMode);
        }}
        onLogin={async (values) => {
          setSubmitting(true);
          try {
            const success = await loginCustomer(values.email.trim().toLowerCase(), values.password);
            if (success) setCelebration({ kind: 'welcome', name: useAuthStore.getState().user?.name ?? '' });
          } finally {
            setSubmitting(false);
          }
        }}
        onRegister={async (values) => {
          setSubmitting(true);
          try {
            const result = await registerCustomer({
              name: values.name.trim(),
              email: values.email.trim().toLowerCase(),
              password: values.password,
              gender: values.gender,
              ...(values.phoneNumber.trim() ? { phoneNumber: values.phoneNumber.trim() } : {}),
            });
            if (!result.success) return;
            setCelebration(result.confirmationRequired
              ? { kind: 'created', name: values.name.trim(), confirmEmail: values.email.trim().toLowerCase() }
              : { kind: 'created', name: values.name.trim() });
          } finally {
            setSubmitting(false);
          }
        }}
      />
    );
  }

  return (
    <CustomerAccount
      user={user}
      loading={loading}
      error={authError}
      onUpdate={async (values) => {
        const success = await updateProfile({
          name: values.name.trim(),
          phoneNumber: values.phoneNumber.trim(),
          addressLine: values.addressLine.trim(),
          cityName: values.cityName.trim(),
          stateName: values.stateName.trim(),
          countryName: values.countryName.trim(),
          postalCode: values.postalCode.trim(),
        });
        if (success) showSuccess('Profile updated successfully');
        else showError(useAuthStore.getState().error || 'Profile update failed');
        return success;
      }}
      onLogout={async () => {
        await logout();
        showSuccess('You have been logged out');
      }}
      onChangePassword={async (currentPassword, newPassword) => {
        const success = await changePassword(currentPassword, newPassword);
        if (success) showSuccess('Password updated. Please log in again.');
        else showError(useAuthStore.getState().error || 'Password update failed');
        return success;
      }}
    />
  );
};

const CustomerAccount: React.FC<{
  user: User;
  loading: boolean;
  error: string | null;
  onUpdate: (values: ProfileValues) => Promise<boolean>;
  onLogout: () => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
}> = ({ user, loading, error, onUpdate, onLogout, onChangePassword }) => {
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ProfileValues>();
  const genderAvatar = user.gender === 'FEMALE'
    ? femaleCustomerAvatar
    : user.gender === 'MALE'
      ? maleCustomerAvatar
      : null;

  useEffect(() => {
    reset({
      name: user.name || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      addressLine: user.addressLine || '',
      cityName: user.cityName || '',
      stateName: user.stateName || '',
      countryName: user.countryName || '',
      postalCode: user.postalCode || '',
    });
  }, [reset, user]);

  if (user.role === 'CUSTOMER') {
    return (
      <CustomerAccountDashboard
        user={user}
        loading={loading}
        error={error}
        onUpdate={onUpdate}
        onLogout={onLogout}
        onChangePassword={onChangePassword}
      />
    );
  }

  return (
    <section className="bg-[#f7f7f5] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.2em] text-black/40">Customer account</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">My profile</h1><p className="mt-2 text-sm text-black/50">Keep your contact and delivery details up to date.</p></div>
          <button type="button" onClick={() => void onLogout()} disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-5 text-xs font-bold hover:bg-black hover:text-white"><LogOut className="h-4 w-4" /> Logout</button>
        </div>

        <div className="mt-7 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_15px_50px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col gap-5 border-b border-black/10 bg-black px-5 py-7 text-white sm:flex-row sm:items-center sm:px-8">
            {genderAvatar ? (
              <img
                src={genderAvatar}
                alt={`${user.gender === 'FEMALE' ? 'Female' : 'Male'} profile avatar`}
                className="h-20 w-20 shrink-0 rounded-full border-2 border-white/25 bg-white object-cover"
              />
            ) : (
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-white text-3xl font-black text-black">{user.name?.charAt(0).toUpperCase() || 'C'}</div>
            )}
            <div><h2 className="text-2xl font-black">{user.name}</h2><p className="mt-1 text-sm text-white/65">{user.email}</p><span className="mt-3 inline-flex rounded-full border border-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider">Customer</span></div>
          </div>

          <form onSubmit={handleSubmit(async (values) => { const success = await onUpdate(values); if (success) reset(values); })} className="p-5 sm:p-8" noValidate>
            <div className="grid gap-5 sm:grid-cols-2">
              <ProfileInput label="Full name" icon={<UserRound />} error={errors.name?.message} registration={register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name must contain at least 2 characters' } })} />
              <ProfileInput label="Email address" type="email" icon={<Mail />} disabled registration={register('email')} />
              <ProfileInput label="Phone number" type="tel" icon={<Phone />} error={errors.phoneNumber?.message} registration={register('phoneNumber', { validate: (value) => !value || (value.trim().length >= 7 && value.trim().length <= 20) || 'Phone number must contain 7–20 characters' })} />
              <ProfileInput label="Postal code" icon={<MapPin />} error={errors.postalCode?.message} registration={register('postalCode', { maxLength: { value: 20, message: 'Postal code is too long' } })} />
              <div className="sm:col-span-2"><ProfileInput label="Address" icon={<MapPin />} error={errors.addressLine?.message} registration={register('addressLine', { maxLength: { value: 255, message: 'Address cannot exceed 255 characters' } })} /></div>
              <ProfileInput label="City" registration={register('cityName', { maxLength: { value: 100, message: 'City name is too long' } })} error={errors.cityName?.message} />
              <ProfileInput label="State" registration={register('stateName', { maxLength: { value: 100, message: 'State name is too long' } })} error={errors.stateName?.message} />
              <ProfileInput label="Country" registration={register('countryName', { maxLength: { value: 100, message: 'Country name is too long' } })} error={errors.countryName?.message} />
            </div>
            <AuthError message={error} />
            <div className="mt-7 flex justify-end border-t border-black/10 pt-5">
              <button type="submit" disabled={loading || !isDirty} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-black px-6 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-35 sm:w-auto"><Save className="h-4 w-4" />{loading ? 'Saving…' : 'Save profile'}</button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

const ProfileInput: React.FC<{
  label: string;
  type?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  error?: string;
  registration: UseFormRegisterReturn;
}> = ({ label, type = 'text', icon, disabled, error, registration }) => (
  <label className="block text-xs font-bold text-black/65">
    {label}
    <span className="relative mt-2 block">
      {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/35 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
      <input {...registration} type={type} disabled={disabled} aria-invalid={Boolean(error)} className={`h-12 w-full rounded-lg border bg-[#fafafa] pr-3 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 disabled:cursor-not-allowed disabled:bg-black/[0.04] disabled:text-black/45 ${icon ? 'pl-10' : 'pl-3'} ${error ? 'border-red-500' : 'border-black/15'}`} />
    </span>
    {error && <span className="mt-1.5 block text-[11px] font-semibold text-red-600">{error}</span>}
  </label>
);

const AuthError: React.FC<{ message: string | null }> = ({ message }) => message ? (
  <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">{message}</div>
) : null;


export default CustomerProfilePage;
