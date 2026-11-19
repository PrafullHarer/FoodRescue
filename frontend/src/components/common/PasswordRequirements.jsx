import React from 'react';
import { Check, Circle, AlertCircle, CheckCircle2 } from 'lucide-react';

export const PASSWORD_RULES = [
  { id: 'len', label: 'At least 8 characters', test: (p) => (p || '').length >= 8 },
  { id: 'upper', label: '1 uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p || '') },
  { id: 'lower', label: '1 lowercase letter (a-z)', test: (p) => /[a-z]/.test(p || '') },
  { id: 'num', label: '1 number (0-9)', test: (p) => /[0-9]/.test(p || '') },
  { id: 'spec', label: '1 special character (!@#$%^&*)', test: (p) => /[^A-Za-z0-9]/.test(p || '') },
];

export const evaluatePassword = (password = '') => {
  const criteria = PASSWORD_RULES.map((rule) => ({
    ...rule,
    met: rule.test(password),
  }));
  const metCount = criteria.filter((c) => c.met).length;
  const isValid = metCount === PASSWORD_RULES.length;

  let strengthLabel = 'Very Weak';
  let strengthColor = 'text-rose-500';
  let barColor = 'bg-rose-500';

  if (metCount === 5) {
    strengthLabel = 'Strong';
    strengthColor = 'text-emerald-500 dark:text-emerald-400';
    barColor = 'bg-emerald-500';
  } else if (metCount >= 4) {
    strengthLabel = 'Good';
    strengthColor = 'text-lime-500';
    barColor = 'bg-lime-500';
  } else if (metCount >= 3) {
    strengthLabel = 'Medium';
    strengthColor = 'text-amber-500';
    barColor = 'bg-amber-500';
  } else if (metCount >= 2) {
    strengthLabel = 'Weak';
    strengthColor = 'text-orange-500';
    barColor = 'bg-orange-500';
  }

  return { criteria, metCount, isValid, strengthLabel, strengthColor, barColor };
};

export default function PasswordRequirements({
  password = '',
  confirmPassword = null,
  compact = false,
  className = '',
}) {
  const { criteria, metCount, isValid, strengthLabel, strengthColor, barColor } = evaluatePassword(password);
  const hasTyped = password.length > 0;
  const hasConfirmTyped = confirmPassword !== null && confirmPassword !== undefined && confirmPassword.length > 0;
  const passwordsMatch = hasConfirmTyped && password === confirmPassword;
  const passwordsMismatch = hasConfirmTyped && password !== confirmPassword;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Strength Bar & Header */}
      {hasTyped && (
        <div className="space-y-1.5 animate-fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
              Password Strength: <strong className={strengthColor}>{strengthLabel}</strong>
            </span>
            <span className="text-[10px] text-neutral-400 font-medium">
              {metCount} of {PASSWORD_RULES.length} requirements met
            </span>
          </div>
          <div className="flex gap-1.5 h-1.5 w-full">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <div
                key={lvl}
                className={`h-full flex-1 rounded-full transition-all duration-300 ${
                  metCount >= lvl ? barColor : 'bg-neutral-200 dark:bg-[#232328]'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Rules Checklist */}
      <div className="p-3.5 bg-neutral-50 dark:bg-[#121214] border border-neutral-200 dark:border-[#282830] rounded-xl space-y-2 shadow-2xs">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
            Password Requirements:
          </p>
          {isValid && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 dark:text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> All Requirements Met
            </span>
          )}
        </div>

        <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-1.5 text-[11px]`}>
          {criteria.map((criterion) => (
            <div
              key={criterion.id}
              className={`flex items-center gap-1.5 transition-colors duration-150 ${
                criterion.met
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : hasTyped
                  ? 'text-neutral-500 dark:text-neutral-400'
                  : 'text-neutral-400 dark:text-neutral-500'
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

        {/* Optional Confirm Password Live Feedback */}
        {hasConfirmTyped && (
          <div className="pt-2 border-t border-neutral-200 dark:border-[#232328] flex items-center justify-between text-[11px]">
            <span className="text-neutral-500 dark:text-neutral-400 font-medium">Confirmation match:</span>
            {passwordsMatch ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Passwords match
              </span>
            ) : passwordsMismatch ? (
              <span className="text-rose-500 dark:text-rose-400 font-bold inline-flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Passwords do not match
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

