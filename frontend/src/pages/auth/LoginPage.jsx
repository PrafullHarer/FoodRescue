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
    <div className="min-h-screen w-full bg-[#0d0c0b] flex items-center justify-center p-3.5 sm:p-6 font-sans">
      <div className="w-full max-w-[460px] bg-[#141312] border border-[#262320] rounded-2xl sm:rounded-[28px] p-5 sm:p-9 shadow-2xl shadow-black/90 space-y-5 sm:space-y-6 animate-fade-in relative">
        
        {/* Back to Home pill */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1c1a18] hover:bg-[#262320] text-xs font-medium text-[#ECB65F] hover:text-white transition-all border border-[#262320]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Center Lock Icon Badge */}
        <div className="text-center pt-2">
          <div className="w-14 h-14 bg-gradient-to-br from-[#E89951] to-[#ECB65F] rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-[#E89951]/20 mb-4">
            <Lock className="w-6 h-6 text-[#0d0c0b] stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h1>
          <p className="text-xs sm:text-sm text-[#cfc6ba] mt-1">
            Enter your credentials to access FoodRescue
          </p>
        </div>

        {/* Quick Demo Logins Bar */}
        <div className="p-3 bg-[#100f0e] rounded-2xl border border-[#262320] space-y-2">
          <div className="text-[10px] uppercase font-bold tracking-wider text-[#ECB65F] px-1 flex items-center gap-1.5">
            <span>⚡ Quick 1-Click Demo Logins</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickLogin('provider@foodrescue.org', 'password123')}
              className="flex items-center gap-2 p-2 rounded-xl bg-[#1c1a18] hover:bg-[#262320] border border-[#262320] hover:border-[#E89951]/50 text-left transition-all group"
            >
              <Store className="w-3.5 h-3.5 text-[#E89951] flex-shrink-0 group-hover:scale-110 transition-transform" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white leading-tight">Provider</div>
                <div className="text-[10px] text-[#cfc6ba]/70">Post Food</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('ngo@foodrescue.org', 'password123')}
              className="flex items-center gap-2 p-2 rounded-xl bg-[#1c1a18] hover:bg-[#262320] border border-[#262320] hover:border-[#ECB65F]/50 text-left transition-all group"
            >
              <HeartHandshake className="w-3.5 h-3.5 text-[#ECB65F] flex-shrink-0 group-hover:scale-110 transition-transform" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white leading-tight">NGO / Shelter</div>
                <div className="text-[10px] text-[#cfc6ba]/70">Claim Food</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('volunteer@foodrescue.org', 'password123')}
              className="flex items-center gap-2 p-2 rounded-xl bg-[#1c1a18] hover:bg-[#262320] border border-[#262320] hover:border-[#A5CF83]/50 text-left transition-all group"
            >
              <Truck className="w-3.5 h-3.5 text-[#A5CF83] flex-shrink-0 group-hover:scale-110 transition-transform" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white leading-tight">Volunteer</div>
                <div className="text-[10px] text-[#cfc6ba]/70">Deliveries</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('admin@foodrescue.org', 'password123')}
              className="flex items-center gap-2 p-2 rounded-xl bg-[#1c1a18] hover:bg-[#262320] border border-[#262320] hover:border-[#F0E76F]/50 text-left transition-all group"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#F0E76F] flex-shrink-0 group-hover:scale-110 transition-transform" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white leading-tight">Admin</div>
                <div className="text-[10px] text-[#cfc6ba]/70">Management</div>
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
                className="w-full bg-[#100f0e] border border-[#262320] focus:border-[#E89951] focus:outline-none focus:ring-1 focus:ring-[#E89951] text-white placeholder-neutral-500 rounded-xl px-4 py-3 pl-10 text-sm transition-all"
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
                className="text-xs text-[#ECB65F] hover:text-white underline underline-offset-2 transition-colors"
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
                className="w-full bg-[#100f0e] border border-[#262320] focus:border-[#E89951] focus:outline-none focus:ring-1 focus:ring-[#E89951] text-white placeholder-neutral-500 rounded-xl px-4 py-3 pl-10 pr-10 text-sm transition-all"
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
                rememberMe ? 'bg-gradient-to-r from-[#E89951] to-[#ECB65F] text-[#0d0c0b]' : 'border border-[#3c3732] bg-[#100f0e]'
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
            className="w-full bg-gradient-to-r from-[#E89951] to-[#ECB65F] hover:from-[#f0a35e] hover:to-[#f4bf6c] text-[#0d0c0b] font-bold py-3.5 rounded-xl text-sm transition-all duration-150 flex items-center justify-center shadow-lg shadow-[#E89951]/20 active:scale-[0.99] disabled:opacity-50 mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-[#0d0c0b]/30 border-t-[#0d0c0b] rounded-full animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Create one link */}
        <div className="text-center pt-2">
          <p className="text-xs text-[#cfc6ba]">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-[#ECB65F] font-semibold underline underline-offset-4 hover:text-white transition-colors"
            >
              Create one here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
