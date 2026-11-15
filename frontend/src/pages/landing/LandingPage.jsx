import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ThemeToggle from '../../components/common/ThemeToggle';
import Logo from '../../components/common/Logo';
import api from '../../api/client';

import foodRescueCommunityImg from '../../assets/food_rescue_community.jpg';

import {
  Heart, Store, HeartHandshake, Truck, ArrowRight, CheckCircle2,
  Clock, MapPin, QrCode, Star, MessageSquarePlus,
  ShieldCheck, ChevronDown, ChevronUp, Utensils,
  Leaf, Menu, X, Package, Zap, BadgeCheck,
} from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();

// Sections tracked by scroll-spy
const NAV_SECTIONS = [
  { id: 'hero', label: 'Home' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'impact', label: 'Impact' },
  { id: 'live-feed', label: 'Live Feed' },
  { id: 'faq', label: 'FAQ' },
];

export default function LandingPage() {
  const { user } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [activeSection, setActiveSection] = useState('hero');
  const [scrolled, setScrolled] = useState(false);

  const [impactMetrics, setImpactMetrics] = useState({
    meals_saved: 10450,
    donations_completed: 285,
    deliveries: { completed_deliveries: 540 },
    active_ngos: 112,
  });

  // ── Fetch live metrics ──────────────────────────────────────────────
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
      .catch(() => { });
    return () => { isMounted = false; };
  }, []);

    // ── Scroll-spy: track active section + header shadow ───────────────
    useEffect(() => {
      const onScroll = () => setScrolled(window.scrollY > 10);
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }, []);

  useEffect(() => {
    const observers = [];
    NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  // ── Data ────────────────────────────────────────────────────────────
  const stats = [
    { label: 'Meals rescued', value: `${Number(impactMetrics.meals_saved).toLocaleString()}+`, icon: Utensils, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Donations completed', value: `${Number(impactMetrics.donations_completed).toLocaleString()}+`, icon: Store, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'NGO partners', value: `${Number(impactMetrics.active_ngos).toLocaleString()}+`, icon: HeartHandshake, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10' },
    { label: 'Deliveries made', value: `${Number(impactMetrics.deliveries.completed_deliveries).toLocaleString()}+`, icon: Truck, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10' },
  ];

  const steps = [
    {
      number: '01',
      title: 'List surplus food',
      description: 'Restaurants, grocers, and caterers post excess food with photos, quantity, and a pickup window in under 30 seconds.',
      icon: Store,
    },
    {
      number: '02',
      title: 'Instant shelter match',
      description: 'Nearby verified shelters receive a geo-alert and claim the food with one tap before the expiry countdown ends.',
      icon: HeartHandshake,
    },
    {
      number: '03',
      title: 'QR-verified delivery',
      description: 'Community volunteers pick up and hand off the food, confirmed by dual QR codes at both ends of the journey.',
      icon: Truck,
    },
  ];

  const roles = [
    {
      title: 'Food Providers',
      sub: 'Restaurants, bakeries & caterers',
      desc: 'Post surplus in 30 seconds. Get ESG reports and reduce disposal costs.',
      icon: Store,
      cta: 'Start donating',
      borderColor: 'border-amber-200 dark:border-amber-900/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-950/40',
    },
    {
      title: 'NGOs & Shelters',
      sub: 'Food pantries & community kitchens',
      desc: 'Get real-time alerts for nearby surplus and claim with one tap. Free for verified non-profits.',
      icon: HeartHandshake,
      cta: 'Register your shelter',
      borderColor: 'border-rose-200 dark:border-rose-900/40',
      iconColor: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-50 dark:bg-rose-950/40',
    },
    {
      title: 'Volunteers',
      sub: 'Drivers, cyclists & commuters',
      desc: 'Pick up and deliver food on your own schedule. Earn service hours and community badges.',
      icon: Truck,
      cta: 'Join as volunteer',
      borderColor: 'border-sky-200 dark:border-sky-900/40',
      iconColor: 'text-sky-600 dark:text-sky-400',
      iconBg: 'bg-sky-50 dark:bg-sky-950/40',
    },
  ];

  const liveItems = [
    { title: 'Artisan Sourdough & Croissants', provider: 'Greenhouse Hearth Bakery', category: 'Bakery', quantity: '45 Loaves', servings: '60 servings', expires: '2 hrs 40 min', distance: '1.2 km', urgent: true },
    { title: 'Chef-Prepared Lunch Bowls', provider: 'Metropolitan Corporate Kitchen', category: 'Prepared Meals', quantity: '80 Bento Boxes', servings: '80 servings', expires: '3 hrs 15 min', distance: '2.5 km', urgent: false },
    { title: 'Organic Apples & Mixed Greens', provider: 'Sunrise Valley Market', category: 'Fresh Produce', quantity: '120 kg', servings: '180+ servings', expires: '16 hrs', distance: '3.1 km', urgent: false },
    { title: 'Cold-Pressed Juices', provider: 'Botanical Juice Lab', category: 'Beverages', quantity: '60 Bottles', servings: '60 servings', expires: '8 hrs', distance: '1.8 km', urgent: false },
    { title: 'Family Pasta Trays', provider: 'Trattoria Bella Kitchen', category: 'Prepared Meals', quantity: '12 Large Trays', servings: '110 servings', expires: '1 hr 50 min', distance: '2.0 km', urgent: true },
    { title: 'Bagels & Muffin Assortment', provider: 'Morning Roast Roastery', category: 'Bakery', quantity: '55 Pieces', servings: '55 servings', expires: '4 hrs 20 min', distance: '0.9 km', urgent: false },
  ];

  const testimonials = [
    {
      quote: 'Instead of throwing out dozens of fresh sourdough loaves every evening, local community kitchens now collect them within 40 minutes. It changed how we close the day.',
      author: 'Chef Marcus Vance',
      role: 'Executive Chef, Vance Bakery Co.',
      avatar: '👨‍🍳',
    },
    {
      quote: 'The instant claim alerts let our shelter plan wholesome dinner services for 150+ residents every night using ingredients we could never afford to buy.',
      author: 'Elena Rodriguez',
      role: 'Operations Director, Hope Community Center',
      avatar: '👩‍💼',
    },
    {
      quote: 'Delivering meals on my bike between university classes is the most rewarding part of my week. The QR handoff makes the whole process transparent and seamless.',
      author: 'Aarav Patel',
      role: 'Volunteer Courier, 120+ Missions',
      avatar: '🚴',
    },
  ];

  const faqs = [
    {
      q: 'Is donating surplus food legally protected?',
      a: 'Yes. Under the Bill Emerson Good Samaritan Food Donation Act and international equivalents, food businesses that donate apparently wholesome food in good faith to non-profit organizations are protected from civil and criminal liability.',
    },
    {
      q: 'How fast is surplus food typically claimed?',
      a: 'Over 82% of posted surplus listings are claimed within 25 minutes by nearby verified shelters. Volunteer couriers are dispatched immediately, ensuring food arrives fresh well before its pickup window expires.',
    },
    {
      q: 'Do volunteer couriers need a vehicle or license?',
      a: 'No. Anyone 18+ can volunteer. We support bicycle, scooter, walking, and car deliveries for short, localized community runs. Every mission shows estimated distance and container sizes before acceptance.',
    },
    {
      q: 'How does FoodRescue ensure food safety during transit?',
      a: 'Donors verify temperature and packaging checklists during listing. Couriers use insulated bags and scan a timestamped QR code upon arrival. NGOs inspect and approve the handoff with a secondary verification scan.',
    },
  ];

  // ── Nav active link helper ──────────────────────────────────────────
  const navLinkClass = (id) =>
    `relative text-sm transition-colors duration-150 ${activeSection === id
      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
      : 'font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
    }`;

  const scrollTo = (id, e) => {
    e?.preventDefault();
    setMobileNavOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFCF8] dark:bg-[#070907] text-neutral-900 dark:text-neutral-100 flex flex-col font-sans antialiased">

          {/* ══════════════════════════════════════════════════════════════
          HEADER — Scroll-spy tracking navbar
      ══════════════════════════════════════════════════════════════ */}
          <header className={`sticky top-0 z-50 w-full bg-white/90 dark:bg-[#0c100c]/90 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800 transition-shadow duration-200 ${scrolled ? 'shadow-sm' : ''}`}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">

              <Logo to="/" size="md" showText={true} />

                {/* Desktop nav with scroll-spy active indicators */}
                <nav className="hidden md:flex items-center gap-1">
                  {NAV_SECTIONS.filter(s => s.id !== 'hero').map(({ id, label }) => (
                    <a
                      key={id}
                      href={`#${id}`}
                      onClick={(e) => scrollTo(id, e)}
                      className={`${navLinkClass(id)} px-3 py-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800`}
                    >
                      {label}
                      {activeSection === id && (
                        <span className="absolute -bottom-[1px] left-3 right-3 h-[2px] bg-emerald-500 rounded-full" />
                      )}
                    </a>
                  ))}
                  <Link
                    to="/feedback"
                    className="px-3 py-1.5 rounded-md text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Feedback
                  </Link>
                </nav>

                  <div className="hidden md:flex items-center gap-3 shrink-0">
                    <ThemeToggle variant="icon" />
                    {user ? (
                      <Link to="/dashboard" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
                        Dashboard <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <>
                        <Link to="/login" className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                          Sign In
                        </Link>
                        <Link to="/register" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
                          Get Started
                        </Link>
                      </>
                    )}
                  </div>

                  <div className="flex md:hidden items-center gap-2">
                    <ThemeToggle variant="icon" />
                    <button
                      onClick={() => setMobileNavOpen(!mobileNavOpen)}
                      className="p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Mobile drawer */}
                {mobileNavOpen && (
                  <div className="md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0c100c] px-4 py-5 space-y-4">
                      <nav className="flex flex-col gap-1">
                        {NAV_SECTIONS.filter(s => s.id !== 'hero').map(({ id, label }) => (
                          <a
                            key={id}
                            href={`#${id}`}
                            onClick={(e) => scrollTo(id, e)}
                            className={`px-3 py-2 rounded-lg text-sm transition-colors ${activeSection === id
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold'
                                : 'font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                              }`}
                          >
                            {label}
                          </a>
                        ))}
                        <Link
                          to="/feedback"
                          onClick={() => setMobileNavOpen(false)}
                          className="px-3 py-2 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          Feedback
                        </Link>
                      </nav>
                      <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex flex-col gap-2">
                        {user ? (
                          <Link to="/dashboard" onClick={() => setMobileNavOpen(false)} className="w-full text-center py-2.5 rounded-lg font-semibold bg-emerald-600 text-white text-sm">
                            Go to Dashboard
                          </Link>
                        ) : (
                          <>
                            <Link to="/login" onClick={() => setMobileNavOpen(false)} className="w-full text-center py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                              Sign In
                            </Link>
                            <Link to="/register" onClick={() => setMobileNavOpen(false)} className="w-full text-center py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold">
                              Get Started
                            </Link>
                          </>
                        )}
                      </div>
                  </div>
                )}
              </header>

              <main className="flex-1">

                  {/* ══════════════════════════════════════════════════════════════
            HERO SECTION
        ══════════════════════════════════════════════════════════════ */}
                  <section id="hero" className="pt-16 pb-20 md:pt-24 md:pb-28">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6">

                      <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-6">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Surplus food redistribution network
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-neutral-900 dark:text-white leading-[1.1]">
                          Good food deserves a{' '}
                          <span className="text-emerald-600 dark:text-emerald-400">second chance.</span>
                        </h1>

                        <p className="mt-5 text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
                          FoodRescue connects restaurants and bakeries with nearby shelters and volunteer couriers — so surplus food feeds people instead of filling landfills.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 mt-8">
                          <Link
                            to={user ? '/dashboard' : '/register'}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                          >
                            <Heart className="w-4 h-4 fill-current" />
                            Donate Surplus Food
                          </Link>
                          <a
                            href="#how-it-works"
                            onClick={(e) => scrollTo('how-it-works', e)}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                          >
                            See How It Works
                          </a>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-7 text-xs text-neutral-500 dark:text-neutral-400">
                          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Liability protected</span>
                          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Free for non-profits</span>
                          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> No subscription needed</span>
                        </div>
                      </div>

                      {/* Hero visual */}
                      <div className="mt-14 grid grid-cols-1 lg:grid-cols-5 gap-5">
                        <div className="lg:col-span-3 relative rounded-2xl overflow-hidden h-72 sm:h-80 lg:h-[22rem] bg-neutral-200 dark:bg-neutral-800">
                          <img
                            src={foodRescueCommunityImg}
                            alt="Community volunteers packaging rescued meals"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                          <div className="absolute bottom-5 left-5 right-5">
                            <p className="text-white font-semibold text-sm">Real food rescue in action</p>
                            <p className="text-neutral-300 text-xs mt-0.5">Volunteer-powered, community-driven</p>
                          </div>
                        </div>

                        <div className="lg:col-span-2 flex flex-col gap-5">
                          {/* Live radar card */}
                          <div className="flex-1 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5">
                            <div className="flex items-center gap-2 mb-4">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Live surplus</span>
                            </div>
                            <div className="space-y-3">
                              {[
                                { name: 'Artisan Sourdough & Croissants', provider: 'Greenhouse Bakery', time: '1h 45m left', emoji: '🥐' },
                                { name: 'Chef-Prepared Lunch Bowls', provider: 'Metro Corporate Kitchen', time: '3h 15m left', emoji: '🍱' },
                              ].map((item, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800">
                                  <span className="text-xl">{item.emoji}</span>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-neutral-900 dark:text-white leading-snug">{item.name}</p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{item.provider}</p>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1.5">
                                      <Clock className="w-3 h-3" /> {item.time}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                              <a href="#live-feed" onClick={(e) => scrollTo('live-feed', e)} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-4 hover:underline">
                                Browse all listings <ArrowRight className="w-3 h-3" />
                              </a>
                          </div>

                          {/* Stats mini card */}
                          <div className="rounded-2xl bg-emerald-600 p-5 text-white">
                            <p className="text-3xl font-bold">{Number(impactMetrics.meals_saved).toLocaleString()}+</p>
                            <p className="text-sm text-emerald-100 mt-1">Meals rescued to date</p>
                            <div className="mt-4 flex items-center gap-4 text-xs text-emerald-100">
                              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Food-safe transit</span>
                              <span className="flex items-center gap-1.5"><QrCode className="w-3.5 h-3.5" /> QR verified</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* ══════════════════════════════════════════════════════════════
            PROCESS BLOCK — Visual journey strip (new block)
        ══════════════════════════════════════════════════════════════ */}
                  <section className="py-16 border-y border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6">

                      {/* Section label */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-12">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">The rescue journey</p>
                          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
                            Every donation, tracked end to end
                          </h2>
                        </div>
                        <Link to="/register" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 shrink-0 self-start sm:self-auto">
                          Join the network <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                      {/* Journey track */}
                      <div className="relative">
                        {/* Connecting line (desktop) */}
                        <div className="hidden lg:block absolute top-9 left-[calc(1/8*100%)] right-[calc(1/8*100%)] h-px bg-neutral-200 dark:bg-neutral-800 z-0" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                          {/* Step A: Surplus Listed */}
                          <div className="relative z-10 group">
                            <div className="flex flex-col items-start gap-4">
                              <div className="w-[72px] h-[72px] rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-900/50 flex items-center justify-center group-hover:border-amber-400 dark:group-hover:border-amber-700 transition-colors">
                                <Store className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Step 1</span>
                                <h3 className="text-base font-semibold text-neutral-900 dark:text-white mt-1">Surplus Listed</h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
                                  A restaurant posts leftover food with quantity, photos, and a 2-hour pickup window.
                                </p>
                              </div>

                              {/* Mini detail card */}
                              <div className="w-full p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">🥐</span>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate">Artisan Sourdough</p>
                                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Greenhouse Bakery · 45 loaves</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                  <Clock className="w-3 h-3" /> Listed 2 mins ago
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Step B: NGO Notified */}
                          <div className="relative z-10 group">
                            <div className="flex flex-col items-start gap-4">
                              <div className="w-[72px] h-[72px] rounded-2xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-200 dark:border-rose-900/50 flex items-center justify-center group-hover:border-rose-400 dark:group-hover:border-rose-700 transition-colors">
                                <Zap className="w-7 h-7 text-rose-600 dark:text-rose-400" />
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400">Step 2</span>
                                <h3 className="text-base font-semibold text-neutral-900 dark:text-white mt-1">Shelter Notified</h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
                                  Nearby verified shelters get an instant alert and claim the food before anyone else.
                                </p>
                              </div>

                              <div className="w-full p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">Hope Community Center</span>
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">Claimed</span>
                                </div>
                                <p className="text-[10px] text-neutral-400 dark:text-neutral-500">1.2 km away · claimed in 4 mins</p>
                              </div>
                            </div>
                          </div>

                          {/* Step C: Courier Dispatched */}
                          <div className="relative z-10 group">
                            <div className="flex flex-col items-start gap-4">
                              <div className="w-[72px] h-[72px] rounded-2xl bg-sky-50 dark:bg-sky-950/30 border-2 border-sky-200 dark:border-sky-900/50 flex items-center justify-center group-hover:border-sky-400 dark:group-hover:border-sky-700 transition-colors">
                                <Truck className="w-7 h-7 text-sky-600 dark:text-sky-400" />
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">Step 3</span>
                                <h3 className="text-base font-semibold text-neutral-900 dark:text-white mt-1">Courier En Route</h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
                                  A volunteer picks up with an insulated pack and scans the QR code to confirm collection.
                                </p>
                              </div>

                              <div className="w-full p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">🚴</span>
                                  <div>
                                    <p className="text-xs font-semibold text-neutral-900 dark:text-white">Alex R. — Volunteer</p>
                                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500">0.8 km away · ETA 6 mins</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-sky-600 dark:text-sky-400">
                                  <QrCode className="w-3 h-3" /> Pickup QR scanned ✓
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Step D: Delivered */}
                          <div className="relative z-10 group">
                            <div className="flex flex-col items-start gap-4">
                              <div className="w-[72px] h-[72px] rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center group-hover:border-emerald-500 dark:group-hover:border-emerald-700 transition-colors">
                                <BadgeCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Step 4</span>
                                <h3 className="text-base font-semibold text-neutral-900 dark:text-white mt-1">Delivered & Confirmed</h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
                                  The shelter scans the drop-off QR code. The donation is logged and an ESG receipt is auto-generated.
                                </p>
                              </div>

                              <div className="w-full p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-2">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> 60 meals delivered
                                </div>
                                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">ESG receipt · CO₂ saved logged · Donor notified</p>
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* Bottom strip — aggregate stats across the journey */}
                      <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                          { label: 'Avg claim time', value: '< 4 min', color: 'text-amber-600 dark:text-amber-400' },
                          { label: 'Avg delivery time', value: '22 min', color: 'text-sky-600 dark:text-sky-400' },
                          { label: 'Zero-contact errors', value: '100%', color: 'text-emerald-600 dark:text-emerald-400' },
                          { label: 'ESG receipts issued', value: '285+', color: 'text-rose-600 dark:text-rose-400' },
                        ].map((s, i) => (
                          <div key={i} className="text-center px-4 py-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{s.label}</p>
                          </div>
                        ))}
                      </div>

                    </div>
                  </section>

                    {/* ══════════════════════════════════════════════════════════════
            IMPACT STATS STRIP
        ══════════════════════════════════════════════════════════════ */}
                    <section id="impact" className="py-12 bg-white dark:bg-[#0c100c]">
                      <div className="max-w-6xl mx-auto px-4 sm:px-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                          {stats.map((stat, i) => (
                            <div key={i} className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                              </div>
                              <div>
                                <p className="text-xl font-bold text-neutral-900 dark:text-white">{stat.value}</p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{stat.label}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>

                      {/* ══════════════════════════════════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════════════════════════════════ */}
                      <section id="how-it-works" className="py-20 md:py-24 border-t border-neutral-200 dark:border-neutral-800">
                        <div className="max-w-6xl mx-auto px-4 sm:px-6">

                          <div className="max-w-xl mb-14">
                            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-3">How it works</p>
                            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white tracking-tight">
                              From kitchen surplus to community table
                            </h2>
                            <p className="mt-3 text-neutral-600 dark:text-neutral-400 leading-relaxed">
                              Three simple steps connect food businesses, local shelters, and volunteer couriers.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            {steps.map((step, i) => (
                              <div key={i}>
                                <div className="flex items-center gap-3 mb-5">
                                  <span className="text-sm font-bold text-neutral-300 dark:text-neutral-700 tabular-nums">{step.number}</span>
                                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 flex items-center justify-center">
                                    <step.icon className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" />
                                  </div>
                                </div>
                                <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-2">{step.title}</h3>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{step.description}</p>
                              </div>
                            ))}
                          </div>

                          {/* Role cards */}
                          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-5">
                            {roles.map((role, i) => (
                              <div key={i} className={`p-6 rounded-2xl bg-white dark:bg-neutral-900 border ${role.borderColor} flex flex-col gap-4`}>
                                <div className={`w-10 h-10 rounded-xl ${role.iconBg} flex items-center justify-center`}>
                                  <role.icon className={`w-5 h-5 ${role.iconColor}`} />
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold text-neutral-900 dark:text-white">{role.title}</p>
                                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{role.sub}</p>
                                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-3 leading-relaxed">{role.desc}</p>
                                </div>
                                <Link to="/register" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
                                  {role.cta} <ArrowRight className="w-3 h-3" />
                                </Link>
                              </div>
                            ))}
                          </div>
                        </div>
                      </section>

                      {/* ══════════════════════════════════════════════════════════════
            LIVE FEED PREVIEW
        ══════════════════════════════════════════════════════════════ */}
                      <section id="live-feed" className="py-20 bg-neutral-50 dark:bg-neutral-950 border-y border-neutral-200 dark:border-neutral-800">
                        <div className="max-w-6xl mx-auto px-4 sm:px-6">

                          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">Live surplus feed</p>
                              <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white tracking-tight">Available right now</h2>
                            </div>
                            <Link to="/register" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 shrink-0">
                              Sign in to claim <ArrowRight className="w-4 h-4" />
                            </Link>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {liveItems.map((item, i) => (
                              <div
                                key={i}
                                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 flex flex-col gap-4 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 rounded-md">
                                    {item.category}
                                  </span>
                                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-md ${item.urgent ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'}`}>
                                    <Clock className="w-3 h-3" /> {item.expires}
                                  </span>
                                </div>

                                <div>
                                  <h3 className="font-semibold text-neutral-900 dark:text-white text-sm leading-snug">{item.title}</h3>
                                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1.5">
                                    <Store className="w-3 h-3" /> {item.provider}
                                  </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                                  <div>
                                    <p className="text-neutral-400 dark:text-neutral-500">Volume</p>
                                    <p className="font-medium text-neutral-900 dark:text-white mt-0.5">{item.quantity}</p>
                                  </div>
                                  <div>
                                    <p className="text-neutral-400 dark:text-neutral-500">Servings</p>
                                    <p className="font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">{item.servings}</p>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                  <span className="text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
                                    <MapPin className="w-3 h-3" /> {item.distance}
                                  </span>
                                  <Link to="/register" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
                                    Claim <ArrowRight className="w-3 h-3" />
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </section>

                      {/* ══════════════════════════════════════════════════════════════
            TESTIMONIALS
        ══════════════════════════════════════════════════════════════ */}
                      <section className="py-20 md:py-24">
                        <div className="max-w-6xl mx-auto px-4 sm:px-6">

                          <div className="max-w-xl mb-14">
                            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-3">Community stories</p>
                            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white tracking-tight">
                              People behind the mission
                            </h2>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {testimonials.map((t, i) => (
                              <div key={i} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 flex flex-col gap-5">
                                <div className="flex items-center gap-0.5 text-amber-400">
                                  {[...Array(5)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-current" />)}
                                </div>
                                <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed flex-1">
                                  "{t.quote}"
                                </p>
                                <div className="flex items-center gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                                  <span className="text-2xl">{t.avatar}</span>
                                  <div>
                                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">{t.author}</p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{t.role}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </section>

                      {/* ══════════════════════════════════════════════════════════════
            FAQ
        ══════════════════════════════════════════════════════════════ */}
                      <section id="faq" className="py-20 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                        <div className="max-w-2xl mx-auto px-4 sm:px-6">

                          <div className="mb-12">
                            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-3">FAQ</p>
                            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">Common questions</h2>
                          </div>

                          <div className="space-y-3">
                            {faqs.map((faq, i) => {
                              const isOpen = openFaqIndex === i;
                              return (
                                <div key={i} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
                                  <button
                                    onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                                    className="w-full px-5 py-4 text-left text-sm font-medium text-neutral-900 dark:text-white flex items-center justify-between gap-4 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                                  >
                                    <span>{faq.q}</span>
                                    {isOpen
                                      ? <ChevronUp className="w-4 h-4 shrink-0 text-neutral-400" />
                                      : <ChevronDown className="w-4 h-4 shrink-0 text-neutral-400" />}
                                  </button>
                                  {isOpen && (
                                    <div className="px-5 pb-5 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed border-t border-neutral-100 dark:border-neutral-800 pt-4">
                                      {faq.a}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <div className="mt-8 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-neutral-900 dark:text-white">Help shape FoodRescue</p>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Share ideas, bugs, or your experience — no account needed.</p>
                            </div>
                            <Link to="/feedback" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors whitespace-nowrap">
                              <MessageSquarePlus className="w-3.5 h-3.5" /> Submit Feedback
                            </Link>
                          </div>
                        </div>
                      </section>

                      {/* ══════════════════════════════════════════════════════════════
            CTA BANNER
        ══════════════════════════════════════════════════════════════ */}
                      <section className="py-20">
                        <div className="max-w-6xl mx-auto px-4 sm:px-6">
                          <div className="rounded-2xl bg-emerald-600 px-8 py-14 md:px-14 text-center">
                            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight max-w-xl mx-auto leading-tight">
                              Ready to make surplus food count?
                            </h2>
                            <p className="mt-4 text-emerald-100 max-w-md mx-auto text-sm leading-relaxed">
                              Whether you have extra food to give, a shelter to feed, or time to deliver — there's a place for you here.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
                              <Link
                                to="/register"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold bg-white text-emerald-700 hover:bg-emerald-50 transition-colors w-full sm:w-auto justify-center"
                              >
                                <Heart className="w-4 h-4 fill-current" />
                                Create a free account
                              </Link>
                              <Link
                                to="/login"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white border border-emerald-400 hover:bg-emerald-500 transition-colors w-full sm:w-auto justify-center"
                              >
                                Sign in to portal
                              </Link>
                            </div>
                          </div>
                        </div>
                      </section>

                    </main>

                    {/* ══════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════ */}
                    <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 py-12">
                      <div className="max-w-6xl mx-auto px-4 sm:px-6">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-10 mb-10">

                          <div className="sm:col-span-1 space-y-3">
                            <Logo to="/" size="sm" showText={true} />
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                              Surplus food redistribution connecting providers, shelters, and volunteer couriers.
                            </p>
                            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Community network active
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-900 dark:text-white mb-4">Platform</p>
                            <ul className="space-y-2.5 text-xs text-neutral-500 dark:text-neutral-400">
                              <li><a href="#how-it-works" onClick={(e) => scrollTo('how-it-works', e)} className="hover:text-neutral-900 dark:hover:text-white transition-colors">How It Works</a></li>
                              <li><a href="#live-feed" onClick={(e) => scrollTo('live-feed', e)} className="hover:text-neutral-900 dark:hover:text-white transition-colors">Live Surplus Feed</a></li>
                              <li><a href="#faq" onClick={(e) => scrollTo('faq', e)} className="hover:text-neutral-900 dark:hover:text-white transition-colors">FAQ</a></li>
                            </ul>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-900 dark:text-white mb-4">Portals</p>
                            <ul className="space-y-2.5 text-xs text-neutral-500 dark:text-neutral-400">
                              <li><Link to="/login" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Food Provider</Link></li>
                              <li><Link to="/login" className="hover:text-neutral-900 dark:hover:text-white transition-colors">NGO & Shelter</Link></li>
                              <li><Link to="/login" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Volunteer Courier</Link></li>
                              <li><Link to="/login" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Admin</Link></li>
                            </ul>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-900 dark:text-white mb-4">Community</p>
                            <ul className="space-y-2.5 text-xs text-neutral-500 dark:text-neutral-400">
                              <li>
                                <Link to="/feedback" className="hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1.5">
                                  <MessageSquarePlus className="w-3 h-3" /> Submit Feedback
                                </Link>
                              </li>
                              <li>
                                <Link to="/register" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
                                  Become a Partner
                                </Link>
                              </li>
                            </ul>
                          </div>

                        </div>

                        <div className="pt-8 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-400 dark:text-neutral-500">
                          <p>© {CURRENT_YEAR} FoodRescue. Built for social good.</p>
                          <div className="flex items-center gap-1.5">
                            <Leaf className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Zero waste, more impact</span>
                          </div>
                        </div>
                      </div>
                    </footer>

                  </div>
                  );
}
