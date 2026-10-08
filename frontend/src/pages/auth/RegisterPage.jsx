import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  UserPlus, Mail, Lock, User, Phone, Building2, MapPin,
  ArrowLeft, ArrowRight, Eye, EyeOff, Store, HeartHandshake, Truck
} from 'lucide-react';
import toast from 'react-hot-toast';

const roleOptions = [
  {
    value: 'provider',
    label: 'Food Provider',
    desc: 'Restaurants, caterers, bakeries & groceries',
    icon: Store,
  },
  {
    value: 'ngo',
    label: 'NGO / Shelter',
    desc: 'Charities, shelters & community kitchens',
    icon: HeartHandshake,
  },
  {
    value: 'volunteer',
    label: 'Volunteer Courier',
    desc: 'Pick up & deliver food packages to shelters',
    icon: Truck,
  },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
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
        payload.address = form.address || 'Downtown Market St';
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
      toast.success(`Welcome, ${user.full_name || 'User'}! Account created.`);
      navigate('/dashboard');
    } catch (err) {
      const errorMsg =
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        'Registration failed. Please check your credentials.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-[500px] bg-[#121214] border border-[#232328] rounded-[28px] p-7 sm:p-9 shadow-2xl shadow-black/80 space-y-6 animate-fade-in relative">
        
        {/* Back pill */}
        <div className="flex items-center justify-between">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1b1b1f] hover:bg-[#26262c] text-xs font-medium text-neutral-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>
          <span className="text-xs text-neutral-400 font-medium">
            Step {step} of 2
          </span>
        </div>

        {/* Center Icon Badge */}
        <div className="text-center pt-1">
          <div className="w-14 h-14 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-white/10 mb-3">
            <UserPlus className="w-6 h-6 text-black stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create an Account</h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            {step === 1 ? 'Choose your role and basic credentials' : 'Complete your organization & route details'}
          </p>
        </div>

        {/* Step progress bar */}
        <div className="flex gap-2">
          <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-white' : 'bg-[#232328]'}`} />
          <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-white' : 'bg-[#232328]'}`} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-2">
                  Select Your Role
                </label>
                <div className="grid gap-2">
                  {roleOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = form.role === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => update('role', opt.value)}
                        className={`flex items-center gap-3.5 p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-[#1e1e24] border-white text-white shadow-sm'
                            : 'bg-[#0c0c0e] border-[#232328] hover:border-neutral-500 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-white text-black' : 'bg-[#1b1b1f] text-neutral-300'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white">{opt.label}</p>
                          <p className="text-[11px] text-neutral-400 truncate">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => update('full_name', e.target.value)}
                    className="w-full bg-[#0c0c0e] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white placeholder-neutral-500 rounded-xl px-4 py-3 pl-10 text-sm transition-all"
                    placeholder="Jane Doe"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => update('email', e.target.value)}
                      className="w-full bg-[#0c0c0e] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white placeholder-neutral-500 rounded-xl px-4 py-3 pl-10 text-sm transition-all"
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => update('phone', e.target.value)}
                      className="w-full bg-[#0c0c0e] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white placeholder-neutral-500 rounded-xl px-4 py-3 pl-10 text-sm transition-all"
                      placeholder="+1 555-0199"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    className="w-full bg-[#0c0c0e] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white placeholder-neutral-500 rounded-xl px-4 py-3 pl-10 pr-10 text-sm transition-all"
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
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

              <button
                type="button"
                disabled={!form.role || !form.full_name || !form.email || !form.password}
                onClick={() => setStep(2)}
                className="w-full bg-white hover:bg-neutral-200 text-black font-semibold py-3.5 rounded-xl text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-white/5 active:scale-[0.99] disabled:opacity-40 mt-2"
              >
                <span>Continue to Profile Setup</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-neutral-400 hover:text-white font-medium flex items-center gap-1 transition-colors"
              >
                ← Back to credentials
              </button>

              {form.role === 'provider' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                      Business / Organization Name
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <input
                        type="text"
                        value={form.business_name}
                        onChange={(e) => update('business_name', e.target.value)}
                        className="w-full bg-[#0c0c0e] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white placeholder-neutral-500 rounded-xl px-4 py-3 pl-10 text-sm"
                        placeholder="e.g. Green Bakery & Deli"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                      Establishment Type
                    </label>
                    <select
                      value={form.business_type}
                      onChange={(e) => update('business_type', e.target.value)}
                      className="w-full bg-[#0c0c0e] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white rounded-xl px-4 py-3 text-sm"
                    >
                      <option value="restaurant">Restaurant</option>
                      <option value="bakery">Bakery / Patisserie</option>
                      <option value="grocery">Supermarket / Grocery</option>
                      <option value="catering">Catering Service</option>
                      <option value="other">Other Food Donor</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                      Pickup Address
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <input
                        type="text"
                        value={form.address}
                        onChange={(e) => update('address', e.target.value)}
                        className="w-full bg-[#0c0c0e] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white placeholder-neutral-500 rounded-xl px-4 py-3 pl-10 text-sm"
                        placeholder="e.g. 124 Market St, Suite 10"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {form.role === 'ngo' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                      NGO / Shelter Name
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <input
                        type="text"
                        value={form.organization_name}
                        onChange={(e) => update('organization_name', e.target.value)}
                        className="w-full bg-[#0c0c0e] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white placeholder-neutral-500 rounded-xl px-4 py-3 pl-10 text-sm"
                        placeholder="e.g. Hope Harvest Community Center"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                      Registration / Tax ID
                    </label>
                    <input
                      type="text"
                      value={form.registration_no}
                      onChange={(e) => update('registration_no', e.target.value)}
                      className="w-full bg-[#0c0c0e] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white placeholder-neutral-500 rounded-xl px-4 py-3 text-sm"
                      placeholder="e.g. NGO-88421 (Optional)"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                      Distribution Facility Address
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <input
                        type="text"
                        value={form.address}
                        onChange={(e) => update('address', e.target.value)}
                        className="w-full bg-[#0c0c0e] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white placeholder-neutral-500 rounded-xl px-4 py-3 pl-10 text-sm"
                        placeholder="e.g. 450 Mission Blvd"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                      Daily Capacity (servings)
                    </label>
                    <input
                      type="number"
                      value={form.capacity}
                      onChange={(e) => update('capacity', e.target.value)}
                      className="w-full bg-[#0c0c0e] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white placeholder-neutral-500 rounded-xl px-4 py-3 text-sm"
                      placeholder="200"
                    />
                  </div>
                </div>
              )}

              {form.role === 'volunteer' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                      Primary Transport Mode
                    </label>
                    <select
                      value={form.vehicle_type}
                      onChange={(e) => update('vehicle_type', e.target.value)}
                      className="w-full bg-[#0c0c0e] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white rounded-xl px-4 py-3 text-sm"
                    >
                      <option value="car">Personal Car / SUV</option>
                      <option value="van">Van / Small Truck</option>
                      <option value="bike">Bicycle / E-Bike</option>
                      <option value="scooter">Motorcycle / Scooter</option>
                      <option value="on_foot">On Foot (Walking distance)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                      Max Delivery Radius (km)
                    </label>
                    <input
                      type="number"
                      value={form.max_distance_km}
                      onChange={(e) => update('max_distance_km', e.target.value)}
                      className="w-full bg-[#0c0c0e] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white rounded-xl px-4 py-3 text-sm"
                      min="1"
                      max="50"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white hover:bg-neutral-200 text-black font-semibold py-3.5 rounded-xl text-sm transition-all duration-150 flex items-center justify-center shadow-lg shadow-white/5 active:scale-[0.99] disabled:opacity-50 mt-4"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  'Complete Registration'
                )}
              </button>
            </div>
          )}
        </form>

        {/* Bottom sign-in link */}
        <div className="text-center pt-2">
          <p className="text-xs text-neutral-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-white font-semibold underline underline-offset-4 hover:text-neutral-200 transition-colors"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
