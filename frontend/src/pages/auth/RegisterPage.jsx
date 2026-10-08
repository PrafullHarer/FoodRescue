import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Leaf, Mail, Lock, User, Phone, Building2, MapPin, ArrowRight, Truck } from 'lucide-react';
import toast from 'react-hot-toast';

const roleOptions = [
  { value: 'provider', label: 'Food Provider', desc: 'Restaurants, caterers, bakeries, grocery stores', icon: '🍽️' },
  { value: 'ngo', label: 'NGO / Charity', desc: 'Shelters & charity distribution centers', icon: '🤝' },
  { value: 'volunteer', label: 'Volunteer', desc: 'Pick up & deliver rescued food parcels', icon: '🚗' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: '',
    // Provider
    business_name: '',
    business_type: 'restaurant',
    address: '',
    // NGO
    organization_name: '',
    registration_no: '',
    capacity: 200,
    // Volunteer
    vehicle_type: 'car',
    max_distance_km: 15,
  });

  const update = (field, value) => setForm({ ...form, [field]: value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        phone: form.phone ? form.phone.trim() : undefined,
        role: form.role,
        latitude: 28.6139,
        longitude: 77.2090,
      };

      if (form.role === 'provider') {
        payload.business_name = form.business_name || form.full_name;
        payload.business_type = form.business_type || 'restaurant';
        payload.address = form.address || 'Local Market Area';
      } else if (form.role === 'ngo') {
        payload.organization_name = form.organization_name || form.full_name;
        payload.registration_no = form.registration_no || 'NGO-PENDING';
        payload.address = form.address || 'Community Shelter Blvd';
        payload.capacity = parseInt(form.capacity, 10) || 100;
      } else if (form.role === 'volunteer') {
        payload.vehicle_type = form.vehicle_type || 'car';
        payload.max_distance_km = parseFloat(form.max_distance_km) || 10;
      }

      const user = await register(payload);
      toast.success(`Welcome, ${user.full_name || 'User'}! Account created successfully.`);
      navigate('/dashboard');
    } catch (err) {
      const errorMsg =
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        'Registration failed. Please check form inputs.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-4">
      <div className="w-full max-w-xl animate-slide-up">
        <div className="glass-card p-8 shadow-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-surface-900">Join FoodRescue</h1>
              <p className="text-xs text-surface-500 font-medium">Step {step} of 2</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex gap-2 mb-6">
            <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-primary-500' : 'bg-surface-200'} transition-colors`} />
            <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-primary-500' : 'bg-surface-200'} transition-colors`} />
          </div>

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="font-semibold text-base text-surface-800">Select your account type</h3>
                <div className="grid gap-2.5">
                  {roleOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update('role', opt.value)}
                      className={`flex items-center gap-3.5 p-3.5 rounded-xl border-2 transition-all text-left ${
                        form.role === opt.value
                          ? 'border-primary-500 bg-primary-50/60 shadow-sm'
                          : 'border-surface-200 hover:border-surface-300 bg-white'
                      }`}
                    >
                      <span className="text-2xl flex-shrink-0">{opt.icon}</span>
                      <div>
                        <p className="font-semibold text-sm text-surface-900">{opt.label}</p>
                        <p className="text-xs text-surface-500">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-surface-600 mb-1 block">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                      <input
                        type="text"
                        value={form.full_name}
                        onChange={(e) => update('full_name', e.target.value)}
                        className="input pl-10"
                        placeholder="Your full name"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-surface-600 mb-1 block">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                        className="input pl-10"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-surface-600 mb-1 block">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => update('phone', e.target.value)}
                        className="input pl-10"
                        placeholder="+1 555-0199"
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-surface-600 mb-1 block">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                      <input
                        type="password"
                        value={form.password}
                        onChange={(e) => update('password', e.target.value)}
                        className="input pl-10"
                        placeholder="Min 6 characters"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!form.role || !form.full_name || !form.email || !form.password}
                  onClick={() => setStep(2)}
                  className="btn btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-40"
                >
                  Continue to Profile Details <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-primary-600 hover:text-primary-700 font-semibold"
                >
                  ← Back to account credentials
                </button>

                {form.role === 'provider' && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-base text-surface-800">Provider Organization Info</h3>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-surface-600 mb-1 block">Business Name</label>
                      <input
                        type="text"
                        value={form.business_name}
                        onChange={(e) => update('business_name', e.target.value)}
                        className="input"
                        placeholder="e.g. Daily Bread Bakery & Deli"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-surface-600 mb-1 block">Business Category</label>
                      <select
                        value={form.business_type}
                        onChange={(e) => update('business_type', e.target.value)}
                        className="input"
                      >
                        <option value="restaurant">Restaurant</option>
                        <option value="bakery">Bakery / Patisserie</option>
                        <option value="grocery">Supermarket / Grocery</option>
                        <option value="catering">Catering / Events</option>
                        <option value="other">Other Food Donor</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-surface-600 mb-1 block">Pickup Address</label>
                      <input
                        type="text"
                        value={form.address}
                        onChange={(e) => update('address', e.target.value)}
                        className="input"
                        placeholder="e.g. 100 Main St, Suite 4"
                        required
                      />
                    </div>
                  </div>
                )}

                {form.role === 'ngo' && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-base text-surface-800">NGO / Shelter Organization Info</h3>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-surface-600 mb-1 block">Organization Name</label>
                      <input
                        type="text"
                        value={form.organization_name}
                        onChange={(e) => update('organization_name', e.target.value)}
                        className="input"
                        placeholder="e.g. City Hope Shelter"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-surface-600 mb-1 block">Registration / Tax ID</label>
                      <input
                        type="text"
                        value={form.registration_no}
                        onChange={(e) => update('registration_no', e.target.value)}
                        className="input"
                        placeholder="e.g. NGO-99212 (Optional)"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-surface-600 mb-1 block">Distribution Facility Address</label>
                      <input
                        type="text"
                        value={form.address}
                        onChange={(e) => update('address', e.target.value)}
                        className="input"
                        placeholder="e.g. 500 Community Ave"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-surface-600 mb-1 block">Daily Meal Capacity</label>
                      <input
                        type="number"
                        value={form.capacity}
                        onChange={(e) => update('capacity', e.target.value)}
                        className="input"
                        placeholder="e.g. 300 servings"
                      />
                    </div>
                  </div>
                )}

                {form.role === 'volunteer' && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-base text-surface-800">Volunteer Driver Profile</h3>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-surface-600 mb-1 block">Primary Transport Vehicle</label>
                      <select
                        value={form.vehicle_type}
                        onChange={(e) => update('vehicle_type', e.target.value)}
                        className="input"
                      >
                        <option value="car">Personal Car / SUV</option>
                        <option value="van">Van / Small Truck</option>
                        <option value="bike">Bicycle / E-Bike</option>
                        <option value="scooter">Motorcycle / Scooter</option>
                        <option value="on_foot">On Foot (Walking distance)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-surface-600 mb-1 block">Max Delivery Radius (km)</label>
                      <input
                        type="number"
                        value={form.max_distance_km}
                        onChange={(e) => update('max_distance_km', e.target.value)}
                        className="input"
                        min="1"
                        max="50"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-60 mt-4"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Complete Registration & Sign In <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            )}
          </form>

          <p className="text-center mt-6 text-xs text-surface-500">
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
