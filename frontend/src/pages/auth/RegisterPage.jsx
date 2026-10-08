import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Leaf, Mail, Lock, User, Phone, Building2, MapPin, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const roleOptions = [
  { value: 'provider', label: 'Food Provider', desc: 'Restaurants, caterers, groceries', icon: '🍽️' },
  { value: 'ngo', label: 'NGO / Charity', desc: 'Receive & distribute food', icon: '🤝' },
  { value: 'volunteer', label: 'Volunteer', desc: 'Pick up & deliver food', icon: '🚗' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '', full_name: '', phone: '', role: '',
    // Provider
    business_name: '', business_type: '', address: '', latitude: 0, longitude: 0,
    // NGO
    organization_name: '', registration_no: '', capacity: '',
    // Volunteer
    vehicle_type: '', max_distance_km: 10,
  });

  const update = (field, value) => setForm({ ...form, [field]: value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      if (payload.capacity) payload.capacity = parseInt(payload.capacity, 10);

      // Use dummy coords for now (would use browser geolocation in production)
      if (!payload.latitude) {
        payload.latitude = 28.6139;
        payload.longitude = 77.209;
      }

      if (form.role === 'ngo') {
        payload.organization_name = payload.organization_name || payload.full_name;
        payload.address = payload.address || 'To be updated';
      }

      const user = await register(payload);
      toast.success(`Welcome, ${user.full_name}! Account created.`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-4">
      <div className="w-full max-w-xl animate-slide-up">
        <div className="glass-card p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-surface-900">Create Account</h1>
              <p className="text-sm text-surface-500">Step {step} of 2</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex gap-2 mb-8">
            <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-primary-500' : 'bg-surface-200'} transition-colors`} />
            <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-primary-500' : 'bg-surface-200'} transition-colors`} />
          </div>

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-5 animate-fade-in">
                <h3 className="font-semibold text-lg text-surface-800 mb-4">Choose your role</h3>
                <div className="grid gap-3">
                  {roleOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update('role', opt.value)}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                        form.role === opt.value
                          ? 'border-primary-500 bg-primary-50 shadow-sm'
                          : 'border-surface-200 hover:border-surface-300 bg-white'
                      }`}
                    >
                      <span className="text-2xl">{opt.icon}</span>
                      <div>
                        <p className="font-semibold text-surface-800">{opt.label}</p>
                        <p className="text-sm text-surface-500">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-surface-700 mb-1.5 block">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                      <input type="text" value={form.full_name} onChange={(e) => update('full_name', e.target.value)}
                        className="input-field pl-10" placeholder="Your full name" required />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-surface-700 mb-1.5 block">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                      <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)}
                        className="input-field pl-10" placeholder="you@example.com" required />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-surface-700 mb-1.5 block">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                      <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)}
                        className="input-field pl-10" placeholder="+91 98765 43210" />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-surface-700 mb-1.5 block">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                      <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)}
                        className="input-field pl-10" placeholder="Min 8 characters" required minLength={8} />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!form.role || !form.full_name || !form.email || !form.password}
                  onClick={() => setStep(2)}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5 animate-fade-in">
                <button type="button" onClick={() => setStep(1)} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  ← Back to basics
                </button>

                {form.role === 'provider' && (
                  <>
                    <h3 className="font-semibold text-lg text-surface-800">Provider Details</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-surface-700 mb-1.5 block">Business Name</label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                          <input type="text" value={form.business_name} onChange={(e) => update('business_name', e.target.value)}
                            className="input-field pl-10" placeholder="Restaurant / Store name" required />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-surface-700 mb-1.5 block">Business Type</label>
                        <select value={form.business_type} onChange={(e) => update('business_type', e.target.value)}
                          className="input-field">
                          <option value="">Select type</option>
                          <option value="restaurant">Restaurant</option>
                          <option value="grocery">Grocery Store</option>
                          <option value="catering">Catering Service</option>
                          <option value="bakery">Bakery</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-surface-700 mb-1.5 block">Address</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                          <input type="text" value={form.address} onChange={(e) => update('address', e.target.value)}
                            className="input-field pl-10" placeholder="Full address" required />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {form.role === 'ngo' && (
                  <>
                    <h3 className="font-semibold text-lg text-surface-800">NGO Details</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-surface-700 mb-1.5 block">Organization Name</label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                          <input type="text" value={form.organization_name} onChange={(e) => update('organization_name', e.target.value)}
                            className="input-field pl-10" placeholder="NGO name" required />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-surface-700 mb-1.5 block">Registration Number</label>
                        <input type="text" value={form.registration_no} onChange={(e) => update('registration_no', e.target.value)}
                          className="input-field" placeholder="Optional" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-surface-700 mb-1.5 block">Address</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                          <input type="text" value={form.address} onChange={(e) => update('address', e.target.value)}
                            className="input-field pl-10" placeholder="Full address" required />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-surface-700 mb-1.5 block">Daily Capacity (servings)</label>
                        <input type="number" value={form.capacity} onChange={(e) => update('capacity', e.target.value)}
                          className="input-field" placeholder="e.g. 200" />
                      </div>
                    </div>
                  </>
                )}

                {form.role === 'volunteer' && (
                  <>
                    <h3 className="font-semibold text-lg text-surface-800">Volunteer Details</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-surface-700 mb-1.5 block">Vehicle Type</label>
                        <select value={form.vehicle_type} onChange={(e) => update('vehicle_type', e.target.value)}
                          className="input-field">
                          <option value="">Select vehicle</option>
                          <option value="bike">Bike / Scooter</option>
                          <option value="car">Car</option>
                          <option value="on_foot">On Foot</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-surface-700 mb-1.5 block">Max Delivery Distance (km)</label>
                        <input type="number" value={form.max_distance_km} onChange={(e) => update('max_distance_km', parseFloat(e.target.value))}
                          className="input-field" min="1" max="50" />
                      </div>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 mt-6"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Create Account <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            )}
          </form>

          <p className="text-center mt-6 text-sm text-surface-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
