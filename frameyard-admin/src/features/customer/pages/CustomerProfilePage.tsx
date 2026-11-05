import React, { useEffect, useState } from 'react';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
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
import { useLocation, useNavigate } from 'react-router-dom';

type AuthMode = 'login' | 'register';

type LoginValues = {
  email: string;
  password: string;
};

type RegistrationValues = LoginValues & {
  name: string;
  phoneNumber: string;
  confirmPassword: string;
  gender: 'MALE' | 'FEMALE';
};

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

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CustomerProfilePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loading = useAuthStore((state) => state.loading);
  const authError = useAuthStore((state) => state.error);
  const loginCustomer = useAuthStore((state) => state.loginCustomer);
  const registerCustomer = useAuthStore((state) => state.registerCustomer);
  const authChecked = useAuthStore((state) => state.authChecked);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const changePassword = useAuthStore((state) => state.changePassword);
  const logout = useAuthStore((state) => state.logout);
  const clearError = useAuthStore((state) => state.clearError);
  const [mode, setMode] = useState<AuthMode>('login');
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const customerAuthenticated = isAuthenticated && user?.role === 'CUSTOMER';
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;

  if (!authChecked) return <ProfileSkeleton />;

  if (!customerAuthenticated || !user) {
    return (
      <CustomerAuthPanel
        mode={mode}
        loading={loading}
        error={authError}
        confirmationEmail={confirmationEmail}
        onModeChange={(nextMode) => {
          clearError();
          setConfirmationEmail('');
          setMode(nextMode);
        }}
        onLogin={async (values) => {
          const success = await loginCustomer(values.email.trim().toLowerCase(), values.password);
          if (success) {
            showSuccess('Welcome back to FrameYaad');
            if (returnTo) navigate(returnTo, { replace: true });
          }
        }}
        onRegister={async (values) => {
          const result = await registerCustomer({
            name: values.name.trim(),
            email: values.email.trim().toLowerCase(),
            password: values.password,
            gender: values.gender,
            ...(values.phoneNumber.trim() ? { phoneNumber: values.phoneNumber.trim() } : {}),
          });
          if (!result.success) return;
          if (result.confirmationRequired) {
            setConfirmationEmail(values.email.trim().toLowerCase());
            return;
          }
          showSuccess('Your FrameYaad account is ready');
          if (returnTo) navigate(returnTo, { replace: true });
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

const CustomerAuthPanel: React.FC<{
  mode: AuthMode;
  loading: boolean;
  error: string | null;
  confirmationEmail: string;
  onModeChange: (mode: AuthMode) => void;
  onLogin: (values: LoginValues) => Promise<void>;
  onRegister: (values: RegistrationValues) => Promise<void>;
}> = ({ mode, loading, error, confirmationEmail, onModeChange, onLogin, onRegister }) => (
  <section className="bg-[#f7f7f5] px-4 py-8 sm:px-6 sm:py-14">
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.08)] lg:grid-cols-[0.85fr_1.15fr]">
      <div className="hidden bg-black p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-white/55">FrameYaad account</p>
          <h1 className="mt-5 text-4xl font-black leading-tight">Your memories,<br />all in one place.</h1>
          <p className="mt-5 max-w-sm text-sm leading-6 text-white/65">Save your details, manage future orders, and create personalized frames faster.</p>
        </div>
        <div className="space-y-3 text-sm font-semibold text-white/75">
          <AuthBenefit text="Faster personalized checkout" />
          <AuthBenefit text="Profile and delivery details" />
          <AuthBenefit text="Order history in one place" />
        </div>
      </div>

      <div className="p-5 sm:p-9 lg:p-12">
        <div className="mb-8 grid grid-cols-2 rounded-xl bg-black/[0.04] p-1">
          <AuthTab active={mode === 'login'} onClick={() => onModeChange('login')}>Login</AuthTab>
          <AuthTab active={mode === 'register'} onClick={() => onModeChange('register')}>Create account</AuthTab>
        </div>

        {confirmationEmail ? (
          <div className="flex min-h-80 flex-col items-center justify-center text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Mail className="h-7 w-7" /></span>
            <h2 className="mt-5 text-2xl font-black">Confirm your email</h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-black/55">We created your account and sent a confirmation link to <strong className="text-black">{confirmationEmail}</strong>.</p>
            <button type="button" onClick={() => onModeChange('login')} className="mt-6 rounded-lg bg-black px-5 py-3 text-xs font-bold text-white">Return to login</button>
          </div>
        ) : mode === 'login' ? (
          <LoginForm loading={loading} error={error} onSubmit={onLogin} onRegister={() => onModeChange('register')} />
        ) : (
          <RegistrationForm loading={loading} error={error} onSubmit={onRegister} onLogin={() => onModeChange('login')} />
        )}
      </div>
    </div>
  </section>
);

const LoginForm: React.FC<{
  loading: boolean;
  error: string | null;
  onSubmit: (values: LoginValues) => Promise<void>;
  onRegister: () => void;
}> = ({ loading, error, onSubmit, onRegister }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({
    defaultValues: { email: '', password: '' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-black/40">Welcome back</p>
      <h2 className="mt-2 text-3xl font-black">Login to FrameYaad</h2>
      <p className="mt-2 text-sm text-black/50">Access your customer profile and saved details.</p>
      <div className="mt-7 space-y-4">
        <AuthInput label="Email address" type="email" autoComplete="email" icon={<Mail />} error={errors.email?.message} registration={register('email', { required: 'Email address is required', pattern: { value: emailPattern, message: 'Enter a valid email address' } })} />
        <AuthInput label="Password" type="password" autoComplete="current-password" icon={<LockKeyhole />} error={errors.password?.message} registration={register('password', { required: 'Password is required' })} />
      </div>
      <AuthError message={error} />
      <SubmitButton loading={loading} label="Login" />
      <p className="mt-5 text-center text-xs text-black/50">New to FrameYaad? <button type="button" onClick={onRegister} className="font-black text-black underline underline-offset-4">Create an account</button></p>
    </form>
  );
};

const RegistrationForm: React.FC<{
  loading: boolean;
  error: string | null;
  onSubmit: (values: RegistrationValues) => Promise<void>;
  onLogin: () => void;
}> = ({ loading, error, onSubmit, onLogin }) => {
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<RegistrationValues>({
    defaultValues: { name: '', email: '', phoneNumber: '', password: '', confirmPassword: '' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-black/40">Join FrameYaad</p>
      <h2 className="mt-2 text-3xl font-black">Create your account</h2>
      <p className="mt-2 text-sm text-black/50">Enter your details to start personalizing frames.</p>
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <AuthInput label="Full name" autoComplete="name" icon={<UserRound />} error={errors.name?.message} registration={register('name', { required: 'Full name is required', minLength: { value: 2, message: 'Name must contain at least 2 characters' }, maxLength: { value: 120, message: 'Name is too long' } })} />
        <AuthInput label="Phone number (optional)" type="tel" autoComplete="tel" icon={<Phone />} error={errors.phoneNumber?.message} registration={register('phoneNumber', { validate: (value) => !value || (value.trim().length >= 7 && value.trim().length <= 20) || 'Phone number must contain 7–20 characters' })} />
        <fieldset className="sm:col-span-2">
          <legend className="text-xs font-bold text-black/75">Gender</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {(['MALE', 'FEMALE'] as const).map((gender) => (
              <label key={gender} className="flex h-12 cursor-pointer items-center gap-3 rounded-lg border border-black/15 px-4 text-sm font-semibold transition has-[:checked]:border-black has-[:checked]:bg-black has-[:checked]:text-white">
                <input type="radio" value={gender} className="h-4 w-4 accent-black" {...register('gender', { required: 'Select your gender' })} />
                {gender === 'MALE' ? 'Male' : 'Female'}
              </label>
            ))}
          </div>
          {errors.gender && <span className="mt-1.5 block text-[11px] font-semibold text-red-600">{errors.gender.message}</span>}
        </fieldset>
        <div className="sm:col-span-2"><AuthInput label="Email address" type="email" autoComplete="email" icon={<Mail />} error={errors.email?.message} registration={register('email', { required: 'Email address is required', pattern: { value: emailPattern, message: 'Enter a valid email address' } })} /></div>
        <AuthInput label="Password" type="password" autoComplete="new-password" icon={<LockKeyhole />} error={errors.password?.message} registration={register('password', { required: 'Password is required', minLength: { value: 8, message: 'Password must contain at least 8 characters' }, maxLength: { value: 72, message: 'Password cannot exceed 72 characters' } })} />
        <AuthInput label="Confirm password" type="password" autoComplete="new-password" icon={<LockKeyhole />} error={errors.confirmPassword?.message} registration={register('confirmPassword', { required: 'Confirm your password', validate: (value) => value === getValues('password') || 'Passwords do not match' })} />
      </div>
      <AuthError message={error} />
      <SubmitButton loading={loading} label="Create account" />
      <p className="mt-5 text-center text-xs text-black/50">Already registered? <button type="button" onClick={onLogin} className="font-black text-black underline underline-offset-4">Login</button></p>
    </form>
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

const AuthInput: React.FC<{
  label: string;
  type?: string;
  autoComplete?: string;
  icon: React.ReactNode;
  error?: string;
  registration: UseFormRegisterReturn;
}> = ({ label, type = 'text', autoComplete, icon, error, registration }) => (
  <label className="block text-xs font-bold text-black/75">
    {label}
    <span className="relative mt-2 block">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/35 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <input {...registration} type={type} autoComplete={autoComplete} aria-invalid={Boolean(error)} className={`h-12 w-full rounded-lg border bg-white pl-10 pr-3 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 ${error ? 'border-red-500' : 'border-black/15'}`} />
    </span>
    {error && <span className="mt-1.5 block text-[11px] font-semibold text-red-600">{error}</span>}
  </label>
);

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

const AuthTab: React.FC<React.PropsWithChildren<{ active: boolean; onClick: () => void }>> = ({ active, onClick, children }) => (
  <button type="button" onClick={onClick} className={`rounded-lg px-3 py-2.5 text-xs font-black transition ${active ? 'bg-black text-white shadow' : 'text-black/50 hover:text-black'}`}>{children}</button>
);

const SubmitButton: React.FC<{ loading: boolean; label: string }> = ({ loading, label }) => (
  <button type="submit" disabled={loading} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-black text-sm font-black text-white transition hover:bg-black/85 disabled:cursor-wait disabled:opacity-55">
    {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{loading ? 'Please wait…' : label}
  </button>
);

const AuthError: React.FC<{ message: string | null }> = ({ message }) => message ? (
  <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">{message}</div>
) : null;

const AuthBenefit: React.FC<{ text: string }> = ({ text }) => (
  <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-white" />{text}</p>
);

const ProfileSkeleton = () => (
  <div className="mx-auto max-w-5xl animate-pulse px-4 py-12">
    <div className="h-8 w-48 rounded bg-black/10" />
    <div className="mt-7 h-[520px] rounded-3xl bg-black/5" />
  </div>
);

export default CustomerProfilePage;
