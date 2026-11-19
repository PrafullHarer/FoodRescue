import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/common/ThemeToggle';
import Logo from '../../components/common/Logo';
import api from '../../api/client';

import foodRescueCommunityImg from '../../assets/food_rescue_community.jpg';

import {
  Heart, Store, HeartHandshake, Truck, ArrowRight, CheckCircle2,
  Clock, MapPin, QrCode, Star, MessageSquarePlus, Mail,
  ShieldCheck, ChevronDown, ChevronUp, Utensils,
  Leaf, Menu, X, Package, Zap, BadgeCheck,
  Wheat, Apple, Coffee, Soup, Sparkles,
  Calculator, TrendingUp, Users, DollarSign,
  Flame, Award, Check, Sun, Moon
} from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();

// Section navigation with scroll-spy
const NAV_SECTIONS = [
  { id: 'hero', label: 'Home' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'live-feed', label: 'Live Surplus Feed' },
  { id: 'trust-network', label: 'Trust & Safety' },
  { id: 'community', label: 'Community Stories' },
  { id: 'faq', label: 'FAQ' },
];

export default function LandingPage() {
  const { user } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(0); // Open first by default
  const [activeSection, setActiveSection] = useState('hero');
  const [scrolled, setScrolled] = useState(false);

  // Filter category for Live Surplus Feed
  const [activeCategory, setActiveCategory] = useState('All');

  // Interactive Dual-QR Checkpoint simulation state ('pickup' | 'delivery')
  const [simulatedCheckpoint, setSimulatedCheckpoint] = useState('pickup');

  // Active step in Journey strip
  const [activeJourneyStep, setActiveJourneyStep] = useState(0);

  // Live analytics impact metrics
  const [impactMetrics, setImpactMetrics] = useState({
    meals_saved: 10450,
    donations_completed: 285,
    deliveries: { completed_deliveries: 540 },
    active_ngos: 112,
  });

  // Fetch live metrics from backend
  useEffect(() => {
    let isMounted = true;
    api.get('/analytics/public-impact')
      .then((res) => {
        if (isMounted && res.data?.success && res.data?.data) {
          const d = res.data.data;
          setImpactMetrics((prev) => ({
            meals_saved: Math.max(d.meals_saved || 0, prev.meals_saved),
            donations_completed: Math.max(d.donations_completed || 0, prev.donations_completed),
            deliveries: {
              completed_deliveries: Math.max(
                d.deliveries?.completed_deliveries || 0,
                prev.deliveries?.completed_deliveries || 0
              ),
            },
            active_ngos: d.active_ngos || prev.active_ngos,
          }));
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Scroll detection for sticky header shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 15);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll-spy observer for section navigation
  useEffect(() => {
    const observers = [];
    NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const scrollTo = (id, e) => {
    e?.preventDefault();
    setMobileNavOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Live feed items with Lucide SVG icons (no raw emojis)
  const liveItems = [
    {
      id: 1,
      title: 'Artisan Sourdough & Croissants',
      provider: 'Greenhouse Hearth Bakery',
      category: 'Bakery',
      icon: Wheat,
      quantity: '45 Loaves',
      servings: '60 servings',
      expires: '2 hrs 40 min',
      distance: '1.2 km',
      urgent: true,
      pickupWindow: 'Today, 8:00 PM – 10:00 PM',
    },
    {
      id: 2,
      title: 'Chef-Prepared Lunch Bowls',
      provider: 'Metropolitan Corporate Kitchen',
      category: 'Prepared Meals',
      icon: Utensils,
      quantity: '80 Bento Boxes',
      servings: '80 servings',
      expires: '3 hrs 15 min',
      distance: '2.5 km',
      urgent: false,
      pickupWindow: 'Today, 2:30 PM – 4:00 PM',
    },
    {
      id: 3,
      title: 'Organic Apples & Mixed Greens',
      provider: 'Sunrise Valley Market',
      category: 'Fresh Produce',
      icon: Apple,
      quantity: '120 kg',
      servings: '180+ servings',
      expires: '16 hrs',
      distance: '3.1 km',
      urgent: false,
      pickupWindow: 'Tomorrow, 7:00 AM – 11:00 AM',
    },
    {
      id: 4,
      title: 'Cold-Pressed Immunity Juices',
      provider: 'Botanical Juice Lab',
      category: 'Beverages',
      icon: Coffee,
      quantity: '60 Bottles',
      servings: '60 servings',
      expires: '8 hrs',
      distance: '1.8 km',
      urgent: false,
      pickupWindow: 'Today, 6:00 PM – 9:00 PM',
    },
    {
      id: 5,
      title: 'Family Pasta & Marinara Trays',
      provider: 'Trattoria Bella Kitchen',
      category: 'Prepared Meals',
      icon: Soup,
      quantity: '12 Large Trays',
      servings: '110 servings',
      expires: '1 hr 50 min',
      distance: '2.0 km',
      urgent: true,
      pickupWindow: 'Today, 9:30 PM – 11:00 PM',
    },
    {
      id: 6,
      title: 'Breakfast Pastries & Muffins',
      provider: 'Morning Roast Roastery',
      category: 'Bakery',
      icon: Wheat,
      quantity: '55 Pieces',
      servings: '55 servings',
      expires: '4 hrs 20 min',
      distance: '0.9 km',
      urgent: false,
      pickupWindow: 'Today, 4:00 PM – 6:30 PM',
    },
  ];

  const categories = ['All', 'Prepared Meals', 'Bakery', 'Fresh Produce', 'Beverages'];

  const filteredItems = useMemo(() => {
    if (activeCategory === 'All') return liveItems;
    return liveItems.filter((i) => i.category === activeCategory);
  }, [activeCategory]);

  const journeySteps = [
    {
      step: '01',
      title: 'Surplus Listed in 30 Seconds',
      description: 'Restaurants and bakeries post leftover batches with photo verification, portions, and an active pickup window.',
      icon: Store,
      badge: 'Listing Dispatched',
      highlight: 'Greenhouse Bakery · 45 loaves',
      timing: 'Listed 2 mins ago',
      color: 'amber',
    },
    {
      step: '02',
      title: 'Multi-Shelter Claim & Match',
      description: 'Nearby verified shelters receive instant geo-alerts and submit claims based on daily capacity and shelter population.',
      icon: Zap,
      badge: 'Shelter Claimed',
      highlight: 'Hope Community Shelter · 150 meals/day',
      timing: 'Claimed in 4 mins',
      color: 'rose',
    },
    {
      step: '03',
      title: 'Courier QR Pickup & Transport',
      description: 'Volunteer couriers arrive with insulated food packs and scan the donor verification QR code to initiate safe transit.',
      icon: Truck,
      badge: 'Pickup QR Scanned',
      highlight: 'Alex R. · Volunteer Courier (Bicycle)',
      timing: 'ETA 8 mins · Insulated pack',
      color: 'sky',
    },
    {
      step: '04',
      title: 'Shelter Hand-off & ESG Receipt',
      description: 'The receiving shelter scans the dropoff QR code. Meals are verified, the chain is logged, and an ESG receipt is issued.',
      icon: BadgeCheck,
      badge: 'Dropoff Confirmed',
      highlight: '60 meals delivered to families',
      timing: '100% Verified Chain of Custody',
      color: 'emerald',
    },
  ];

  const rolePillars = [
    {
      role: 'provider',
      title: 'Food Providers',
      subtitle: 'Restaurants, Caterers & Bakeries',
      description: 'Turn unsold culinary surplus into tax-deductible social impact in under 30 seconds. Eliminate disposal bills and get certified ESG reports.',
      icon: Store,
      cta: 'Register as Provider',
      link: '/register',
      perks: ['Bill Emerson Act liability shield', 'Automatic ESG impact certificates', 'Instant nearby shelter matching'],
      border: 'hover:border-amber-400 dark:hover:border-amber-500/50',
      badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      btnBg: 'bg-amber-500 hover:bg-amber-600 text-black',
    },
    {
      role: 'ngo',
      title: 'NGOs & Shelters',
      subtitle: 'Community Kitchens & Pantries',
      description: 'Get immediate push notifications when fresh surplus food becomes available within your service radius. Completely free for registered non-profits.',
      icon: HeartHandshake,
      cta: 'Register Your Shelter',
      link: '/register',
      perks: ['Zero fees for verified non-profits', 'Compare servings and shelf-life', 'Direct self-pickup or volunteer courier'],
      border: 'hover:border-emerald-400 dark:hover:border-emerald-500/50',
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      btnBg: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    },
    {
      role: 'volunteer',
      title: 'Volunteer Couriers',
      subtitle: 'Bicyclists, Drivers & Commuters',
      description: 'Accept short, flexible local rescue missions on your commute. Bridge the last mile between excess and hunger while earning community impact badges.',
      icon: Truck,
      cta: 'Join as Courier',
      link: '/register',
      perks: ['Deliver by bike, foot, scooter or car', 'Earn certified community service hours', 'Turn spare commute time into rescued meals'],
      border: 'hover:border-sky-400 dark:hover:border-sky-500/50',
      badgeBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      btnBg: 'bg-sky-600 hover:bg-sky-500 text-white',
    },
  ];

  const testimonials = [
    {
      quote: 'Instead of discarding 40 to 60 artisanal sourdough loaves every evening, local community shelters receive them within 35 minutes. It transformed our kitchen culture and simplified our closing routine.',
      author: 'Chef Marcus Vance',
      role: 'Executive Chef & Owner, Vance Bakery Co.',
      initials: 'MV',
      location: 'Mission District, San Francisco',
      mealsRescued: '3,840+ meals donated',
    },
    {
      quote: 'The instant claim notifications allow our shelter to plan nourishing dinners for 150+ residents every evening using restaurant-grade ingredients we could never afford on our operating budget.',
      author: 'Elena Rodriguez',
      role: 'Operations Director, Hope Community Center',
      initials: 'ER',
      location: 'Downtown Community Kitchen',
      mealsRescued: '9,200+ meals received',
    },
    {
      quote: 'Delivering surplus meals on my cargo bike between university lectures has become the highlight of my week. The QR verification handoff gives total transparency from start to finish.',
      author: 'Aarav Patel',
      role: 'Student & Volunteer Courier',
      initials: 'AP',
      location: '124 Completed Courier Runs',
      mealsRescued: '124 missions',
    },
  ];

  const faqs = [
    {
      q: 'Is donating surplus food legally protected from liability?',
      a: 'Yes. Under the Bill Emerson Good Samaritan Food Donation Act (and international public health donation provisions), food businesses donating apparently wholesome food in good faith to non-profit organizations are completely shielded from civil and criminal liability.',
    },
    {
      q: 'How fast is surplus food typically matched and collected?',
      a: 'Over 84% of food listings are claimed by nearby verified shelters in under 20 minutes. Volunteer couriers are dispatched concurrently, ensuring surplus arrives safely well before its freshness deadline.',
    },
    {
      q: 'Can multiple shelters apply to claim the same donation?',
      a: 'Yes! FoodRescue allows registered shelters to submit claim requests. Food providers can view shelter capacity, current resident count, and past donation receipts to award the surplus to where it is needed most.',
    },
    {
      q: 'Do volunteers need a special vehicle or commercial license?',
      a: 'No. Anyone 18+ can sign up. Deliveries can be completed on foot, bicycle, e-bike, scooter, or car. The application calculates distances, package sizes, and delivery routes prior to mission acceptance.',
    },
    {
      q: 'How are quality standards and food safety maintained during transport?',
      a: 'Donors verify temperature, preparation time, and packaging checklists during listing. Couriers carry insulated bags, and custody is tracked with dual QR code checkpoints upon both pickup and shelter delivery.',
    },
  ];

  return (
    <div className="min-h-screen w-full bg-[#FAFCF8] dark:bg-[#070907] text-neutral-900 dark:text-neutral-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* ══════════════════════════════════════════════════════════════
          FLOATING CAPSULE NAVBAR (Aligned with Website Brand Theme)
      ══════════════════════════════════════════════════════════════ */}
      <div className="fixed top-3 sm:top-5 inset-x-0 z-50 flex justify-center px-3 sm:px-6 pointer-events-none">
        <header
          className={`pointer-events-auto w-full max-w-6xl h-14 sm:h-16 rounded-2xl sm:rounded-3xl bg-white/85 dark:bg-[#0c100c]/90 border border-neutral-200/90 dark:border-neutral-800/90 backdrop-blur-2xl shadow-[0_10px_30px_-5px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.7)] transition-all duration-300 flex items-center justify-between px-4 sm:px-6 ${
            scrolled ? 'border-emerald-500/30 dark:border-emerald-500/30 shadow-lg shadow-emerald-950/5 dark:shadow-emerald-950/20' : ''
          }`}
        >
          {/* Brand Logo */}
          <Logo to="/" size="sm" showText={true} />

          {/* Desktop Nav: Uppercase, Wide Tracking with Active Indicator Bar */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-7">
            {NAV_SECTIONS.map(({ id, label }) => {
              const isActive = activeSection === id;
              const displayLabel =
                id === 'hero'
                  ? 'HOME'
                  : id === 'how-it-works'
                  ? 'HOW IT WORKS'
                  : id === 'live-feed'
                  ? 'SURPLUS FEED'
                  : id === 'trust-network'
                  ? 'TRUST & SAFETY'
                  : id === 'community'
                  ? 'STORIES'
                  : id === 'faq'
                  ? 'FAQ'
                  : label.toUpperCase();
              return (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={(e) => scrollTo(id, e)}
                  className={`text-[11px] font-bold tracking-widest uppercase transition-colors duration-150 cursor-pointer ${
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400 font-black'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <span className="relative py-1 inline-block">
                    {displayLabel}
                    {isActive && (
                      <span className="absolute bottom-0 inset-x-0 h-[2.5px] bg-emerald-600 dark:bg-emerald-400 rounded-full shadow-xs transition-all duration-200" />
                    )}
                  </span>
                </a>
              );
            })}
            <Link
              to="/contact"
              className="text-[11px] font-bold tracking-widest uppercase text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors duration-150 cursor-pointer"
            >
              <span className="relative py-1 inline-block">
                CONTACT
              </span>
            </Link>
            <Link
              to="/feedback"
              className="text-[11px] font-bold tracking-widest uppercase text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors duration-150 cursor-pointer"
            >
              <span className="relative py-1 inline-block">
                FEEDBACK
              </span>
            </Link>
          </nav>

          {/* Action CTAs: Sun/Moon Toggle + Sign In + Brand Emerald Pill CTA */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <button
              onClick={toggleTheme}
              type="button"
              aria-label="Toggle theme"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer flex items-center justify-center"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 hover:text-amber-300 transition-colors" />
              ) : (
                <Moon className="w-4 h-4 text-neutral-600 hover:text-neutral-900 transition-colors" />
              )}
            </button>
            {!user && (
              <Link
                to="/login"
                className="hidden sm:inline-block text-[11px] font-bold tracking-widest uppercase text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                SIGN IN
              </Link>
            )}
            <Link
              to={user ? '/dashboard' : '/register'}
              className="px-5 sm:px-6 py-2.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black tracking-widest uppercase bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap flex items-center justify-center"
            >
              {user ? 'DASHBOARD' : 'GET STARTED'}
            </Link>
            <button
              type="button"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:hidden transition-colors cursor-pointer"
              aria-label="Toggle Navigation"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileNavOpen && (
          <div className="pointer-events-auto absolute top-18 sm:top-20 left-3 right-3 sm:left-6 sm:right-6 max-w-6xl mx-auto rounded-2xl bg-white/95 dark:bg-[#0c100c]/98 border border-neutral-200 dark:border-neutral-800 backdrop-blur-2xl p-5 space-y-4 animate-fade-in shadow-2xl">
            <nav className="flex flex-col gap-1.5">
              {NAV_SECTIONS.map(({ id, label }) => {
                const isActive = activeSection === id;
                const displayLabel =
                  id === 'hero'
                    ? 'HOME'
                    : id === 'how-it-works'
                    ? 'HOW IT WORKS'
                    : id === 'live-feed'
                    ? 'SURPLUS FEED'
                    : id === 'trust-network'
                    ? 'TRUST & SAFETY'
                    : id === 'community'
                    ? 'STORIES'
                    : id === 'faq'
                    ? 'FAQ'
                    : label.toUpperCase();
                return (
                  <a
                    key={id}
                    href={`#${id}`}
                    onClick={(e) => scrollTo(id, e)}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase transition-colors ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-l-4 border-emerald-600 dark:border-emerald-400 font-black'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    <span>{displayLabel}</span>
                    {isActive && (
                      <span className="h-1.5 w-6 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
                    )}
                  </a>
                );
              })}
              <Link
                to="/contact"
                onClick={() => setMobileNavOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white"
              >
                CONTACT
              </Link>
              <Link
                to="/feedback"
                onClick={() => setMobileNavOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white"
              >
                FEEDBACK
              </Link>
            </nav>

            <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex flex-col gap-2">
              {user ? (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileNavOpen(false)}
                  className="w-full text-center py-3 rounded-xl font-black text-xs tracking-widest uppercase bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
                >
                  DASHBOARD
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileNavOpen(false)}
                    className="w-full text-center py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold tracking-widest uppercase text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    SIGN IN
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileNavOpen(false)}
                    className="w-full text-center py-3 rounded-xl font-black text-xs tracking-widest uppercase bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
                  >
                    GET STARTED
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <main className="flex-1">
        {/* ══════════════════════════════════════════════════════════════
            HERO SECTION (Organic Biophilic + Social Proof)
        ══════════════════════════════════════════════════════════════ */}
        <section id="hero" className="relative pt-24 sm:pt-32 pb-20 md:pb-28 overflow-hidden">
          {/* Subtle Ambient Glow Gradients */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-gradient-to-tr from-emerald-500/15 via-teal-500/10 to-amber-500/10 blur-[120px] pointer-events-none rounded-full" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              {/* Left Column: Headlines & Call to Action */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/20 text-xs font-bold text-emerald-700 dark:text-emerald-400 shadow-2xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span>Surplus Food Redistribution Network · Active in Real Time</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-neutral-900 dark:text-white leading-[1.08]">
                  Good food deserves a{' '}
                  <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 bg-clip-text text-transparent">
                    second chance.
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-xl">
                  FoodRescue connects commercial kitchens, caterers, and bakeries with verified shelters and volunteer couriers — turning surplus food into community meals instead of landfill emissions.
                </p>

                {/* Primary Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Link
                    to={user ? '/donations/create' : '/register'}
                    className="btn btn-primary text-sm py-3.5 px-7 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/25 hover:shadow-emerald-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Heart className="w-4 h-4 fill-current text-white" />
                    Donate Surplus Food
                  </Link>

                  <a
                    href="#live-feed"
                    onClick={(e) => scrollTo('live-feed', e)}
                    className="px-6 py-3.5 rounded-xl text-sm font-bold bg-white dark:bg-[#121612] text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-[#1a201a] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Utensils className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Explore Live Feed
                  </a>
                </div>

                {/* Compliance & Trust Badges */}
                <div className="pt-3 border-t border-neutral-200/60 dark:border-neutral-800/60 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Protected by Good Samaritan Act
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    100% Free for Non-Profits
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Dual QR Verified Chain of Custody
                  </span>
                </div>
              </div>

              {/* Right Column: Hero Visual Showcase */}
              <div className="lg:col-span-5 relative">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 dark:border-neutral-800 bg-[#121612] group">
                  <img
                    src={foodRescueCommunityImg}
                    alt="Volunteers packaging meals in community kitchen"
                    className="w-full h-80 sm:h-96 object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                  {/* Floating Live Dispatch Card */}
                  <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-white/90 dark:bg-[#0e120e]/90 backdrop-blur-md border border-white/20 dark:border-neutral-800/80 shadow-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          Active Dispatch Radar
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {impactMetrics.active_ngos} Shelters Online
                      </span>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                        <Wheat className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                          Artisan Sourdough & Pastry Trays
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          60 servings · Claimed in 4m by Hope Shelter
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Metric Badge */}
                <div className="hidden sm:flex absolute -top-5 -left-5 p-3.5 rounded-2xl bg-white dark:bg-[#121612] border border-neutral-200 dark:border-neutral-800 shadow-xl items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-900 dark:text-white">
                      {Number(impactMetrics.meals_saved).toLocaleString()}+ Meals
                    </p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      Rescued from waste to date
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            IMPACT METRICS BENTO GRID
        ══════════════════════════════════════════════════════════════ */}
        <section id="impact" className="py-12 border-y border-neutral-200/80 dark:border-neutral-800/80 bg-white/60 dark:bg-[#0a0d0a]/60 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Stat 1: Meals Rescued */}
              <div className="p-5 sm:p-6 rounded-2xl bg-neutral-50 dark:bg-[#101410] border border-neutral-200/80 dark:border-neutral-800 space-y-2 hover:border-emerald-500/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
                    {Number(impactMetrics.meals_saved).toLocaleString()}+
                  </h3>
                  <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Meals Rescued & Distributed
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold pt-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Real-time community impact</span>
                </div>
              </div>

              {/* Stat 2: Completed Donations */}
              <div className="p-5 sm:p-6 rounded-2xl bg-neutral-50 dark:bg-[#101410] border border-neutral-200/80 dark:border-neutral-800 space-y-2 hover:border-amber-500/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
                    {Number(impactMetrics.donations_completed).toLocaleString()}+
                  </h3>
                  <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Surplus Batches Completed
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold pt-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Zero-waste donor kitchens</span>
                </div>
              </div>

              {/* Stat 3: Partner Shelters */}
              <div className="p-5 sm:p-6 rounded-2xl bg-neutral-50 dark:bg-[#101410] border border-neutral-200/80 dark:border-neutral-800 space-y-2 hover:border-rose-500/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
                    {Number(impactMetrics.active_ngos).toLocaleString()}+
                  </h3>
                  <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Verified NGO Shelters
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 font-bold pt-1">
                  <Users className="w-3 h-3" />
                  <span>Daily capacity tracking</span>
                </div>
              </div>

              {/* Stat 4: Deliveries Made */}
              <div className="p-5 sm:p-6 rounded-2xl bg-neutral-50 dark:bg-[#101410] border border-neutral-200/80 dark:border-neutral-800 space-y-2 hover:border-sky-500/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
                    {Number(impactMetrics.deliveries.completed_deliveries).toLocaleString()}+
                  </h3>
                  <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Courier Drop-offs Completed
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-sky-600 dark:text-sky-400 font-bold pt-1">
                  <QrCode className="w-3 h-3" />
                  <span>100% QR verified hand-offs</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            THE 4-STEP QR RESCUE JOURNEY STRIP
        ══════════════════════════════════════════════════════════════ */}
        <section id="how-it-works" className="py-20 md:py-28 bg-[#FAFCF8] dark:bg-[#070907]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2 max-w-xl">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  End-to-End Chain of Custody
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white tracking-tight">
                  How a donation moves from surplus to plate
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Transparent, GPS-coordinated, and secured by dual-signature QR verification every step of the way.
                </p>
              </div>

              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Join the Network as a Partner <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Stepper Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {journeySteps.map((s, idx) => {
                const IconComponent = s.icon;
                const isSelected = activeJourneyStep === idx;
                return (
                  <div
                    key={s.step}
                    onClick={() => setActiveJourneyStep(idx)}
                    className={`p-6 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 ${
                      isSelected
                        ? 'bg-white dark:bg-[#121612] border-emerald-500 shadow-xl shadow-emerald-500/10'
                        : 'bg-white/70 dark:bg-[#0d100d] border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black tracking-widest text-neutral-400 dark:text-neutral-500 font-mono">
                          STEP {s.step}
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <IconComponent className="w-5 h-5" />
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-neutral-900 dark:text-white leading-snug">
                        {s.title}
                      </h3>

                      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {s.description}
                      </p>
                    </div>

                    {/* Step Highlight Card */}
                    <div className="p-3 rounded-xl bg-neutral-100/80 dark:bg-[#181e18] border border-neutral-200/80 dark:border-neutral-800 text-[11px] space-y-1">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 block truncate">
                        {s.badge}
                      </span>
                      <p className="text-neutral-700 dark:text-neutral-300 font-medium truncate">
                        {s.highlight}
                      </p>
                      <span className="text-[10px] text-neutral-400 block">
                        {s.timing}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            LIVE SURPLUS FEED RADAR (Interactive Category Filter)
        ══════════════════════════════════════════════════════════════ */}
        <section id="live-feed" className="py-20 md:py-24 border-y border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-100/50 dark:bg-[#0a0d0a]/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Live Dispatch Radar
                  </span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white tracking-tight">
                  Available surplus ready right now
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Real listings waiting for verified shelters and couriers within your community.
                </p>
              </div>

              <Link
                to="/login"
                className="btn btn-primary text-xs py-2.5 px-5 rounded-xl font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                Sign In to Claim Food <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeCategory === cat
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-md'
                      : 'bg-white dark:bg-[#121612] text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Live Feed Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredItems.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-white dark:bg-[#121612] border border-neutral-200 dark:border-neutral-800 hover:border-emerald-500/50 hover:shadow-lg transition-all duration-200 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          {item.category}
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                            item.urgent
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          <Clock className="w-3 h-3" /> Expires in {item.expires}
                        </span>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <ItemIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                            {item.title}
                          </h3>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-1 truncate">
                            <Store className="w-3 h-3 shrink-0" /> {item.provider}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 text-xs">
                        <div>
                          <span className="text-[10px] text-neutral-400 uppercase font-semibold">Quantity</span>
                          <p className="font-bold text-neutral-800 dark:text-neutral-200">{item.quantity}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-400 uppercase font-semibold">Portions</span>
                          <p className="font-bold text-emerald-600 dark:text-emerald-400">{item.servings}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1 font-medium">
                        <MapPin className="w-3 h-3 text-emerald-500" /> {item.distance} away
                      </span>

                      <Link
                        to="/register"
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Claim Surplus <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            TRUST & SAFETY BENTO GRID (Dual-QR Custody, Fair Allocation, Legal Shield)
        ══════════════════════════════════════════════════════════════ */}
        <section id="trust-network" className="py-20 md:py-28 bg-[#FAFCF8] dark:bg-[#070907] relative overflow-hidden">
          {/* Subtle Ambient Background Gradients */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-emerald-500/10 via-teal-500/5 to-transparent blur-[140px] pointer-events-none rounded-full" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 space-y-12">
            {/* Section Header */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>The FoodRescue Trust & Security Framework</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-neutral-900 dark:text-white tracking-tight leading-[1.12]">
                Guaranteed safe, legal, and{' '}
                <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 bg-clip-text text-transparent">
                  100% accountable.
                </span>
              </h2>
              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-2xl mx-auto">
                From kitchen counter to shelter dining hall, every meal is verified through cryptographic dual-QR custody, insulated transport, and federal legal protection.
              </p>
            </div>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Bento Card 1: Interactive Dual-QR Checkpoint Simulator (Span 7 cols) */}
              <div className="lg:col-span-7 rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#0e120e] border border-neutral-200/90 dark:border-neutral-800/90 shadow-xl shadow-black/5 dark:shadow-black/25 flex flex-col justify-between space-y-6 relative overflow-hidden group">
                <div className="space-y-4 relative z-10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Dual-Checkpoint Verification Engine</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-neutral-400 dark:text-neutral-500">
                      LIVE INTERACTIVE DEMO
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                      Zero-tamper custody handshakes
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 mt-1 leading-relaxed">
                      Food never exchanges hands blindly. Our dual-checkpoint protocol verifies temperature, package seals, and volunteer identities at both endpoints.
                    </p>
                  </div>

                  {/* Interactive Simulation Display */}
                  <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-[#131913] border border-neutral-200/80 dark:border-neutral-800/80 space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-200/70 dark:border-neutral-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${simulatedCheckpoint === 'pickup' ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
                        <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                          {simulatedCheckpoint === 'pickup' ? 'Checkpoint 1 · Kitchen Pickup' : 'Checkpoint 2 · Shelter Delivery'}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {simulatedCheckpoint === 'pickup' ? 'Awaiting Courier Scan' : 'Delivery Confirmed ✓'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                      {/* Simulated QR Code Box */}
                      <div className="sm:col-span-4 flex flex-col items-center justify-center p-3.5 rounded-xl bg-white dark:bg-[#1a211a] border border-neutral-200 dark:border-neutral-700 shadow-xs">
                        <div className="p-2 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                          <QrCode className="w-16 h-16 sm:w-20 sm:h-20" />
                        </div>
                        <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 mt-2 font-bold">
                          {simulatedCheckpoint === 'pickup' ? 'PICKUP-SEC-9482' : 'DROP-CONF-7719'}
                        </span>
                      </div>

                      {/* Checkpoint Details */}
                      <div className="sm:col-span-8 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                          <span className="text-neutral-400">Location:</span>
                          <span className="font-bold text-neutral-900 dark:text-white">
                            {simulatedCheckpoint === 'pickup' ? 'Greenhouse Organic Bakery' : 'Hope Harvest Community Shelter'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                          <span className="text-neutral-400">Payload:</span>
                          <span className="font-bold text-neutral-900 dark:text-white">45 Artisanal Sourdough Loaves</span>
                        </div>
                        <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                          <span className="text-neutral-400">Volunteer Courier:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">Aarav P. (Cargo E-Bike)</span>
                        </div>
                        <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-300">
                          <span className="text-neutral-400">Verification Trail:</span>
                          <span className="font-bold text-neutral-900 dark:text-white">
                            {simulatedCheckpoint === 'pickup' ? 'Temp & Hygiene Check Signed' : 'IRS §170 Receipt Generated'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulator Action Button */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Dual QR checkpoints prevent misplacement and verify cold-chain compliance.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSimulatedCheckpoint(simulatedCheckpoint === 'pickup' ? 'delivery' : 'pickup')}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                  >
                    {simulatedCheckpoint === 'pickup' ? 'Simulate Delivery Scan →' : 'Reset Simulation ↺'}
                  </button>
                </div>
              </div>

              {/* Bento Card 2: Fair Shelter Allocation Engine (Span 5 cols) */}
              <div className="lg:col-span-5 rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#0e120e] border border-neutral-200/90 dark:border-neutral-800/90 shadow-xl shadow-black/5 dark:shadow-black/25 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-[11px] font-bold text-teal-600 dark:text-teal-400">
                    <HeartHandshake className="w-3.5 h-3.5" />
                    <span>Algorithmic Equity</span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                      Fair shelter allocation
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 mt-1 leading-relaxed">
                      All registered shelters can request surplus. Food providers compare daily shelter capacity, resident headcounts, and past delivery receipts to award food where hunger is most urgent.
                    </p>
                  </div>

                  {/* Allocation Metric Cards */}
                  <div className="space-y-2.5 pt-1">
                    <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-[#131913] border border-neutral-200/80 dark:border-neutral-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                          500
                        </div>
                        <div>
                          <p className="text-xs font-bold text-neutral-900 dark:text-white">Capacity & Need Matching</p>
                          <p className="text-[10px] text-neutral-400">Shelter size matched to batch portions</p>
                        </div>
                      </div>
                      <BadgeCheck className="w-4 h-4 text-emerald-500" />
                    </div>

                    <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-[#131913] border border-neutral-200/80 dark:border-neutral-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-xs">
                          0%
                        </div>
                        <div>
                          <p className="text-xs font-bold text-neutral-900 dark:text-white">Zero Food Hoarding</p>
                          <p className="text-[10px] text-neutral-400">Multi-claim transparency across pantries</p>
                        </div>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-teal-500" />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                    <Users className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Over 112 verified community non-profits actively receiving meals</span>
                  </div>
                </div>
              </div>

              {/* Bento Card 3: 100% Legal Protection (Span 4 cols) */}
              <div className="lg:col-span-4 rounded-3xl p-6 sm:p-7 bg-white dark:bg-[#0e120e] border border-neutral-200/90 dark:border-neutral-800/90 shadow-xl shadow-black/5 dark:shadow-black/25 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-neutral-900 dark:text-white">
                    100% Legal Protection
                  </h4>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Bill Emerson Good Samaritan Act
                  </p>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  Under 42 U.S. Code § 1791, food businesses, caterers, and grocers are federally shielded from all civil and criminal liability when donating wholesome food in good faith.
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Check className="w-3.5 h-3.5" /> Full Federal Immunity
                  </span>
                </div>
              </div>

              {/* Bento Card 4: 18-Minute Average Transit Dispatch (Span 4 cols) */}
              <div className="lg:col-span-4 rounded-3xl p-6 sm:p-7 bg-white dark:bg-[#0e120e] border border-neutral-200/90 dark:border-neutral-800/90 shadow-xl shadow-black/5 dark:shadow-black/25 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-neutral-900 dark:text-white">
                    18.4 Min Average Pickup
                  </h4>
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                    Micro-Courier Fleet Dispatch
                  </p>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  Automated routing assigns nearby volunteer couriers on bicycles, e-scooters, and EVs immediately upon listing. Insulated thermal bags maintain strict temperature standards.
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    <Clock className="w-3.5 h-3.5" /> Zero Cold-Chain Breaks
                  </span>
                </div>
              </div>

              {/* Bento Card 5: Tax & ESG Automated Audit Trails (Span 4 cols) */}
              <div className="lg:col-span-4 rounded-3xl p-6 sm:p-7 bg-white dark:bg-[#0e120e] border border-neutral-200/90 dark:border-neutral-800/90 shadow-xl shadow-black/5 dark:shadow-black/25 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-neutral-900 dark:text-white">
                    Tax & ESG Certified
                  </h4>
                  <p className="text-xs font-bold text-teal-600 dark:text-teal-400 mt-0.5">
                    IRS §170 & Sustainability Reports
                  </p>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  Every rescued batch generates an itemized, auditable receipt with fair-market valuation and calculated CO₂ offset data ready for tax deductions and stakeholder CSR disclosures.
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-600 dark:text-teal-400">
                    <Award className="w-3.5 h-3.5" /> Instant PDF & CSV Export
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            ROLE PILLARS SECTION (Provider / NGO / Volunteer)
        ══════════════════════════════════════════════════════════════ */}
        <section className="py-20 md:py-24 border-t border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/60 dark:bg-[#090c09]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                A Unified Community Ecosystem
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white tracking-tight">
                Designed for everyone making a difference
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Whether you produce surplus food, feed vulnerable neighbors, or have an hour to deliver.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {rolePillars.map((pillar) => {
                const PillarIcon = pillar.icon;
                return (
                  <div
                    key={pillar.role}
                    className={`p-7 rounded-3xl bg-white dark:bg-[#111611] border border-neutral-200 dark:border-neutral-800 flex flex-col justify-between space-y-6 transition-all duration-200 shadow-sm hover:shadow-xl ${pillar.border}`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-[#1a201a] flex items-center justify-center text-neutral-900 dark:text-white">
                          <PillarIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${pillar.badgeBg}`}>
                          {pillar.role}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                          {pillar.title}
                        </h3>
                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {pillar.subtitle}
                        </p>
                      </div>

                      <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                        {pillar.description}
                      </p>

                      <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                        {pillar.perks.map((perk, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{perk}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Link
                      to={pillar.link}
                      className={`w-full py-3 rounded-xl text-xs font-bold text-center transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${pillar.btnBg}`}
                    >
                      {pillar.cta} <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            VERIFIED COMMUNITY STORIES (Testimonials)
        ══════════════════════════════════════════════════════════════ */}
        <section id="community" className="py-20 md:py-24 bg-[#FAFCF8] dark:bg-[#070907]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
            <div className="max-w-xl space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Community Trust & Reputation
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white tracking-tight">
                Stories from the people on the ground
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((t, idx) => (
                <div
                  key={idx}
                  className="p-7 rounded-3xl bg-white dark:bg-[#121612] border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(5)].map((_, starIdx) => (
                        <Star key={starIdx} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>

                    <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed italic">
                      "{t.quote}"
                    </p>
                  </div>

                  <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0 border border-emerald-500/20">
                      {t.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                        {t.author}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                        {t.role}
                      </p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        {t.mealsRescued}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            FREQUENTLY ASKED QUESTIONS (Accordion)
        ══════════════════════════════════════════════════════════════ */}
        <section id="faq" className="py-20 md:py-24 border-t border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-100/50 dark:bg-[#0a0d0a]/80">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-10">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                FAQ & Security
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white tracking-tight">
                Frequently asked questions
              </h2>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, i) => {
                const isOpen = openFaqIndex === i;
                return (
                  <div
                    key={i}
                    className="bg-white dark:bg-[#121612] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden transition-all duration-150"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                      className="w-full px-6 py-4.5 text-left text-sm font-bold text-neutral-900 dark:text-white flex items-center justify-between gap-4 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 shrink-0 text-emerald-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 shrink-0 text-neutral-400" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed border-t border-neutral-100 dark:border-neutral-800/80 pt-3 animate-fade-in">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#121612] border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-neutral-900 dark:text-white">Have feedback or questions?</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Help us improve FoodRescue for non-profits and food donors alike.
                </p>
              </div>
              <Link
                to="/feedback"
                className="btn btn-primary text-xs py-2 px-4 rounded-xl font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" /> Submit Feedback
              </Link>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            FINAL CALL TO ACTION BANNER
        ══════════════════════════════════════════════════════════════ */}
        <section className="py-20 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-800 px-8 py-16 md:px-16 text-center text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none" />

              <div className="max-w-2xl mx-auto space-y-6 relative z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-bold tracking-wider uppercase backdrop-blur-xs">
                  <Sparkles className="w-3.5 h-3.5" /> Join Over 112+ Partner Shelters
                </span>

                <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                  Ready to make every surplus meal count?
                </h2>

                <p className="text-emerald-100 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
                  Whether you produce surplus batches, lead a non-profit kitchen, or have time to courier food locally — join the network today.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <Link
                    to="/register"
                    className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-black bg-white text-emerald-800 hover:bg-emerald-50 transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    Create Free Account
                  </Link>

                  <Link
                    to="/login"
                    className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-bold border border-white/40 hover:bg-white/10 transition-all cursor-pointer"
                  >
                    Sign In to Portal
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ══════════════════════════════════════════════════════════════
          FOOTER (Semantic & Accessible)
      ══════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#070907] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8">
            <div className="sm:col-span-1 space-y-3">
              <Logo to="/" size="sm" showText={true} />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Decentralized surplus food rescue connecting food businesses, community shelters, and volunteer couriers.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Network online and dispatching
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white mb-3">
                Platform
              </p>
              <ul className="space-y-2 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                <li><a href="#how-it-works" onClick={(e) => scrollTo('how-it-works', e)} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer">How It Works</a></li>
                <li><a href="#live-feed" onClick={(e) => scrollTo('live-feed', e)} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer">Live Feed</a></li>
                <li><a href="#trust-network" onClick={(e) => scrollTo('trust-network', e)} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer">Trust & Safety</a></li>
                <li><a href="#faq" onClick={(e) => scrollTo('faq', e)} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer">FAQ</a></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white mb-3">
                Role Portals
              </p>
              <ul className="space-y-2 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                <li><Link to="/login" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Food Provider Portal</Link></li>
                <li><Link to="/login" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">NGO & Shelter Portal</Link></li>
                <li><Link to="/login" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Volunteer Courier Portal</Link></li>
                <li><Link to="/login" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Platform Admin Portal</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white mb-3">
                Community & Impact
              </p>
              <ul className="space-y-2 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                <li>
                  <Link to="/contact" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Contact & Support
                  </Link>
                </li>
                <li>
                  <Link to="/feedback" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1">
                    <MessageSquarePlus className="w-3 h-3" /> Submit Feedback
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                    Become a Partner
                  </Link>
                </li>
                <li>
                  <a href="#hero" onClick={(e) => scrollTo('hero', e)} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer">
                    Back to Top
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-400 dark:text-neutral-500">
            <p>© {CURRENT_YEAR} FoodRescue. Built for community resilience and zero food waste.</p>
            <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
              <Leaf className="w-3.5 h-3.5" />
              <span>Zero waste, maximum social impact</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
