import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ThemeToggle from '../../components/common/ThemeToggle';
import Logo from '../../components/common/Logo';
import api from '../../api/client';
import foodRescueCommunityImg from '../../assets/food_rescue_community.jpg';
import {
  Box, ArrowRight, CheckCircle2, Store, HeartHandshake,
  Truck, Sparkles, Clock, MapPin, QrCode, Leaf,
  ChevronRight, Menu, X, Star, Play, MessageSquarePlus
} from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();

export default function LandingPage() {
  const { user } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeRoleTab, setActiveRoleTab] = useState('provider');
  const [impactMetrics, setImpactMetrics] = useState({
    meals_saved: 609,
    donations_completed: 14,
    deliveries: { completed_deliveries: 4 },
  });
  const [loadingImpact, setLoadingImpact] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchMetrics = () => {
      api.get('/analytics/public-impact')
        .then((res) => {
          if (isMounted && res.data?.success && res.data?.data) {
            setImpactMetrics(res.data.data);
          }
        })
        .catch((err) => {
          console.warn('Could not fetch public impact metrics:', err.message);
        })
        .finally(() => {
          if (isMounted) setLoadingImpact(false);
        });
    };

    fetchMetrics();
    // Poll every 15 seconds to keep impact stats dynamically updated in realtime
    const pollInterval = setInterval(fetchMetrics, 15000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, []);

  const roles = [
    {
      id: 'provider',
      title: 'Food Providers',
      badge: 'Restaurants, Bakeries & Groceries',
      icon: Store,
      desc: 'Turn surplus ingredients and prepared meals into community sustenance while receiving verified ESG reports.',
      benefits: [
        'Post surplus listings in under 30 seconds with photos & expiry times',
        'Automated real-time dispatch to nearby verified shelters',
        'Verifiable digital receipts for CSR and tax deductions',
        'Eliminate commercial food disposal waste charges',
      ],
      ctaText: 'Start Donating Surplus',
      ctaLink: '/register',
    },
    {
      id: 'ngo',
      title: 'NGOs & Shelters',
      badge: 'Community Pantries & Charities',
      icon: HeartHandshake,
      desc: 'Access verified nutritious surplus food in real time to feed those who need it most in your area.',
      benefits: [
        'Live localized feed of fresh surplus food matching dietary preferences',
        '1-click instant reservations before food expiry countdowns',
        'Volunteer delivery courier dispatch right to your doorstep',
        'Transparent quality checklist and dietary labeling',
      ],
      ctaText: 'Register Your Shelter',
      ctaLink: '/register',
    },
    {
      id: 'volunteer',
      title: 'Volunteer Couriers',
      badge: 'Drivers, Cyclists & Walkers',
      icon: Truck,
      desc: 'Be the hero on the road. Accept flexible rescue delivery missions that fit your daily commute schedule.',
      benefits: [
        'Browse nearby pickup-and-dropoff delivery runs',
        'Built-in QR code scanner for secure and contactless physical handoff',
        'Gamified delivery leaderboard and verified service badges',
        'Flexible hours: deliver by bicycle, car, scooter, or walking',
      ],
      ctaText: 'Join Volunteer Fleet',
      ctaLink: '/register',
    },
  ];

  const sampleDonations = [
    {
      title: 'Fresh Artisan Sourdough & Pastries',
      provider: 'Greenhouse Artisan Bakery',
      category: 'Bakery',
      quantity: '45 Loaves & Buns',
      servings: '60 Servings',
      expiresIn: '2 hrs 40 mins',
      distance: '1.4 km away',
      tags: ['Vegetarian', 'Nut-Free'],
      status: 'Ready for Pickup',
    },
    {
      title: 'Pre-Packaged Healthy Lunch Boxes',
      provider: 'Grand Metropolitan Caterers',
      category: 'Prepared Meals',
      quantity: '85 Boxes',
      servings: '85 Servings',
      expiresIn: '4 hrs 15 mins',
      distance: '2.8 km away',
      tags: ['Halal', 'Balanced Meal'],
      status: 'Claimed • In Transit',
    },
    {
      title: 'Organic Farm Vegetables & Apples',
      provider: 'Sunrise Organic Supermarket',
      category: 'Fresh Produce',
      quantity: '120 kg Crate',
      servings: '200+ Servings',
      expiresIn: '18 hrs remaining',
      distance: '3.1 km away',
      tags: ['Vegan', 'Gluten-Free'],
      status: 'Available Now',
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'List in 30 Seconds',
      desc: 'Food businesses post surplus food with quantity, dietary badges, pickup window, and expiry countdown.',
      icon: Store,
    },
    {
      step: '02',
      title: 'Instant Smart Match',
      desc: 'Nearby shelters receive instant notifications and reserve available surplus packages with 1-click claim.',
      icon: HeartHandshake,
    },
    {
      step: '03',
      title: 'QR-Verified Handoff',
      desc: 'Volunteer couriers accept delivery missions and scan dynamic QR codes at pickup and dropoff for complete transparency.',
      icon: QrCode,
    },
  ];

  const testimonials = [
    {
      quote: 'FoodRescue transformed our closing routine. Instead of discarding 30 kg of artisan pastries every evening, local community kitchens pick them up within 40 minutes.',
      author: 'Marcus Vance',
      role: 'Executive Pastry Chef, Vance Bakery Co.',
      badge: 'Food Provider',
    },
    {
      quote: 'The real-time claim notifications allow our shelter kitchen to plan dinner services with fresh, high-quality ingredients that would otherwise have been lost.',
      author: 'Elena Rodriguez',
      role: 'Operations Director, Hope Community Center',
      badge: 'NGO Shelter',
    },
    {
      quote: 'Delivering meals between my university lectures is deeply rewarding. The QR code verification makes every pickup and dropoff crystal clear.',
      author: 'Aarav Patel',
      role: 'Active Volunteer Courier (120+ Missions)',
      badge: 'Top Volunteer',
    },
  ];

  return (
    <div className="min-h-screen w-full bg-[#F9FAFB] dark:bg-[#050505] text-neutral-900 dark:text-white flex flex-col font-sans transition-colors duration-200">
      {/* ─── Sticky Navbar ───────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full bg-white/90 dark:bg-[#0c0c0e]/90 backdrop-blur-xl border-b border-[#E5E7EB] dark:border-[#232328] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <Logo to="/" size="md" showText={true} subtitle="Surplus Redistribution" />

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-neutral-600 dark:text-neutral-400">
            <a href="#how-it-works" className="hover:text-neutral-900 dark:hover:text-white transition-colors">How It Works</a>
            <a href="#roles" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Solutions</a>
            <a href="#live-feed" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Live Feed</a>
            <a href="#impact" className="hover:text-neutral-900 dark:hover:text-white transition-colors">ESG Impact</a>
            <a href="#testimonials" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Stories</a>
            <Link to="/feedback" className="hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1.5 font-semibold text-neutral-800 dark:text-neutral-200">
              <MessageSquarePlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Feedback</span>
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle variant="icon" />

            {user ? (
              <Link
                to="/dashboard"
                className="btn btn-primary text-xs sm:text-sm"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-2 rounded-xl text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#18181b] transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="btn btn-primary text-xs sm:text-sm"
                >
                  <span>Rescue Food Today</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Menu Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle variant="icon" />
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="p-2 rounded-xl bg-neutral-100 dark:bg-[#18181b] border border-neutral-200 dark:border-[#232328] text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-[#232328] transition-all"
              aria-label="Toggle navigation menu"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileNavOpen && (
          <div className="md:hidden border-b border-[#E5E7EB] dark:border-[#232328] bg-white dark:bg-[#0c0c0e] px-5 py-6 space-y-4 animate-fade-in shadow-xl">
            <nav className="flex flex-col space-y-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
              <a
                href="#how-it-works"
                onClick={() => setMobileNavOpen(false)}
                className="py-1 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                How It Works
              </a>
              <a
                href="#roles"
                onClick={() => setMobileNavOpen(false)}
                className="py-1 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                Solutions
              </a>
              <a
                href="#live-feed"
                onClick={() => setMobileNavOpen(false)}
                className="py-1 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                Live Feed
              </a>
              <a
                href="#impact"
                onClick={() => setMobileNavOpen(false)}
                className="py-1 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                ESG Impact
              </a>
              <a
                href="#testimonials"
                onClick={() => setMobileNavOpen(false)}
                className="py-1 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                Stories
              </a>
              <Link
                to="/feedback"
                onClick={() => setMobileNavOpen(false)}
                className="py-1 hover:text-neutral-900 dark:hover:text-white font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 transition-colors"
              >
                <MessageSquarePlus className="w-4 h-4" />
                <span>Submit Feedback</span>
              </Link>
            </nav>
            <div className="pt-4 border-t border-neutral-200 dark:border-[#232328] flex flex-col gap-2.5">
              {user ? (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileNavOpen(false)}
                  className="btn btn-primary w-full text-center"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileNavOpen(false)}
                    className="btn btn-secondary w-full text-center"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileNavOpen(false)}
                    className="btn btn-primary w-full text-center"
                  >
                    Rescue Food Today
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* ─── Hero Section ────────────────────────────────────────── */}
        <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 lg:pt-24 lg:pb-32 overflow-hidden bg-[#F9FAFB] dark:bg-[#050505] transition-colors duration-200">
          {/* Subtle Ambient Glows aligned with dashboard theme */}
          <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[380px] bg-neutral-200/50 dark:bg-white/[0.03] rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute top-1/3 right-10 w-[450px] h-[350px] bg-neutral-200/40 dark:bg-white/[0.02] rounded-full blur-[130px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              
              {/* Left Column — Messaging */}
              <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-left animate-fade-in">
                
                {/* Eyebrow Label with small indicator */}
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-neutral-100 dark:bg-[#18181b] border border-neutral-200 dark:border-[#232328] text-xs font-semibold text-neutral-700 dark:text-neutral-300 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="uppercase tracking-wider">FOOD RESCUE • COMMUNITY IMPACT • ZERO WASTE</span>
                </div>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-neutral-900 dark:text-white leading-[1.08]">
                  Waste Less.<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-500 dark:from-white dark:via-neutral-200 dark:to-neutral-400">
                    Feed More.
                  </span><br />
                  Change Lives.
                </h1>

                {/* Supporting Description */}
                <p className="text-base sm:text-lg lg:text-xl text-neutral-600 dark:text-neutral-400 max-w-xl leading-relaxed">
                  Every day, good food goes to waste while communities face food insecurity. FoodRescue seamlessly connects food providers, verified shelters, and volunteer couriers to turn surplus into nourishment.
                </p>

                {/* Primary & Secondary CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                  <Link
                    to={user ? '/dashboard' : '/register'}
                    className="btn btn-primary text-sm sm:text-base px-7 py-3.5 rounded-xl shadow-md"
                  >
                    <span>Rescue Food Today</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </Link>
                  <a
                    href="#how-it-works"
                    className="btn btn-secondary text-sm sm:text-base px-7 py-3.5 rounded-xl"
                  >
                    <Play className="w-4 h-4 fill-current opacity-70" />
                    <span>Explore How It Works</span>
                  </a>
                </div>

                {/* Trust Statement */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                  <p className="font-semibold tracking-wide text-neutral-700 dark:text-neutral-300">
                    Built for the entire redistribution ecosystem:
                  </p>
                  <div className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-[#232328]" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 font-semibold text-[11px] text-amber-700 dark:text-amber-300 shadow-xs">
                      <Store className="w-3.5 h-3.5 text-amber-500" /> Providers
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/25 font-semibold text-[11px] text-rose-700 dark:text-rose-300 shadow-xs">
                      <HeartHandshake className="w-3.5 h-3.5 text-rose-500" /> NGOs
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/25 font-semibold text-[11px] text-sky-700 dark:text-sky-300 shadow-xs">
                      <Truck className="w-3.5 h-3.5 text-sky-500" /> Volunteers
                    </span>
                  </div>
                </div>

              </div>

              {/* Right Column — Visual Storytelling */}
              <div className="lg:col-span-5 relative mt-6 lg:mt-0">
                {/* Image Container matching dashboard card styling */}
                <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-neutral-200 dark:border-[#232328] shadow-2xl bg-white dark:bg-[#121214] group">
                  <img
                    src={foodRescueCommunityImg}
                    alt="Volunteers and community staff packaging surplus meals for rescue"
                    className="w-full h-[380px] sm:h-[460px] lg:h-[520px] object-cover object-center transform group-hover:scale-102 transition-transform duration-700 ease-out"
                    loading="eager"
                  />
                  {/* Gradient overlay for text legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

                  {/* Floating Impact Badge */}
                  <div className="absolute bottom-5 left-5 right-5 sm:right-auto sm:left-6 sm:bottom-6 bg-white/95 dark:bg-[#121214]/95 backdrop-blur-md border border-neutral-200 dark:border-[#232328] rounded-2xl p-4 shadow-xl flex items-center gap-3.5 max-w-sm">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-[#1c1c20] border border-neutral-200 dark:border-[#27272e] flex items-center justify-center text-neutral-900 dark:text-white shrink-0">
                      <Leaf className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-900 dark:text-white leading-tight">
                        Good food. Greater impact.
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Direct community redistribution network
                      </p>
                    </div>
                  </div>

                  {/* Top-right subtle badge */}
                  <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-white flex items-center gap-1.5 shadow-sm">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>Real-Time Dispatch</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ─── Impact Statistics Strip ─────────────────────────────── */}
        <section id="impact" className="py-10 border-y border-neutral-200 dark:border-[#232328] bg-neutral-50 dark:bg-[#0c0c0e] transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
              
              {/* Metric 1: Meals rescued */}
              <div className="stat-card relative overflow-hidden p-6 rounded-2xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] hover:border-emerald-500/50 dark:hover:border-emerald-500/40 flex flex-col justify-between shadow-xs hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Meals Rescued
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                      <Leaf className="w-5 h-5 stroke-[2.2]" />
                    </div>
                  </div>
                  <p className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                    {Number(impactMetrics?.meals_saved ?? 609).toLocaleString()}+
                  </p>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Nourishing surplus diverted from local waste streams</span>
                </p>
              </div>

              {/* Metric 2: Food donations completed */}
              <div className="stat-card relative overflow-hidden p-6 rounded-2xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] hover:border-amber-500/50 dark:hover:border-amber-500/40 flex flex-col justify-between shadow-xs hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300 group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Food Donations Completed
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                      <HeartHandshake className="w-5 h-5 stroke-[2.2]" />
                    </div>
                  </div>
                  <p className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                    {Number(impactMetrics?.donations_completed ?? 14).toLocaleString()}+
                  </p>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Coordinated directly between donors and verified shelters</span>
                </p>
              </div>

              {/* Metric 3: Successful deliveries */}
              <div className="stat-card relative overflow-hidden p-6 rounded-2xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] hover:border-sky-500/50 dark:hover:border-sky-500/40 flex flex-col justify-between shadow-xs hover:shadow-lg hover:shadow-sky-500/5 transition-all duration-300 group">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-indigo-500" />
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Successful Deliveries
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                      <Truck className="w-5 h-5 stroke-[2.2]" />
                    </div>
                  </div>
                  <p className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                    {Number(impactMetrics?.deliveries?.completed_deliveries ?? 4).toLocaleString()}+
                  </p>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  <span>Contactless QR-verified transport by local couriers</span>
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ─── How It Works ────────────────────────────────────────── */}
        <section id="how-it-works" className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Simple 3-Step Process</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white tracking-tight">
              How FoodRescue Works in Minutes
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
              Designed from the ground up for busy kitchen staff, urgent shelter needs, and rapid courier delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {steps.map((step, idx) => {
              const stepStyles = [
                {
                  line: 'from-emerald-500 to-teal-400',
                  badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
                  hover: 'hover:border-emerald-500/40 hover:shadow-emerald-500/5',
                },
                {
                  line: 'from-amber-500 to-orange-400',
                  badge: 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400',
                  hover: 'hover:border-amber-500/40 hover:shadow-amber-500/5',
                },
                {
                  line: 'from-sky-500 to-indigo-500',
                  badge: 'bg-sky-500/15 border-sky-500/30 text-sky-600 dark:text-sky-400',
                  hover: 'hover:border-sky-500/40 hover:shadow-sky-500/5',
                },
              ][idx];

              return (
                <div key={idx} className={`p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] flex flex-col justify-between relative group ${stepStyles.hover} shadow-sm transition-all duration-300 overflow-hidden`}>
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stepStyles.line}`} />
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-3xl font-extrabold text-neutral-300 dark:text-neutral-700 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">{step.step}</span>
                      <div className={`w-12 h-12 rounded-xl ${stepStyles.badge} border flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs`}>
                        <step.icon className="w-6 h-6" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">{step.title}</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{step.desc}</p>
                  </div>
                  <div className="pt-6 mt-6 border-t border-neutral-200 dark:border-[#232328] flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Real-time automation</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── Role Solutions Showcase ─────────────────────────────── */}
        <section id="roles" className="py-20 border-t border-neutral-200 dark:border-[#232328] bg-neutral-50 dark:bg-[#0c0c0e] transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Built for Every Participant</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white tracking-tight">
                Tailored for Food Donors, Shelters & Volunteers
              </h2>
            </div>

            {/* Role Switcher Tabs */}
            <div className="flex items-center justify-center gap-2.5 mb-10 overflow-x-auto pb-2">
              {roles.map((r) => {
                const isActive = activeRoleTab === r.id;
                const roleThemes = {
                  provider: {
                    active: 'bg-[#39FF14] text-black shadow-md shadow-[#39FF14]/30 font-bold',
                    icon: 'text-amber-500',
                  },
                  ngo: {
                    active: 'bg-[#39FF14] text-black shadow-md shadow-[#39FF14]/30 font-bold',
                    icon: 'text-rose-500',
                  },
                  volunteer: {
                    active: 'bg-[#39FF14] text-black shadow-md shadow-[#39FF14]/30 font-bold',
                    icon: 'text-sky-500',
                  },
                }[r.id];

                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveRoleTab(r.id)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                      isActive
                        ? roleThemes.active
                        : 'bg-white dark:bg-[#18181b] border border-neutral-200 dark:border-[#232328] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-400 dark:hover:border-neutral-600'
                    }`}
                  >
                    <r.icon className={`w-4 h-4 ${isActive ? 'text-white' : roleThemes.icon}`} />
                    <span>{r.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Role Content Card */}
            {roles
              .filter((r) => r.id === activeRoleTab)
              .map((role) => (
                <div key={role.id} className="p-6 sm:p-10 rounded-2xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] max-w-4xl mx-auto animate-fade-in shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-5">
                      <div className="inline-block">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-[#18181b] text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-[#232328]">{role.badge}</span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">{role.title}</h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{role.desc}</p>
                      
                      <Link
                        to={role.ctaLink}
                        className="btn btn-primary text-sm px-6 py-3 rounded-xl shadow-sm"
                      >
                        <span>{role.ctaText}</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>

                    <div className="bg-neutral-50 dark:bg-[#18181b] border border-neutral-200 dark:border-[#232328] rounded-2xl p-6 space-y-3.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white mb-2">Key Advantages</h4>
                      {role.benefits.map((benefit, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm text-neutral-600 dark:text-neutral-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>

        {/* ─── Live Feed Preview ───────────────────────────────────── */}
        <section id="live-feed" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Live Surplus Showcase</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white tracking-tight mt-1">
                Recent Food Packages Rescued
              </h2>
            </div>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white hover:underline"
            >
              <span>Explore All Live Listings</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sampleDonations.map((item, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] flex flex-col justify-between hover:border-neutral-400 dark:hover:border-neutral-600 shadow-sm transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-[#18181b] border border-neutral-200 dark:border-[#232328] text-neutral-800 dark:text-neutral-200">{item.category}</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Clock className="w-3 h-3" />
                      {item.expiresIn}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-neutral-900 dark:text-white leading-snug">{item.title}</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
                      {item.provider}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-200 dark:border-[#232328] text-xs">
                    <div>
                      <span className="text-neutral-500 dark:text-neutral-400 block">Quantity</span>
                      <span className="font-semibold text-neutral-900 dark:text-white">{item.quantity}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 dark:text-neutral-400 block">Estimated Servings</span>
                      <span className="font-semibold text-neutral-900 dark:text-white">{item.servings}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag, tIdx) => (
                      <span key={tIdx} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 dark:bg-[#18181b] border border-neutral-200 dark:border-[#232328] text-neutral-600 dark:text-neutral-400">{tag}</span>
                    ))}
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-neutral-200 dark:border-[#232328] flex items-center justify-between">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
                    {item.distance}
                  </span>
                  <Link
                    to="/register"
                    className="text-xs font-bold text-neutral-900 dark:text-white hover:underline flex items-center gap-1"
                  >
                    Claim Food <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Testimonials / Social Proof ─────────────────────────── */}
        <section id="testimonials" className="py-20 border-t border-neutral-200 dark:border-[#232328] bg-neutral-50 dark:bg-[#0c0c0e] transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Community Voices</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white tracking-tight">
                Trusted by 450+ Food Businesses & Shelters
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((t, idx) => (
                <div key={idx} className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] flex flex-col justify-between shadow-sm">
                  <div className="space-y-4">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed italic">
                      "{t.quote}"
                    </p>
                  </div>

                  <div className="pt-6 mt-6 border-t border-neutral-200 dark:border-[#232328] flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-neutral-900 dark:text-white">{t.author}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.role}</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 dark:bg-[#18181b] border border-neutral-200 dark:border-[#232328] text-neutral-600 dark:text-neutral-400">{t.badge}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Community Feedback Callout ─────────────────────────── */}
        <section className="py-14 border-t border-neutral-200 dark:border-[#232328] bg-white dark:bg-[#050505] transition-colors duration-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="p-6 sm:p-8 rounded-2xl bg-neutral-50 dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm">
              <div className="space-y-1.5 max-w-xl">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <MessageSquarePlus className="w-4 h-4" />
                  <span>Public Feedback & Suggestions</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">
                  Help Us Improve FoodRescue
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Have an idea, found an issue, or want to share your experience? Anyone can submit anonymous or identified feedback without an account.
                </p>
              </div>
              <Link
                to="/feedback"
                className="btn btn-secondary text-sm font-semibold whitespace-nowrap self-start sm:self-center"
              >
                <span>Share Feedback</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Bottom CTA Banner ───────────────────────────────────── */}
        <section className="py-20 md:py-24 relative overflow-hidden bg-neutral-50 dark:bg-[#0c0c0e] transition-colors duration-200 border-t border-neutral-200 dark:border-[#232328]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="p-8 sm:p-14 rounded-3xl text-center space-y-6 relative overflow-hidden bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] shadow-xl">
              <div className="flex justify-center">
                <Logo to="/" size="xl" showText={false} />
              </div>

              <h2 className="text-3xl sm:text-5xl font-bold text-neutral-900 dark:text-white tracking-tight max-w-2xl mx-auto leading-tight">
                Ready to Help Eliminate Food Waste in Your City?
              </h2>

              <p className="text-base text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto">
                Join our network today. Whether you have surplus food, represent a community shelter, or want to deliver meals as a courier.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
                <Link
                  to="/register"
                  className="btn btn-primary text-sm sm:text-base px-8 py-3.5 rounded-xl shadow-md w-full sm:w-auto"
                >
                  <span>Create Free Account</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="btn btn-secondary text-sm sm:text-base px-8 py-3.5 rounded-xl w-full sm:w-auto"
                >
                  <span>Sign In to Portal</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Comprehensive Footer ─────────────────────────────────── */}
      <footer className="border-t border-neutral-200 dark:border-[#232328] bg-white dark:bg-[#0c0c0e] py-12 text-sm text-neutral-600 dark:text-neutral-400 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Brand Info */}
            <div className="space-y-3 md:col-span-1">
              <Logo to="/" size="sm" showText={true} />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Smart surplus food donation and redistribution platform combating food insecurity and greenhouse carbon emissions.
              </p>
            </div>

            {/* Links: Platform */}
            <div>
              <p className="font-semibold text-neutral-900 dark:text-white text-xs uppercase tracking-wider mb-3">Platform</p>
              <ul className="space-y-2 text-xs">
                <li><a href="#how-it-works" className="hover:text-neutral-900 dark:hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#live-feed" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Live Surplus Feed</a></li>
                <li><a href="#impact" className="hover:text-neutral-900 dark:hover:text-white transition-colors">ESG Analytics</a></li>
                <li><Link to="/feedback" className="hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                  <span>Give Feedback</span>
                </Link></li>
                <li><Link to="/register" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Become a Partner</Link></li>
              </ul>
            </div>

            {/* Links: Portals */}
            <div>
              <p className="font-semibold text-neutral-900 dark:text-white text-xs uppercase tracking-wider mb-3">Portals</p>
              <ul className="space-y-2 text-xs">
                <li><Link to="/login" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Food Provider Login</Link></li>
                <li><Link to="/login" className="hover:text-neutral-900 dark:hover:text-white transition-colors">NGO & Shelter Portal</Link></li>
                <li><Link to="/login" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Volunteer Courier Hub</Link></li>
                <li><Link to="/login" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Admin Governance</Link></li>
              </ul>
            </div>

            {/* Status & Trust */}
            <div className="space-y-3">
              <p className="font-semibold text-neutral-900 dark:text-white text-xs uppercase tracking-wider mb-3">Network Status</p>
              <div className="p-3.5 rounded-xl bg-neutral-100 dark:bg-[#18181b] border border-neutral-200 dark:border-[#232328] space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">All Systems Operational</span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">PostGIS Geolocation & Real-time WebSockets active.</p>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-neutral-200 dark:border-[#232328] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500 dark:text-neutral-400">
            <p>© {CURRENT_YEAR} FoodRescue Platform. Built for Social Good.</p>
            <div className="flex items-center gap-6">
              <Link to="/feedback" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Feedback & Inquiries</Link>
              <a href="#privacy" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Privacy Notice</a>
              <a href="#terms" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
