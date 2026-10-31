import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Mail, Eye, EyeOff, ArrowLeft,
  Check, Store, HeartHandshake, Truck, ShieldCheck,
  Clock, XCircle, AlertTriangle, UserX
} from 'lucide-react';
import toast from 'react-hot-toast';
import ThemeToggle from '../../components/common/ThemeToggle';
import Logo from '../../components/common/Logo';
import GoogleAuthButton from '../../components/common/GoogleAuthButton';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    email: location.state?.email || sessionStorage.getItem('foodrescue_pending_email') || '',
    password: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [statusNotice, setStatusNotice] = useState(null);

  useEffect(() => {
    if (location.state?.email) {
      setForm((prev) => ({ ...prev, email: location.state.email }));
    }
    if (location.state?.approved) {
      toast.success(location.state.message || 'Your account is approved! Please log in with your credentials.');
    }
  }, [location.state]);

  const handleSubmit = async (e, customEmail = null, customPass = null) => {
    if (e) e.preventDefault();
    const emailToUse = customEmail || form.email;
    const passToUse = customPass || form.password;

    setStatusNotice(null);
    setLoading(true);
    try {
      const user = await login(emailToUse, passToUse);
      toast.success(`Welcome back, ${user.full_name}!`);
      navigate('/dashboard');
    } catch (err) {
      const errorData = err.response?.data || {};
      const msg = errorData.message || 'Login failed. Please check credentials.';

      if (
        errorData.code === 'ACCOUNT_PENDING_VERIFICATION' ||
        msg.toLowerCase().includes('awaiting admin verification')
      ) {
        sessionStorage.setItem('foodrescue_pending_email', emailToUse.trim());
        toast.error('Account is awaiting admin verification.');
        navigate('/verification-pending', {
          state: {
            email: emailToUse.trim(),
            status: 'PENDING',
            verification_status: 'PENDING',
            full_name: errorData.details?.full_name || '',
            role: errorData.details?.role || '',
          },
        });
        return;
      } else if (
        errorData.code === 'ACCOUNT_REJECTED' ||
        msg.toLowerCase().includes('rejected') ||
        msg.toLowerCase().includes('not approved')
      ) {
        sessionStorage.setItem('foodrescue_pending_email', emailToUse.trim());
        setStatusNotice({
          type: 'rejected',
          title: 'Registration Not Approved',
          message: msg,
          email: emailToUse.trim(),
        });
        toast.error('Registration was not approved.');
      } else if (
        errorData.code === 'ACCOUNT_SUSPENDED' ||
        msg.toLowerCase().includes('suspended')
      ) {
        sessionStorage.setItem('foodrescue_pending_email', emailToUse.trim());
        setStatusNotice({
          type: 'suspended',
          title: 'Account Suspended',
          message: 'Your account has been suspended. Please contact support.',
          email: emailToUse.trim(),
        });
        toast.error('Account has been suspended.');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (email, password) => {
    setForm({ email, password });
    handleSubmit(null, email, password);
  };

  return (
    <div className="min-h-screen w-full bg-[#F9FAFB] dark:bg-[#050505] text-neutral-900 dark:text-white flex items-center justify-center p-3.5 sm:p-6 font-sans transition-colors duration-200">
      <div className="w-full max-w-[460px] bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] rounded-2xl sm:rounded-[28px] p-5 sm:p-9 shadow-xl shadow-black/5 dark:shadow-black/80 space-y-5 sm:space-y-6 animate-fade-in relative transition-colors">
        
        {/* Back to Home pill & Theme Toggle */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-[#1b1b1f] dark:hover:bg-[#26262c] text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
          <ThemeToggle variant="icon" />
        </div>

        {/* Center Official Logo Badge */}
        <div className="text-center pt-1">
          <div className="flex justify-center mb-3">
            <Logo to="/" size="xl" showText={false} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Welcome Back</h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Enter your credentials to access your FoodRescue account
          </p>
        </div>

        {/* Quick Demo Logins Bar */}
        <div className="p-3 bg-neutral-50 dark:bg-[#0a0a0c] rounded-2xl border border-neutral-200 dark:border-[#1f1f23] space-y-2">
          <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 dark:text-neutral-400 px-1">
            ⚡ Quick 1-Click Demo Logins
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickLogin('provider@foodrescue.org', 'password123')}
              className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-[#141416] hover:bg-neutral-100 dark:hover:bg-[#1e1e24] border border-neutral-200 dark:border-[#232328] text-left transition-all cursor-pointer"
            >
              <Store className="w-3.5 h-3.5 text-neutral-800 dark:text-white flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-neutral-900 dark:text-white leading-tight">Provider</div>
                <div className="text-[10px] text-neutral-500">Post Food</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('ngo@foodrescue.org', 'password123')}
              className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-[#141416] hover:bg-neutral-100 dark:hover:bg-[#1e1e24] border border-neutral-200 dark:border-[#232328] text-left transition-all cursor-pointer"
            >
              <HeartHandshake className="w-3.5 h-3.5 text-neutral-800 dark:text-white flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-neutral-900 dark:text-white leading-tight">NGO / Shelter</div>
                <div className="text-[10px] text-neutral-500">Claim Food</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('volunteer@foodrescue.org', 'password123')}
              className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-[#141416] hover:bg-neutral-100 dark:hover:bg-[#1e1e24] border border-neutral-200 dark:border-[#232328] text-left transition-all cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5 text-neutral-800 dark:text-white flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-neutral-900 dark:text-white leading-tight">Volunteer</div>
                <div className="text-[10px] text-neutral-500">Deliveries</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('admin@foodrescue.org', 'password123')}
              className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-[#141416] hover:bg-neutral-100 dark:hover:bg-[#1e1e24] border border-neutral-200 dark:border-[#232328] text-left transition-all cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-800 dark:text-white flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-neutral-900 dark:text-white leading-tight">Admin</div>
                <div className="text-[10px] text-neutral-500">Management</div>
              </div>
            </button>
          </div>
        </div>

        {/* Status Notice Banner if account is Pending, Rejected, or Suspended */}
        {statusNotice && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 animate-fade-in ${
              statusNotice.type === 'pending'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                : statusNotice.type === 'rejected'
                ? 'bg-red-500/10 border-red-500/30 text-red-500'
                : 'bg-neutral-500/10 border-neutral-500/30 text-neutral-400'
            }`}
          >
            {statusNotice.type === 'pending' ? (
              <Clock className="w-4 h-4 flex-shrink-0 mt-0.5 animate-spin" />
            ) : statusNotice.type === 'rejected' ? (
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            ) : (
              <UserX className="w-4 h-4 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold text-neutral-900 dark:text-white">
                {statusNotice.title}
              </div>
              <p className="text-neutral-600 dark:text-neutral-300 mt-0.5 leading-relaxed">
                {statusNotice.message}
              </p>
              {statusNotice.email && (
                <Link
                  to={`/verification-pending?email=${encodeURIComponent(statusNotice.email)}`}
                  className="inline-block mt-2 font-semibold underline text-[11px] hover:opacity-80 transition-opacity"
                >
                  View Verification Details & Status →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Continue with Google */}
        <div className="space-y-4 pt-1">
          <GoogleAuthButton mode="signin" />

          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-neutral-200 dark:border-[#232328] w-full" />
            <span className="bg-white dark:bg-[#121214] px-3 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider absolute">
              or continue with email
            </span>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="email"
                id="login-email"
                name="email"
                autoComplete="username"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#232328] focus:border-neutral-900 dark:focus:border-white focus:outline-none text-neutral-900 dark:text-white placeholder:text-neutral-400 rounded-xl px-4 py-3 pl-10 text-sm transition-all"
                placeholder="name@example.com"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Password
              </label>
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  toast('Demo accounts use password: password123', { icon: '🔑' });
                }}
                className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white underline underline-offset-2 transition-colors"
              >
                Forgot?
              </a>
            </div>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                id="login-password"
                name="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#232328] focus:border-neutral-900 dark:focus:border-white focus:outline-none text-neutral-900 dark:text-white placeholder:text-neutral-400 rounded-xl px-4 py-3 pl-4 pr-10 text-sm transition-all"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember this device checkbox */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setRememberMe(!rememberMe)}
              className={`w-4 h-4 rounded-[5px] flex items-center justify-center transition-colors cursor-pointer ${
                rememberMe
                  ? 'bg-neutral-900 text-white dark:bg-[#39FF14] dark:text-black'
                  : 'border border-neutral-300 dark:border-[#38383f] bg-neutral-100 dark:bg-[#0c0c0e]'
              }`}
            >
              {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
            </button>
            <span
              onClick={() => setRememberMe(!rememberMe)}
              className="text-xs text-neutral-600 dark:text-neutral-300 font-medium select-none cursor-pointer"
            >
              Remember this device
            </span>
          </div>

          {/* Sign in button */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-center shadow-md active:scale-[0.99] disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Create one link */}
        <div className="text-center pt-2">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-neutral-900 dark:text-white font-semibold underline underline-offset-4 hover:underline transition-colors"
            >
              Create one here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
