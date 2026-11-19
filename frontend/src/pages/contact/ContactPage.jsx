import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../../components/common/Logo';
import ThemeToggle from '../../components/common/ThemeToggle';
import {
  Mail, ArrowLeft, Copy, Check, Send, Sparkles, UtensilsCrossed, Building, Truck, LifeBuoy
} from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();
const OFFICIAL_EMAIL = '2026.food.rescue@gmail.com';

export default function ContactPage() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(OFFICIAL_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFCF8] dark:bg-[#070907] text-neutral-900 dark:text-neutral-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* ══════════════════════════════════════════════════════════════
          PAGE HEADER
      ══════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-[#0c100c]/85 backdrop-blur-xl border-b border-neutral-200/80 dark:border-neutral-800/80 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Home</span>
            </Link>
            <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-800" />
            <Logo to="/" size="sm" showText={true} />
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle variant="icon" />
            {user ? (
              <Link
                to="/dashboard"
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════
          MAIN CONTENT (Sole Point of Contact: Email)
      ══════════════════════════════════════════════════════════════ */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-16 w-full flex flex-col justify-center">
        {/* Title */}
        <div className="text-center space-y-3 mb-10 md:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Direct Communication
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-neutral-900 dark:text-white tracking-tight">
            Contact FoodRescue
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-lg mx-auto leading-relaxed">
            Our central operations and coordination desk is reachable exclusively via our official project email.
          </p>
        </div>

        {/* Central Dedicated Email Hero Card */}
        <div className="rounded-3xl bg-white dark:bg-[#0e120e] border border-neutral-200/90 dark:border-neutral-800/90 shadow-2xl shadow-black/5 dark:shadow-black/30 p-8 sm:p-10 space-y-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 pb-8 border-b border-neutral-100 dark:border-neutral-800/80">
            <div className="flex items-center sm:items-start gap-4 text-center sm:text-left flex-col sm:flex-row">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Mail className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  Official Point of Contact
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
                  2026.food.rescue@gmail.com
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                  Monitored 24/7 across all rescue operations and support inquiries
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopyEmail}
                className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                title="Copy email to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Email</span>
                  </>
                )}
              </button>

              <a
                href={`mailto:${OFFICIAL_EMAIL}`}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Email</span>
              </a>
            </div>
          </div>

          {/* Inquiry Categories */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              What You Can Email Us For
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800/60 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white">Commercial Food Donors</h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                    Surplus listings, corporate food recovery partnerships, and kitchen pickup schedules.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800/60 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white">Shelters & NGOs</h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                    Shelter onboarding, meal allocation requirements, and non-profit verification.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800/60 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white">Volunteer Couriers</h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                    Joining the volunteer rescue fleet, delivery mission questions, and verification badges.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800/60 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <LifeBuoy className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white">Technical & General Support</h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                    Account access, OTP verification, QR handoff issues, and platform suggestions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Response Time Guarantee */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span>⚡ Typical response time: <strong>2 – 4 hours</strong></span>
            <span>Coordination desk active 24/7</span>
          </div>
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#070907] py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-2">
            <Logo to="/" size="xs" showText={true} />
            <span>· © {CURRENT_YEAR} FoodRescue Network</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Home</Link>
            <Link to="/feedback" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Feedback</Link>
            <Link to="/contact" className="text-emerald-600 dark:text-emerald-400 font-bold">Contact</Link>
            <Link to="/login" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
