import React, { useEffect, useState } from 'react';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react';

import fyLogoMark from '../../../assets/fy-logo-mark.png';
import AnimeFramer from './AnimeFramer';
import FrameDoodle from './FrameDoodle';
import { showValidationWarning } from '../../../utils/toast';
import '../styles/auth.css';

export type AuthMode = 'login' | 'register';
export type LoginValues = { email: string; password: string };
export type RegistrationValues = LoginValues & { name: string; phoneNumber: string; confirmPassword: string; gender: 'MALE' | 'FEMALE' };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ScreenProps = {
  mode: AuthMode;
  loading: boolean;
  error: string | null;
  onModeChange: (mode: AuthMode) => void;
  onLogin: (values: LoginValues) => Promise<void>;
  onRegister: (values: RegistrationValues) => Promise<void>;
};

/**
 * Customer log in and sign up, as a page of its own (the storefront chrome is hidden): the
 * FrameYaad logo top left, one card holding a centered monochrome frame doodle, and the
 * form beside it. Desktop fits one screen with no
 * scrolling. Switching modes swaps only the form. On phones the figure becomes a header and
 * the form a sheet over it. All submission, validation and redirects stay with the page.
 */
export const CustomerAuthScreen: React.FC<ScreenProps> = ({ mode, loading, error, onModeChange, onLogin, onRegister }) => {
  const login = mode === 'login';
  return (
    <section className="fy-auth" data-mode={mode}>
      <div className="fy-auth__doodle-field" aria-hidden="true">
        {Array.from({ length: 20 }, (_, index) => <span key={index} className={`fy-auth__mini-frame fy-auth__mini-frame--${index + 1}`} />)}
      </div>

      <Link to="/" className="fy-auth__brand" aria-label="FrameYaad home">
        <img src={fyLogoMark} alt="" />
        <span>FrameYaad</span>
      </Link>

      <div className="fy-auth__card">
        <div className="fy-auth__visual">
          <FrameDoodle className="fy-auth__figure" />
        </div>

        <div className="fy-auth__body">
          <div className="fy-auth__rules" aria-hidden="true">
            <span className="fy-auth__rule fy-auth__rule--long" />
            <span className="fy-auth__rule fy-auth__rule--short" />
          </div>
          {/* Phones: a two-way switch on top of the sheet. Wider: a single pill in the corner. */}
          <div className="fy-auth__tabs" role="group" aria-label="Log in or create an account">
            <button type="button" aria-pressed={login} onClick={() => onModeChange('login')}>Log in</button>
            <button type="button" aria-pressed={!login} onClick={() => onModeChange('register')}>Create account</button>
          </div>
          <div className="fy-auth__corner">
            <button type="button" onClick={() => onModeChange(login ? 'register' : 'login')} className="fy-auth__pill">{login ? 'Create account' : 'Log in'}</button>
          </div>

          <div key={mode} className="fy-auth__swap">
            {login
              ? <LoginForm loading={loading} error={error} onSubmit={onLogin} onRegister={() => onModeChange('register')} />
              : <RegistrationForm loading={loading} error={error} onSubmit={onRegister} onLogin={() => onModeChange('login')} />}
          </div>
        </div>
      </div>
    </section>
  );
};

const LoginForm: React.FC<{ loading: boolean; error: string | null; onSubmit: (values: LoginValues) => Promise<void>; onRegister: () => void }> = ({ loading, error, onSubmit, onRegister }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({ defaultValues: { email: '', password: '' } });
  return (
    <form onSubmit={handleSubmit(onSubmit, showValidationWarning)} noValidate className="fy-auth__form">
      <h1 className="fy-auth__title"><span>Welcome back to</span> FrameYaad</h1>
      <p className="fy-auth__lead">Log in to see your orders, saved frames and delivery details.</p>
      <div className="fy-auth__fields">
        <Field label="Email address" type="email" autoComplete="email" inputMode="email" error={errors.email?.message} registration={register('email', { required: 'Email address is required', pattern: { value: emailPattern, message: 'Enter a valid email address' } })} />
        <Field label="Password" type="password" autoComplete="current-password" error={errors.password?.message} registration={register('password', { required: 'Password is required' })} />
      </div>
      <div className="fy-auth__forgot"><Link to="/forgot-password">Forgot password?</Link></div>
      <ServerError message={error} />
      <SubmitButton loading={loading} label="Log in" busyLabel="Logging in…" />
      <p className="fy-auth__alt">New to FrameYaad? <button type="button" onClick={onRegister}>Create an account</button></p>
    </form>
  );
};

