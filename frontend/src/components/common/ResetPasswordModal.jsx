import React, { useState } from 'react';
import { X, KeyRound, Mail, Lock, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import PasswordRequirements, { evaluatePassword } from './PasswordRequirements';

export default function ResetPasswordModal({ isOpen, onClose, initialEmail = '' }) {
  const [step, setStep] = useState(1); // 1 = enter email, 2 = enter otp & new password
  const [identifier, setIdentifier] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error('Please enter your registered email address or User ID.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', {
        email: identifier.trim(),
        identifier: identifier.trim(),
      });

      toast.success(data.message || 'Recovery code sent!');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request recovery code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast.error('Please enter the 6-digit recovery code.');
      return;
    }

    const { isValid, criteria } = evaluatePassword(newPassword);
    if (!isValid) {
      const missing = criteria.filter((c) => !c.met).map((c) => c.label).join(', ');
      toast.error(`Password requirement not met: ${missing}`);
      return;
    }

    if (!confirmPassword) {
      toast.error('Please confirm your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        email: identifier.trim(),
        identifier: identifier.trim(),
        otp: otp.trim(),
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      toast.success(data.message || 'Password reset successfully! You can now log in.');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setStep(1);
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#282830] rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-[#232328]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {step === 1 ? 'Reset Your Password' : 'Set New Password'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {step === 1 ? 'Enter your email or User ID to receive a code' : 'Enter verification code and your new password'}
              </p>
            </div>
          </div>

          <button
            onClick={resetAll}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#1f1f26] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1: Request Code */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                Registered Email or User ID
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@example.com or PRO-849201"
                  required
                  className="w-full bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#232328] focus:border-neutral-900 dark:focus:border-white focus:outline-none rounded-xl px-4 py-2.5 pl-10 text-sm text-neutral-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={resetAll}
                className="btn-secondary text-xs py-2 px-3.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold"
              >
                {loading ? 'Sending Code...' : 'Send Recovery Code'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Enter Code & Set New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                6-Digit Recovery Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                required
                className="w-full bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#232328] focus:border-neutral-900 dark:focus:border-white focus:outline-none rounded-xl px-4 py-2 text-center text-lg font-mono font-bold tracking-widest text-neutral-900 dark:text-white"
              />
            </div>

            {/* New Password */}
            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create new strong password"
                  required
                  className="w-full bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#232328] focus:border-neutral-900 dark:focus:border-white focus:outline-none rounded-xl px-4 py-2.5 pl-10 pr-10 text-sm text-neutral-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                {confirmPassword && (
                  <span className={`text-[11px] font-bold ${
                    newPassword === confirmPassword
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-500'
                  }`}>
                    {newPassword === confirmPassword ? '✓ Passwords match' : '✕ Passwords do not match'}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  className="w-full bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#232328] focus:border-neutral-900 dark:focus:border-white focus:outline-none rounded-xl px-4 py-2.5 pl-10 pr-10 text-sm text-neutral-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Live Password Requirements & Strength */}
            <PasswordRequirements
              password={newPassword}
              confirmPassword={confirmPassword}
              compact={true}
            />

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-white underline cursor-pointer"
              >
                Back to step 1
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetAll}
                  className="btn-secondary text-xs py-2 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold"
                >
                  {loading ? 'Setting Password...' : 'Save New Password'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

