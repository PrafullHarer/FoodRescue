import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';
import toast from 'react-hot-toast';
import {
  Clock, ShieldAlert, CheckCircle2, AlertTriangle, ArrowLeft,
  RefreshCw, LayoutDashboard, Mail, HelpCircle, Sparkles, Building2,
  Check, FileCheck, Shield, ChevronRight
} from 'lucide-react';
import Logo from '../../components/common/Logo';
import ThemeToggle from '../../components/common/ThemeToggle';

export default function VerificationPendingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout } = useAuth();

  // Retrieve initial email from location state, search param, auth session, or sessionStorage
  const initialEmail =
    location.state?.email ||
    searchParams.get('email') ||
    user?.email ||
    sessionStorage.getItem('foodrescue_pending_email') ||
    '';

  const [email, setEmail] = useState(initialEmail);
  const [inputEmail, setInputEmail] = useState(initialEmail);
  const [statusData, setStatusData] = useState({
    verification_status: location.state?.verification_status || location.state?.status || 'PENDING',
    role: location.state?.role || user?.role || '',
    full_name: location.state?.full_name || user?.full_name || '',
    organization_name: location.state?.organization_name || '',
    rejection_reason: location.state?.rejection_reason || '',
    info_requested_notes: location.state?.info_requested_notes || '',
    approved_at: null,
  });
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState(new Date());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const pollTimerRef = useRef(null);

  // Sync email to sessionStorage and URL query param
  useEffect(() => {
    if (email) {
      sessionStorage.setItem('foodrescue_pending_email', email);
      if (searchParams.get('email') !== email) {
        setSearchParams({ email }, { replace: true });
      }
    }
  }, [email, searchParams, setSearchParams]);

  // Fetch latest verification status from backend API
  const fetchStatus = useCallback(async (targetEmail, isManual = false) => {
    const emailToCheck = (targetEmail || email || '').trim();
    if (!emailToCheck) return;

    if (isManual) setLoading(true);
    try {
      const res = await api.get(`/auth/verification-status?email=${encodeURIComponent(emailToCheck)}`);
      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        setStatusData({
          verification_status: data.verification_status,
          role: data.role,
          full_name: data.full_name,
          organization_name: data.organization_name,
          rejection_reason: data.rejection_reason,
          info_requested_notes: data.info_requested_notes,
          approved_at: data.approved_at,
        });
        setLastChecked(new Date());

        if (isManual) {
          if (data.verification_status === 'APPROVED') {
            toast.success('Great news! Your account has been approved by the administrator.');
          } else if (data.verification_status === 'REJECTED') {
            toast.error('Your registration was not approved. See details below.');
          } else if (data.verification_status === 'SUSPENDED') {
            toast.error('Your account is currently suspended.');
          } else {
            toast.success('Status checked: Your application is currently under review.');
          }
        }
      }
    } catch (err) {
      if (isManual) {
        const msg = err.response?.data?.message || 'Could not verify status. Please verify the email address.';
        toast.error(msg);
      }
    } finally {
      if (isManual) setLoading(false);
    }
  }, [email]);

  // Fetch status on initial mount if email is available
  useEffect(() => {
    if (email) {
      fetchStatus(email, false);
    }
  }, [email, fetchStatus]);

  // Auto-refresh periodically (every 30 seconds) while status is PENDING and tab is visible
  useEffect(() => {
    if (!autoRefreshEnabled || !email || statusData.verification_status !== 'PENDING') {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    pollTimerRef.current = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return; // Pause polling when tab is not visible
      }
      fetchStatus(email, false);
    }, 30000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [autoRefreshEnabled, email, statusData.verification_status, fetchStatus]);

  const handleManualCheck = (e) => {
    if (e) e.preventDefault();
    fetchStatus(email, true);
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!inputEmail.trim()) {
      toast.error('Please enter your account email address.');
      return;
    }
    setEmail(inputEmail.trim());
    fetchStatus(inputEmail.trim(), true);
  };

  const handleGoToDashboard = () => {
    // If the user already has an active approved session, route to dashboard;
    // otherwise direct them to login with a friendly prefilled message
    if (user && user.verification_status === 'APPROVED') {
      navigate('/dashboard');
    } else {
      navigate('/login', {
        state: {
          email,
          approved: true,
          message: 'Your account has been approved! Please enter your password to sign in.',
        },
      });
    }
  };

  const handleBackToLogin = async () => {
    if (user) {
      try {
        await logout();
      } catch {
        // ignore
      }
    }
    navigate('/login', { state: { email } });
  };

  const currentStatus = statusData.verification_status || 'PENDING';

  return (
    <div className="min-h-screen w-full bg-[#F9FAFB] dark:bg-[#050505] text-neutral-900 dark:text-white flex flex-col items-center justify-center p-4 sm:p-6 font-sans transition-colors duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] rounded-2xl sm:rounded-[28px] p-6 sm:p-10 shadow-xl shadow-black/5 dark:shadow-black/70 space-y-6 animate-fade-in relative transition-colors">
        
        {/* Top Navigation Bar: Back to Login & Theme Toggle */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-[#1f1f24]">
          <button
            type="button"
            onClick={handleBackToLogin}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-[#1b1b1f] dark:hover:bg-[#26262c] text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </button>
          <div className="flex items-center gap-3">
            <Logo to="/" size="sm" showText={false} />
            <ThemeToggle variant="icon" />
          </div>
        </div>

        {/* 1. PENDING STATUS VIEW */}
        {currentStatus === 'PENDING' && (
          <div className="space-y-6 text-center">
            {/* Friendly Verification Icon with Glow */}
            <div className="flex flex-col items-center pt-2">
              <div className="relative flex items-center justify-center mb-4">
                <div className="w-20 h-20 rounded-3xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shadow-lg shadow-amber-500/5">
                  <Clock className="w-10 h-10 animate-pulse" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center border-2 border-white dark:border-[#121214] shadow-md">
                  <Shield className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Status Badge */}
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 uppercase tracking-wider mb-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                PENDING ADMIN APPROVAL
              </span>

              {/* Heading */}
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white mt-1">
                Your Account Is Under Review
              </h1>

              {/* Main Message */}
              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 mt-2.5 max-w-lg leading-relaxed">
                Thank you for joining FoodRescue! Your registration and profile verification request have been successfully submitted. Our admin team is currently reviewing your information.
              </p>

              {/* Additional message */}
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-2 max-w-md">
                Please wait until your account is approved. This process may take some time. You can check back later to see whether your account has been approved.
              </p>
            </div>

            {/* Applicant Summary Banner (if email known) */}
            {email && (
              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#18181b] border border-neutral-200 dark:border-[#26262b] text-left flex items-center justify-between text-xs sm:text-sm">
                <div className="min-w-0 pr-2">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 dark:text-neutral-500">
                    Registration Account
                  </div>
                  <div className="font-semibold text-neutral-900 dark:text-white truncate">
                    {email}
                  </div>
                  {statusData.full_name && (
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                      {statusData.full_name} {statusData.role && `• ${statusData.role.toUpperCase()}`}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className="px-2.5 py-1 rounded-lg bg-neutral-200/60 dark:bg-[#27272a] text-neutral-700 dark:text-neutral-300 text-[11px] font-medium">
                    In Queue
                  </span>
                </div>
              </div>
            )}

            {/* Supporting Information Cards */}
            <div className="grid grid-cols-1 gap-2.5 text-left pt-1">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-[#151518] border border-neutral-200/80 dark:border-[#202025]">
                <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
                  <span className="font-semibold text-neutral-900 dark:text-white">Registration Submitted:</span> Your account details have been submitted successfully.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-[#151518] border border-neutral-200/80 dark:border-[#202025]">
                <div className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
                  <span className="font-semibold text-neutral-900 dark:text-white">Admin Verification:</span> Our administrator will review your registration and role details.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-[#151518] border border-neutral-200/80 dark:border-[#202025]">
                <div className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
                  <span className="font-semibold text-neutral-900 dark:text-white">Dashboard Access:</span> You will be able to access your dashboard after approval.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-[#151518] border border-neutral-200/80 dark:border-[#202025]">
                <div className="w-5 h-5 rounded-full bg-purple-500/15 text-purple-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <RefreshCw className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
                  <span className="font-semibold text-neutral-900 dark:text-white">Stay Tuned:</span> Please check back after some time.
                </div>
              </div>
            </div>

            {/* If applicant needs to provide email to track */}
            {!email && (
              <form onSubmit={handleEmailSubmit} className="pt-2 text-left space-y-2">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Enter your registration email to check status:
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    placeholder="e.g. foodprovider@gmail.com"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-[#2b2b32] bg-white dark:bg-[#18181c] text-neutral-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-semibold transition-all cursor-pointer"
                  >
                    Set Email
                  </button>
                </div>
              </form>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleManualCheck}
                disabled={loading || !email}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-semibold text-sm transition-all shadow-md active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Checking Status...' : 'Check Approval Status'}</span>
              </button>

              <button
                type="button"
                onClick={handleBackToLogin}
                className="py-3 px-5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-[#1e1e24] dark:hover:bg-[#282830] text-neutral-800 dark:text-white font-semibold text-sm transition-all cursor-pointer"
              >
                Back to Login
              </button>
            </div>

            {/* Polling Indicator */}
            <div className="pt-1 flex items-center justify-center gap-2 text-[11px] text-neutral-400 dark:text-neutral-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Auto-checking every 30s • Last checked {lastChecked.toLocaleTimeString()}</span>
            </div>
          </div>
        )}

        {/* 2. APPROVED STATUS VIEW */}
        {currentStatus === 'APPROVED' && (
          <div className="space-y-6 text-center animate-fade-in">
            <div className="flex flex-col items-center pt-2">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 uppercase tracking-wider mb-2">
                <Check className="w-3.5 h-3.5" />
                ACCOUNT APPROVED
              </span>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white mt-1">
                Your Account Has Been Approved!
              </h1>

              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 mt-2.5 max-w-md leading-relaxed">
                Your account has been approved! You can now access your dashboard and start using FoodRescue.
              </p>
            </div>

            {email && (
              <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 text-left text-xs sm:text-sm">
                <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400">
                  Verified Member
                </div>
                <div className="font-semibold text-neutral-900 dark:text-white mt-0.5">
                  {statusData.full_name || email}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Role: <span className="uppercase font-semibold">{statusData.role}</span> {statusData.organization_name && `• ${statusData.organization_name}`}
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleGoToDashboard}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.99] cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Go to Dashboard</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full py-2.5 px-4 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Log In to Another Account
              </button>
            </div>
          </div>
        )}

        {/* 3. REJECTED STATUS VIEW */}
        {currentStatus === 'REJECTED' && (
          <div className="space-y-6 text-center animate-fade-in">
            <div className="flex flex-col items-center pt-2">
              <div className="w-20 h-20 rounded-3xl bg-rose-500/10 text-rose-500 border border-rose-500/25 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/10">
                <AlertTriangle className="w-10 h-10" />
              </div>

              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 uppercase tracking-wider mb-2">
                <ShieldAlert className="w-3.5 h-3.5" />
                REGISTRATION NOT APPROVED
              </span>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white mt-1">
                Registration Under Review Update
              </h1>

              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 mt-2.5 max-w-md leading-relaxed">
                Thank you for your interest in FoodRescue. Unfortunately, your registration could not be approved at this time.
              </p>
            </div>

            {/* Display Reason */}
            {statusData.rejection_reason && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-left">
                <div className="text-[10px] uppercase font-bold tracking-wider text-rose-700 dark:text-rose-400">
                  Reason Provided
                </div>
                <p className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 mt-1 font-medium leading-relaxed">
                  {statusData.rejection_reason}
                </p>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#18181b] border border-neutral-200 dark:border-[#26262b] text-left text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
              <div className="font-semibold text-neutral-900 dark:text-white">Need help or wish to appeal?</div>
              <div>
                If you believe this was an error or would like to submit updated documentation, please contact our administrator team at{' '}
                <a href="mailto:support@foodrescue.org" className="text-emerald-600 dark:text-emerald-400 underline font-medium">
                  support@foodrescue.org
                </a>.
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleManualCheck}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-semibold text-sm transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Re-check Status</span>
              </button>

              <button
                type="button"
                onClick={handleBackToLogin}
                className="py-3 px-5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-[#1e1e24] dark:hover:bg-[#282830] text-neutral-800 dark:text-white font-semibold text-sm transition-all cursor-pointer"
              >
                Back to Login
              </button>
            </div>
          </div>
        )}

        {/* 4. SUSPENDED STATUS VIEW */}
        {currentStatus === 'SUSPENDED' && (
          <div className="space-y-6 text-center animate-fade-in">
            <div className="flex flex-col items-center pt-2">
              <div className="w-20 h-20 rounded-3xl bg-red-500/10 text-red-500 border border-red-500/25 flex items-center justify-center mb-4 shadow-lg shadow-red-500/10">
                <ShieldAlert className="w-10 h-10" />
              </div>

              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/25 uppercase tracking-wider mb-2">
                ACCOUNT SUSPENDED
              </span>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white mt-1">
                Account Temporarily Disabled
              </h1>

              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 mt-2.5 max-w-md leading-relaxed">
                This account has been suspended by an administrator. Active sessions and dashboard access have been revoked.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#18181b] border border-neutral-200 dark:border-[#26262b] text-left text-xs text-neutral-600 dark:text-neutral-400 space-y-1.5">
              <div className="font-semibold text-neutral-900 dark:text-white">Support & Assistance</div>
              <div>
                To resolve account suspension or inquire about compliance policies, please get in touch with FoodRescue support at{' '}
                <a href="mailto:support@foodrescue.org" className="text-emerald-600 dark:text-emerald-400 underline font-medium">
                  support@foodrescue.org
                </a>.
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleManualCheck}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-semibold text-sm transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Check Status</span>
              </button>

              <button
                type="button"
                onClick={handleBackToLogin}
                className="py-3 px-5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-[#1e1e24] dark:hover:bg-[#282830] text-neutral-800 dark:text-white font-semibold text-sm transition-all cursor-pointer"
              >
                Back to Login
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

