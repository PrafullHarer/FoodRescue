import React, { useState, useEffect } from 'react';
import {
  X, Mail, KeyRound, ArrowRight, ArrowLeft,
  CheckCircle2, AlertCircle, RefreshCw, Eye, EyeOff, Sparkles, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import PasswordRequirements, { evaluatePassword } from '../common/PasswordRequirements';

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  initialIdentifier = '',
  onSuccess,
}) {
  const [step, setStep] = useState('REQUEST'); // 'REQUEST' | 'RESET' | 'SUCCESS'
  const [identifier, setIdentifier] = useState(initialIdentifier || '');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setStep('REQUEST');
      setIdentifier(initialIdentifier || '');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setCountdown(0);
    }
  }, [isOpen, initialIdentifier]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  if (!isOpen) return null;

  // Step 1: Send OTP
  const handleRequestCode = async (e) => {
    if (e) e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) {
      toast.error('Please enter your email address or User ID');
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
      toast.error(err.response?.data?.message || 'Failed to send recovery code. Please check your email or User ID.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password with OTP
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
      if (onSuccess) onSuccess(newPassword);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password. Please check your code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || loading) return;
    await handleRequestCode();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#27272e] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-[#222228]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {step === 'REQUEST' && 'Reset Password'}
                {step === 'RESET' && 'Enter Verification Code'}
                {step === 'SUCCESS' && 'Password Reset Complete'}
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {step === 'REQUEST' && 'Recover access using your email or User ID'}
                {step === 'RESET' && `Code sent to ${maskedEmail || 'your email'}`}
                {step === 'SUCCESS' && 'Your account security has been updated'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#1f1f24] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* STEP 1: REQUEST OTP */}
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
                    placeholder="e.g. alex@example.com or PRO-123456"
                    className="w-full bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#27272e] focus:border-neutral-900 dark:focus:border-white focus:outline-none text-neutral-900 dark:text-white placeholder:text-neutral-400 rounded-xl px-4 py-3 pl-10 text-sm transition-all"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1.5">
                  We'll send a 6-digit recovery code to the registered email address.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-[#2b2b34] hover:bg-neutral-100 dark:hover:bg-[#1c1c22] text-neutral-700 dark:text-neutral-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !identifier.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      Send Code <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: VERIFY OTP & ENTER NEW PASSWORD */}
          {step === 'RESET' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* 6-digit OTP */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    6-Digit Verification Code
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep('REQUEST')}
                    className="text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                  >
                    Change Email
                  </button>
                </div>
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

              {/* New Password */}
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

              {/* Confirm Password */}
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

              {/* Password Requirements Checklist */}
              <PasswordRequirements
                password={newPassword}
                confirmPassword={confirmPassword}
                compact={true}
              />

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={countdown > 0 || loading}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50 cursor-pointer"
                >
                  {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('REQUEST')}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-[#2b2b34] hover:bg-neutral-100 dark:hover:bg-[#1c1c22] text-neutral-700 dark:text-neutral-300 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !otp || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SUCCESS */}
          {step === 'SUCCESS' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-neutral-900 dark:text-white">
                  Password Updated!
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs mx-auto">
                  Your password has been changed. You can now use your new password to sign in.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