const RegistrationForm: React.FC<{ loading: boolean; error: string | null; onSubmit: (values: RegistrationValues) => Promise<void>; onLogin: () => void }> = ({ loading, error, onSubmit, onLogin }) => {
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<RegistrationValues>({ defaultValues: { name: '', email: '', phoneNumber: '', password: '', confirmPassword: '' } });
  return (
    <form onSubmit={handleSubmit(onSubmit, showValidationWarning)} noValidate className="fy-auth__form">
      <h1 className="fy-auth__title"><span>Join</span> FrameYaad</h1>
      <p className="fy-auth__lead">Create an account to check out faster and keep every order in one place.</p>
      <div className="fy-auth__fields fy-auth__fields--grid">
        <Field label="Full name" autoComplete="name" error={errors.name?.message} registration={register('name', { required: 'Full name is required', minLength: { value: 2, message: 'Name must contain at least 2 characters' }, maxLength: { value: 120, message: 'Name is too long' } })} />
        <Field label="Phone number" optional type="tel" autoComplete="tel" inputMode="tel" error={errors.phoneNumber?.message} registration={register('phoneNumber', { validate: (value) => !value || (value.trim().length >= 7 && value.trim().length <= 20) || 'Phone number must contain 7–20 characters' })} />
        <fieldset className="fy-auth__span fy-auth__choice" aria-invalid={Boolean(errors.gender) || undefined}>
          <legend>Gender</legend>
          <div className="fy-auth__choice-row">
            {(['MALE', 'FEMALE'] as const).map((gender) => (
              <label key={gender} className="fy-auth__choice-option">
                <input type="radio" value={gender} {...register('gender', { required: 'Select your gender' })} />
                <span>{gender === 'MALE' ? 'Male' : 'Female'}</span>
              </label>
            ))}
          </div>
          {errors.gender && <p className="fy-auth__error" role="alert">{errors.gender.message}</p>}
        </fieldset>
        <div className="fy-auth__span">
          <Field label="Email address" type="email" autoComplete="email" inputMode="email" error={errors.email?.message} registration={register('email', { required: 'Email address is required', pattern: { value: emailPattern, message: 'Enter a valid email address' } })} />
        </div>
        <Field label="Password" type="password" autoComplete="new-password" hint="At least 8 characters." error={errors.password?.message} registration={register('password', { required: 'Password is required', minLength: { value: 8, message: 'Password must contain at least 8 characters' }, maxLength: { value: 72, message: 'Password cannot exceed 72 characters' } })} />
        <Field label="Confirm password" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} registration={register('confirmPassword', { required: 'Confirm your password', validate: (value) => value === getValues('password') || 'Passwords do not match' })} />
      </div>
      <ServerError message={error} />
      <SubmitButton loading={loading} label="Create account" busyLabel="Creating your account…" />
      <p className="fy-auth__alt">Already have an account? <button type="button" onClick={onLogin}>Log in</button></p>
    </form>
  );
};

const Field: React.FC<{ label: string; type?: string; autoComplete?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; optional?: boolean; hint?: string; error?: string; registration: UseFormRegisterReturn }> = ({ label, type = 'text', autoComplete, inputMode, optional, hint, error, registration }) => {
  const [shown, setShown] = useState(false);
  const id = `fy-auth-${registration.name}`;
  const password = type === 'password';
  const described = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="fy-auth__field" data-invalid={error ? true : undefined}>
      <label htmlFor={id}>{label}{optional && <span> (optional)</span>}</label>
      <div className="fy-auth__control">
        <input id={id} {...registration} type={password && shown ? 'text' : type} autoComplete={autoComplete} inputMode={inputMode} aria-invalid={Boolean(error)} aria-describedby={described} />
        {password && (
          <button type="button" className="fy-auth__reveal" onClick={() => setShown((value) => !value)} aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown}>
            {shown ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        )}
      </div>
      {error ? <p id={`${id}-error`} className="fy-auth__error">{error}</p> : hint ? <p id={`${id}-hint`} className="fy-auth__hint">{hint}</p> : null}
    </div>
  );
};

