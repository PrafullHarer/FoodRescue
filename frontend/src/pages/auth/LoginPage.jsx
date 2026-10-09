import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Lock, Mail, Eye, EyeOff, ArrowLeft,
  Check, Store, HeartHandshake, Truck, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e, customEmail = null, customPass = null) => {
    if (e) e.preventDefault();
    const emailToUse = customEmail || form.email;
    const passToUse = customPass || form.password;

    setLoading(true);
    try {
      const user = await login(emailToUse, passToUse);
      toast.success(`Welcome back, ${user.full_name}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (email, password) => {
    setForm({ email, password });
    handleSubmit(null, email, password);
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] flex items-center justify-center p-3.5 sm:p-6 font-sans">
      <div className="w-full max-w-[460px] bg-[#121214] border border-[#232328] rounded-2xl sm:rounded-[28px] p-5 sm:p-9 shadow-2xl shadow-black/80 space-y-5 sm:space-y-6 animate-fade-in relative">
        
        {/* Back to Home pill */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1b1b1f] hover:bg-[#26262c] text-xs font-medium text-neutral-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Center Lock Icon Badge */}
        <div className="text-center pt-2">
          <div className="w-14 h-14 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-white/10 mb-4">
            <Lock className="w-6 h-6 text-black stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Enter your credentials to access your account
          </p>
        </div>

        {/* Quick Demo Logins Bar */}
        <div className="p-3 bg-[#0a0a0c] rounded-2xl border border-[#1f1f23] space-y-2">
          <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 px-1">
            ⚡ Quick 1-Click Demo Logins
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickLogin('provider@foodrescue.org', 'password123')}
              className="flex items-center gap-2 p-2 rounded-xl bg-[#141416] hover:bg-[#1e1e24] border border-[#232328] hover:border-neutral-500 text-left transition-all"
            >
              <Store className="w-3.5 h-3.5 text-white flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white leading-tight">Provider</div>
                <div className="text-[10px] text-neutral-500">Post Food</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('ngo@foodrescue.org', 'password123')}
              className="flex items-center gap-2 p-2 rounded-xl bg-[#141416] hover:bg-[#1e1e24] border border-[#232328] hover:border-neutral-500 text-left transition-all"
            >
              <HeartHandshake className="w-3.5 h-3.5 text-white flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white leading-tight">NGO / Shelter</div>
                <div className="text-[10px] text-neutral-500">Claim Food</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('volunteer@foodrescue.org', 'password123')}
              className="flex items-center gap-2 p-2 rounded-xl bg-[#141416] hover:bg-[#1e1e24] border border-[#232328] hover:border-neutral-500 text-left transition-all"
            >
              <Truck className="w-3.5 h-3.5 text-white flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white leading-tight">Volunteer</div>
                <div className="text-[10px] text-neutral-500">Deliveries</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('admin@foodrescue.org', 'password123')}
              className="flex items-center gap-2 p-2 rounded-xl bg-[#141416] hover:bg-[#1e1e24] border border-[#232328] hover:border-neutral-500 text-left transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-white flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white leading-tight">Admin</div>
                <div className="text-[10px] text-neutral-500">Management</div>
              </div>
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-neutral-300 block mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="email"
                id="login-email"
                name="email"
                autoComplete="username"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-[#0c0c0e] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white placeholder-neutral-500 rounded-xl px-4 py-3 pl-10 text-sm transition-all"
                placeholder="name@example.com"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-neutral-300">
                Password
              </label>
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  toast('Demo accounts use password: password123', { icon: '🔑' });
                }}
                className="text-xs text-neutral-400 hover:text-white underline underline-offset-2 transition-colors"
              >
                Forgot?
              </a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type={showPass ? 'text' : 'password'}
                id="login-password"
                name="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-[#0c0c0e] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white placeholder-neutral-500 rounded-xl px-4 py-3 pl-10 pr-10 text-sm transition-all"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
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
              className={`w-4 h-4 rounded-[5px] flex items-center justify-center transition-colors ${
                rememberMe ? 'bg-white text-black' : 'border border-[#38383f] bg-[#0c0c0e]'
              }`}
            >
              {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
            </button>
            <span
              onClick={() => setRememberMe(!rememberMe)}
              className="text-xs text-neutral-300 font-medium select-none cursor-pointer"
            >
              Remember this device
            </span>
          </div>

          {/* Sign in button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-neutral-200 text-black font-semibold py-3.5 rounded-xl text-sm transition-all duration-150 flex items-center justify-center shadow-lg shadow-white/5 active:scale-[0.99] disabled:opacity-50 mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Create one link */}
        <div className="text-center pt-2">
          <p className="text-xs text-neutral-400">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-white font-semibold underline underline-offset-4 hover:text-neutral-200 transition-colors"
            >
              Create one here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
