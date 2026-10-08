import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Leaf, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, HeartHandshake, Truck, Store } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
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
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white animate-float"
              style={{
                width: `${60 + i * 30}px`,
                height: `${60 + i * 30}px`,
                top: `${10 + i * 15}%`,
                left: `${5 + i * 16}%`,
                animationDelay: `${i * 0.8}s`,
                animationDuration: `${5 + i}s`,
              }}
            />
          ))}
        </div>
        <div className="relative z-10 text-white max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-8">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4">FoodRescue</h1>
          <p className="text-lg text-white/80 leading-relaxed">
            Connecting food providers with NGOs and volunteers to rescue surplus food
            and feed communities in need.
          </p>
          <div className="mt-12 space-y-4">
            {[
              { num: '10K+', label: 'Meals Rescued' },
              { num: '500+', label: 'Active Partners' },
              { num: '50+', label: 'Cities Covered' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center font-bold text-lg">
                  {stat.num}
                </div>
                <span className="text-white/70">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-50">
        <div className="w-full max-w-md animate-slide-up space-y-6">
          <div className="lg:hidden flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-xl text-surface-900">FoodRescue</h1>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-surface-900">Welcome back</h2>
            <p className="text-surface-500 text-sm mt-1">Sign in to your account to continue</p>
          </div>

          {/* Quick Demo Logins */}
          <div className="p-4 bg-white rounded-2xl border border-surface-200 shadow-sm space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-surface-400">⚡ 1-Click Demo Accounts</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('provider@foodrescue.org', 'password123')}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-surface-200 hover:border-emerald-500 hover:bg-emerald-50/60 text-left transition-all group"
              >
                <Store className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-surface-800 group-hover:text-emerald-700">Food Provider</div>
                  <div className="text-[10px] text-surface-400 truncate">Post surplus</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('ngo@foodrescue.org', 'password123')}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-surface-200 hover:border-emerald-500 hover:bg-emerald-50/60 text-left transition-all group"
              >
                <HeartHandshake className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-surface-800 group-hover:text-emerald-700">NGO / Shelter</div>
                  <div className="text-[10px] text-surface-400 truncate">Claim food</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('volunteer@foodrescue.org', 'password123')}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-surface-200 hover:border-emerald-500 hover:bg-emerald-50/60 text-left transition-all group"
              >
                <Truck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-surface-800 group-hover:text-emerald-700">Volunteer</div>
                  <div className="text-[10px] text-surface-400 truncate">Pick & deliver</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin@foodrescue.org', 'password123')}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-surface-200 hover:border-emerald-500 hover:bg-emerald-50/60 text-left transition-all group"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-surface-800 group-hover:text-emerald-700">Administrator</div>
                  <div className="text-[10px] text-surface-400 truncate">Platform admin</div>
                </div>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-surface-600 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input pl-10"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-surface-600 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-surface-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 font-semibold hover:text-primary-700">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
