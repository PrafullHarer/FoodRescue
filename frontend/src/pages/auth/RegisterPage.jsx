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
import ThemeToggle from '../../components/common/ThemeToggle';
import Logo from '../../components/common/Logo';
import GoogleAuthButton from '../../components/common/GoogleAuthButton';

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
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);
  const [registeredRole, setRegisteredRole] = useState('provider');
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

    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error('Please enter your full name and email address.');
      return;
    }

    if (!isPasswordValid) {
      toast.error('Please fulfill all password security requirements.');
      return;
    }

    if (form.role === 'provider' && !form.business_name?.trim()) {
      toast.error('Please enter your business or store name.');
      return;
    }

    if (form.role === 'ngo' && !form.organization_name?.trim()) {
      toast.error('Please enter your NGO or shelter organization name.');
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

      const res = await register(payload);
      sessionStorage.setItem('foodrescue_pending_email', form.email.trim());
      toast.success(
        res?.message ||
        'Registration submitted! Your account is currently awaiting administrator verification.',
        { duration: 6000 }
      );
      navigate('/verification-pending', {
        state: {
          email: form.email.trim(),
          role: form.role,
          full_name: form.full_name.trim(),
          organization_name: form.business_name || form.organization_name || '',
          status: 'PENDING',
          verification_status: 'PENDING',
        },
      });
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

  if (registrationSubmitted) {
    return (
      <div className="min-h-screen w-full bg-[#F9FAFB] dark:bg-[#050505] text-neutral-900 dark:text-white flex items-center justify-center p-4 sm:p-6 font-sans transition-colors duration-200">
        <div className="w-full max-w-xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] rounded-2xl sm:rounded-[28px] p-6 sm:p-10 shadow-2xl space-y-6 animate-fade-in relative transition-colors text-center">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-[#232328]">
            <Logo to="/" size="md" showText={true} />
            <ThemeToggle variant="icon" />
          </div>

          {/* Verification Badge & Icon */}
          <div className="flex flex-col items-center pt-2">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mb-4 shadow-sm">
              <ShieldCheck className="w-9 h-9" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Awaiting Admin Verification
            </span>

            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
              Registration Submitted Successfully
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-2 max-w-md mx-auto leading-relaxed">
              Your FoodRescue account has been created successfully. Your account is currently awaiting admin verification. You will receive a notification once your application is reviewed.
            </p>
          </div>

          {/* Details Card */}
          <div className="bg-neutral-50 dark:bg-[#16161a] border border-neutral-200 dark:border-[#232328] rounded-xl p-4 text-left text-xs space-y-2">
            <div className="flex items-center justify-between py-1 border-b border-neutral-200 dark:border-[#232328]">
              <span className="text-neutral-500">Applicant Name</span>
              <span className="font-semibold text-neutral-900 dark:text-white">{form.full_name}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-neutral-200 dark:border-[#232328]">
              <span className="text-neutral-500">Email Address</span>
              <span className="font-semibold text-neutral-900 dark:text-white">{form.email}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-neutral-200 dark:border-[#232328]">
              <span className="text-neutral-500">Applied Role</span>
              <span className="font-semibold text-neutral-900 dark:text-white capitalize">
                {registeredRole === 'provider' ? 'Food Provider' : registeredRole === 'ngo' ? 'NGO / Shelter' : 'Volunteer Courier'}
              </span>
            </div>
            {(form.business_name || form.organization_name) && (
              <div className="flex items-center justify-between py-1 border-b border-neutral-200 dark:border-[#232328]">
                <span className="text-neutral-500">Entity / Organization</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {form.business_name || form.organization_name}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between py-1">
              <span className="text-neutral-500">Verification Status</span>
              <span className="font-bold text-amber-500">PENDING</span>
            </div>
          </div>

          {/* Steps Notice */}
          <div className="text-left text-xs bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 space-y-1.5 text-neutral-700 dark:text-neutral-300">
            <div className="font-semibold text-amber-600 dark:text-amber-400">What happens next?</div>
            <p className="text-[11px] text-neutral-500 leading-normal">
              1. An administrator reviews your submitted registration details and credentials.<br />
              2. Once approved, your account status changes to <strong>APPROVED</strong>.<br />
              3. You can then sign in using your credentials to access your FoodRescue dashboard.
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/login')}
              className="btn btn-primary w-full py-2.5 text-xs font-bold"
            >
              Go to Sign In
            </button>
            <button
              onClick={() => navigate('/')}
              className="btn btn-secondary w-full py-2.5 text-xs font-medium"
            >
              Return to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#F9FAFB] dark:bg-[#050505] text-neutral-900 dark:text-white flex items-center justify-center p-3 sm:p-6 lg:p-8 font-sans transition-colors duration-200">
      <div className="w-full max-w-5xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] rounded-2xl sm:rounded-[28px] p-4 sm:p-8 lg:p-10 shadow-xl shadow-black/5 dark:shadow-black/80 space-y-6 sm:space-y-8 animate-fade-in relative transition-colors">
        
        {/* Integrated Top Bar with Back Link, Centered Header & Logo, and Status Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-neutral-200 dark:border-[#232328] pb-5 sm:pb-6">
          <div className="flex-shrink-0">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-[#1b1b1f] dark:hover:bg-[#26262c] text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>

          <div className="flex flex-col items-center text-center space-y-1">
            <div className="flex justify-center mb-1">
              <Logo to="/" size="md" showText={false} />
            </div>
            <h1 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tracking-tight leading-tight">
              Join the FoodRescue Network
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm">
              Complete your account profile in two simple columns below.
            </p>
          </div>

          <div className="flex-shrink-0 flex items-center gap-3 self-end md:self-center">
            <ThemeToggle variant="icon" />
            <div className="hidden sm:flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Create Account</span>
            </div>
          </div>
        </div>

        {/* Quick Google Registration */}
        <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#232328] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Fast-Track Registration</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Sign up securely with Google and complete your profile in 1 quick step.
            </p>
          </div>
          <div className="w-full sm:w-auto sm:min-w-[240px]">
            <GoogleAuthButton mode="signup" />
          </div>
        </div>

        <div className="relative flex items-center justify-center my-1">
          <div className="border-t border-neutral-200 dark:border-[#232328] w-full" />
          <span className="bg-white dark:bg-[#121214] px-3 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider absolute">
            or register with email below
          </span>
        </div>

        {/* 2-Column Form Layout */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">
            
            {/* COLUMN 1: Account Credentials & Role */}
            <div className="space-y-5 bg-neutral-50/80 dark:bg-[#0c0c0e]/80 p-5 sm:p-6 rounded-2xl border border-neutral-200 dark:border-[#232328]">
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-[#232328] pb-3">
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black text-[11px] font-bold flex items-center justify-center">1</span>
                  Account & Role
                </h2>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">Step 1</span>
              </div>

              {/* Role Selection */}
              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-2">
                  Select Your Platform Role
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {roleOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = form.role === opt.value;
                    if (registrationSubmitted) {
    return (
      <div className="min-h-screen w-full bg-[#F9FAFB] dark:bg-[#050505] text-neutral-900 dark:text-white flex items-center justify-center p-4 sm:p-6 font-sans transition-colors duration-200">
        <div className="w-full max-w-xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] rounded-2xl sm:rounded-[28px] p-6 sm:p-10 shadow-2xl space-y-6 animate-fade-in relative transition-colors text-center">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-[#232328]">
            <Logo to="/" size="md" showText={true} />
            <ThemeToggle variant="icon" />
          </div>

          {/* Verification Badge & Icon */}
          <div className="flex flex-col items-center pt-2">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mb-4 shadow-sm">
              <ShieldCheck className="w-9 h-9" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Awaiting Admin Verification
            </span>

            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
              Registration Submitted Successfully
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-2 max-w-md mx-auto leading-relaxed">
              Your FoodRescue account has been created successfully. Your account is currently awaiting admin verification. You will receive a notification once your application is reviewed.
            </p>
          </div>

          {/* Details Card */}
          <div className="bg-neutral-50 dark:bg-[#16161a] border border-neutral-200 dark:border-[#232328] rounded-xl p-4 text-left text-xs space-y-2">
            <div className="flex items-center justify-between py-1 border-b border-neutral-200 dark:border-[#232328]">
              <span className="text-neutral-500">Applicant Name</span>
              <span className="font-semibold text-neutral-900 dark:text-white">{form.full_name}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-neutral-200 dark:border-[#232328]">
              <span className="text-neutral-500">Email Address</span>
              <span className="font-semibold text-neutral-900 dark:text-white">{form.email}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-neutral-200 dark:border-[#232328]">
              <span className="text-neutral-500">Applied Role</span>
              <span className="font-semibold text-neutral-900 dark:text-white capitalize">
                {registeredRole === 'provider' ? 'Food Provider' : registeredRole === 'ngo' ? 'NGO / Shelter' : 'Volunteer Courier'}
              </span>
            </div>
            {(form.business_name || form.organization_name) && (
              <div className="flex items-center justify-between py-1 border-b border-neutral-200 dark:border-[#232328]">
                <span className="text-neutral-500">Entity / Organization</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {form.business_name || form.organization_name}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between py-1">
              <span className="text-neutral-500">Verification Status</span>
              <span className="font-bold text-amber-500">PENDING</span>
            </div>
          </div>

          {/* Steps Notice */}
          <div className="text-left text-xs bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 space-y-1.5 text-neutral-700 dark:text-neutral-300">
            <div className="font-semibold text-amber-600 dark:text-amber-400">What happens next?</div>
            <p className="text-[11px] text-neutral-500 leading-normal">
              1. An administrator reviews your submitted registration details and credentials.<br />
              2. Once approved, your account status changes to <strong>APPROVED</strong>.<br />
              3. You can then sign in using your credentials to access your FoodRescue dashboard.
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/login')}
              className="btn btn-primary w-full py-2.5 text-xs font-bold"
            >
              Go to Sign In
            </button>
            <button
              onClick={() => navigate('/')}
              className="btn btn-secondary w-full py-2.5 text-xs font-medium"
            >
              Return to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => update('role', opt.value)}
                        className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#39FF14] border-[#39FF14] text-black shadow-md shadow-[#39FF14]/25 ring-2 ring-[#39FF14]/50'
                            : 'bg-white dark:bg-[#141416] border-neutral-300 dark:border-[#232328] hover:border-neutral-400 dark:hover:border-neutral-500 text-neutral-800 dark:text-neutral-200'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 ${
                          isSelected ? 'bg-black/10 text-black' : 'bg-neutral-100 dark:bg-[#1b1b1f] text-neutral-700 dark:text-neutral-300'
                        }`}>
                          <Icon className={`w-4 h-4 stroke-[2.5] ${isSelected ? 'text-black' : 'text-neutral-700 dark:text-neutral-300'}`} />
                        </div>
                        <p className={`text-xs leading-tight ${
                          isSelected ? 'text-black font-bold' : 'text-neutral-800 dark:text-neutral-200 font-semibold'
                        }`}>
                          {opt.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                  <input
                    type="text"
                    id="register-full-name"
                    name="name"
                    autoComplete="name"
                    value={form.full_name}
                    onChange={(e) => update('full_name', e.target.value)}
                    className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#282830] focus:border-neutral-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 rounded-xl px-4 py-3 pl-10 text-sm transition-all shadow-2xs"
                    placeholder="e.g. Jane Doe"
                    required
                  />
                </div>
              </div>

              {/* Email & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                    <input
                      type="email"
                      id="register-email"
                      name="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => update('email', e.target.value)}
                      className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#282830] focus:border-neutral-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 rounded-xl px-4 py-3 pl-10 text-sm transition-all shadow-2xs"
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                    Phone Number
                  </label>
                  <div className="flex rounded-xl overflow-hidden border border-neutral-200 dark:border-[#282830] focus-within:border-neutral-900 dark:focus-within:border-white focus-within:ring-1 focus-within:ring-neutral-900 dark:focus-within:ring-white bg-white dark:bg-[#121214] transition-all shadow-2xs">
                    <div className="bg-neutral-100 dark:bg-[#18181c] border-r border-neutral-200 dark:border-[#282830] px-3 flex items-center justify-center text-xs font-semibold text-neutral-700 dark:text-neutral-300 select-none tracking-wide">
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
                      className="w-full bg-transparent text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 px-3 py-3 text-sm focus:outline-none font-mono tracking-wider"
                      placeholder="9876543210"
                    />
                  </div>
                </div>
              </div>

              {/* Password & Security Rules */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Password
                  </label>
                  {form.password && (
                    <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                      Strength:{' '}
                      <span className={metRulesCount === 5 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : metRulesCount >= 3 ? 'text-neutral-700 dark:text-neutral-200' : 'text-neutral-400'}>
                        {metRulesCount === 5 ? 'Strong' : metRulesCount >= 3 ? 'Medium' : 'Weak'}
                      </span>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    id="register-password"
                    name="new-password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#282830] focus:border-neutral-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 rounded-xl px-4 py-3 pl-10 pr-10 text-sm transition-all shadow-2xs"
                    placeholder="Create a strong password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors cursor-pointer"
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
                          metRulesCount >= level ? 'bg-[#39FF14]' : 'bg-neutral-200 dark:bg-[#232328]'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Password Rules Checklist */}
                <div className="mt-3 p-3.5 bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#282830] rounded-xl space-y-1.5 shadow-2xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">Password Rules:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                    {passwordCriteria.map((criterion) => (
                      <div
                        key={criterion.id}
                        className={`flex items-center gap-1.5 transition-colors ${
                          criterion.met ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-neutral-400 dark:text-neutral-500'
                        }`}
                      >
                        {criterion.met ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5] flex-shrink-0" />
                        ) : (
                          <Circle className="w-2.5 h-2.5 text-neutral-400 dark:text-neutral-600 flex-shrink-0 mx-0.5" />
                        )}
                        <span>{criterion.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 2: Organization & Logistics Details */}
            <div className="space-y-5 bg-neutral-50/80 dark:bg-[#0c0c0e]/80 p-5 sm:p-6 rounded-2xl border border-neutral-200 dark:border-[#232328] flex flex-col justify-between h-full">
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-neutral-200 dark:border-[#232328] pb-3">
                  <h2 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black text-[11px] font-bold flex items-center justify-center">2</span>
                    {form.role === 'provider' ? 'Provider Details' : form.role === 'ngo' ? 'NGO / Shelter Details' : 'Volunteer Courier Details'}
                  </h2>
                  <span className="badge badge-neutral uppercase text-[10px] font-bold">{form.role}</span>
                </div>

                {/* Role Specific Fields */}
                {form.role === 'provider' && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                        Business / Store Name
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                        <input
                          type="text"
                          value={form.business_name}
                          onChange={(e) => update('business_name', e.target.value)}
                          className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#282830] focus:border-neutral-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 rounded-xl px-4 py-3 pl-10 text-sm shadow-2xs transition-all"
                          placeholder="e.g. Grand Central Kitchen"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                        Establishment Category
                      </label>
                      <select
                        value={form.business_type}
                        onChange={(e) => update('business_type', e.target.value)}
                        className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#282830] focus:border-neutral-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white text-neutral-900 dark:text-white rounded-xl px-4 py-3 text-sm shadow-2xs transition-all cursor-pointer"
                      >
                        <option value="restaurant">Restaurant / Eatery</option>
                        <option value="bakery">Bakery / Patisserie</option>
                        <option value="grocery">Supermarket / Grocery</option>
                        <option value="catering">Catering & Events</option>
                        <option value="other">Other Food Donor</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                        Surplus Pickup Address
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                        <input
                          type="text"
                          value={form.address}
                          onChange={(e) => update('address', e.target.value)}
                          className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#282830] focus:border-neutral-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 rounded-xl px-4 py-3 pl-10 pr-28 text-sm shadow-2xs transition-all"
                          placeholder="e.g. 124 Market St, Ground Floor"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setMapOpen(true)}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#39FF14] hover:bg-[#32e612] text-black text-[11px] font-bold transition-all cursor-pointer shadow-xs border border-[#39FF14] active:scale-95"
                        >
                          <Map className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                          <span className="text-black font-bold">Pick on Map</span>
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
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                        NGO / Organization Name
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                        <input
                          type="text"
                          value={form.organization_name}
                          onChange={(e) => update('organization_name', e.target.value)}
                          className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#282830] focus:border-neutral-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 rounded-xl px-4 py-3 pl-10 text-sm shadow-2xs transition-all"
                          placeholder="e.g. Hope Food Bank Network"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                          Registration / Tax ID
                        </label>
                        <input
                          type="text"
                          value={form.registration_no}
                          onChange={(e) => update('registration_no', e.target.value)}
                          className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#282830] focus:border-neutral-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 rounded-xl px-4 py-3 text-sm shadow-2xs transition-all"
                          placeholder="e.g. NGO-99214"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                          Daily Capacity (Meals)
                        </label>
                        <input
                          type="number"
                          value={form.capacity}
                          onChange={(e) => update('capacity', e.target.value)}
                          className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#282830] focus:border-neutral-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 rounded-xl px-4 py-3 text-sm shadow-2xs transition-all"
                          placeholder="200"
                          min="10"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                        Shelter Distribution Facility Address
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                        <input
                          type="text"
                          value={form.address}
                          onChange={(e) => update('address', e.target.value)}
                          className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#282830] focus:border-neutral-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 rounded-xl px-4 py-3 pl-10 pr-28 text-sm shadow-2xs transition-all"
                          placeholder="e.g. 450 Mission Blvd, Wing B"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setMapOpen(true)}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#39FF14] hover:bg-[#32e612] text-black text-[11px] font-bold transition-all cursor-pointer shadow-xs border border-[#39FF14] active:scale-95"
                        >
                          <Map className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                          <span className="text-black font-bold">Pick on Map</span>
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
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                        Primary Transport Mode
                      </label>
                      <select
                        value={form.vehicle_type}
                        onChange={(e) => update('vehicle_type', e.target.value)}
                        className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#282830] focus:border-neutral-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white text-neutral-900 dark:text-white rounded-xl px-4 py-3 text-sm shadow-2xs transition-all cursor-pointer"
                      >
                        <option value="car">Personal Car / SUV</option>
                        <option value="van">Van / Light Commercial</option>
                        <option value="scooter">Motorcycle / Scooter</option>
                        <option value="bike">Bicycle / Cargo E-Bike</option>
                        <option value="on_foot">On Foot (Local neighborhood)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                        Maximum Delivery Radius (km)
                      </label>
                      <input
                        type="number"
                        value={form.max_distance_km}
                        onChange={(e) => update('max_distance_km', e.target.value)}
                        className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#282830] focus:border-neutral-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white text-neutral-900 dark:text-white rounded-xl px-4 py-3 text-sm shadow-2xs transition-all"
                        min="1"
                        max="50"
                      />
                    </div>

                    <div className="p-3.5 bg-white dark:bg-[#121214] rounded-xl border border-neutral-200 dark:border-[#282830] text-neutral-600 dark:text-neutral-400 text-xs flex items-start gap-2.5 shadow-2xs">
                      <Sparkles className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>Volunteers receive automatic route notifications when donors nearby post food rescue requests.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Submit */}
              <div className="pt-4 border-t border-neutral-200 dark:border-[#232328] space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.99] transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
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
        <div className="text-center pt-2 border-t border-neutral-200 dark:border-[#232328]">
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-neutral-900 dark:text-white font-bold underline underline-offset-4 hover:text-[#39FF14] dark:hover:text-[#39FF14] transition-colors"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
