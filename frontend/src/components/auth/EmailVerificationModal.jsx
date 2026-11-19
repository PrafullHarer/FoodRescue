import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Mail, CheckCircle2, X, RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EmailVerificationModal({
  isOpen,
  onClose,
  email,
  onVerified,
  sendOtpFn,
  verifyOtpFn,
}) {
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRefs = useRef([]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setOtpDigits(['', '', '', '', '', '']);
      setErrorMsg('');
      setCountdown(60);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Resend countdown timer
  useEffect(() => {
    if (!isOpen || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleDigitChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);
    setErrorMsg('');

    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullCode = newDigits.join('');
    if (fullCode.length === 6) {
      handleVerify(fullCode);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedText) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedText[i] || '';
    }
    setOtpDigits(newDigits);
    setErrorMsg('');

    const nextFocusIndex = Math.min(pastedText.length, 5);
    inputRefs.current[nextFocusIndex]?.focus();

    if (pastedText.length === 6) {
      handleVerify(pastedText);
    }
  };

  const handleVerify = async (codeToVerify = null) => {
    const fullOtp = codeToVerify || otpDigits.join('');
    if (fullOtp.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the verification code.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await verifyOtpFn(email, fullOtp);
      toast.success(res?.message || 'Email verified successfully!');
      onVerified({
        email,
        verificationToken: res?.verification_token,
      });
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Incorrect or expired verification code.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setErrorMsg('');
    try {
      await sendOtpFn(email);
      toast.success(`New code sent to ${email}!`);
      setCountdown(60);
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to resend code.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#141418] border-2 border-neutral-300 dark:border-[#2e2e38] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl relative space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#1f1f24] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Title */}
        <div className="text-center space-y-1 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-[#39FF14]/15 text-[#39FF14] border border-[#39FF14]/30 flex items-center justify-center mx-auto mb-2 shadow-sm shadow-[#39FF14]/20">
            <Mail className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
            Verify Your Email Address
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto leading-relaxed">
            We sent a 6-digit code to <span className="font-semibold text-neutral-900 dark:text-white font-mono">{email}</span>
          </p>
        </div>

        {/* 6-Digit OTP Boxes */}
        <div className="py-2">
          <div className="flex items-center justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className={`w-10 h-12 sm:w-11 sm:h-12 text-center text-lg sm:text-xl font-bold font-mono rounded-xl border ${
                  errorMsg
                    ? 'border-rose-500 bg-rose-50/20 text-rose-500 focus:border-rose-500'
                    : digit
                    ? 'border-[#39FF14] bg-neutral-50 dark:bg-[#1a1a20] text-neutral-900 dark:text-white ring-1 ring-[#39FF14]/40'
                    : 'border-neutral-300 dark:border-[#33333d] bg-neutral-50 dark:bg-[#16161a] text-neutral-900 dark:text-white focus:border-neutral-900 dark:focus:border-white'
                } focus:outline-none transition-all`}
              />
            ))}
          </div>

          {errorMsg && (
            <p className="text-[11px] text-rose-500 flex items-center justify-center gap-1.5 mt-2 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </p>
          )}
        </div>

        {/* Action Button: Verify */}
        <button
          type="button"
          onClick={() => handleVerify()}
          disabled={submitting}
          className="btn btn-primary w-full py-3 px-4 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#39FF14]/20 hover:shadow-[#39FF14]/30 active:scale-[0.99] transition-all uppercase tracking-wider rounded-xl disabled:opacity-60"
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
              <span>Verify & Continue</span>
            </>
          )}
        </button>

        {/* Resend Code & Cancel */}
        <div className="flex items-center justify-between text-[11px] pt-1 text-neutral-500 dark:text-neutral-400">
          <div>
            {countdown > 0 ? (
              <span>Resend in <strong className="font-mono text-neutral-700 dark:text-neutral-300">{countdown}s</strong></span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-neutral-900 dark:text-white font-bold hover:text-[#39FF14] dark:hover:text-[#39FF14] underline underline-offset-2 transition-colors cursor-pointer flex items-center gap-1"
              >
                {resending && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>Resend Code</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