const ServerError: React.FC<{ message: string | null }> = ({ message }) => message ? (
  <div role="alert" className="fy-auth__alert"><AlertCircle aria-hidden="true" /><span>{message}</span></div>
) : null;

const SubmitButton: React.FC<{ loading: boolean; label: string; busyLabel: string }> = ({ loading, label, busyLabel }) => (
  <button type="submit" disabled={loading} aria-busy={loading || undefined} className="fy-auth__submit">
    {loading ? <><LoaderCircle className="fy-auth__spin" aria-hidden="true" />{busyLabel}</> : <>{label}<ArrowRight aria-hidden="true" /></>}
  </button>
);

/* ---------- After a successful log in or sign up ---------- */

export type Celebration =
  | { kind: 'welcome'; name: string }
  | { kind: 'created'; name: string; confirmEmail?: string };

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * A short full-screen moment before the page moves on. Log in: the FrameYaad mark and
 * "Welcome back, {name}". Sign up: an empty frame draws itself and a portrait develops
 * inside it. When the email still needs confirming, the frame stays with that message and
 * a way back to log in; otherwise the overlay hands over on its own.
 */
export const AuthCelebration: React.FC<{ celebration: Celebration; onDone: () => void; onReturnToLogin: () => void }> = ({ celebration, onDone, onReturnToLogin }) => {
  const waiting = celebration.kind === 'created' && Boolean(celebration.confirmEmail);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (waiting) return;
    const still = reducedMotion();
    const hold = still ? 900 : celebration.kind === 'welcome' ? 1500 : 2600;
    const fade = still ? 0 : 320;
    const leave = window.setTimeout(() => setLeaving(true), hold);
    const done = window.setTimeout(onDone, hold + fade);
    return () => { window.clearTimeout(leave); window.clearTimeout(done); };
  }, [celebration.kind, onDone, waiting]);

  const firstName = celebration.name.trim().split(/\s+/)[0] || '';

  return (
    <div className="fy-celebrate" data-kind={celebration.kind} data-leaving={leaving || undefined} role="status" aria-live="polite">
      {celebration.kind === 'welcome' ? (
        <div className="fy-celebrate__welcome">
          <img src={fyLogoMark} alt="" className="fy-celebrate__mark" />
          <span className="fy-celebrate__rule" aria-hidden="true" />
          <p className="fy-celebrate__title">Welcome back{firstName ? `, ${firstName}` : ''}</p>
          <p className="fy-celebrate__sub">Taking you to your account</p>
        </div>
      ) : (
        <div className="fy-celebrate__created">
          <div className="fy-celebrate__frame" aria-hidden="true">
            <svg viewBox="0 0 200 250" className="fy-celebrate__outline"><rect x="4" y="4" width="192" height="242" pathLength="100" /></svg>
            <div className="fy-celebrate__opening"><AnimeFramer crop="bust" className="fy-celebrate__figure" /></div>
          </div>
          {waiting ? (
            <>
              <p className="fy-celebrate__title">Confirm your email</p>
              <p className="fy-celebrate__sub">Your account is created. We sent a confirmation link to <strong>{celebration.confirmEmail}</strong>.</p>
              <button type="button" onClick={onReturnToLogin} className="fy-auth__submit fy-celebrate__action">Return to log in</button>
            </>
          ) : (
            <>
              <p className="fy-celebrate__title">Your account is ready{firstName ? `, ${firstName}` : ''}</p>
              <p className="fy-celebrate__sub">Welcome to FrameYaad</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};
