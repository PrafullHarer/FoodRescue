import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  KeyRound, Mail, ArrowLeft, ArrowRight,
  RefreshCw, CheckCircle2, Sparkles, Eye, EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import Logo from '../../components/common/Logo';
import ThemeToggle from '../../components/common/ThemeToggle';
import PasswordRequirements, { evaluatePassword } from '../../components/common/PasswordRequirements';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('REQUEST'); // 'REQUEST' | 'RESET' | 'SUCCESS'
  const [identifier, setIdentifier] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleRequestCode = async (e) => {
    if (e) e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) {
      toast.error('Please enter your email address or User ID');
      return;
    }

    if (cleanId.toLowerCase().includes('admin')) {
      toast.error('Self-service password recovery is disabled for Super Administrator accounts.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { identifier: cleanId });
      const data = res.data?.data || {};
      setMaskedEmail(data.email_masked || cleanId);
      toast.success(res.data?.message || 'Verification code sent to your email.');
      setStep('RESET');
      setCountdown(30);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send recovery code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!otp.trim()) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }

    const { isValid } = evaluatePassword(newPassword);
    if (!isValid) {
      toast.error('Please meet all password requirements before proceeding.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        identifier: identifier.trim(),
        otp: otp.trim(),
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      toast.success(res.data?.message || 'Password reset successfully!');
      setStep('SUCCESS');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password. Please check your code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#070709] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-block mb-4">
          <Logo />
        </Link>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
          {step === 'REQUEST' && 'Forgot Password'}
          {step === 'RESET' && 'Reset Password'}
          {step === 'SUCCESS' && 'Password Reset Complete'}
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
          {step === 'REQUEST' && 'Enter your email or unique User ID to receive a verification code.'}
          {step === 'RESET' && `Enter the 6-digit code sent to ${maskedEmail || 'your email'}.`}
          {step === 'SUCCESS' && 'You can now sign in with your updated password.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-[#121214] py-8 px-5 sm:px-8 shadow-xl border border-neutral-200 dark:border-[#232328] rounded-2xl space-y-6">
          {step === 'REQUEST' && (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                  Email Address or Unique User ID
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. name@example.com or PRO-123456"
                    className="w-full bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#27272e] focus:border-neutral-900 dark:focus:border-white focus:outline-none text-neutral-900 dark:text-white placeholder:text-neutral-400 rounded-xl px-4 py-3 pl-10 text-sm transition-all"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !identifier.trim()}
                className="w-full py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-bold text-sm transition-all shadow-md active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <>Send Verification Code <ArrowRight className="w-4 h-4" /></>}
              </button>

              <p className="text-[11px] text-neutral-500 dark:text-neutral-500 text-center leading-relaxed">
                Available for all Food Providers, NGOs & Community Shelters, and Volunteer Couriers. (Super Administrator accounts cannot use email recovery).
              </p>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white inline-flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
              </div>
            </form>
          )}

          {step === 'RESET' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#27272e] focus:border-neutral-900 dark:focus:border-white focus:outline-none text-neutral-900 dark:text-white text-center font-mono text-xl tracking-widest rounded-xl py-2.5 transition-all"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter strong new password"
                    className="w-full bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#27272e] focus:border-neutral-900 dark:focus:border-white focus:outline-none text-neutral-900 dark:text-white placeholder:text-neutral-400 rounded-xl px-4 py-2.5 pr-10 text-sm transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#27272e] focus:border-neutral-900 dark:focus:border-white focus:outline-none text-neutral-900 dark:text-white placeholder:text-neutral-400 rounded-xl px-4 py-2.5 text-sm transition-all"
                  required
                />
              </div>

              <PasswordRequirements
                password={newPassword}
                confirmPassword={confirmPassword}
                compact={true}
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={handleRequestCode}
                  disabled={countdown > 0 || loading}
                  className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50 cursor-pointer"
                >
                  {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('REQUEST')}
                  className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  Change Email
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || !otp || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-md active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Reset Password'}
              </button>
            </form>
          )}

          {step === 'SUCCESS' && (
            <div className="text-center py-4 space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Password Updated!
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs mx-auto">
                  Your password has been changed. You can now use your new password to sign in.
                </p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-bold text-sm transition-all shadow-md cursor-pointer"
              >
                Proceed to Sign In →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

