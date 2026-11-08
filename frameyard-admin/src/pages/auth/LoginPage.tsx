import React, { useState, useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import AuthPendingScreen from '../../components/auth/AuthPendingScreen';
import { safeAuthReturnPath } from '../../utils/auth-return-path';
import useAuth from '../../hooks/useAuth';
import { LoaderCircle, LogIn } from 'lucide-react';
import fyLogoIcon from '../../assets/fy-logo-icon.jpeg';
import { showSuccess, showWarning } from '../../utils/toast';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error, status, verificationError, checkAuth, user, clearError } = useAuth();
  const location = useLocation();
  const returnTo = safeAuthReturnPath((location.state as { returnTo?: unknown } | null)?.returnTo, 'admin');

  // Clear previous auth errors on load
  useEffect(() => {
    clearError();
  }, [clearError]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { showWarning('Email address and password are required'); return; }
    const success = await login(email, password);
    if (success) {
      showSuccess('Login successful');

    }
  };

  if (status === 'checking') return <AuthPendingScreen error={verificationError} onRetry={() => { void checkAuth(); }} />;
  if (status === 'authenticated') return <Navigate to={user?.role === 'CUSTOMER' ? '/' : returnTo} replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl p-8 flex flex-col">
        <div className="flex flex-col items-center mb-8 text-center">
          <img src={fyLogoIcon} alt="FrameYaad logo" className="mb-4 h-16 w-16 rounded-2xl object-contain p-2" />
          <h2 className="text-2xl font-bold text-on-surface">FrameYaad Console</h2>
          <p className="text-sm text-on-surface-variant mt-1">Admin and employee sign in.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-error-container text-on-error-container text-xs font-semibold rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2 " >
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-outline-variant rounded-xl p-3 text-sm bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="name@company.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-outline-variant rounded-xl p-3 text-sm bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <Link to="/fyadminlogin/forgot-password" className="self-end text-sm font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2">Forgot password?</Link>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary hover:bg-primary/95 font-semibold py-3 rounded-xl shadow-sm transition-all disabled:opacity-50 mt-2 hover:scale-[1.01]"
          >
            {loading ? (
              <LoaderCircle aria-label="Signing in" className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-outline-variant text-center">
          
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
