import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Mail, Lock, User, Users, Phone, Building2, MapPin,
  ArrowLeft, ArrowRight, Eye, EyeOff, Store, HeartHandshake, Truck,
  Check, ShieldCheck, Sparkles, Map, AlertCircle, RefreshCw, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import MapAddressPickerModal from '../../components/common/MapAddressPickerModal';
import ThemeToggle from '../../components/common/ThemeToggle';
import Logo from '../../components/common/Logo';
import GoogleAuthButton from '../../components/common/GoogleAuthButton';
import PasswordRequirements, { evaluatePassword } from '../../components/common/PasswordRequirements';
import EmailVerificationModal from '../../components/auth/EmailVerificationModal';

const roleOptions = [
  {
    value: 'provider',
    label: 'Food Provider',
    desc: 'Restaurants, bakeries & groceries',
    icon: Store,
    step2Label: 'Provider Details',
  },
  {
    value: 'ngo',
    label: 'NGO / Shelter',
    desc: 'Charities, shelters & community kitchens',
    icon: HeartHandshake,
    step2Label: 'Shelter Details',
  },
  {
    value: 'volunteer',
    label: 'Volunteer Courier',
    desc: 'Pick up & deliver food packages',
    icon: Truck,
    step2Label: 'Courier Details',
  },
];

