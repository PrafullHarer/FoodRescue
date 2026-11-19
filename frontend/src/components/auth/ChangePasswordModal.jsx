import React, { useState } from 'react';
import { X, KeyRound, Eye, EyeOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import PasswordRequirements, { evaluatePassword } from '../common/PasswordRequirements';

export default function ChangePasswordModal({
  isOpen,
  onClose,
  onForgotPassword,
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Current password is required.');
      return;
    }

    const { isValid } = evaluatePassword(newPassword);
    if (!isValid) {
      toast.error('Please meet all password requirements before proceeding.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      toast.success(res.data?.message || 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
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
                Change Password
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Update your account security credentials
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Current Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Current Password
              </label>
              {onForgotPassword && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onForgotPassword();
                  }}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Forgot current password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                className="w-full bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#27272e] focus:border-neutral-900 dark:focus:border-white focus:outline-none text-neutral-900 dark:text-white placeholder:text-neutral-400 rounded-xl px-4 py-2.5 pr-10 text-sm transition-all"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new strong password"
                className="w-full bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#27272e] focus:border-neutral-900 dark:focus:border-white focus:outline-none text-neutral-900 dark:text-white placeholder:text-neutral-400 rounded-xl px-4 py-2.5 pr-10 text-sm transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
              Confirm New Password
            </label>
            <input
              type={showNew ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type new password"
              className="w-full bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#27272e] focus:border-neutral-900 dark:focus:border-white focus:outline-none text-neutral-900 dark:text-white placeholder:text-neutral-400 rounded-xl px-4 py-2.5 text-sm transition-all"
              required
            />
          </div>

          {/* Real-time Password Rules Checklist */}
          <PasswordRequirements
            password={newPassword}
            confirmPassword={confirmPassword}
            compact={true}
          />

          {/* Actions */}
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
              disabled={loading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                'Save Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

