import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, Mail, Lock, User, Hash, Briefcase, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { api } from '../lib/api';

type Step = 'email-check' | 'activate' | 'full-signup';

export default function Signup() {
  const [step, setStep] = useState<Step>('email-check');
  const [email, setEmail] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  // Activation fields (pre-provisioned employee)
  const [activationEmployeeId, setActivationEmployeeId] = useState('');
  const [activationFirstName, setActivationFirstName] = useState('');
  const [activationNewPassword, setActivationNewPassword] = useState('');
  const [activationConfirmPassword, setActivationConfirmPassword] = useState('');

  // Full signup fields (new user)
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [designation, setDesignation] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  // Step 1: Check if email is already in system
  const handleEmailCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setIsChecking(true);

    try {
      const res = await api.post('/api/auth/check-email', { email });

      if (res.exists) {
        if (res.status === 'inactive') {
          setError(res.message || 'Account is deactivated. Contact admin.');
          setIsChecking(false);
          return;
        }
        // Pre-provisioned employee found – go to activation step
        setActivationFirstName(res.firstName || '');
        setActivationEmployeeId(res.employeeId || '');
        setStep('activate');
      } else {
        // Not in system – full signup
        setStep('full-signup');
      }
    } catch {
      setError('Unable to check email. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  // Step 2a: Activate pre-provisioned account
  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (activationNewPassword !== activationConfirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (activationNewPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/api/auth/activate', {
        email,
        employeeId: activationEmployeeId,
        newPassword: activationNewPassword,
      });
      localStorage.setItem('token', res.token);
      navigate('/');
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Activation failed. Check your Employee ID and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2b: Full signup for new users not in the system
  const handleFullSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await signup({ email, password, firstName, lastName, employeeId, designation });
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
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
          {step === 'activate' ? `Welcome, ${activationFirstName}!` : 'Join CTI'}
        </h2>
        <p className="mt-2 text-center text-sm text-secondary-600 dark:text-surface-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
            Sign in here
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-surface-200/50 dark:border-surface-800/50">

          {error && (
            <div className="mb-5 p-4 bg-error-50/80 dark:bg-error-900/20 backdrop-blur-sm border border-error-200 dark:border-error-800 rounded-xl animate-shake">
              <p className="text-sm text-error-600 dark:text-error-400 font-medium text-center">{error}</p>
            </div>
          )}

          {/* ─── Step 1: Email Check ──────────────────────────────── */}
          {step === 'email-check' && (
            <form className="space-y-6" onSubmit={handleEmailCheck}>
              <div className="text-center mb-2">
                <p className="text-sm text-secondary-500 dark:text-surface-400">
                  Enter your work email to get started. If you were added by your admin, we'll recognize you automatically.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300">Work Email Address</label>
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
                    autoFocus
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isChecking || !email.trim()}
                className="w-full btn-primary py-2.5 text-base relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isChecking ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Checking...</>
                  ) : (
                    <>Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                  )}
                </span>
              </button>
            </form>
          )}

          {/* ─── Step 2a: Activate Pre-Provisioned Account ────────── */}
          {step === 'activate' && (
            <form className="space-y-5" onSubmit={handleActivate}>
              {/* Success banner */}
              <div className="flex items-start gap-3 p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-success-600 dark:text-success-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-success-800 dark:text-success-300">Account found!</p>
                  <p className="text-xs text-success-700 dark:text-success-400 mt-0.5">
                    Your account was set up by your admin. Verify your Employee ID and choose a new password to activate it.
                  </p>
                </div>
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300">Email</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-secondary-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="input-field pl-10 bg-surface-100 dark:bg-surface-800 cursor-not-allowed opacity-70"
                  />
                </div>
              </div>

              {/* Employee ID verification */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300">
                  Employee ID <span className="text-secondary-400 font-normal">(for verification)</span>
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Hash className="h-5 w-5 text-secondary-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={activationEmployeeId}
                    onChange={(e) => setActivationEmployeeId(e.target.value)}
                    className="input-field pl-10 bg-white/50 dark:bg-surface-800/50"
                    placeholder="e.g. EMP004"
                  />
                </div>
                <p className="text-xs text-secondary-400 mt-1">Your Employee ID was provided by your admin or HR team.</p>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300">New Password</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-secondary-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={activationNewPassword}
                    onChange={(e) => setActivationNewPassword(e.target.value)}
                    className="input-field pl-10 bg-white/50 dark:bg-surface-800/50"
                    placeholder="Min. 6 characters"
                    minLength={6}
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300">Confirm Password</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-secondary-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={activationConfirmPassword}
                    onChange={(e) => setActivationConfirmPassword(e.target.value)}
                    className="input-field pl-10 bg-white/50 dark:bg-surface-800/50"
                    placeholder="Re-enter password"
                    minLength={6}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep('email-check'); setError(''); }}
                  className="flex-1 btn-secondary py-2.5 text-base"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 btn-primary py-2.5 text-base"
                >
                  {isLoading ? 'Activating...' : 'Activate Account'}
                </button>
              </div>
            </form>
          )}

          {/* ─── Step 2b: Full Signup ──────────────────────────────── */}
          {step === 'full-signup' && (
            <form className="space-y-5" onSubmit={handleFullSignup}>
              <div className="p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs text-secondary-500">
                Email <span className="font-semibold text-secondary-700 dark:text-surface-200">{email}</span> is not registered. Fill in your details to create an account.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300">First Name</label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-secondary-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="input-field pl-10 bg-white/50 dark:bg-surface-800/50"
                      placeholder="John"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300">Last Name</label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-secondary-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="input-field pl-10 bg-white/50 dark:bg-surface-800/50"
                      placeholder="Doe"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300">Employee ID</label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Hash className="h-5 w-5 text-secondary-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className="input-field pl-10 bg-white/50 dark:bg-surface-800/50"
                      placeholder="EMP002"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300">Designation</label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Briefcase className="h-5 w-5 text-secondary-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="input-field pl-10 bg-white/50 dark:bg-surface-800/50"
                      placeholder="Developer"
                    />
                  </div>
                </div>
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300">Email</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-secondary-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="input-field pl-10 bg-surface-100 dark:bg-surface-800 cursor-not-allowed opacity-70"
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
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-10 bg-white/50 dark:bg-surface-800/50"
                    placeholder="••••••••"
                    minLength={6}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep('email-check'); setError(''); }}
                  className="flex-1 btn-secondary py-2.5 text-base"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 btn-primary py-2.5 text-base relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? 'Creating...' : 'Create Account'}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