export default function RegisterPage() {
  const { register, sendEmailOtp, verifyEmailOtp, checkEmailAvailability } = useAuth();
  const navigate = useNavigate();

  // Stepper State (Step 1: Account & Role, Step 2: Role Details)
  const [currentStep, setCurrentStep] = useState(1);

  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const cardTopRef = useRef(null);

  // Email Verification State
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [isEmailRegistered, setIsEmailRegistered] = useState(false);
  const [showInlineOtp, setShowInlineOtp] = useState(false);
  const [inlineOtpCode, setInlineOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  // Form State
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirm_password: '',
    full_name: '',
    phone: '',
    role: 'provider', // 'provider' | 'ngo' | 'volunteer'
    // Provider Details
    business_name: '',
    business_type: 'restaurant',
    address: '',
    latitude: null,
    longitude: null,
    // NGO Details
    organization_name: '',
    registration_no: '',
    capacity: '',
    // Volunteer Details
    vehicle_type: 'car',
    max_distance_km: 15,
  });

  const { criteria: passwordCriteria, isValid: isPasswordValid } = evaluatePassword(form.password);

  const selectedRoleOption = roleOptions.find((r) => r.value === form.role) || roleOptions[0];
  const step2Title = selectedRoleOption.step2Label;

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    update('phone', digitsOnly);
  };

  // Real-time check when leaving email field
  const handleEmailBlur = async () => {
    const trimmedEmail = form.email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return;

    try {
      const res = await checkEmailAvailability(trimmedEmail);
      if (res && res.isRegistered) {
        setIsEmailRegistered(true);
        setErrors((prev) => ({ ...prev, email: 'This email is already registered.' }));
      } else {
        setIsEmailRegistered(false);
        if (errors.email === 'This email is already registered.') {
          setErrors((prev) => {
            const next = { ...prev };
            delete next.email;
            return next;
          });
        }
      }
    } catch {
      // ignore background check failure
    }
  };

  // Request Email Verification OTP (inline box or modal)
  const handleRequestEmailOtp = async (openModal = false) => {
    const trimmedEmail = form.email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrors((prev) => ({ ...prev, email: 'Please enter a valid email address first.' }));
      toast.error('Please enter a valid email address first.');
      return;
    }

    if (isEmailRegistered) {
      toast.error('This email is already registered. Please sign in instead.', {
        id: 'email-registered-warn',
      });
      return;
    }

    setSendingOtp(true);
    try {
      const res = await sendEmailOtp(trimmedEmail);
      toast.success(res?.message || `Verification code sent to ${trimmedEmail}!`);
      setShowInlineOtp(true);
      setOtpCountdown(60);
      setIsEmailRegistered(false);
      if (openModal) {
        setShowOtpModal(true);
      }
    } catch (err) {
      const status = err.response?.status;
      const code = err.response?.data?.code;
      const msg = err.response?.data?.message || err.message || 'Failed to send verification code.';

      if (status === 409 || code === 'EMAIL_ALREADY_REGISTERED' || msg.toLowerCase().includes('already registered')) {
        setIsEmailRegistered(true);
        setErrors((prev) => ({ ...prev, email: 'This email is already registered.' }));
        toast((t) => (
          <div className="flex items-center gap-2 text-xs">
            <span>This email is already registered.</span>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                navigate('/login', { state: { email: trimmedEmail } });
              }}
              className="text-[#39FF14] font-bold underline cursor-pointer"
            >
              Sign In →
            </button>
          </div>
        ), { id: 'email-already-registered', duration: 6000, icon: '⚠️' });
      } else {
        toast.error(msg);
        setErrors((prev) => ({ ...prev, email: msg }));
      }
    } finally {
      setSendingOtp(false);
    }
  };

  // Verify Inline 6-Digit Code
  const handleVerifyInlineOtp = async (codeToVerify = null) => {
    const code = codeToVerify || inlineOtpCode.trim();
    if (code.length !== 6) {
      toast.error('Please enter the full 6-digit code.');
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await verifyEmailOtp(form.email.trim(), code);
      setEmailVerified(true);
      setVerifiedEmail(form.email.trim());
      setShowInlineOtp(false);
      setInlineOtpCode('');
      setErrors((prev) => {
        const next = { ...prev };
        delete next.email;
        return next;
      });
      toast.success(res?.message || 'Email verified successfully! ✓');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Incorrect verification code.';
      toast.error(msg);
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Step 1 Validation & Transition
  const handleProceedToStep2 = () => {
    const newErrors = {};

    if (!form.full_name.trim()) {
      newErrors.full_name = 'Please enter your full name.';
    }

    if (!form.email.trim()) {
      newErrors.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (form.phone && form.phone.length !== 10) {
      newErrors.phone = 'Phone number must be exactly 10 digits.';
    }

    if (!form.password) {
      newErrors.password = 'Please create a password.';
    } else if (!isPasswordValid) {
      const missing = passwordCriteria.filter((c) => !c.met).map((c) => c.label).join(', ');
      newErrors.password = `Missing requirement: ${missing}`;
    }

    if (!form.confirm_password) {
      newErrors.confirm_password = 'Please confirm your password.';
    } else if (form.password !== form.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      return;
    }

    // Email verification check
    if (!emailVerified || form.email.trim().toLowerCase() !== verifiedEmail.toLowerCase()) {
      toast('Please verify your email address to proceed.', { icon: '✉️' });
      setShowInlineOtp(true);
      if (!sendingOtp) {
        handleRequestEmailOtp(false);
      }
      return;
    }

    setErrors({});
    setCurrentStep(2);
    if (cardTopRef.current) {
      cardTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Step 2 Submission
  const handleSubmit = async (e) => {
    e?.preventDefault();
    const newErrors = {};

    if (form.role === 'provider') {
      if (!form.business_name?.trim()) {
        newErrors.business_name = 'Please enter your business or store name.';
      }
      if (!form.address?.trim()) {
        newErrors.address = 'Please enter your surplus pickup address.';
      }
    } else if (form.role === 'ngo') {
      if (!form.organization_name?.trim()) {
        newErrors.organization_name = 'Please enter your NGO or shelter organization name.';
      }
      if (!form.capacity || parseInt(form.capacity, 10) <= 0) {
        newErrors.capacity = 'Please enter the current NGO capacity (number of people).';
      }
      if (!form.address?.trim()) {
        newErrors.address = 'Please enter your facility distribution address.';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
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
        payload.business_name = form.business_name.trim();
        payload.business_type = form.business_type || 'restaurant';
        payload.address = form.address.trim();
      } else if (form.role === 'ngo') {
        payload.organization_name = form.organization_name.trim();
        payload.registration_no = form.registration_no?.trim() || 'NGO-PENDING';
        payload.address = form.address.trim();
        payload.capacity = parseInt(form.capacity, 10) || 100;
      } else if (form.role === 'volunteer') {
        payload.vehicle_type = form.vehicle_type || 'car';
        payload.max_distance_km = parseFloat(form.max_distance_km) || 15;
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

  return (
    <div className="min-h-screen w-full bg-[#F9FAFB] dark:bg-[#050505] text-neutral-900 dark:text-white flex items-center justify-center p-2.5 sm:p-4 md:p-6 font-sans transition-colors duration-200">
      <div
        ref={cardTopRef}
        className="w-full max-w-4xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl shadow-black/5 dark:shadow-black/80 space-y-3.5 sm:space-y-4 animate-fade-in relative transition-colors"
      >
        
        {/* ─── 1. TOP HEADER LAYOUT ─── */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-[#232328] pb-2.5 sm:pb-3">
          {/* Left: Back to Sign In */}
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-[#1b1b1f] dark:hover:bg-[#26262c] text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </Link>

          {/* Center: FoodRescue Logo & Page Heading */}
          <div className="flex items-center gap-2">
            <Logo to="/" size="sm" showText={false} />
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-neutral-900 dark:text-white">
              Join the FoodRescue Network
            </h1>
          </div>

          {/* Right: Theme Toggle & Status Indicator */}
          <div className="flex items-center gap-2">
            <ThemeToggle variant="icon" />
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-[#39FF14] animate-pulse" />
              <span>Create Account</span>
            </div>
          </div>
        </div>

        {/* ─── 2. TWO-STEP STEPPER PROGRESS INDICATOR ─── */}
        <div className="w-full max-w-sm mx-auto py-0.5">
          <div className="relative flex items-center justify-between">
            {/* Background connecting line */}
            <div className="absolute left-5 right-5 top-4 -translate-y-1/2 h-[2.5px] bg-neutral-200 dark:bg-[#232328] z-0 rounded-full" />
            
            {/* Active filled connecting line */}
            <div
              className="absolute left-5 top-4 -translate-y-1/2 h-[2.5px] bg-[#39FF14] z-0 rounded-full transition-all duration-400 ease-out shadow-[0_0_8px_rgba(57,255,20,0.6)]"
              style={{
                width: currentStep === 1 ? '0%' : 'calc(100% - 40px)',
              }}
            />

            {/* STEP 1 INDICATOR */}
            <button
              type="button"
              onClick={() => {
                if (currentStep === 2) setCurrentStep(1);
              }}
              className="relative z-10 flex flex-col items-center group cursor-pointer select-none transition-all"
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                  currentStep === 1
                    ? 'bg-[#39FF14] text-black shadow-md shadow-[#39FF14]/30 ring-3 ring-[#39FF14]/20 scale-105'
                    : 'bg-[#39FF14] text-black shadow-xs'
                }`}
              >
                {currentStep > 1 ? (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                ) : (
                  <span>1</span>
                )}
              </div>
              <div className="mt-1 text-center">
                <span className={`text-[10px] uppercase font-bold tracking-wider transition-colors block ${
                  currentStep === 1 ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'
                }`}>
                  Step 1
                </span>
                <span className={`text-[11px] font-semibold transition-colors block ${
                  currentStep === 1 ? 'text-[#39FF14]' : 'text-neutral-400 dark:text-neutral-500'
                }`}>
                  Account & Role
                </span>
              </div>
            </button>

            {/* STEP 2 INDICATOR */}
            <div className="relative z-10 flex flex-col items-center select-none">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                  currentStep === 2
                    ? 'bg-[#39FF14] text-black shadow-md shadow-[#39FF14]/30 ring-3 ring-[#39FF14]/20 scale-105'
                    : 'bg-neutral-100 dark:bg-[#1a1a20] text-neutral-400 dark:text-neutral-500 border border-neutral-300 dark:border-[#2e2e38]'
                }`}
              >
                <span>2</span>
              </div>
              <div className="mt-1 text-center">
                <span className={`text-[10px] uppercase font-bold tracking-wider transition-colors block ${
                  currentStep === 2 ? 'text-neutral-900 dark:text-white' : 'text-neutral-400 dark:text-neutral-500'
                }`}>
                  Step 2
                </span>
                <span className={`text-[11px] font-semibold transition-colors block ${
                  currentStep === 2 ? 'text-[#39FF14]' : 'text-neutral-400 dark:text-neutral-500'
                }`}>
                  {step2Title}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── STEP 1 CONTENT: ACCOUNT & ROLE (2 COLUMNS) ─── */}
        {currentStep === 1 && (
          <div className="space-y-3 sm:space-y-3.5 animate-fade-in">
            {/* Top Bar: Google Fast-Track Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-xl bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#232328]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#39FF14] shrink-0" />
                <span className="text-xs font-bold text-neutral-900 dark:text-white">Fast-Track Registration:</span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 hidden sm:inline">Sign up in 1 quick step with Google</span>
              </div>
              <div className="w-full sm:w-auto sm:min-w-[200px]">
                <GoogleAuthButton mode="signup" />
              </div>
            </div>

            {/* Platform Role Selector Cards (3 cards across) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 block">
                Select Platform Role <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                {roleOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = form.role === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update('role', opt.value)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'bg-neutral-100/90 dark:bg-[#18181e] border-[#39FF14] ring-2 ring-[#39FF14]/30 shadow-xs'
                          : 'bg-white dark:bg-[#0e0e10] border-neutral-200 dark:border-[#232328] hover:border-neutral-300 dark:hover:border-[#33333d]'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? 'bg-[#39FF14] text-black shadow-xs font-bold'
                            : 'bg-neutral-100 dark:bg-[#1a1a20] text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-bold truncate ${
                            isSelected ? 'text-neutral-900 dark:text-white' : 'text-neutral-800 dark:text-neutral-200'
                          }`}>
                            {opt.label}
                          </p>
                          {isSelected && (
                            <span className="w-3.5 h-3.5 rounded-full bg-[#39FF14] text-black flex items-center justify-center text-[9px] font-bold shrink-0 ml-1">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          {opt.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ─── 2 COLUMNS: Column 1 = Personal Details, Column 2 = Security & Password ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5 items-stretch">
              
              {/* COLUMN 1: Personal Information */}
              <div className="bg-neutral-50/70 dark:bg-[#0c0c0e]/80 p-3 sm:p-3.5 rounded-xl border border-neutral-200 dark:border-[#232328] space-y-2.5 flex flex-col justify-between">
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-2">
                    Personal Information
                  </h3>

                  <div className="space-y-2">
                    {/* Full Name */}
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                        <input
                          type="text"
                          id="register-full-name"
                          name="name"
                          autoComplete="name"
                          value={form.full_name}
                          onChange={(e) => update('full_name', e.target.value)}
                          className={`w-full bg-white dark:bg-[#121214] border ${
                            errors.full_name
                              ? 'border-rose-500 focus:ring-rose-500/20'
                              : 'border-neutral-200 dark:border-[#282830] focus:border-neutral-900 dark:focus:border-white focus:ring-neutral-900 dark:focus:ring-white'
                          } focus:outline-none focus:ring-1 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 rounded-lg px-2.5 py-1.5 pl-8 text-xs sm:text-sm transition-all`}
                          placeholder="e.g. Jane Doe"
                        />
                      </div>
                      {errors.full_name && (
                        <p className="text-[10px] text-rose-500 flex items-center gap-1 mt-1 font-medium">
                          <AlertCircle className="w-3 h-3" />
                          {errors.full_name}
                        </p>
                      )}
                    </div>

                    {/* Email Address */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        {emailVerified && form.email.trim().toLowerCase() === verifiedEmail.toLowerCase() ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-[#39FF14]">
                            <Check className="w-3 h-3 stroke-[3]" /> Verified
                          </span>
                        ) : null}
                      </div>
                      <div className="relative">
                        <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                        <input
                          type="email"
                          id="register-email"
                          name="email"
                          autoComplete="email"
                          value={form.email}
                          onBlur={handleEmailBlur}
                          onChange={(e) => {
                            update('email', e.target.value);
                            if (isEmailRegistered) {
                              setIsEmailRegistered(false);
                            }
                            if (emailVerified && e.target.value.trim().toLowerCase() !== verifiedEmail.toLowerCase()) {
                              setEmailVerified(false);
                            }
                          }}
                          className={`w-full bg-white dark:bg-[#121214] border ${
                            errors.email
                              ? 'border-rose-500 focus:ring-rose-500/20'
                              : emailVerified && form.email.trim().toLowerCase() === verifiedEmail.toLowerCase()
                              ? 'border-emerald-500/60 dark:border-[#39FF14]/50'
                              : 'border-neutral-200 dark:border-[#282830] focus:border-neutral-900 dark:focus:border-white focus:ring-neutral-900 dark:focus:ring-white'
                          } focus:outline-none focus:ring-1 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 rounded-lg px-2.5 py-1.5 pl-8 pr-16 text-xs sm:text-sm transition-all`}
                          placeholder="name@example.com"
                        />
                        {form.email && !emailVerified && (
                          <button
                            type="button"
                            onClick={() => handleRequestEmailOtp(false)}
                            disabled={sendingOtp}
                            className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-[#39FF14] hover:bg-[#32e612] text-black text-[10px] font-extrabold transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1"
                          >
                            {sendingOtp ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : null}
                            <span>{sendingOtp ? 'Sending...' : 'Verify'}</span>
                          </button>
                        )}
                      </div>
                      {errors.email && (
                        <div className="flex items-center justify-between mt-1 text-[10px]">
                          <p className="text-rose-500 flex items-center gap-1 font-medium">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>{errors.email}</span>
                          </p>
                          {(isEmailRegistered || errors.email.toLowerCase().includes('already registered')) && (
                            <Link
                              to="/login"
                              state={{ email: form.email.trim() }}
                              className="text-neutral-900 dark:text-white font-bold underline hover:text-[#39FF14] dark:hover:text-[#39FF14] transition-colors ml-2 shrink-0"
                            >
                              Sign in instead →
                            </Link>
                          )}
                        </div>
                      )}

                      {/* Inline OTP Verification Box */}
                      {showInlineOtp && !emailVerified && (
                        <div className="mt-2 p-2.5 rounded-xl bg-neutral-100/90 dark:bg-[#151518] border border-[#39FF14]/50 shadow-md space-y-2 animate-fade-in ring-1 ring-[#39FF14]/20">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#39FF14]" />
                              Enter 6-Digit Verification Code
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowInlineOtp(false)}
                              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer p-0.5 rounded transition-colors"
                              title="Close verification box"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={inlineOtpCode}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setInlineOtpCode(val);
                                if (val.length === 6) {
                                  handleVerifyInlineOtp(val);
                                }
                              }}
                              placeholder="••••••"
                              className="flex-1 bg-white dark:bg-[#0e0e10] border border-neutral-300 dark:border-[#2e2e38] focus:border-[#39FF14] focus:ring-1 focus:ring-[#39FF14] text-neutral-900 dark:text-white font-mono font-bold tracking-[0.4em] text-center text-sm py-1.5 px-3 rounded-lg focus:outline-none transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-neutral-400"
                            />

                            <button
                              type="button"
                              onClick={() => handleVerifyInlineOtp()}
                              disabled={verifyingOtp || inlineOtpCode.length !== 6}
                              className="px-3 py-1.5 rounded-lg bg-[#39FF14] hover:bg-[#32e612] text-black text-xs font-bold transition-all disabled:opacity-40 cursor-pointer shrink-0 flex items-center gap-1 shadow-xs"
                            >
                              {verifyingOtp ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 stroke-[3]" />}
                              <span>{verifyingOtp ? 'Verifying...' : 'Verify'}</span>
                            </button>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400 pt-0.5">
                            <span className="truncate max-w-[150px]">Sent to {form.email}</span>
                            {otpCountdown > 0 ? (
                              <span>Resend in <strong className="font-mono text-neutral-700 dark:text-neutral-300">{otpCountdown}s</strong></span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRequestEmailOtp(false)}
                                disabled={sendingOtp}
                                className="text-neutral-900 dark:text-white font-bold hover:text-[#39FF14] dark:hover:text-[#39FF14] underline cursor-pointer"
                              >
                                {sendingOtp ? 'Sending...' : 'Resend Code'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                        Phone Number
                      </label>
                      <div className={`flex rounded-lg overflow-hidden border ${
                        errors.phone
                          ? 'border-rose-500 focus-within:ring-rose-500/20'
                          : 'border-neutral-200 dark:border-[#282830] focus-within:border-neutral-900 dark:focus-within:border-white focus-within:ring-neutral-900 dark:focus-within:ring-white'
                      } focus-within:ring-1 bg-white dark:bg-[#121214] transition-all`}>
                        <div className="bg-neutral-100 dark:bg-[#18181c] border-r border-neutral-200 dark:border-[#282830] px-2.5 flex items-center justify-center text-xs font-semibold text-neutral-700 dark:text-neutral-300 select-none">
                          +91
                        </div>
                        <input
                          type="tel"
                          id="register-phone"
                          name="tel"
                          autoComplete="tel-national"
                          inputMode="numeric"
                          maxLength={10}
                          value={form.phone}
                          onChange={handlePhoneChange}
                          className="w-full bg-transparent text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 px-2.5 py-1.5 text-xs sm:text-sm focus:outline-none font-mono tracking-wider"
                          placeholder="9876543210"
                        />
                      </div>
                      {errors.phone && (
                        <p className="text-[10px] text-rose-500 flex items-center gap-1 mt-1 font-medium">
                          <AlertCircle className="w-3 h-3" />
                          {errors.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-200 dark:border-[#1f1f24] text-[10px] text-neutral-400 dark:text-neutral-500">
                  ℹ️ Email and phone will be used for delivery dispatches and account verification.
                </div>
              </div>

              {/* COLUMN 2: Security & Password */}
              <div className="bg-neutral-50/70 dark:bg-[#0c0c0e]/80 p-3 sm:p-3.5 rounded-xl border border-neutral-200 dark:border-[#232328] space-y-2.5 flex flex-col justify-between">
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-2">
                    Security & Password
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Create Password */}
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                        <input
                          type={showPass ? 'text' : 'password'}
                          id="register-password"
                          name="new-password"
                          autoComplete="new-password"
                          value={form.password}
                          onChange={(e) => update('password', e.target.value)}
                          className={`w-full bg-white dark:bg-[#121214] border ${
                            errors.password
                              ? 'border-rose-500 focus:ring-rose-500/20'
                              : 'border-neutral-200 dark:border-[#282830] focus:border-neutral-900 dark:focus:border-white focus:ring-neutral-900 dark:focus:ring-white'
                          } focus:outline-none focus:ring-1 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 rounded-lg px-2.5 py-1.5 pl-8 pr-7 text-xs sm:text-sm transition-all`}
                          placeholder="Min 8 chars"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors cursor-pointer"
                        >
                          {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="text-[10px] text-rose-500 flex items-center gap-1 mt-1 font-medium">
                          <AlertCircle className="w-3 h-3" />
                          {errors.password}
                        </p>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                          Confirm <span className="text-red-500">*</span>
                        </label>
                        {form.confirm_password && (
                          <span className={`text-[10px] font-bold ${
                            form.password === form.confirm_password
                              ? 'text-emerald-600 dark:text-[#39FF14]'
                              : 'text-rose-500'
                          }`}>
                            {form.password === form.confirm_password ? '✓' : '✕'}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                        <input
                          type={showConfirmPass ? 'text' : 'password'}
                          id="register-confirm-password"
                          name="confirm-password"
                          autoComplete="new-password"
                          value={form.confirm_password}
                          onChange={(e) => update('confirm_password', e.target.value)}
                          className={`w-full bg-white dark:bg-[#121214] border ${
                            errors.confirm_password
                              ? 'border-rose-500 focus:ring-rose-500/20'
                              : form.confirm_password && form.password === form.confirm_password
                              ? 'border-emerald-500/60 dark:border-[#39FF14]/50 focus:border-emerald-500'
                              : 'border-neutral-200 dark:border-[#282830] focus:border-neutral-900 dark:focus:border-white focus:ring-neutral-900 dark:focus:ring-white'
                          } focus:outline-none focus:ring-1 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 rounded-lg px-2.5 py-1.5 pl-8 pr-7 text-xs sm:text-sm transition-all`}
                          placeholder="Re-enter"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors cursor-pointer"
                        >
                          {showConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {errors.confirm_password && (
                        <p className="text-[10px] text-rose-500 flex items-center gap-1 mt-1 font-medium">
                          <AlertCircle className="w-3 h-3" />
                          {errors.confirm_password}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Password Requirements Compact Checklist */}
                <div>
                  <PasswordRequirements
                    password={form.password}
                    confirmPassword={form.confirm_password}
                    compact={false}
                  />
                </div>
              </div>
            </div>

            {/* Step 1 Next Navigation Button */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={handleProceedToStep2}
                className="btn btn-primary w-full py-2.5 sm:py-3 px-4 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#39FF14]/20 hover:shadow-[#39FF14]/30 active:scale-[0.99] transition-all uppercase tracking-wider rounded-xl"
              >
                <span>Next: {step2Title}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2 CONTENT: ROLE-SPECIFIC PROVIDER DETAILS (2 COLUMNS) ─── */}
        {currentStep === 2 && (
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5 animate-fade-in">
            {/* Header info bar for Step 2 */}
            <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#232328]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#39FF14]/15 text-[#39FF14] flex items-center justify-center font-bold border border-[#39FF14]/25">
                  <selectedRoleOption.icon className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
                    {step2Title}
                  </h2>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    Role: <span className="font-semibold text-neutral-800 dark:text-neutral-200">{selectedRoleOption.label}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-[11px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white underline underline-offset-4 cursor-pointer font-medium"
              >
                ← Change Role (Step 1)
              </button>
            </div>

            {/* ─── PROVIDER 2-COLUMN GRID ─── */}
            {form.role === 'provider' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5 items-stretch">
                {/* Column 1: Establishment Profile */}
                <div className="bg-neutral-50/70 dark:bg-[#0c0c0e]/80 p-3 sm:p-3.5 rounded-xl border border-neutral-200 dark:border-[#232328] space-y-2.5">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                    Establishment Profile
                  </h3>
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                      Business / Store Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                      <input
                        type="text"
                        value={form.business_name}
                        onChange={(e) => update('business_name', e.target.value)}
                        className={`w-full bg-white dark:bg-[#121214] border ${
                          errors.business_name
                            ? 'border-rose-500 focus:ring-rose-500/20'
                            : 'border-neutral-200 dark:border-[#282830] focus:border-neutral-900 dark:focus:border-white focus:ring-neutral-900 dark:focus:ring-white'
                        } focus:outline-none focus:ring-1 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 rounded-lg px-2.5 py-1.5 pl-8 text-xs sm:text-sm transition-all`}
                        placeholder="e.g. Grand Central Kitchen & Bakery"
                      />
                    </div>
                    {errors.business_name && (
                      <p className="text-[10px] text-rose-500 flex items-center gap-1 mt-1 font-medium">
                        <AlertCircle className="w-3 h-3" />
                        {errors.business_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                      Establishment Category
                    </label>
                    <select
                      value={form.business_type}
                      onChange={(e) => update('business_type', e.target.value)}
                      className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#282830] focus:border-neutral-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white text-neutral-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs sm:text-sm transition-all cursor-pointer"
                    >
                      <option value="restaurant">Restaurant / Eatery</option>
                      <option value="bakery">Bakery / Patisserie</option>
                      <option value="grocery">Supermarket / Grocery</option>
                      <option value="catering">Catering & Events</option>
                      <option value="other">Other Food Donor</option>
                    </select>
                  </div>
                </div>

                {/* Column 2: Pickup Location & Map */}
                <div className="bg-neutral-50/70 dark:bg-[#0c0c0e]/80 p-3 sm:p-3.5 rounded-xl border border-neutral-200 dark:border-[#232328] space-y-2.5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                      Surplus Pickup Address <span className="text-red-500">*</span>
                    </h3>
                    <div className="relative mt-1">
                      <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                      <input
                        type="text"
                        value={form.address}
                        onChange={(e) => update('address', e.target.value)}
                        className={`w-full bg-white dark:bg-[#121214] border ${
                          errors.address
                            ? 'border-rose-500 focus:ring-rose-500/20'
                            : 'border-neutral-200 dark:border-[#282830] focus:border-neutral-900 dark:focus:border-white focus:ring-neutral-900 dark:focus:ring-white'
                        } focus:outline-none focus:ring-1 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 rounded-lg px-2.5 py-1.5 pl-8 pr-24 text-xs sm:text-sm transition-all`}
                        placeholder="e.g. 124 Market St, Ground Floor"
                      />
                      <button
                        type="button"
                        onClick={() => setMapOpen(true)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-md bg-[#39FF14] hover:bg-[#32e612] text-black text-[10px] font-extrabold transition-all cursor-pointer shadow-xs border border-[#39FF14] active:scale-95"
                      >
                        <Map className="w-3 h-3 text-black stroke-[2.5]" />
                        <span>Pick on Map</span>
                      </button>
                    </div>
                    {errors.address && (
                      <p className="text-[10px] text-rose-500 flex items-center gap-1 mt-1 font-medium">
                        <AlertCircle className="w-3 h-3" />
                        {errors.address}
                      </p>
                    )}
                    {form.latitude && form.longitude && (
                      <p className="text-[10px] text-[#39FF14] mt-1.5 font-mono flex items-center gap-1">
                        <span>📍 Coordinates:</span>
                        <span className="font-semibold">{form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}</span>
                      </p>
                    )}
                  </div>

                  <div className="p-2 rounded-lg bg-neutral-100 dark:bg-[#151518] text-[10px] text-neutral-500 dark:text-neutral-400">
                    🚚 Couriers will pick up food packages directly from this address.
                  </div>
                </div>
              </div>
            )}

            {/* ─── NGO 2-COLUMN GRID ─── */}
            {form.role === 'ngo' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5 items-stretch">
                {/* Column 1: Organization & Registration */}
                <div className="bg-neutral-50/70 dark:bg-[#0c0c0e]/80 p-3 sm:p-3.5 rounded-xl border border-neutral-200 dark:border-[#232328] space-y-2.5">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                    Shelter Identity
                  </h3>
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                      NGO / Organization Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                      <input
                        type="text"
                        value={form.organization_name}
                        onChange={(e) => update('organization_name', e.target.value)}
                        className={`w-full bg-white dark:bg-[#121214] border ${
                          errors.organization_name
                            ? 'border-rose-500 focus:ring-rose-500/20'
                            : 'border-neutral-200 dark:border-[#282830] focus:border-neutral-900 dark:focus:border-white focus:ring-neutral-900 dark:focus:ring-white'
                        } focus:outline-none focus:ring-1 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 rounded-lg px-2.5 py-1.5 pl-8 text-xs sm:text-sm transition-all`}
                        placeholder="e.g. Hope Food Bank Network"
                      />
                    </div>
                    {errors.organization_name && (
                      <p className="text-[10px] text-rose-500 flex items-center gap-1 mt-1 font-medium">
                        <AlertCircle className="w-3 h-3" />
                        {errors.organization_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                      Registration / Tax ID
                    </label>
                    <input
                      type="text"
                      value={form.registration_no}
                      onChange={(e) => update('registration_no', e.target.value)}
                      className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#282830] focus:border-neutral-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm transition-all"
                      placeholder="e.g. NGO-99214"
                    />
                  </div>
                </div>

                {/* Column 2: Capacity & Distribution Address */}
                <div className="bg-neutral-50/70 dark:bg-[#0c0c0e]/80 p-3 sm:p-3.5 rounded-xl border border-neutral-200 dark:border-[#232328] space-y-2.5">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                    Capacity & Location
                  </h3>
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                      NGO Capacity (People) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                      <input
                        type="number"
                        value={form.capacity}
                        onChange={(e) => update('capacity', e.target.value)}
                        className={`w-full bg-white dark:bg-[#121214] border ${
                          errors.capacity
                            ? 'border-rose-500 focus:ring-rose-500/20'
                            : 'border-neutral-200 dark:border-[#282830] focus:border-neutral-900 dark:focus:border-white focus:ring-neutral-900 dark:focus:ring-white'
                        } focus:outline-none focus:ring-1 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 rounded-lg px-2.5 py-1.5 pl-8 text-xs sm:text-sm transition-all`}
                        placeholder="e.g. 150"
                        min="1"
                      />
                    </div>
                    {errors.capacity && (
                      <p className="text-[10px] text-rose-500 flex items-center gap-1 mt-1 font-medium">
                        <AlertCircle className="w-3 h-3" />
                        {errors.capacity}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                      Distribution Facility Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                      <input
                        type="text"
                        value={form.address}
                        onChange={(e) => update('address', e.target.value)}
                        className={`w-full bg-white dark:bg-[#121214] border ${
                          errors.address
                            ? 'border-rose-500 focus:ring-rose-500/20'
                            : 'border-neutral-200 dark:border-[#282830] focus:border-neutral-900 dark:focus:border-white focus:ring-neutral-900 dark:focus:ring-white'
                        } focus:outline-none focus:ring-1 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 rounded-lg px-2.5 py-1.5 pl-8 pr-24 text-xs sm:text-sm transition-all`}
                        placeholder="e.g. 450 Mission Blvd, Wing B"
                      />
                      <button
                        type="button"
                        onClick={() => setMapOpen(true)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-md bg-[#39FF14] hover:bg-[#32e612] text-black text-[10px] font-extrabold transition-all cursor-pointer shadow-xs border border-[#39FF14] active:scale-95"
                      >
                        <Map className="w-3 h-3 text-black stroke-[2.5]" />
                        <span>Pick on Map</span>
                      </button>
                    </div>
                    {errors.address && (
                      <p className="text-[10px] text-rose-500 flex items-center gap-1 mt-1 font-medium">
                        <AlertCircle className="w-3 h-3" />
                        {errors.address}
                      </p>
                    )}
                    {form.latitude && form.longitude && (
                      <p className="text-[10px] text-[#39FF14] mt-1.5 font-mono flex items-center gap-1">
                        <span>📍 Coordinates:</span>
                        <span className="font-semibold">{form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ─── VOLUNTEER 2-COLUMN GRID ─── */}
            {form.role === 'volunteer' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5 items-stretch">
                <div className="bg-neutral-50/70 dark:bg-[#0c0c0e]/80 p-3 sm:p-3.5 rounded-xl border border-neutral-200 dark:border-[#232328] space-y-2.5">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                    Logistics & Transport
                  </h3>
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                      Primary Transport Mode
                    </label>
                    <select
                      value={form.vehicle_type}
                      onChange={(e) => update('vehicle_type', e.target.value)}
                      className="w-full bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#282830] focus:border-neutral-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white text-neutral-900 dark:text-white rounded-lg px-2.5 py-1.5 text-xs sm:text-sm transition-all cursor-pointer"
                    >
                      <option value="car">Personal Car / SUV</option>
                      <option value="van">Van / Light Commercial</option>
                      <option value="scooter">Motorcycle / Scooter</option>
                      <option value="bike">Bicycle / Cargo E-Bike</option>
                      <option value="on_foot">On Foot (Local neighborhood)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                      Max Delivery Radius: <span className="font-bold text-[#39FF14]">{form.max_distance_km} km</span>
                    </label>
                    <div className="space-y-1">
                      <input
                        type="range"
                        min="1"
                        max="50"
                        value={form.max_distance_km}
                        onChange={(e) => update('max_distance_km', e.target.value)}
                        className="w-full accent-[#39FF14] cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                        <span>1 km</span>
                        <span>25 km</span>
                        <span>50 km</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-50/70 dark:bg-[#0c0c0e]/80 p-3 sm:p-3.5 rounded-xl border border-neutral-200 dark:border-[#232328] space-y-2.5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Mission Dispatching
                    </h3>
                    <div className="p-2.5 bg-white dark:bg-[#121214] rounded-lg border border-neutral-200 dark:border-[#232328] text-neutral-600 dark:text-neutral-400 text-xs flex items-start gap-2 shadow-2xs">
                      <Sparkles className="w-3.5 h-3.5 text-[#39FF14] shrink-0 mt-0.5" />
                      <p className="leading-relaxed text-[11px]">
                        Volunteers receive real-time push alerts and route directions whenever surplus food listings are ready nearby.
                      </p>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-neutral-100 dark:bg-[#151518] text-[10px] text-neutral-500 dark:text-neutral-400">
                    🛡️ Safe food handling guidelines will be available on your volunteer courier dashboard.
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 Bottom Actions: Back + Create Account */}
            <div className="pt-0.5 flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-[#1b1b1f] dark:hover:bg-[#26262c] text-neutral-700 dark:text-neutral-200 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full flex-1 py-2.5 sm:py-3 px-4 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#39FF14]/25 hover:shadow-[#39FF14]/35 active:scale-[0.99] transition-all disabled:opacity-60 uppercase tracking-wider rounded-xl"
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
            </div>

            <p className="text-[10px] text-neutral-500 text-center leading-relaxed">
              By creating an account, you agree to FoodRescue food safety and hygiene guidelines.
            </p>
          </form>
        )}

        {/* Map Address Picker Modal */}
        <MapAddressPickerModal
          isOpen={mapOpen}
          onClose={() => setMapOpen(false)}
          initialAddress={form.address}
          initialLat={form.latitude || 28.6139}
          initialLng={form.longitude || 77.2090}
          title={
            form.role === 'provider'
              ? 'Select Surplus Pickup Location'
              : form.role === 'ngo'
              ? 'Select Facility Location'
              : 'Select Your Location'
          }
          onSelectLocation={({ address, latitude, longitude }) => {
            setForm(prev => ({
              ...prev,
              address,
              latitude,
              longitude,
            }));
            if (errors.address) {
              setErrors(prev => {
                const next = { ...prev };
                delete next.address;
                return next;
              });
            }
            toast.success('Pickup location pinned successfully!');
          }}
        />

        {/* Email Verification OTP Modal */}
        <EmailVerificationModal
          isOpen={showOtpModal}
          onClose={() => setShowOtpModal(false)}
          email={form.email.trim()}
          sendOtpFn={sendEmailOtp}
          verifyOtpFn={verifyEmailOtp}
          onVerified={({ email }) => {
            setEmailVerified(true);
            setVerifiedEmail(email);
            setErrors(prev => {
              const next = { ...prev };
              delete next.email;
              return next;
            });
            toast.success('Email verified! Moving to Step 2...');
            setCurrentStep(2);
            if (cardTopRef.current) {
              cardTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
        />

        {/* Bottom sign-in link */}
        <div className="text-center pt-1 border-t border-neutral-200 dark:border-[#232328]">
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
