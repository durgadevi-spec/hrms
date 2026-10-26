import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Mail, Lock, User, Hash, Briefcase, ArrowRight, CheckCircle2, Loader2, Eye, EyeOff 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ThemeToggle } from '../components/ThemeToggle';
import { NetworkCanvas } from '../components/NetworkCanvas';
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
  const [showActivationPassword, setShowActivationPassword] = useState(false);

  // Full signup fields (new user)
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [designation, setDesignation] = useState('');
  const [showFullPassword, setShowFullPassword] = useState(false);

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
          title="Join CTI HRMS"
          subtitle="Set up your official employee profile and get instant access to attendance, leaves, IT assets, and company updates."
        />

        {/* Right Side: Activation / Signup Form */}
        <div className="w-full md:w-1/2 p-8 sm:p-10 flex flex-col justify-center bg-white dark:bg-surface-900">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-secondary-900 dark:text-white tracking-tight">
              {step === 'activate' ? `Welcome, ${activationFirstName}!` : 'Join CTI'}
            </h1>
            <p className="text-xs sm:text-sm text-secondary-500 dark:text-surface-400 mt-1 mb-6">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-500 transition-colors">
                Sign in here
              </Link>
            </p>

            {error && (
              <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-xs text-red-700 dark:text-red-300 font-medium text-center">{error}</p>
              </div>
            )}

            {/* ─── Step 1: Work Email Check ──────────────────────────── */}
            {step === 'email-check' && (
              <form onSubmit={handleEmailCheck} className="space-y-4">
                <p className="text-xs text-secondary-600 dark:text-surface-400 leading-relaxed">
                  Enter your work email to get started. If you were added by your admin, we'll recognize you automatically.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-secondary-700 dark:text-surface-300 mb-1">
                    Work Email Address <span className="text-blue-500">*</span>
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
                      autoFocus
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isChecking || !email.trim()}
                    className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isChecking ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Checking...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ─── Step 2a: Activate Pre-Provisioned Account ─────────── */}
            {step === 'activate' && (
              <form onSubmit={handleActivate} className="space-y-4">
                <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">Account found!</p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Verify your Employee ID and choose your password to activate.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary-700 dark:text-surface-300 mb-1">
                    Work Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      readOnly
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-surface-100 dark:bg-surface-800 cursor-not-allowed opacity-75 border border-surface-200 dark:border-surface-700 rounded-xl text-secondary-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary-700 dark:text-surface-300 mb-1">
                    Employee ID <span className="text-blue-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary-400">
                      <Hash className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={activationEmployeeId}
                      onChange={(e) => setActivationEmployeeId(e.target.value)}
                      placeholder="e.g. EMP004"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 rounded-xl text-secondary-900 dark:text-white placeholder:text-secondary-400 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary-700 dark:text-surface-300 mb-1">
                    New Password <span className="text-blue-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showActivationPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={activationNewPassword}
                      onChange={(e) => setActivationNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full pl-10 pr-10 py-2.5 text-sm bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 rounded-xl text-secondary-900 dark:text-white placeholder:text-secondary-400 focus:outline-none focus:border-primary-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowActivationPassword(!showActivationPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary-400 hover:text-secondary-600"
                    >
                      {showActivationPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary-700 dark:text-surface-300 mb-1">
                    Confirm Password <span className="text-blue-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-secondary-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showActivationPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={activationConfirmPassword}
                      onChange={(e) => setActivationConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-10 pr-10 py-2.5 text-sm bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 rounded-xl text-secondary-900 dark:text-white placeholder:text-secondary-400 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('email-check')}
                    className="w-1/3 py-2.5 px-4 rounded-xl text-xs font-semibold text-secondary-600 dark:text-surface-300 border border-surface-200 dark:border-surface-700 hover:bg-surface-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-2/3 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Activate & Enter'}
                  </button>
                </div>
              </form>
            )}

            {/* ─── Step 2b: Full Signup ──────────────────────────────── */}
            {step === 'full-signup' && (
              <form onSubmit={handleFullSignup} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-secondary-700 dark:text-surface-300 mb-1">
                      First Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-3.5 w-3.5 text-secondary-400" />
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        className="w-full pl-8 pr-3 py-2 text-xs bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-secondary-700 dark:text-surface-300 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="w-full px-3 py-2 text-xs bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-secondary-700 dark:text-surface-300 mb-1">
                      Employee ID *
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-3 h-3.5 w-3.5 text-secondary-400" />
                      <input
                        type="text"
                        required
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        placeholder="EMP001"
                        className="w-full pl-8 pr-3 py-2 text-xs bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-secondary-700 dark:text-surface-300 mb-1">
                      Designation *
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-3 h-3.5 w-3.5 text-secondary-400" />
                      <input
                        type="text"
                        required
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="Developer"
                        className="w-full pl-8 pr-3 py-2 text-xs bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary-700 dark:text-surface-300 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-3.5 w-3.5 text-secondary-400" />
                    <input
                      type={showFullPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full pl-8 pr-9 py-2 text-xs bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFullPassword(!showFullPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary-400"
                    >
                      {showFullPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('email-check')}
                    className="w-1/3 py-2 px-3 rounded-xl text-xs font-semibold text-secondary-600 dark:text-surface-300 border border-surface-200"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-2/3 py-2 px-3 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md flex items-center justify-center gap-1.5"
                  >
                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create Account'}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
