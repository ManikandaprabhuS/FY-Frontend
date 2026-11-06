import { useEffect, useRef, useState, type FormEvent } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, LoaderCircle } from 'lucide-react';
import { authService, type RecoveryPortal, type RecoverySession } from '../../services/auth.service';

type RecoveryStep = 'email' | 'otp' | 'password' | 'done';

const errorMessage = (error: unknown) => {
  if (axios.isAxiosError<{ error?: { message?: string }; message?: string }>(error)) {
    return error.response?.data.error?.message ?? error.response?.data.message ?? 'Unable to connect. Please try again.';
  }
  return 'Something went wrong. Please try again.';
};

export default function ForgotPasswordPage({ portal }: { portal: RecoveryPortal }) {
  const loginPath = portal === 'admin' ? '/fyadminlogin' : '/profile';
  const [step, setStep] = useState<RecoveryStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [session, setSession] = useState<RecoverySession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds(value => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const sendCode = async () => {
    await authService.requestPasswordReset(portal, email);
    setOtp('');
    setStep('otp');
    setResendSeconds(60);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (step === 'password' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      if (step === 'email') await sendCode();
      else if (step === 'otp') {
        const recovery = await authService.verifyResetOtp(portal, email, otp.trim());
        // Recovery credentials stay in component memory, never in URLs or browser storage.
        setSession(recovery);
        setOtp('');
        setStep('password');
      } else if (step === 'password' && session) {
        await authService.resetPassword(portal, session, password);
        setSession(null);
        setPassword('');
        setConfirmPassword('');
        setStep('done');
      }
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally { setLoading(false); }
  };

  const inputClass = 'mt-2 min-h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';
  const titles: Record<RecoveryStep, string> = {
    email: 'Forgot your password?', otp: 'Check your email', password: 'Set a new password', done: 'Password updated',
  };

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-10 text-on-surface">
      <section aria-labelledby="recovery-heading" className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">FrameYaad {portal === 'admin' ? 'admin' : 'customer'} recovery</p>
        <h1 id="recovery-heading" ref={heading} tabIndex={-1} className="mt-3 text-2xl font-bold outline-none">{titles[step]}</h1>
        {step === 'done' ? (
          <div className="mt-5" role="status">
            <CheckCircle2 className="mb-4 h-10 w-10" aria-hidden="true" />
            <p className="text-sm text-on-surface-variant">Your password has been reset. Sign in with your new password.</p>
            <Link to={loginPath} className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 py-3 font-semibold text-on-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">Return to login</Link>
          </div>
        ) : (
          <>
            <p className="mt-3 break-words text-sm leading-6 text-on-surface-variant">
              {step === 'email' ? `Enter the email registered to your ${portal} account to receive a password reset code.` : step === 'otp' ? `A verification code has been sent to ${email.trim()}. It expires in 10 minutes. Check your inbox and spam folder.` : 'Choose a new password with at least 8 characters.'}
            </p>
            <form onSubmit={submit} className="mt-6 space-y-5" aria-busy={loading}>
              {step === 'email' && <label className="block text-sm font-semibold" htmlFor="recovery-email">Email address
                <input id="recovery-email" type="email" autoComplete="email" required maxLength={320} value={email} onChange={event => setEmail(event.target.value)} className={inputClass} />
              </label>}
              {step === 'otp' && <label className="block text-sm font-semibold" htmlFor="recovery-otp">Verification code
                <input id="recovery-otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, ''))} className={`${inputClass} tracking-[0.3em]`} />
              </label>}
              {step === 'password' && <>
                <label className="block text-sm font-semibold" htmlFor="recovery-password">New password
                  <input id="recovery-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={password} onChange={event => setPassword(event.target.value)} className={inputClass} />
                </label>
                <label className="block text-sm font-semibold" htmlFor="recovery-confirm">Confirm new password
                  <input id="recovery-confirm" type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className={inputClass} />
                </label>
              </>}
              {error && <p role="alert" className="rounded-lg bg-error-container p-3 text-sm text-on-error-container">{error}</p>}
              <button disabled={loading} type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-on-primary transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-50">
                {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {loading ? 'Please wait…' : step === 'email' ? 'Send verification code' : step === 'otp' ? 'Verify code' : 'Reset password'}
              </button>
            </form>
            {step === 'otp' && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <button type="button" disabled={loading || resendSeconds > 0} onClick={async () => { setLoading(true); setError(''); try { await sendCode(); } catch (requestError) { setError(errorMessage(requestError)); } finally { setLoading(false); } }} className="min-h-11 underline underline-offset-4 disabled:opacity-50">{resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}</button>
              <button type="button" disabled={loading} onClick={() => { setStep('email'); setOtp(''); setError(''); }} className="min-h-11 underline underline-offset-4">Change email</button>
            </div>}
            {step === 'password' && <button type="button" disabled={loading} onClick={() => { setSession(null); setPassword(''); setConfirmPassword(''); setError(''); setStep('email'); }} className="mt-3 block min-h-11 text-sm font-semibold underline underline-offset-4">Request a new code</button>}
            <Link to={loginPath} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to login</Link>
          </>
        )}
      </section>
    </main>
  );
}
