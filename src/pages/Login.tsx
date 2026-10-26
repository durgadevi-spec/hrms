import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Mail, Lock, Eye, EyeOff, 
  AlertCircle, ShieldAlert, CheckCircle2, X, KeyRound, Loader2, ArrowRight 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ThemeToggle } from '../components/ThemeToggle';
import { NetworkCanvas } from '../components/NetworkCanvas';
import { api } from '../lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

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
        const role = res.user?.role;
        const target = role === 'it_support'
          ? '/assets'
          : (role === 'admin' || role === 'hr')
            ? '/admin'
            : res.user?.id
              ? `/profile/${res.user.id}`
              : '/assets';
        navigate(target, { replace: true });
      } else {
        const errMsg = res.error || 'Invalid email or password.';
        if (errMsg.toLowerCase().includes('deactivated')) {
          setError(errMsg);
          setErrorType('deactivated');
          setShowActivateHint(false);
        } else if (
          errMsg.toLowerCase().includes('internal server error') ||
          errMsg.toLowerCase().includes('server error') ||
          errMsg.toLowerCase().includes('failed to fetch') ||
          errMsg.toLowerCase().includes('network')
        ) {
          setError('Server connection temporarily interrupted. Please click Sign In again.');
          setErrorType('general');
          setShowActivateHint(false);
        } else {
          setError(errMsg);
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
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-100 dark:from-surface-950 dark:via-surface-900 dark:to-surface-950 p-4 sm:p-6 relative overflow-hidden transition-colors">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-4xl overflow-hidden rounded-3xl flex flex-col md:flex-row bg-white dark:bg-surface-900 shadow-2xl border border-surface-200/70 dark:border-surface-800"
      >
        {/* Left Side: Animated Network Canvas */}
        <NetworkCanvas
          title="CTI HRMS"
          subtitle="Unified workforce operating system. Manage profiles, attendance, leaves, IT assets, and automated bill reminders in one secure hub."
        />

        {/* Right Side: Sign-In Form */}
        <div className="w-full md:w-1/2 p-8 sm:p-10 flex flex-col justify-center bg-white dark:bg-surface-900">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-secondary-900 dark:text-white tracking-tight">
              Welcome back
            </h1>
            <p className="text-xs sm:text-sm text-secondary-500 dark:text-surface-400 mt-1 mb-6">
              Sign in to your workplace account
            </p>

            {/* Success Banner */}
            {successMsg && (
              <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-800 dark:text-emerald-200 font-medium">{successMsg}</p>
              </div>
            )}

            {/* Deactivated Warning */}
            {error && errorType === 'deactivated' && (
              <div className="mb-5 p-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">Account Deactivated</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">{error}</p>
                </div>
              </div>
            )}

            {/* Credential Error */}
            {error && errorType !== 'deactivated' && (
              <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl space-y-1">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-300 font-medium">{error}</p>
                </div>
                {showActivateHint && (
                  <p className="text-[11px] text-secondary-500 dark:text-surface-400 pl-6">
                    First time?{' '}
                    <Link to="/signup" className="text-primary-600 font-semibold underline">
                      Activate account
                    </Link>
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-secondary-700 dark:text-surface-300 mb-1">
                  Email address <span className="text-blue-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 rounded-xl text-secondary-900 dark:text-white placeholder:text-secondary-400 focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary-700 dark:text-surface-300 mb-1">
                  Password <span className="text-blue-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 rounded-xl text-secondary-900 dark:text-white placeholder:text-secondary-400 focus:outline-none focus:border-primary-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary-400 hover:text-secondary-600 dark:hover:text-surface-200"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center text-xs text-secondary-600 dark:text-surface-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2">Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotError('');
                    setForgotStep('email');
                    setIsForgotModalOpen(true);
                  }}
                  className="text-xs font-medium text-primary-600 hover:text-primary-500 transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <p className="text-xs text-secondary-500 dark:text-surface-400">
                  New employee?{' '}
                  <Link to="/signup" className="font-semibold text-primary-600 hover:text-primary-500">
                    Activate your account
                  </Link>
                </p>
              </div>
            </form>
          </motion.div>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsForgotModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl overflow-hidden border border-surface-200 dark:border-surface-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-800">
              <h2 className="text-base font-bold text-secondary-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                Reset Password
              </h2>
              <button onClick={() => setIsForgotModalOpen(false)} className="text-secondary-400 hover:text-secondary-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {forgotError && (
                <div className="p-3 text-xs bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-xl border border-red-200">
                  {forgotError}
                </div>
              )}

              {forgotStep === 'email' ? (
                <form onSubmit={handleForgotEmailCheck} className="space-y-4">
                  <p className="text-xs text-secondary-600 dark:text-surface-400">
                    Enter your work email address to verify your account and start the password reset process.
                  </p>
                  <div>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full px-3.5 py-2.5 text-sm bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-secondary-900 dark:text-white"
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsForgotModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-secondary-600 dark:text-surface-400 hover:bg-surface-100 rounded-xl"
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
              ) : (
                <form onSubmit={handleForgotResetSubmit} className="space-y-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Email verified for <strong>{forgotEmail}</strong>.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">New Password</label>
                    <div className="relative">
                      <input
                        type={showForgotNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full px-3.5 py-2 text-sm bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl pr-9 text-secondary-900 dark:text-white"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary-400"
                      >
                        {showForgotNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showForgotConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full px-3.5 py-2 text-sm bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl pr-9 text-secondary-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary-400"
                      >
                        {showForgotConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setForgotStep('email')}
                      className="px-4 py-2 text-xs font-semibold text-secondary-600 dark:text-surface-400 hover:bg-surface-100 rounded-xl"
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
