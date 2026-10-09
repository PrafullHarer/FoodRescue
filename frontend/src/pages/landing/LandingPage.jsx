import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ThemeToggle from '../../components/common/ThemeToggle';
import {
  Box, ArrowRight, CheckCircle2, Store, HeartHandshake,
  Truck, ShieldCheck, Sparkles, Clock, MapPin, QrCode,
  TrendingUp, Award, Leaf, Users, ChevronRight, Menu, X,
  Globe, Shield, Check, Star, Play
} from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeRoleTab, setActiveRoleTab] = useState('provider');

  const stats = [
    { label: 'Kg Food Rescued', value: '18,450+', icon: Leaf, desc: 'diverted from landfills' },
    { label: 'Meals Provided', value: '44,200+', icon: HeartHandshake, desc: 'to community shelters' },
    { label: 'CO₂ Emissions Prevented', value: '46.1 Tons', icon: TrendingUp, desc: 'greenhouse gas avoided' },
    { label: 'Avg Delivery Time', value: '38 Mins', icon: Clock, desc: 'from post to shelter dropoff' },
  ];

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
    <div className="min-h-screen w-full bg-[#050505] text-white flex flex-col selection:bg-white selection:text-black">
      {/* ─── Sticky Glass Navbar ─────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full bg-[#0c0c0e]/85 backdrop-blur-xl border-b border-[#232328] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-bold shadow-md shadow-white/10 group-hover:scale-105 transition-transform">
              <Box className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight block leading-none text-white">FoodRescue</span>
              <span className="text-[10px] text-neutral-400 font-medium tracking-wide">Smart Redistribution Network</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-400">
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#roles" className="hover:text-white transition-colors">For Providers & NGOs</a>
            <a href="#live-feed" className="hover:text-white transition-colors">Live Feed</a>
            <a href="#impact" className="hover:text-white transition-colors">ESG Impact</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Stories</a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle variant="icon" />

            {user ? (
              <Link to="/dashboard" className="btn btn-primary">
                <span>Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-sm font-medium text-neutral-300 hover:text-white hover:bg-[#18181b] transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="btn btn-primary shadow-lg shadow-white/5"
                >
                  <span>Get Started</span>
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
              className="p-2 rounded-xl bg-[#18181b] border border-[#232328] text-white hover:bg-[#232328] transition-all"
              aria-label="Toggle navigation menu"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileNavOpen && (
          <div className="md:hidden border-b border-[#232328] bg-[#0c0c0e] px-5 py-6 space-y-4 animate-fade-in">
            <nav className="flex flex-col space-y-3 text-sm font-medium text-neutral-300">
              <a
                href="#how-it-works"
                onClick={() => setMobileNavOpen(false)}
                className="py-1 hover:text-white transition-colors"
              >
                How It Works
              </a>
              <a
                href="#roles"
                onClick={() => setMobileNavOpen(false)}
                className="py-1 hover:text-white transition-colors"
              >
                For Providers & NGOs
              </a>
              <a
                href="#live-feed"
                onClick={() => setMobileNavOpen(false)}
                className="py-1 hover:text-white transition-colors"
              >
                Live Feed
              </a>
              <a
                href="#impact"
                onClick={() => setMobileNavOpen(false)}
                className="py-1 hover:text-white transition-colors"
              >
                ESG Impact
              </a>
              <a
                href="#testimonials"
                onClick={() => setMobileNavOpen(false)}
                className="py-1 hover:text-white transition-colors"
              >
                Stories
              </a>
            </nav>
            <div className="pt-4 border-t border-[#232328] flex flex-col gap-2.5">
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
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* ─── Hero Section ────────────────────────────────────────── */}
        <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden">
          {/* Subtle Background Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-white/5 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[200px] bg-white/3 rounded-full blur-[100px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto space-y-6">
              
              {/* Mission Pill Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#18181b] border border-[#232328] text-xs font-medium text-neutral-300 shadow-sm animate-fade-in">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>Zero Hunger • Zero Food Waste Platform</span>
                <span className="text-neutral-500">•</span>
                <span className="text-neutral-400 font-semibold">Live in 40+ Cities</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-white">
                Turn Surplus Food Into <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
                  Immediate Social Impact
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed">
                Connect restaurants, bakeries, and food businesses directly with local community shelters and volunteer couriers to rescue edible surplus food in real time.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  to="/register"
                  className="btn btn-primary w-full sm:w-auto text-base px-7 py-3.5 shadow-xl shadow-white/10"
                >
                  <span>Join FoodRescue</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="btn btn-secondary w-full sm:w-auto text-base px-7 py-3.5"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>See How It Works</span>
                </a>
              </div>

              {/* Trust badges */}
              <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-400 font-medium">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-white" />
                  <span>100% Verified Non-Profits</span>
                </div>
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-white" />
                  <span>Tamper-Proof QR Handover</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>Automated ESG Metrics</span>
                </div>
              </div>
            </div>

            {/* Hero Interactive App Mockup Preview */}
            <div className="mt-14 max-w-4xl mx-auto">
              <div className="glass-card p-4 sm:p-7 relative overflow-hidden shadow-2xl shadow-black/80">
                <div className="flex items-center justify-between border-b border-[#232328] pb-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    <span className="text-xs text-neutral-500 font-mono ml-2">FoodRescue Smart Dispatch Hub</span>
                  </div>
                  <span className="badge badge-success flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                    Live Matching Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: Provider Listing */}
                  <div className="bg-[#18181b]/70 border border-[#232328] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">01. Provider Listed</span>
                      <Store className="w-4 h-4 text-neutral-300" />
                    </div>
                    <p className="font-bold text-sm text-white leading-tight">60 Servings Hot Prepared Rice & Curry</p>
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <Clock className="w-3.5 h-3.5 text-white" />
                      <span>Expiry Countdown: 02h 45m</span>
                    </div>
                    <span className="badge badge-neutral text-[10px]">Verified Fresh • Halal</span>
                  </div>

                  {/* Card 2: NGO Claim */}
                  <div className="bg-[#18181b]/70 border border-[#232328] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">02. Shelter Claimed</span>
                      <HeartHandshake className="w-4 h-4 text-neutral-300" />
                    </div>
                    <p className="font-bold text-sm text-white leading-tight">Hope Haven Community Pantry</p>
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <MapPin className="w-3.5 h-3.5 text-white" />
                      <span>1.8 km Proximity Match</span>
                    </div>
                    <span className="badge badge-primary text-[10px]">Claim Confirmed • Courier Assigned</span>
                  </div>

                  {/* Card 3: QR Handover */}
                  <div className="bg-[#18181b]/70 border border-[#232328] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">03. QR Verification</span>
                      <QrCode className="w-4 h-4 text-neutral-300" />
                    </div>
                    <p className="font-bold text-sm text-white leading-tight">Contactless Courier Handover</p>
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <Truck className="w-3.5 h-3.5 text-white" />
                      <span>Courier On Route (8 mins)</span>
                    </div>
                    <span className="badge badge-success text-[10px]">Quality Checklist Passed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Platform Impact Counter ─────────────────────────────── */}
        <section id="impact" className="py-14 border-y border-[#232328] bg-[#0a0a0c]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, idx) => (
                <div key={idx} className="stat-card flex flex-col justify-between">
                  <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center mb-4 shadow-sm">
                    <stat.icon className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">{stat.value}</p>
                    <p className="text-sm font-semibold text-neutral-200 mt-1">{stat.label}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{stat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How It Works ────────────────────────────────────────── */}
        <section id="how-it-works" className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Simple 3-Step Process</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              How FoodRescue Works in Minutes
            </h2>
            <p className="text-sm sm:text-base text-neutral-400">
              Designed from the ground up for busy kitchen staff, urgent shelter needs, and rapid courier delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {steps.map((step, idx) => (
              <div key={idx} className="glass-card p-6 sm:p-8 flex flex-col justify-between relative group hover:border-neutral-500 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-3xl font-black text-neutral-600 group-hover:text-white transition-colors">{step.step}</span>
                    <div className="w-12 h-12 rounded-xl bg-[#18181b] border border-[#232328] flex items-center justify-center text-white">
                      <step.icon className="w-6 h-6" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-neutral-400 leading-relaxed">{step.desc}</p>
                </div>
                <div className="pt-6 mt-6 border-t border-[#232328] flex items-center gap-2 text-xs font-semibold text-neutral-300">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Real-time automation</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Role Solutions Showcase ─────────────────────────────── */}
        <section id="roles" className="py-20 border-t border-[#232328] bg-[#0c0c0e]/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Built for Every Participant</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Tailored for Food Donors, Shelters & Volunteers
              </h2>
            </div>

            {/* Role Switcher Tabs */}
            <div className="flex items-center justify-center gap-2 mb-10 overflow-x-auto pb-2">
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setActiveRoleTab(r.id)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                    activeRoleTab === r.id
                      ? 'bg-white text-black shadow-lg shadow-white/10'
                      : 'bg-[#18181b] border border-[#232328] text-neutral-400 hover:text-white'
                  }`}
                >
                  <r.icon className="w-4 h-4" />
                  <span>{r.title}</span>
                </button>
              ))}
            </div>

            {/* Active Role Content Card */}
            {roles
              .filter((r) => r.id === activeRoleTab)
              .map((role) => (
                <div key={role.id} className="glass-card p-6 sm:p-10 max-w-4xl mx-auto animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-5">
                      <div className="inline-block">
                        <span className="badge badge-info">{role.badge}</span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-white">{role.title}</h3>
                      <p className="text-sm text-neutral-400 leading-relaxed">{role.desc}</p>
                      
                      <Link
                        to={role.ctaLink}
                        className="btn btn-primary inline-flex mt-2"
                      >
                        <span>{role.ctaText}</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>

                    <div className="bg-[#18181b] border border-[#232328] rounded-2xl p-6 space-y-3.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">Key Advantages</h4>
                      {role.benefits.map((benefit, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm text-neutral-300">
                          <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
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
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Live Surplus Showcase</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-1">
                Recent Food Packages Rescued
              </h2>
            </div>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:underline"
            >
              <span>Explore All Live Listings</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sampleDonations.map((item, idx) => (
              <div key={idx} className="glass-card p-6 flex flex-col justify-between hover:border-neutral-500 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="badge badge-info">{item.category}</span>
                    <span className="badge badge-warning flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.expiresIn}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-white leading-snug">{item.title}</h3>
                    <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-neutral-300" />
                      {item.provider}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#232328] text-xs">
                    <div>
                      <span className="text-neutral-500 block">Quantity</span>
                      <span className="font-semibold text-white">{item.quantity}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Estimated Servings</span>
                      <span className="font-semibold text-white">{item.servings}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag, tIdx) => (
                      <span key={tIdx} className="badge badge-neutral text-[10px]">{tag}</span>
                    ))}
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-[#232328] flex items-center justify-between">
                  <span className="text-xs text-neutral-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-white" />
                    {item.distance}
                  </span>
                  <Link
                    to="/register"
                    className="text-xs font-bold text-white hover:underline flex items-center gap-1"
                  >
                    Claim Food <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Testimonials / Social Proof ─────────────────────────── */}
        <section id="testimonials" className="py-20 border-t border-[#232328] bg-[#0a0a0c]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Community Voices</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Trusted by 450+ Food Businesses & Shelters
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((t, idx) => (
                <div key={idx} className="glass-card p-6 sm:p-7 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    <p className="text-sm text-neutral-300 leading-relaxed italic">
                      "{t.quote}"
                    </p>
                  </div>

                  <div className="pt-6 mt-6 border-t border-[#232328] flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-white">{t.author}</p>
                      <p className="text-xs text-neutral-400">{t.role}</p>
                    </div>
                    <span className="badge badge-neutral text-[10px]">{t.badge}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Bottom CTA Banner ───────────────────────────────────── */}
        <section className="py-20 md:py-28 relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="glass-card p-8 sm:p-14 text-center space-y-6 relative overflow-hidden bg-gradient-to-b from-[#18181b] to-[#0c0c0e]">
              <div className="w-16 h-16 rounded-2xl bg-white text-black mx-auto flex items-center justify-center font-bold shadow-xl shadow-white/10">
                <Box className="w-8 h-8 stroke-[2.5]" />
              </div>

              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight max-w-2xl mx-auto leading-tight">
                Ready to Help Eliminate Food Waste in Your City?
              </h2>

              <p className="text-base text-neutral-400 max-w-xl mx-auto">
                Join our network today. Whether you have surplus food, represent a community shelter, or want to deliver meals as a courier.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  to="/register"
                  className="btn btn-primary text-base px-8 py-3.5 w-full sm:w-auto shadow-xl shadow-white/10"
                >
                  <span>Create Free Account</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="btn btn-secondary text-base px-8 py-3.5 w-full sm:w-auto"
                >
                  <span>Sign In to Portal</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Comprehensive Footer ─────────────────────────────────── */}
      <footer className="border-t border-[#232328] bg-[#0c0c0e] py-12 text-sm text-neutral-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Brand Info */}
            <div className="space-y-3 md:col-span-1">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold">
                  <Box className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span className="font-bold text-base text-white">FoodRescue</span>
              </Link>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Smart surplus food donation and redistribution platform combating food insecurity and carbon emissions.
              </p>
            </div>

            {/* Links: Platform */}
            <div>
              <p className="font-semibold text-white text-xs uppercase tracking-wider mb-3">Platform</p>
              <ul className="space-y-2 text-xs">
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#live-feed" className="hover:text-white transition-colors">Live Surplus Feed</a></li>
                <li><a href="#impact" className="hover:text-white transition-colors">ESG Analytics</a></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Become a Partner</Link></li>
              </ul>
            </div>

            {/* Links: Portals */}
            <div>
              <p className="font-semibold text-white text-xs uppercase tracking-wider mb-3">Portals</p>
              <ul className="space-y-2 text-xs">
                <li><Link to="/login" className="hover:text-white transition-colors">Food Provider Login</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">NGO & Shelter Portal</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Volunteer Courier Hub</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Admin Governance</Link></li>
              </ul>
            </div>

            {/* Status & Trust */}
            <div className="space-y-3">
              <p className="font-semibold text-white text-xs uppercase tracking-wider mb-3">Network Status</p>
              <div className="p-3.5 rounded-xl bg-[#18181b] border border-[#232328] space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-white">All Systems Operational</span>
                </div>
                <p className="text-[11px] text-neutral-400">PostGIS Geolocation & Real-time WebSockets active.</p>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-[#232328] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
            <p>© {new Date().getFullYear()} FoodRescue Platform. Built for Social Good.</p>
            <div className="flex items-center gap-6">
              <a href="#privacy" className="hover:text-neutral-400 transition-colors">Privacy Policy</a>
              <a href="#terms" className="hover:text-neutral-400 transition-colors">Terms of Service</a>
              <a href="#security" className="hover:text-neutral-400 transition-colors">Security Audit</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
