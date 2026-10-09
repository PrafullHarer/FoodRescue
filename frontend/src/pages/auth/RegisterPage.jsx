import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  UserPlus, Mail, Lock, User, Phone, Building2, MapPin,
  ArrowLeft, Eye, EyeOff, Store, HeartHandshake, Truck,
  Check, Circle, ShieldCheck, Sparkles, Map
} from 'lucide-react';
import toast from 'react-hot-toast';
import MapAddressPickerModal from '../../components/common/MapAddressPickerModal';

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
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'provider', // Default to provider for immediate right-side form readiness
    // Provider
    business_name: '',
    business_type: 'restaurant',
    address: '',
    latitude: null,
    longitude: null,
    // NGO
    organization_name: '',
    registration_no: '',
    capacity: 200,
    // Volunteer
    vehicle_type: 'car',
    max_distance_km: 15,
  });

  const passwordCriteria = [
    { id: 'len', label: 'At least 8 characters', met: form.password.length >= 8 },
    { id: 'upper', label: '1 uppercase letter (A-Z)', met: /[A-Z]/.test(form.password) },
    { id: 'lower', label: '1 lowercase letter (a-z)', met: /[a-z]/.test(form.password) },
    { id: 'num', label: '1 number (0-9)', met: /[0-9]/.test(form.password) },
    { id: 'spec', label: '1 special character (!@#$%^&*)', met: /[^A-Za-z0-9]/.test(form.password) },
  ];

  const isPasswordValid = passwordCriteria.every(c => c.met);
  const metRulesCount = passwordCriteria.filter(c => c.met).length;

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm(prev => ({ ...prev, phone: digitsOnly }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.phone && form.phone.length > 0 && form.phone.length !== 10) {
      toast.error('Phone number must be exactly 10 digits (e.g. +91 9876543210)');
      return;
    }

    if (!isPasswordValid) {
      toast.error('Please fulfill all password security requirements');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        phone: form.phone ? `+91${form.phone}` : undefined,
        role: form.role,
        latitude: form.latitude ?? 28.6139,
        longitude: form.longitude ?? 77.2090,
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
    <div className="min-h-screen w-full bg-[#050505] flex items-center justify-center p-3 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-5xl bg-[#121214] border border-[#232328] rounded-2xl sm:rounded-[28px] p-4 sm:p-8 lg:p-10 shadow-2xl shadow-black/80 space-y-6 sm:space-y-8 animate-fade-in relative">
        
        {/* Integrated Top Bar with Back Link, Centered Header & Logo, and Status Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-[#232328] pb-5 sm:pb-6">
          <div className="flex-shrink-0">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1b1b1f] hover:bg-[#26262c] text-xs font-medium text-neutral-400 hover:text-white transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>

          <div className="flex flex-col items-center text-center space-y-1">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-md shadow-white/5 mb-1">
              <UserPlus className="w-4 h-4 text-black stroke-[2.4]" />
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
              Join the FoodRescue Network
            </h1>
            <p className="text-xs text-neutral-400 max-w-sm">
              Complete your account profile in two simple columns below.
            </p>
          </div>

          <div className="flex-shrink-0 flex items-center gap-2 self-end md:self-center">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-xs text-neutral-400 font-medium">Create Account</span>
          </div>
        </div>

        {/* 2-Column Form Layout */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">
            
            {/* COLUMN 1: Account Credentials & Role */}
            <div className="space-y-5 bg-[#0c0c0e]/70 p-5 sm:p-6 rounded-2xl border border-[#232328]">
              <div className="flex items-center justify-between border-b border-[#232328] pb-3">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-white text-black text-[11px] font-bold flex items-center justify-center">1</span>
                  Account & Role
                </h2>
                <span className="text-[11px] text-neutral-400">Step 1</span>
              </div>

              {/* Role Selection */}
              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-2">
                  Select Your Platform Role
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {roleOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = form.role === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => update('role', opt.value)}
                        className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-[#1e1e24] border-white text-white shadow-sm'
                            : 'bg-[#141416] border-[#232328] hover:border-neutral-500 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 ${
                          isSelected ? 'bg-white text-black' : 'bg-[#1b1b1f] text-neutral-300'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-semibold text-white leading-tight">{opt.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    id="register-full-name"
                    name="name"
                    autoComplete="name"
                    value={form.full_name}
                    onChange={(e) => update('full_name', e.target.value)}
                    className="w-full bg-[#121214] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white placeholder-neutral-500 rounded-xl px-4 py-3 pl-10 text-sm transition-all"
                    placeholder="e.g. Jane Doe"
                    required
                  />
                </div>
              </div>

              {/* Email & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      type="email"
                      id="register-email"
                      name="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => update('email', e.target.value)}
                      className="w-full bg-[#121214] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white placeholder-neutral-500 rounded-xl px-4 py-3 pl-10 text-sm transition-all"
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                    Phone Number
                  </label>
                  <div className="flex rounded-xl overflow-hidden border border-[#232328] focus-within:border-neutral-400 focus-within:ring-1 focus-within:ring-neutral-400 transition-all bg-[#121214]">
                    <div className="bg-[#18181c] border-r border-[#232328] px-3 flex items-center justify-center text-xs font-semibold text-neutral-300 select-none tracking-wide">
                      +91
                    </div>
                    <input
                      type="tel"
                      id="register-phone"
                      name="tel"
                      autoComplete="tel-national"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      inputMode="numeric"
                      maxLength={10}
                      value={form.phone}
                      onChange={handlePhoneChange}
                      className="w-full bg-transparent text-white placeholder-neutral-500 px-3 py-3 text-sm focus:outline-none font-mono tracking-wider"
                      placeholder="9876543210"
                    />
                  </div>
                </div>
              </div>

              {/* Password & Security Rules */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-neutral-300">
                    Password
                  </label>
                  {form.password && (
                    <span className="text-[11px] font-semibold text-neutral-400">
                      Strength:{' '}
                      <span className={metRulesCount === 5 ? 'text-white font-bold' : metRulesCount >= 3 ? 'text-neutral-300' : 'text-neutral-500'}>
                        {metRulesCount === 5 ? 'Strong' : metRulesCount >= 3 ? 'Medium' : 'Weak'}
                      </span>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    id="register-password"
                    name="new-password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    className="w-full bg-[#121214] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white placeholder-neutral-500 rounded-xl px-4 py-3 pl-10 pr-10 text-sm transition-all"
                    placeholder="Create a strong password"
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

                {/* Password strength bar */}
                {form.password.length > 0 && (
                  <div className="flex gap-1.5 mt-2.5">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all duration-200 ${
                          metRulesCount >= level ? 'bg-white' : 'bg-[#232328]'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Password Rules Checklist */}
                <div className="mt-3 p-3 bg-[#121214] border border-[#232328] rounded-xl space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Password Rules:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                    {passwordCriteria.map((criterion) => (
                      <div
                        key={criterion.id}
                        className={`flex items-center gap-1.5 transition-colors ${
                          criterion.met ? 'text-white font-medium' : 'text-neutral-500'
                        }`}
                      >
                        {criterion.met ? (
                          <Check className="w-3.5 h-3.5 text-white stroke-[2.5] flex-shrink-0" />
                        ) : (
                          <Circle className="w-2.5 h-2.5 text-neutral-600 flex-shrink-0 mx-0.5" />
                        )}
                        <span>{criterion.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 2: Organization & Logistics Details */}
            <div className="space-y-5 bg-[#0c0c0e]/70 p-5 sm:p-6 rounded-2xl border border-[#232328] flex flex-col justify-between h-full">
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-[#232328] pb-3">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white text-black text-[11px] font-bold flex items-center justify-center">2</span>
                    {form.role === 'provider' ? 'Provider Details' : form.role === 'ngo' ? 'NGO / Shelter Details' : 'Volunteer Courier Details'}
                  </h2>
                  <span className="badge badge-neutral uppercase text-[10px] font-bold">{form.role}</span>
                </div>

                {/* Role Specific Fields */}
                {form.role === 'provider' && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                        Business / Store Name
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                          type="text"
                          value={form.business_name}
                          onChange={(e) => update('business_name', e.target.value)}
                          className="w-full bg-[#121214] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white placeholder-neutral-500 rounded-xl px-4 py-3 pl-10 text-sm"
                          placeholder="e.g. Grand Central Kitchen"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                        Establishment Category
                      </label>
                      <select
                        value={form.business_type}
                        onChange={(e) => update('business_type', e.target.value)}
                        className="w-full bg-[#121214] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white rounded-xl px-4 py-3 text-sm"
                      >
                        <option value="restaurant">Restaurant / Eatery</option>
                        <option value="bakery">Bakery / Patisserie</option>
                        <option value="grocery">Supermarket / Grocery</option>
                        <option value="catering">Catering & Events</option>
                        <option value="other">Other Food Donor</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                        Surplus Pickup Address
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                          type="text"
                          value={form.address}
                          onChange={(e) => update('address', e.target.value)}
                          className="w-full bg-[#121214] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white placeholder-neutral-500 rounded-xl px-4 py-3 pl-10 pr-28 text-sm"
                          placeholder="e.g. 124 Market St, Ground Floor"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setMapOpen(true)}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-[11px] font-semibold hover:bg-neutral-200 transition-colors"
                        >
                          <Map className="w-3 h-3" />
                          Pick on Map
                        </button>
                      </div>
                      {form.latitude && form.longitude && (
                        <p className="text-[10px] text-neutral-500 mt-1.5 font-mono">
                          📍 Coordinates: {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {form.role === 'ngo' && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                        NGO / Organization Name
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                          type="text"
                          value={form.organization_name}
                          onChange={(e) => update('organization_name', e.target.value)}
                          className="w-full bg-[#121214] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white placeholder-neutral-500 rounded-xl px-4 py-3 pl-10 text-sm"
                          placeholder="e.g. Hope Food Bank Network"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                          Registration / Tax ID
                        </label>
                        <input
                          type="text"
                          value={form.registration_no}
                          onChange={(e) => update('registration_no', e.target.value)}
                          className="w-full bg-[#121214] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white placeholder-neutral-500 rounded-xl px-4 py-3 text-sm"
                          placeholder="e.g. NGO-99214"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                          Daily Capacity (Meals)
                        </label>
                        <input
                          type="number"
                          value={form.capacity}
                          onChange={(e) => update('capacity', e.target.value)}
                          className="w-full bg-[#121214] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white placeholder-neutral-500 rounded-xl px-4 py-3 text-sm"
                          placeholder="200"
                          min="10"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                        Shelter Distribution Facility Address
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                          type="text"
                          value={form.address}
                          onChange={(e) => update('address', e.target.value)}
                          className="w-full bg-[#121214] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white placeholder-neutral-500 rounded-xl px-4 py-3 pl-10 pr-28 text-sm"
                          placeholder="e.g. 450 Mission Blvd, Wing B"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setMapOpen(true)}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-[11px] font-semibold hover:bg-neutral-200 transition-colors"
                        >
                          <Map className="w-3 h-3" />
                          Pick on Map
                        </button>
                      </div>
                      {form.latitude && form.longitude && (
                        <p className="text-[10px] text-neutral-500 mt-1.5 font-mono">
                          📍 Coordinates: {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {form.role === 'volunteer' && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                        Primary Transport Mode
                      </label>
                      <select
                        value={form.vehicle_type}
                        onChange={(e) => update('vehicle_type', e.target.value)}
                        className="w-full bg-[#121214] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white rounded-xl px-4 py-3 text-sm"
                      >
                        <option value="car">Personal Car / SUV</option>
                        <option value="van">Van / Light Commercial</option>
                        <option value="scooter">Motorcycle / Scooter</option>
                        <option value="bike">Bicycle / Cargo E-Bike</option>
                        <option value="on_foot">On Foot (Local neighborhood)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                        Maximum Delivery Radius (km)
                      </label>
                      <input
                        type="number"
                        value={form.max_distance_km}
                        onChange={(e) => update('max_distance_km', e.target.value)}
                        className="w-full bg-[#121214] border border-[#232328] focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 text-white rounded-xl px-4 py-3 text-sm"
                        min="1"
                        max="50"
                      />
                    </div>

                    <div className="p-3.5 bg-[#121214] rounded-xl border border-[#232328] text-neutral-400 text-xs flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                      <span>Volunteers receive automatic route notifications when donors nearby post food rescue requests.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Submit */}
              <div className="pt-4 border-t border-[#232328] space-y-3">
                <button
                  type="submit"
                  disabled={loading || !isPasswordValid || !form.email || !form.full_name}
                  className="w-full bg-white hover:bg-neutral-200 text-black font-semibold py-3.5 rounded-xl text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-white/5 active:scale-[0.99] disabled:opacity-40"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-neutral-500 text-center leading-relaxed">
                  By registering, you agree to FoodRescue food safety and hygiene guidelines.
                </p>
              </div>
            </div>
          </div>
        </form>

        {/* Map Address Picker Modal */}
        <MapAddressPickerModal
          isOpen={mapOpen}
          onClose={() => setMapOpen(false)}
          initialAddress={form.address}
          initialLat={form.latitude || 28.6139}
          initialLng={form.longitude || 77.2090}
          title={form.role === 'provider' ? 'Select Pickup Location' : form.role === 'ngo' ? 'Select Facility Location' : 'Select Your Location'}
          onSelectLocation={({ address, latitude, longitude }) => {
            setForm(prev => ({
              ...prev,
              address,
              latitude,
              longitude,
            }));
            toast.success('Location set successfully!');
          }}
        />

        {/* Bottom sign-in link */}
        <div className="text-center pt-2 border-t border-[#232328]">
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
