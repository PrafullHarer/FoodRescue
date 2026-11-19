import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../../components/common/Logo';
import ThemeToggle from '../../components/common/ThemeToggle';
import {
  Mail, PhoneCall, Building2, MapPin, Clock, ArrowLeft
} from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();

export default function ContactPage() {
  const { user } = useAuth();

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
          MAIN CONTENT (Direct Contact Details)
      ══════════════════════════════════════════════════════════════ */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-12 md:py-16 w-full flex flex-col justify-center">
        {/* Title */}
        <div className="text-center space-y-3 mb-10 md:mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Company Coordinates
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-neutral-900 dark:text-white tracking-tight">
            Contact Information
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto leading-relaxed">
            Direct communication channels for food businesses, community shelters, volunteer couriers, and partners.
          </p>
        </div>

        {/* 3 Contact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          
          {/* Card 1: Official Email */}
          <div className="p-7 rounded-3xl bg-white dark:bg-[#0e120e] border border-neutral-200/90 dark:border-neutral-800/90 shadow-xl shadow-black/5 dark:shadow-black/25 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Mail className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                  Email Us
                </span>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Official Project Email
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Monitored 24/7 for all platform inquiries
                </p>
              </div>

              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <a
                  href="mailto:2026.food.rescue@gmail.com"
                  className="text-sm font-black text-emerald-600 dark:text-emerald-400 hover:underline break-all block leading-relaxed"
                >
                  2026.food.rescue@gmail.com
                </a>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Send us a message anytime. Our coordinators typically respond within 2 to 4 hours.
              </p>
            </div>
          </div>

          {/* Card 2: Phone & Helplines */}
          <div className="p-7 rounded-3xl bg-white dark:bg-[#0e120e] border border-neutral-200/90 dark:border-neutral-800/90 shadow-xl shadow-black/5 dark:shadow-black/25 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <PhoneCall className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
                  Call Us (+91)
                </span>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Helplines & Dispatch
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  All-India toll-free and mobile support
                </p>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase font-bold">General Helpline</span>
                  <a
                    href="tel:+9118005557372"
                    className="font-bold text-neutral-900 dark:text-white hover:text-emerald-600 font-mono text-sm"
                  >
                    +91 1800 555 7372
                  </a>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px] uppercase font-bold">Direct Coordinator</span>
                  <a
                    href="tel:+919876543210"
                    className="font-bold text-neutral-900 dark:text-white hover:text-emerald-600 font-mono text-sm"
                  >
                    +91 98765 43210
                  </a>
                </div>
                <div>
                  <span className="text-amber-600 dark:text-amber-400 block text-[10px] uppercase font-bold">24/7 Food Emergency</span>
                  <a
                    href="tel:+919876543211"
                    className="font-bold text-amber-600 dark:text-amber-400 hover:underline font-mono text-sm"
                  >
                    +91 98765 43211
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                For urgent large surplus batches needing immediate pickup, call the 24/7 emergency line.
              </p>
            </div>
          </div>

          {/* Card 3: Headquarters & Hours */}
          <div className="p-7 rounded-3xl bg-white dark:bg-[#0e120e] border border-neutral-200/90 dark:border-neutral-800/90 shadow-xl shadow-black/5 dark:shadow-black/25 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 block mb-1">
                  Visit Us
                </span>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Headquarters & Hours
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  FoodRescue India Foundation
                </p>
              </div>

              <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed text-xs">
                    <span className="font-bold text-neutral-900 dark:text-white block">
                      FoodRescue India Foundation
                    </span>
                    Level 4, Innov8 Hub, 80 Feet Road<br />
                    Koramangala 4th Block, Bengaluru, Karnataka 560034, India
                  </p>
                </div>

                <div className="flex items-start gap-2.5 pt-1">
                  <Clock className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-neutral-600 dark:text-neutral-300 leading-relaxed text-xs">
                    <p><span className="font-bold text-neutral-900 dark:text-white">Live Support:</span> Mon – Sat, 9:00 AM – 8:00 PM IST</p>
                    <p><span className="font-bold text-neutral-900 dark:text-white">Dispatch Engine:</span> 24/7/365 active</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Dispatch engine runs continuously without interruption across all partner networks.
              </p>
            </div>
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
            <span>· © {CURRENT_YEAR} FoodRescue India Foundation</span>
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
