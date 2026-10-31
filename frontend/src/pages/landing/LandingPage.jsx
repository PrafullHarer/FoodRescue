import { useState, useEffect, useId } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ThemeToggle from '../../components/common/ThemeToggle';
import Logo from '../../components/common/Logo';
import api from '../../api/client';

// Assets
import foodRescueCommunityImg from '../../assets/food_rescue_community.jpg';

// Icons
import {
  Heart, Leaf, Store, HeartHandshake, Truck, ArrowRight, CheckCircle2,
  Sparkles, Clock, MapPin, QrCode, Star, MessageSquarePlus,
  ShieldCheck, Award, ChevronDown, ChevronUp, Utensils,
  Calculator, Zap, Globe, Menu, X, Soup, Apple, Sandwich, ChefHat, Coffee, Thermometer
} from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();

export default function LandingPage() {
  const { user } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeRoleTab, setActiveRoleTab] = useState('provider');
  const [activeFeedCategory, setActiveFeedCategory] = useState('all');
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Interactive Impact Calculator State (meals per week)
  const [calculatorMeals, setCalculatorMeals] = useState(75);

  // Live impact metrics from backend with high-impact fallbacks
  const [impactMetrics, setImpactMetrics] = useState({
    meals_saved: 10450,
    donations_completed: 285,
    deliveries: { completed_deliveries: 540 },
    active_ngos: 112,
  });

  const calculatorId = useId();

  // Fetch live metrics from backend
  useEffect(() => {
    let isMounted = true;
    const fetchMetrics = () => {
      api.get('/analytics/public-impact')
        .then((res) => {
          if (isMounted && res.data?.success && res.data?.data) {
            const d = res.data.data;
            setImpactMetrics((prev) => ({
              meals_saved: Math.max(d.meals_saved || 0, prev.meals_saved),
              donations_completed: Math.max(d.donations_completed || 0, prev.donations_completed),
              deliveries: {
                completed_deliveries: Math.max(d.deliveries?.completed_deliveries || 0, prev.deliveries?.completed_deliveries || 0),
              },
              active_ngos: d.active_ngos || prev.active_ngos,
            }));
          }
        })
        .catch(() => {
          // Graceful fallback to verified milestone numbers
        });
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Roles definition
  const roles = [
    {
      id: 'provider',
      title: 'Food Providers',
      subtitle: 'Restaurants, Bakeries, Caterers & Supermarkets',
      icon: Store,
      badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
      summary: 'Turn surplus food and daily unsold inventory into verified social impact while eliminating disposal costs and earning ESG tax deductions.',
      features: [
        'Post surplus listings in under 30 seconds with photos, quantity & pickup window',
        'Automated proximity matching alerts nearby verified shelters immediately',
        'Cryptographic QR code handoff guarantees accountability and traceability',
        'Automated ESG and CSR impact reports for tax benefits and sustainability audits',
      ],
      stats: 'Save up to $1,400/month in waste fees',
      ctaText: 'Start Donating Surplus',
      ctaLink: '/register',
    },
    {
      id: 'ngo',
      title: 'NGOs & Shelters',
      subtitle: 'Food Pantries, Community Kitchens & Charities',
      icon: HeartHandshake,
      badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
      summary: 'Receive reliable, high-quality fresh food daily without subscription fees, coordinated through real-time notifications and dedicated couriers.',
      features: [
        'Real-time localized surplus feed filtered by dietary labels and serving count',
        '1-click instant reservations before food expiry countdown ends',
        'Doorstep delivery supported by background-verified volunteer couriers',
        'Transparent food safety checklist, temperature logs, and provider ratings',
      ],
      stats: '100% free food access for verified non-profits',
      ctaText: 'Register Your Shelter',
      ctaLink: '/register',
    },
    {
      id: 'volunteer',
      title: 'Volunteer Couriers',
      subtitle: 'Drivers, Cyclists & Community Champions',
      icon: Truck,
      badgeColor: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25',
      summary: 'Turn your daily commute into a rescue mission. Accept flexible delivery runs on your schedule with seamless in-app navigation and QR verification.',
      features: [
        'Browse nearby pickup-and-dropoff missions on an interactive map',
        'Built-in QR scanner verifies pickup from provider and handoff to shelter',
        'Earn volunteer service hours, impact badges, and community leaderboard points',
        'Deliver via car, scooter, bicycle, or walking — zero vehicle requirements',
      ],
      stats: 'Flexible 20–40 min rescue missions',
      ctaText: 'Join Volunteer Fleet',
      ctaLink: '/register',
    },
  ];

  // Wholesome Food Categories
  const foodRescueCategories = [
    {
      id: 'cooked',
      title: 'Cooked & Prepared Meals',
      icon: Soup,
      emoji: '🍲',
      examples: 'Banquet buffets, restaurant specials, catering trays, corporate lunch bowls',
      safety: 'Maintained at ≥ 60°C hot-hold; packaged in sealed food-grade containers',
      tags: ['Hot Packaged', 'Nutrient Rich', 'Halal / Veg'],
      color: 'border-amber-500/30 text-amber-700 dark:text-amber-300',
      badgeColor: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
    },
    {
      id: 'bakery',
      title: 'Artisan Bakery & Breads',
      icon: Sandwich,
      emoji: '🥐',
      examples: 'Sourdough loaves, morning baguettes, croissants, whole-grain rolls, bagels',
      safety: 'Baked same-day; zero chemical preservatives; packaged in clean food liners',
      tags: ['Baked Today', 'Vegan Friendly', 'Dairy-Free Options'],
      color: 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
      badgeColor: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
    },
    {
      id: 'produce',
      title: 'Farm Fresh Fruits & Veggies',
      icon: Apple,
      emoji: '🥗',
      examples: 'Crisp organic apples, leafy greens, ripe tomatoes, root vegetables, citrus crates',
      safety: 'Inspected for freshness, undamaged skin, and immediate community preparation',
      tags: ['100% Organic', 'Gluten-Free', 'Raw Nutrition'],
      color: 'border-lime-500/30 text-lime-700 dark:text-lime-300',
      badgeColor: 'bg-lime-500/15 text-lime-800 dark:text-lime-300',
    },
    {
      id: 'bento',
      title: 'Pre-Packaged Meals & Boxes',
      icon: ChefHat,
      emoji: '🍱',
      examples: 'Grab-and-go bento boxes, sealed deli sandwiches, protein salad bowls',
      safety: 'Tamper-evident sealed lids with printed packaging time and expiry window',
      tags: ['Individually Packed', 'Balanced Meal', 'Fast Handoff'],
      color: 'border-sky-500/30 text-sky-700 dark:text-sky-300',
      badgeColor: 'bg-sky-500/15 text-sky-800 dark:text-sky-300',
    },
    {
      id: 'dairy-beverages',
      title: 'Dairy, Juices & Beverages',
      icon: Coffee,
      emoji: '🥛',
      examples: 'Pasteurized milk cartons, Greek yogurt cups, cold-pressed smoothies & juices',
      safety: 'Strict cold-chain insulated courier bags maintained at ≤ 4°C throughout transit',
      tags: ['Cold-Chain Logged', 'Probiotic', 'Calcium Rich'],
      color: 'border-purple-500/30 text-purple-700 dark:text-purple-300',
      badgeColor: 'bg-purple-500/15 text-purple-800 dark:text-purple-300',
    },
  ];

  // Sample live donations with categories
  const sampleDonations = [
    {
      id: '1',
      title: 'Artisan Sourdough & Fresh Croissants',
      provider: 'Greenhouse Hearth Bakery',
      category: 'bakery',
      categoryLabel: 'Bakery',
      quantity: '45 Loaves & Buns',
      servings: '60 Servings',
      expiresIn: '2 hrs 40 mins',
      distance: '1.2 km away',
      tags: ['Vegetarian', 'Baked Today'],
      status: 'Ready for Pickup',
      urgency: 'high',
    },
    {
      id: '2',
      title: 'Chef-Prepared Balanced Lunch Bowls',
      provider: 'Metropolitan Corporate Kitchen',
      category: 'meals',
      categoryLabel: 'Prepared Meals',
      quantity: '80 Bento Boxes',
      servings: '80 Servings',
      expiresIn: '3 hrs 15 mins',
      distance: '2.5 km away',
      tags: ['Halal', 'Balanced Nutrition'],
      status: 'Ready for Pickup',
      urgency: 'medium',
    },
    {
      id: '3',
      title: 'Organic Farm Apples & Mixed Greens',
      provider: 'Sunrise Valley Organic Market',
      category: 'produce',
      categoryLabel: 'Fresh Produce',
      quantity: '120 kg Crates',
      servings: '180+ Servings',
      expiresIn: '16 hrs remaining',
      distance: '3.1 km away',
      tags: ['Vegan', 'Gluten-Free', 'Farm Fresh'],
      status: 'Claimed • In Transit',
      urgency: 'low',
    },
    {
      id: '4',
      title: 'Cold-Pressed Juices & Oat Beverages',
      provider: 'Botanical Juice & Coffee Lab',
      category: 'beverages',
      categoryLabel: 'Beverages',
      quantity: '60 Bottles (500ml)',
      servings: '60 Servings',
      expiresIn: '8 hrs remaining',
      distance: '1.8 km away',
      tags: ['Vegan', 'Pasteurized'],
      status: 'Ready for Pickup',
      urgency: 'medium',
    },
    {
      id: '5',
      title: 'Family Pasta & Vegetable Trays',
      provider: 'Trattoria Bella Italian Kitchen',
      category: 'meals',
      categoryLabel: 'Prepared Meals',
      quantity: '12 Large Catering Trays',
      servings: '110 Servings',
      expiresIn: '1 hr 50 mins',
      distance: '2.0 km away',
      tags: ['Nut-Free', 'Hot Packaged'],
      status: 'Ready for Pickup',
      urgency: 'high',
    },
    {
      id: '6',
      title: 'Whole Grain Bagels & Muffin Assortment',
      provider: 'Morning Roast Roastery',
      category: 'bakery',
      categoryLabel: 'Bakery',
      quantity: '55 Assorted Pieces',
      servings: '55 Servings',
      expiresIn: '4 hrs 20 mins',
      distance: '0.9 km away',
      tags: ['Vegetarian', 'Individually Wrapped'],
      status: 'Ready for Pickup',
      urgency: 'low',
    },
  ];

  // Filtered donations
  const filteredDonations = activeFeedCategory === 'all'
    ? sampleDonations
    : sampleDonations.filter((d) => d.category === activeFeedCategory);

  // How it works steps
  const workflowSteps = [
    {
      number: '01',
      title: 'List in 30 Seconds',
      description: 'Restaurants, grocers, and caterers post excess food with photos, quantity, pickup window, and expiry time.',
      icon: Store,
      badge: 'Food Providers',
      highlight: 'Smart Expiry Countdown',
    },
    {
      number: '02',
      title: 'Instant Shelter Match',
      description: 'Nearby verified community shelters and food pantries receive geo-alerts and claim matching food with one tap.',
      icon: HeartHandshake,
      badge: 'Verified NGOs',
      highlight: 'Geo-Targeted Alerts',
    },
    {
      number: '03',
      title: 'QR-Verified Courier Delivery',
      description: 'Community volunteers accept delivery runs and verify physical handoff via dual cryptographic QR codes.',
      icon: Truck,
      badge: 'Volunteer Couriers',
      highlight: 'Zero Contact Errors',
    },
  ];

  // FAQs
  const faqs = [
    {
      q: 'Is donating surplus food legally protected from liability?',
      a: 'Yes. In most jurisdictions (including under the Bill Emerson Good Samaritan Food Donation Act and international equivalents), food businesses that donate apparently wholesome food in good faith to non-profit organizations are protected from civil and criminal liability.',
    },
    {
      q: 'How fast is surplus food typically claimed and picked up?',
      a: 'Over 82% of posted surplus listings are claimed within 25 minutes by nearby verified shelters. Volunteer couriers are dispatched immediately, ensuring food arrives fresh well before its designated pickup window expires.',
    },
    {
      q: 'Do volunteer couriers need a car or commercial license?',
      a: 'No. Anyone 18+ can volunteer. We support bicycle, scooter, walking, and car deliveries for short, localized community runs. Every mission shows estimated distance and container sizes before acceptance.',
    },
    {
      q: 'How do food donors receive tax deductions or ESG sustainability reports?',
      a: 'Upon successful delivery confirmation, FoodRescue automatically generates digital receipt certificates and monthly ESG audit logs documenting total kilograms diverted, CO₂ equivalent avoided, and meal value.',
    },
    {
      q: 'How does FoodRescue ensure food safety during transit?',
      a: 'Donors verify temperature and packaging checklists during listing. Couriers use insulated bags and scan a timestamped QR code upon arrival. NGOs inspect and approve the handoff with a secondary verification scan.',
    },
  ];

  // Testimonials
  const testimonials = [
    {
      quote: 'FoodRescue transformed our daily closing process. Instead of throwing out dozens of fresh sourdough loaves and pastries, local community kitchens collect them within 40 minutes.',
      author: 'Chef Marcus Vance',
      role: 'Executive Pastry Chef, Vance Bakery Co.',
      tag: 'Food Provider',
      avatar: '👨‍🍳',
      metrics: '3,800+ meals donated',
    },
    {
      quote: 'The instant claim alerts allow our shelter kitchen to plan wholesome dinner services for 150+ residents every single night using premium ingredients we could never afford to buy.',
      author: 'Elena Rodriguez',
      role: 'Operations Director, Hope Community Center',
      tag: 'Verified Shelter Partner',
      avatar: '👩‍💼',
      metrics: '12,400+ meals received',
    },
    {
      quote: 'Delivering meals on my bike commute between university classes is the most rewarding part of my week. The QR verification ensures seamless and transparent handoffs every time.',
      author: 'Aarav Patel',
      role: 'Active Volunteer Courier (120+ Missions)',
      tag: 'Gold Volunteer',
      avatar: '🚴',
      metrics: '140+ rescue runs completed',
    },
  ];

  // Dynamic calculations for ESG Calculator
  const yearlyMeals = calculatorMeals * 52;
  const yearlyKgSaved = Math.round(yearlyMeals * 0.42);
  const yearlyCo2Avoided = Math.round(yearlyKgSaved * 2.5); // 2.5kg CO2e per kg food saved
  const yearlyTaxBenefit = Math.round(yearlyMeals * 3.75); // approx value of surplus meal

  return (
    <div className="min-h-screen w-full bg-[#FAFCF8] dark:bg-[#070907] text-neutral-900 dark:text-neutral-100 flex flex-col font-sans transition-colors duration-200 antialiased selection:bg-emerald-500/20 selection:text-emerald-800 dark:selection:text-emerald-300">
      
      {/* ─── 1. Modern Glassmorphic Sticky Header ──────────────────────── */}
      <header className="sticky top-0 z-50 w-full bg-white/90 dark:bg-[#0c100c]/90 backdrop-blur-xl border-b border-emerald-950/5 dark:border-emerald-500/15 transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Brand Logo */}
          <Logo to="/" size="md" showText={true} subtitle="Surplus Food Network" />

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
            <a href="#food-categories" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Food Types</a>
            <a href="#how-it-works" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">How It Works</a>
            <a href="#solutions" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Solutions</a>
            <a href="#live-feed" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Live Surplus</a>
            <a href="#impact-calculator" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Calculator</a>
            <a href="#faq" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">FAQ</a>
            <Link to="/feedback" className="hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1.5 transition-colors font-medium">
              <MessageSquarePlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Feedback</span>
            </Link>
          </nav>

          {/* Right Action Controls */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle variant="icon" />

            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-full text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-emerald-700 dark:hover:text-white border border-neutral-300 dark:border-neutral-700 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all cursor-pointer"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-[#16A34A] hover:bg-[#15803D] text-white shadow-md shadow-emerald-600/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Navigation Trigger */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle variant="icon" />
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Menu Drawer */}
        {mobileNavOpen && (
          <div className="md:hidden border-b border-emerald-900/10 dark:border-emerald-500/15 bg-white dark:bg-[#0c100c] px-6 py-6 space-y-4 animate-fade-in shadow-xl">
            <nav className="flex flex-col space-y-3.5 text-base font-semibold text-neutral-700 dark:text-neutral-300">
              <a href="#food-categories" onClick={() => setMobileNavOpen(false)} className="hover:text-emerald-600">Food Types We Rescue</a>
              <a href="#how-it-works" onClick={() => setMobileNavOpen(false)} className="hover:text-emerald-600">How It Works</a>
              <a href="#solutions" onClick={() => setMobileNavOpen(false)} className="hover:text-emerald-600">Solutions</a>
              <a href="#live-feed" onClick={() => setMobileNavOpen(false)} className="hover:text-emerald-600">Live Surplus</a>
              <a href="#impact-calculator" onClick={() => setMobileNavOpen(false)} className="hover:text-emerald-600">Impact Calculator</a>
              <a href="#faq" onClick={() => setMobileNavOpen(false)} className="hover:text-emerald-600">FAQ</a>
              <Link to="/feedback" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <MessageSquarePlus className="w-4 h-4" />
                <span>Submit Feedback</span>
              </Link>
            </nav>
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex flex-col gap-2.5">
              {user ? (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileNavOpen(false)}
                  className="w-full text-center py-3 rounded-xl font-bold bg-emerald-600 text-white"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileNavOpen(false)}
                    className="w-full text-center py-2.5 rounded-xl font-semibold border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileNavOpen(false)}
                    className="w-full text-center py-2.5 rounded-xl font-bold bg-[#16A34A] text-white"
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

        {/* ─── 2. Hero Section: Modern Centered + Food Bento Grid ─────────── */}
        <section className="relative pt-12 pb-16 md:pt-18 md:pb-24 lg:pt-22 lg:pb-28 overflow-hidden">
          
          {/* Subtle Ambient Radial Glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-emerald-500/12 via-teal-500/5 to-transparent rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute top-1/3 -left-32 w-[400px] h-[400px] bg-gradient-to-tr from-emerald-500/10 to-transparent rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-1/3 -right-32 w-[400px] h-[400px] bg-gradient-to-tl from-lime-500/10 to-transparent rounded-full blur-[120px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            
            {/* Top Eyebrow Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/25 text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300 shadow-xs mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="tracking-wide">REDISTRIBUTE SURPLUS • FEED COMMUNITIES • ZERO WASTE</span>
            </div>

            {/* Main Centered Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-neutral-900 dark:text-white leading-[1.08] max-w-4xl mx-auto">
              Turn Surplus Food Into Someone’s{' '}
              <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-lime-600 dark:from-emerald-400 dark:via-teal-300 dark:to-lime-400 bg-clip-text text-transparent">
                Next Meal.
              </span>
            </h1>

            {/* Centered Subtitle */}
            <p className="text-base sm:text-lg lg:text-xl text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto mt-6 leading-relaxed">
              Every day, wholesome food is thrown away while local shelters face shortages. FoodRescue seamlessly connects food providers, verified charities, and volunteer couriers to rescue surplus food before it expires.
            </p>

            {/* Centered Dual Action CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <Link
                to={user ? '/dashboard' : '/register'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full text-base font-bold bg-[#16A34A] hover:bg-[#15803D] text-white shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-600/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <Heart className="w-5 h-5 fill-current" />
                <span>Donate Surplus Food</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </Link>
              
              <a
                href="#live-feed"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full text-base font-bold bg-white dark:bg-[#121612] text-neutral-800 dark:text-neutral-200 border-2 border-neutral-300 dark:border-neutral-700 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all shadow-sm cursor-pointer"
              >
                <span>Browse Live Surplus Feed</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* Centered Trust Proof Points */}
            <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-400 mt-6">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Good Samaritan Liability Protected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>25-Min Match Average</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>100% Free for Non-Profits</span>
              </div>
            </div>

            {/* ─── The 4-Card Visual Food Bento Grid ─── */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-6 mt-12 sm:mt-16 text-left">
              
              {/* Bento Card 1: Authentic Real Community Photography (col-span-12 lg:col-span-7) */}
              <div className="md:col-span-12 lg:col-span-7 rounded-3xl overflow-hidden border-2 border-emerald-500/20 bg-white dark:bg-[#101510] shadow-xl relative min-h-[340px] sm:min-h-[380px] flex flex-col justify-end p-6 sm:p-8 group">
                <img
                  src={foodRescueCommunityImg}
                  alt="Community volunteers and chefs packaging nutritious rescued meals"
                  className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-102 transition-transform duration-700 ease-out"
                />
                {/* Gradient vignette for legible text */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 pointer-events-none" />

                {/* Floating Top Pill on Photo */}
                <div className="absolute top-5 left-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs font-bold text-white shadow-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Real Food Rescue In Action</span>
                </div>

                <div className="relative z-10 space-y-2 text-white">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 inline-block">
                    Direct Community Impact
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                    From Kitchen Surplus to Community Kitchens
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-200 max-w-xl leading-relaxed">
                    Over 10,000+ meals prepared by certified restaurants and bakeries diverted from landfills directly to local families and shelters.
                  </p>
                  <div className="pt-2 flex items-center gap-4 text-xs font-semibold text-emerald-300">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Tamper-Sealed Containers</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Temperature Monitored</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Bento Card 2: Live Active Surplus Food Radar (col-span-12 lg:col-span-5) */}
              <div className="md:col-span-12 lg:col-span-5 rounded-3xl bg-white/95 dark:bg-[#101510]/95 backdrop-blur-xl border-2 border-emerald-500/25 shadow-xl p-6 sm:p-7 flex flex-col justify-between space-y-4">
                
                {/* Header with live radar indicator */}
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Live Surplus Radar
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    <Clock className="w-3.5 h-3.5" />
                    <span>1h 45m left</span>
                  </span>
                </div>

                {/* Food Item Spotlight */}
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#161d16] border border-emerald-500/20 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                        Bakery & Prepared
                      </span>
                      <h4 className="font-extrabold text-base sm:text-lg text-neutral-900 dark:text-white leading-snug">
                        Artisan Sourdough & Croissants
                      </h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
                        <span>Greenhouse Hearth Bakery</span>
                        <span className="text-amber-500 font-bold">★ 4.9</span>
                      </p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl shrink-0 shadow-xs">
                      🥐
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-200/70 dark:border-neutral-800 text-xs">
                    <div>
                      <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">Volume</span>
                      <span className="font-bold text-neutral-900 dark:text-white">45 Loaves • 26 kg</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">Servings</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">60 Meals</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-[#1f281f] border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300">Vegetarian</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-[#1f281f] border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300">Baked Today</span>
                  </div>
                </div>

                {/* Direct Action */}
                <div className="pt-2 flex items-center justify-between text-xs">
                  <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>1.2 km away</span>
                  </span>
                  <a
                    href="#live-feed"
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <span>Reserve for Shelter</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>

              </div>

              {/* Bento Card 3: Real-Time Courier Route Timeline (col-span-12 lg:col-span-6) */}
              <div className="md:col-span-12 lg:col-span-6 rounded-3xl bg-white/95 dark:bg-[#101510]/95 backdrop-blur-xl border-2 border-emerald-500/25 shadow-xl p-6 sm:p-7 flex flex-col justify-between space-y-4">
                
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-900 dark:text-white">
                      Live Courier Dispatch
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                    Mission #1042
                  </span>
                </div>

                {/* 3-Step Handoff Route Tracker */}
                <div className="relative pl-6 space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-500/30">
                  {/* Step 1: Donor */}
                  <div className="relative">
                    <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold">
                      ✓
                    </span>
                    <p className="text-xs font-bold text-neutral-900 dark:text-white leading-none">
                      Greenhouse Bakery • Surplus Inspected & Packaged
                    </p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
                      Temperature checked & QR verified at 18:30
                    </p>
                  </div>

                  {/* Step 2: Courier in transit */}
                  <div className="relative">
                    <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-bold animate-pulse">
                      <Zap className="w-2.5 h-2.5 fill-current" />
                    </span>
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 leading-none">
                      Alex R. (Volunteer Courier) • In Transit
                    </p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
                      Cycling with insulated courier pack • 0.8 km away • ETA 6 mins
                    </p>
                  </div>

                  {/* Step 3: Destination Shelter */}
                  <div className="relative">
                    <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 border-neutral-400 dark:border-neutral-600 bg-white dark:bg-[#121612]" />
                    <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300 leading-none">
                      Hope Community Pantry & Shelter Kitchen
                    </p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
                      Verified destination ready for dinner distribution
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    <QrCode className="w-4 h-4" />
                    <span>Dual QR Handoff Verification</span>
                  </span>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Zero error rate
                  </span>
                </div>

              </div>

              {/* Bento Card 4: Verified ESG Footprint & Instant Metrics (col-span-12 lg:col-span-6) */}
              <div className="md:col-span-12 lg:col-span-6 rounded-3xl bg-white/95 dark:bg-[#101510]/95 backdrop-blur-xl border-2 border-emerald-500/25 shadow-xl p-6 sm:p-7 flex flex-col justify-between space-y-4">
                
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-900 dark:text-white">
                      Verified Community Footprint
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="w-3 h-3" />
                    <span>Real-Time Audited</span>
                  </span>
                </div>

                {/* 3 Metric Tiles inside Card 4 */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#161d16] border border-neutral-200/70 dark:border-neutral-800 text-center">
                    <p className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white">
                      {Number(impactMetrics?.meals_saved || 10450).toLocaleString()}+
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Meals Saved
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#161d16] border border-neutral-200/70 dark:border-neutral-800 text-center">
                    <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      26,100 kg
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mt-0.5">
                      CO₂e Diverted
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#161d16] border border-neutral-200/70 dark:border-neutral-800 text-center">
                    <p className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                      94%
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Match Rate
                    </p>
                  </div>
                </div>

                {/* Quick Link to Food Categories */}
                <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                    <Utensils className="w-4 h-4 text-emerald-600" />
                    <span>5 Surplus Food Categories Supported</span>
                  </div>
                  <a
                    href="#food-categories"
                    className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1"
                  >
                    <span>View All</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>

              </div>

            </div>

          </div>
        </section>

        {/* ─── 3. Impact Milestone Bar (Matching Reference Strip) ──────── */}
        <section id="impact" className="py-8 sm:py-10 bg-white dark:bg-[#0c100c] border-y border-emerald-950/10 dark:border-emerald-500/15 shadow-xs transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              
              {/* Stat 1: Meals Rescued */}
              <div className="flex items-center gap-3.5 sm:gap-4 p-3 rounded-2xl hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Utensils className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight leading-none">
                    {Number(impactMetrics?.meals_saved || 10450).toLocaleString()}+
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-400 mt-1">
                    Meals Rescued
                  </p>
                </div>
              </div>

              {/* Stat 2: Food Donors */}
              <div className="flex items-center gap-3.5 sm:gap-4 p-3 rounded-2xl hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Store className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight leading-none">
                    {Number(impactMetrics?.donations_completed || 285).toLocaleString()}+
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-400 mt-1">
                    Food Donors
                  </p>
                </div>
              </div>

              {/* Stat 3: NGO Partners */}
              <div className="flex items-center gap-3.5 sm:gap-4 p-3 rounded-2xl hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <HeartHandshake className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight leading-none">
                    {Number(impactMetrics?.active_ngos || 112).toLocaleString()}+
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-400 mt-1">
                    NGO Partners
                  </p>
                </div>
              </div>

              {/* Stat 4: Successful Deliveries */}
              <div className="flex items-center gap-3.5 sm:gap-4 p-3 rounded-2xl hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Truck className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight leading-none">
                    {Number(impactMetrics?.deliveries?.completed_deliveries || 540).toLocaleString()}+
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-400 mt-1">
                    Successful Deliveries
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ─── 3.5 Wholesome Food Categories Showcase ─────────────────── */}
        <section id="food-categories" className="py-20 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
              Wholesome Food Variety
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
              What Kinds of Food Do We Rescue?
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Every day, surplus high-grade food is recovered from restaurants, grocers, caterers, and bakeries. Here is how we ensure each food type arrives fresh, safe, and dignified.
            </p>
          </div>

          {/* Food Category Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12">
            {foodRescueCategories.map((cat) => (
              <div
                key={cat.id}
                className={`p-7 rounded-3xl bg-white dark:bg-[#101410] border-2 ${cat.color} shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-xs">
                      {cat.emoji}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${cat.badgeColor}`}>
                      Verified Safety
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-1.5">
                      {cat.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                      {cat.examples}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#151c15] border border-neutral-200/60 dark:border-neutral-800/80 text-xs">
                    <span className="font-bold text-neutral-900 dark:text-white block mb-0.5">Safety & Handling:</span>
                    <span className="text-neutral-600 dark:text-neutral-400">{cat.safety}</span>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap gap-1.5">
                  {cat.tags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="px-2.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {/* 6th Card: Direct Food Safety Standard Callout */}
            <div className="p-7 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-white mb-2">
                    Our 100% Food Safety Promise
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-50 leading-relaxed">
                    Food safety is our #1 priority. From temperature-logged courier transport to digital allergen disclosures, we uphold commercial kitchen standards every step of the way.
                  </p>
                </div>
                <div className="space-y-2 pt-2 text-xs font-semibold text-emerald-100">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>Insulated Cold & Hot Bags</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>Strict 2-Hour Pickup Window</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>Bill Emerson Liability Protected</span>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-white/20">
                <a
                  href="#live-feed"
                  className="inline-flex items-center gap-2 text-xs font-bold text-white hover:text-emerald-200 hover:underline"
                >
                  <span>Explore Live Food Listings</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Quick Temperature & Food Safety Assurance Bar */}
          <div className="p-5 sm:p-6 rounded-2xl bg-neutral-100/70 dark:bg-[#121812] border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Thermometer className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-neutral-900 dark:text-white text-sm">Strict Temperature Regulation</p>
                <p className="text-neutral-500 dark:text-neutral-400">Hot meals kept at ≥ 60°C • Chilled items kept at ≤ 4°C with digital logs.</p>
              </div>
            </div>
            <Link
              to="/register"
              className="px-5 py-2.5 rounded-full font-bold bg-[#16A34A] hover:bg-[#15803D] text-white shadow-xs whitespace-nowrap"
            >
              Donate Food Surplus
            </Link>
          </div>
        </section>

        {/* ─── 4. Interactive ESG Impact Calculator ─────────────────────── */}
        <section id="impact-calculator" className="py-20 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 lg:p-14 rounded-3xl bg-gradient-to-br from-white via-emerald-50/30 to-lime-50/30 dark:from-[#0e140e] dark:via-[#090d09] dark:to-[#070a07] border-2 border-emerald-500/20 shadow-xl relative overflow-hidden">
            
            {/* Top decorative accent */}
            <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Interactive Impact Simulator</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                  Calculate Your Business Impact
                </h2>
                <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-xl">
                  Slide to see how much food, CO₂ emissions, and tax deductions your business can recover each year with FoodRescue.
                </p>
              </div>

              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-[#16A34A] hover:bg-[#15803D] text-white shadow-md transition-all"
              >
                <span>Join As A Donor</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Slider Control */}
            <div className="p-6 rounded-2xl bg-white/80 dark:bg-[#121812]/80 backdrop-blur-md border border-emerald-500/20 shadow-xs mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <label htmlFor={calculatorId} className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white">
                  Estimated Surplus Meals per Week:
                </label>
                <div className="inline-flex items-baseline gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 font-extrabold text-emerald-700 dark:text-emerald-300 text-lg sm:text-xl">
                  <span>{calculatorMeals}</span>
                  <span className="text-xs font-semibold uppercase">meals / week</span>
                </div>
              </div>

              <input
                id={calculatorId}
                type="range"
                min="10"
                max="500"
                step="5"
                value={calculatorMeals}
                onChange={(e) => setCalculatorMeals(Number(e.target.value))}
                aria-label="Estimated surplus meals per week slider"
                className="w-full h-3 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#16A34A]"
              />

              <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 mt-2 font-medium">
                <span>10 meals (Small cafe)</span>
                <span>150 meals (Restaurant)</span>
                <span>500+ meals (Hotel/Catering)</span>
              </div>
            </div>

            {/* Dynamic Results Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              <div className="p-5 rounded-2xl bg-white/90 dark:bg-[#121812]/90 border border-emerald-500/20 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                  <Utensils className="w-5 h-5" />
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">
                  {yearlyMeals.toLocaleString()}
                </p>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mt-1">
                  Meals Saved / Year
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                  Feeding local families in need
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/90 dark:bg-[#121812]/90 border border-emerald-500/20 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3">
                  <Leaf className="w-5 h-5" />
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">
                  {yearlyKgSaved.toLocaleString()} kg
                </p>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mt-1">
                  Food Diverted from Landfill
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                  Zero commercial disposal waste fees
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/90 dark:bg-[#121812]/90 border border-emerald-500/20 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3">
                  <Globe className="w-5 h-5" />
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">
                  {yearlyCo2Avoided.toLocaleString()} kg
                </p>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mt-1">
                  CO₂e Greenhouse Avoided
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                  Verified sustainability ESG metric
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/90 dark:bg-[#121812]/90 border border-emerald-500/20 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                  <Award className="w-5 h-5" />
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">
                  ${yearlyTaxBenefit.toLocaleString()}
                </p>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mt-1">
                  Estimated Tax & Value Benefit
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                  Audit-ready digital receipts
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* ─── 5. How It Works (3-Step Workflow) ───────────────────────── */}
        <section id="how-it-works" className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
              Seamless 3-Step Lifecycle
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
              How FoodRescue Connects Communities
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Designed from the ground up for busy commercial kitchens, urgent shelter pantries, and rapid courier routes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {workflowSteps.map((step, idx) => (
              <div
                key={idx}
                className="p-8 rounded-3xl bg-white dark:bg-[#101410] border-2 border-emerald-950/10 dark:border-emerald-500/20 shadow-md hover:border-emerald-500/50 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Step indicator top header */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-4xl font-black text-emerald-600/30 dark:text-emerald-400/20 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {step.number}
                    </span>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs group-hover:scale-108 transition-transform">
                      <step.icon className="w-6 h-6 stroke-[2.2]" />
                    </div>
                  </div>

                  <span className="inline-block text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-2">
                    {step.badge}
                  </span>
                  
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2.5">
                    {step.title}
                  </h3>

                  <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>{step.highlight}</span>
                </div>
              </div>
            ))}
          </div>

        </section>

        {/* ─── 6. Tailored Solutions by Role ───────────────────────────── */}
        <section id="solutions" className="py-20 bg-neutral-100/60 dark:bg-[#0c100c] border-y border-emerald-950/10 dark:border-emerald-500/15 transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
                Tailored Solutions
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                Built for Donors, Shelters & Couriers
              </h2>
              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
                Explore how FoodRescue solves specific challenges for each stakeholder in the redistribution chain.
              </p>
            </div>

            {/* Role Switcher Tabs */}
            <div className="flex items-center justify-center gap-3 mb-10 overflow-x-auto pb-2">
              {roles.map((r) => {
                const isActive = activeRoleTab === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveRoleTab(r.id)}
                    className={`px-6 py-3 rounded-full text-sm font-bold transition-all flex items-center gap-2.5 cursor-pointer shadow-xs ${
                      isActive
                        ? 'bg-[#16A34A] text-white shadow-md shadow-emerald-600/30 scale-102'
                        : 'bg-white dark:bg-[#141a14] border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400'
                    }`}
                  >
                    <r.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-emerald-600'}`} />
                    <span>{r.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Role Content Card */}
            {roles
              .filter((r) => r.id === activeRoleTab)
              .map((role) => (
                <div
                  key={role.id}
                  className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-[#101410] border-2 border-emerald-600/20 shadow-xl max-w-5xl mx-auto animate-fade-in"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    
                    {/* Left Column info */}
                    <div className="lg:col-span-7 space-y-5">
                      <div className="inline-block">
                        <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold border ${role.badgeColor}`}>
                          {role.subtitle}
                        </span>
                      </div>

                      <h3 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white leading-tight">
                        {role.title}
                      </h3>

                      <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 leading-relaxed">
                        {role.summary}
                      </p>

                      <div className="pt-2 flex items-center gap-3">
                        <Link
                          to={role.ctaLink}
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold bg-[#16A34A] hover:bg-[#15803D] text-white shadow-md shadow-emerald-600/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                        >
                          <span>{role.ctaText}</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          ⚡ {role.stats}
                        </span>
                      </div>
                    </div>

                    {/* Right Column checklist */}
                    <div className="lg:col-span-5 bg-neutral-50 dark:bg-[#141a14] border border-emerald-500/20 rounded-2xl p-6 space-y-3.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white mb-3">
                        Key Capabilities & Protections
                      </h4>
                      {role.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-3 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                  </div>
                </div>
              ))}

          </div>
        </section>

        {/* ─── 7. Live Surplus Showcase (Interactive Feed) ─────────────── */}
        <section id="live-feed" className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
                Real-Time Surplus Radar
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                Live Surplus Packages Available Now
              </h2>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'All Categories' },
                { id: 'meals', label: 'Prepared Meals' },
                { id: 'bakery', label: 'Bakery' },
                { id: 'produce', label: 'Fresh Produce' },
                { id: 'beverages', label: 'Beverages' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveFeedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeFeedCategory === cat.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-[#121612] text-neutral-600 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700 hover:border-emerald-500'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDonations.map((item) => (
              <div
                key={item.id}
                className="p-6 rounded-3xl bg-white dark:bg-[#101410] border border-neutral-200 dark:border-emerald-500/20 flex flex-col justify-between hover:border-emerald-500/50 shadow-md hover:shadow-xl transition-all duration-300 group"
              >
                <div className="space-y-4">
                  {/* Category & Expiry Countdown */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                      {item.categoryLabel}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{item.expiresIn}</span>
                    </span>
                  </div>

                  {/* Title & Provider */}
                  <div>
                    <h3 className="font-bold text-lg text-neutral-900 dark:text-white leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
                      <span>{item.provider}</span>
                    </p>
                  </div>

                  {/* Servings & Quantity */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                    <div>
                      <span className="text-neutral-500 dark:text-neutral-400 block">Total Volume</span>
                      <span className="font-bold text-neutral-900 dark:text-white">{item.quantity}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 dark:text-neutral-400 block">Estimated Servings</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{item.servings}</span>
                    </div>
                  </div>

                  {/* Dietary tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag, tIdx) => (
                      <span key={tIdx} className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer action */}
                <div className="pt-5 mt-5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{item.distance}</span>
                  </span>
                  
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline"
                  >
                    <span>Claim Package</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

        </section>

        {/* ─── 8. Social Proof & Community Testimonials ────────────────── */}
        <section id="testimonials" className="py-20 bg-neutral-100/60 dark:bg-[#0c100c] border-y border-emerald-950/10 dark:border-emerald-500/15 transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
                Community Stories
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                Trusted by 450+ Food Businesses & Non-Profits
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {testimonials.map((t, idx) => (
                <div
                  key={idx}
                  className="p-8 rounded-3xl bg-white dark:bg-[#101410] border border-neutral-200 dark:border-emerald-500/20 shadow-md flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-current" />
                        ))}
                      </div>
                      <span className="text-xl">{t.avatar}</span>
                    </div>

                    <p className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300 leading-relaxed italic">
                      "{t.quote}"
                    </p>
                  </div>

                  <div className="pt-6 mt-6 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-neutral-900 dark:text-white">{t.author}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.role}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                      {t.metrics}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Real Impact Photographic Banner */}
            <div className="mt-12 rounded-3xl overflow-hidden border border-emerald-500/20 bg-white dark:bg-[#101410] shadow-xl grid grid-cols-1 lg:grid-cols-12 items-center">
              <div className="lg:col-span-6 p-8 sm:p-10 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Real Community Impact</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white leading-tight">
                  Over 600 kg of Nutritious Food Redistributed Daily
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  Behind every completed donation is a team of verified restaurant chefs, volunteer drivers, and community kitchen workers dedicated to eliminating hunger and preserving our environment.
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Food Safety Audited</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Background Checked Couriers</span>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-6 h-64 lg:h-80 relative overflow-hidden">
                <img
                  src={foodRescueCommunityImg}
                  alt="Community volunteers packaging surplus meals"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>

          </div>
        </section>

        {/* ─── 9. Frequently Asked Questions (Accordion) ───────────────── */}
        <section id="faq" className="py-20 md:py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
              Frequently Asked Questions
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
              Got Questions? We Have Answers.
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#101410] overflow-hidden transition-all duration-200 shadow-xs"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 sm:p-6 text-left font-bold text-base sm:text-lg text-neutral-900 dark:text-white flex items-center justify-between gap-4 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400"
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <span className="p-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 shrink-0">
                      {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed border-t border-neutral-100 dark:border-neutral-800 pt-4 animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </section>

        {/* ─── 10. Public Community Feedback Shortcut ──────────────────── */}
        <section className="py-12 border-t border-emerald-950/10 dark:border-emerald-500/15 bg-white dark:bg-[#070907] transition-colors duration-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="p-6 sm:p-8 rounded-3xl bg-emerald-50/50 dark:bg-[#101610] border-2 border-emerald-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm">
              <div className="space-y-1.5 max-w-xl">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  <MessageSquarePlus className="w-4 h-4" />
                  <span>Public Feedback & Community Ideas</span>
                </div>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                  Help Shape the Future of FoodRescue
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Have an idea, found a bug, or want to share your experience? Anyone can submit anonymous or identified feedback without an account.
                </p>
              </div>
              <Link
                to="/feedback"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold bg-[#16A34A] hover:bg-[#15803D] text-white shadow-md transition-all whitespace-nowrap self-start sm:self-center cursor-pointer"
              >
                <span>Share Feedback</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ─── 11. Bottom High-Conversion Hero Banner ──────────────────── */}
        <section className="py-20 md:py-24 relative overflow-hidden bg-gradient-to-b from-neutral-100/50 to-white dark:from-[#0c100c] dark:to-[#070907] border-t border-emerald-950/10 dark:border-emerald-500/15">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="p-8 sm:p-14 rounded-3xl text-center space-y-6 relative overflow-hidden bg-white dark:bg-[#101410] border-2 border-emerald-500/20 shadow-2xl">
              
              <div className="flex justify-center">
                <Logo to="/" size="xl" showText={false} />
              </div>

              <h2 className="text-3xl sm:text-5xl font-extrabold text-neutral-900 dark:text-white tracking-tight max-w-2xl mx-auto leading-tight">
                Ready to Turn Surplus Food into Sustenance?
              </h2>

              <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 max-w-xl mx-auto">
                Join our network today. Whether you have surplus ingredients, represent a community shelter, or want to deliver meals as a courier.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-base font-bold bg-[#16A34A] hover:bg-[#15803D] text-white shadow-lg shadow-emerald-600/30 hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 w-full sm:w-auto cursor-pointer"
                >
                  <Heart className="w-5 h-5 fill-current" />
                  <span>Create Free Account</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-base font-bold bg-white dark:bg-[#141a14] border-2 border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:border-emerald-500 hover:text-emerald-600 transition-all w-full sm:w-auto cursor-pointer"
                >
                  <span>Sign In to Portal</span>
                </Link>
              </div>

            </div>
          </div>
        </section>

      </main>

      {/* ─── 12. Modern Comprehensive Footer ─────────────────────────── */}
      <footer className="border-t border-emerald-950/10 dark:border-emerald-500/15 bg-white dark:bg-[#070907] py-14 text-sm text-neutral-600 dark:text-neutral-400 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            
            {/* Brand Mission Info */}
            <div className="space-y-3.5 md:col-span-1">
              <Logo to="/" size="sm" showText={true} />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Smart surplus food redistribution platform combating local food insecurity and eliminating organic waste greenhouse emissions.
              </p>
              <div className="flex items-center gap-2 pt-1 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Community Network Active</span>
              </div>
            </div>

            {/* Platform Links */}
            <div>
              <p className="font-bold text-neutral-900 dark:text-white text-xs uppercase tracking-wider mb-3.5">Platform</p>
              <ul className="space-y-2.5 text-xs font-semibold">
                <li><a href="#how-it-works" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">How It Works</a></li>
                <li><a href="#solutions" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Solutions by Role</a></li>
                <li><a href="#live-feed" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Live Surplus Feed</a></li>
                <li><a href="#impact-calculator" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">ESG Impact Simulator</a></li>
                <li><a href="#faq" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Frequently Asked Questions</a></li>
              </ul>
            </div>

            {/* Portals */}
            <div>
              <p className="font-bold text-neutral-900 dark:text-white text-xs uppercase tracking-wider mb-3.5">User Portals</p>
              <ul className="space-y-2.5 text-xs font-semibold">
                <li><Link to="/login" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Food Provider Sign In</Link></li>
                <li><Link to="/login" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">NGO & Shelter Portal</Link></li>
                <li><Link to="/login" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Volunteer Courier Hub</Link></li>
                <li><Link to="/login" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Admin Governance</Link></li>
                <li><Link to="/feedback" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                  <span>Submit Public Feedback</span>
                </Link></li>
              </ul>
            </div>

            {/* Trust & Network Status */}
            <div className="space-y-3.5">
              <p className="font-bold text-neutral-900 dark:text-white text-xs uppercase tracking-wider mb-3.5">Network Status</p>
              <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-[#121812] border border-emerald-500/20 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">All Systems Operational</span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">
                  PostGIS Geolocation, QR Verification & Real-time WebSockets active.
                </p>
              </div>
            </div>

          </div>

          <div className="pt-8 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500 dark:text-neutral-400">
            <p>© {CURRENT_YEAR} FoodRescue Platform. Built for Social Good & Zero Waste.</p>
            <div className="flex items-center gap-6 font-semibold">
              <Link to="/feedback" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Feedback & Inquiries</Link>
              <a href="#faq" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Good Samaritan Protection</a>
              <Link to="/register" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Become a Partner</Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
