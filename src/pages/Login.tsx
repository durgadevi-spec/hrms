import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, Mail, Lock, ArrowRight, Eye, EyeOff, 
  AlertCircle, ShieldAlert, CheckCircle2, X, Hash, KeyRound, Loader2 
} from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { api } from '../lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Login Error & Warning States
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState<'deactivated' | 'credential' | 'general'>('credential');
  const [successMsg, setSuccessMsg] = useState('');
  const [showActivateHint, setShowActivateHint] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password Modal States
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'reset'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [isForgotChecking, setIsForgotChecking] = useState(false);
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setShowActivateHint(false);
    setIsLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        navigate('/');
      } else {
        const errMsg = res.error || 'Invalid email or password.';
        setError(errMsg);
        if (errMsg.toLowerCase().includes('deactivated')) {
          setErrorType('deactivated');
        } else {
          setErrorType('credential');
          setShowActivateHint(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
      setErrorType('general');
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password Step 1: Check Email
  const handleForgotEmailCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotError('');
    setIsForgotChecking(true);

    try {
      const res = await api.post('/api/auth/check-email', { email: forgotEmail });
      if (!res.exists) {
        setForgotError('No registered account found with this work email address.');
      } else if (res.status === 'inactive') {
        setForgotError(res.message || 'Account is deactivated. Contact your HR/Admin.');
      } else {
        setForgotStep('reset');
      }
    } catch (err: any) {
      setForgotError(err.message || 'Unable to verify email address. Please try again.');
    } finally {
      setIsForgotChecking(false);
    }
  };

  // Forgot Password Step 2: Reset Password
  const handleForgotResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match');
      return;
    }
    if (forgotNewPassword.length < 6) {
      setForgotError('Password must be at least 6 characters long');
      return;
    }

    setIsForgotSubmitting(true);
    try {
      const res = await api.post('/api/auth/reset-password', {
        email: forgotEmail,
        newPassword: forgotNewPassword,
      });

      // Success
      setIsForgotModalOpen(false);
      resetForgotModal();
      setEmail(forgotEmail);
      setPassword('');
      setSuccessMsg(res.message || 'Password reset successfully! Please sign in with your new password.');
    } catch (err: any) {
      setForgotError(err.message || 'Unable to reset password.');
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  const resetForgotModal = () => {
    setForgotStep('email');
    setForgotEmail('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setShowForgotNewPassword(false);
    setShowForgotConfirmPassword(false);
    setForgotError('');
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden transition-colors">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] -right-[10%] w-[50%] h-[50%] rounded-full bg-primary-400/10 blur-[120px]" />
        <div className="absolute -bottom-[25%] -left-[10%] w-[50%] h-[50%] rounded-full bg-accent-400/10 blur-[120px]" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-fade-in">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/20 mb-4 transform hover:scale-105 transition-transform">
            <Building2 className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-secondary-900 dark:text-white tracking-tight">
          Welcome to CTI
        </h2>
        <p className="mt-2 text-center text-sm text-secondary-600 dark:text-surface-400">
          New employee?{' '}
          <Link to="/signup" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
            Activate your account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-surface-200/50 dark:border-surface-800/50">
          
          {/* Success Banner */}
          {successMsg && (
            <div className="mb-5 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-800 dark:text-emerald-200 font-medium">{successMsg}</p>
            </div>
          )}

          {/* Deactivated Account Amber Warning Banner */}
          {error && errorType === 'deactivated' && (
            <div className="mb-5 p-4 bg-amber-50/90 dark:bg-amber-900/20 backdrop-blur-sm border border-amber-200 dark:border-amber-800/60 rounded-xl animate-shake flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Account Deactivated</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">{error}</p>
              </div>
            </div>
          )}

          {/* General / Credential Error Red Banner */}
          {error && errorType !== 'deactivated' && (
            <div className="mb-5 p-4 bg-error-50/80 dark:bg-error-900/20 backdrop-blur-sm border border-error-200 dark:border-error-800 rounded-xl animate-shake space-y-2">
              <div className="flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 text-error-600 dark:text-error-400 shrink-0" />
                <p className="text-sm text-error-600 dark:text-error-400 font-medium">{error}</p>
              </div>
              {showActivateHint && (
                <p className="text-xs text-secondary-500 dark:text-surface-400 text-center">
                  First time signing in?{' '}
                  <Link to="/signup" className="text-primary-600 hover:text-primary-500 font-semibold underline">
                    Activate your account here
                  </Link>
                  {' '}— your admin may have pre-registered your email.
                </p>
              )}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300">Email address</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-secondary-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10 bg-white/50 dark:bg-surface-800/50"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300">Password</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-secondary-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 pr-10 bg-white/50 dark:bg-surface-800/50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary-400 hover:text-secondary-600 dark:hover:text-surface-200 transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-surface-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-secondary-700 dark:text-surface-300">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotError('');
                    setForgotStep('email');
                    setIsForgotModalOpen(true);
                  }}
                  className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary py-2.5 text-base relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? 'Signing in...' : 'Sign in'}
                  {!isLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal: Forgot Password (Option 1: Employee ID Verification) */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsForgotModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-surface-200 dark:border-surface-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-800">
              <h2 className="text-lg font-bold text-secondary-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                Reset Password
              </h2>
              <button 
                onClick={() => setIsForgotModalOpen(false)} 
                className="text-secondary-400 hover:text-secondary-600 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {forgotError && (
                <div className="p-3 text-xs bg-error-50 text-error-700 dark:bg-error-900/30 dark:text-error-300 rounded-xl border border-error-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-error-600 shrink-0 mt-0.5" />
                  <span>{forgotError}</span>
                </div>
              )}

              {/* ─── Step 1: Work Email Verification ─────────────────── */}
              {forgotStep === 'email' && (
                <form onSubmit={handleForgotEmailCheck} className="space-y-4">
                  <p className="text-xs text-secondary-600 dark:text-surface-300">
                    Enter your work email address to verify your account and start the password reset process.
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-secondary-700 dark:text-surface-300 mb-1">
                      Work Email Address *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-secondary-400" />
                      </div>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="input-field pl-9 text-xs bg-surface-50 dark:bg-surface-800"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-surface-200 dark:border-surface-800">
                    <button
                      type="button"
                      onClick={() => setIsForgotModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-secondary-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isForgotChecking || !forgotEmail.trim()}
                      className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isForgotChecking ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying...</>
                      ) : (
                        <>Verify Email <ArrowRight className="w-3.5 h-3.5" /></>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* ─── Step 2: Employee ID & New Password ─────────────── */}
              {forgotStep === 'reset' && (
                <form onSubmit={handleForgotResetSubmit} className="space-y-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Email verified for <strong>{forgotEmail}</strong>.</span>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-secondary-700 dark:text-surface-300 mb-1">
                      New Password *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-secondary-400" />
                      </div>
                      <input
                        type={showForgotNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={forgotNewPassword}
                        onChange={e => setForgotNewPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="input-field pl-9 pr-9 text-xs bg-surface-50 dark:bg-surface-800"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary-400 hover:text-secondary-600 dark:hover:text-surface-200"
                      >
                        {showForgotNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-semibold text-secondary-700 dark:text-surface-300 mb-1">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-secondary-400" />
                      </div>
                      <input
                        type={showForgotConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={forgotConfirmPassword}
                        onChange={e => setForgotConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="input-field pl-9 pr-9 text-xs bg-surface-50 dark:bg-surface-800"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary-400 hover:text-secondary-600 dark:hover:text-surface-200"
                      >
                        {showForgotConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-surface-200 dark:border-surface-800">
                    <button
                      type="button"
                      onClick={() => setForgotStep('email')}
                      className="px-4 py-2 text-xs font-semibold text-secondary-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isForgotSubmitting}
                      className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isForgotSubmitting ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Resetting...</>
                      ) : (
                        'Reset Password'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

