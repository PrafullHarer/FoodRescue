import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Store, HeartHandshake, Truck, MapPin, Compass, CheckCircle2,
  ShieldCheck, AlertCircle, ArrowRight, UserCheck, Phone, Building2
} from 'lucide-react';
import toast from 'react-hot-toast';
import MapAddressPickerModal from '../../components/common/MapAddressPickerModal';
import ThemeToggle from '../../components/common/ThemeToggle';
import Logo from '../../components/common/Logo';

const roleOptions = [
  {
    value: 'provider',
    label: 'Food Provider',
    tagline: 'Donor & Partner',
    desc: 'Restaurants, bakeries, groceries & caterers with surplus meals to donate.',
    icon: Store,
  },
  {
    value: 'ngo',
    label: 'NGO / Shelter',
    tagline: 'Beneficiary & Kitchen',
    desc: 'Charities, shelters, and relief kitchens claiming food for community members.',
    icon: HeartHandshake,
  },
  {
    value: 'volunteer',
    label: 'Volunteer Courier',
    tagline: 'Rescue Transport',
    desc: 'Couriers who inspect, transport, and QR-verify surplus food deliveries.',
    icon: Truck,
  },
];

export default function CompleteProfilePage() {
  const { user, loading: authLoading, completeProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('provider');
  const [submitting, setSubmitting] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    // Provider
    business_name: '',
    business_type: 'restaurant',
    address: '',
    latitude: 28.6139,
    longitude: 77.2090,
    // NGO
    organization_name: '',
    registration_no: '',
    capacity: 200,
    // Volunteer
    vehicle_type: 'car',
    max_distance_km: 15,
  });

  // Prefill Google information when user loads
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        full_name: user.full_name || prev.full_name || '',
        phone: user.phone ? user.phone.replace('+91', '') : prev.phone,
        business_name: prev.business_name || user.full_name || '',
        organization_name: prev.organization_name || user.full_name || '',
      }));
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] dark:bg-[#050505] text-neutral-900 dark:text-white">
        <div className="w-8 h-8 border-4 border-neutral-300 dark:border-neutral-700 border-t-neutral-900 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // If user is not authenticated, send to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If profile is already completed, go to dashboard
  if (user.profile_completed === true) {
    return <Navigate to="/dashboard" replace />;
  }

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm((prev) => ({ ...prev, phone: digitsOnly }));
  };

  const handleLocationSelected = ({ address, latitude, longitude }) => {
    setForm((prev) => ({
      ...prev,
      address,
      latitude,
      longitude,
    }));
    toast.success('Location & coordinates updated!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.full_name.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    if (!form.phone || form.phone.length !== 10) {
      toast.error('Please provide a valid 10-digit phone number (e.g. 9876543210)');
      return;
    }

    const payload = {
      full_name: form.full_name.trim(),
      phone: `+91${form.phone}`,
      role,
    };

    if (role === 'provider') {
      if (!form.business_name.trim()) {
        toast.error('Please enter your business or restaurant name');
        return;
      }
      if (!form.address.trim()) {
        toast.error('Please specify your physical pickup address');
        return;
      }
      payload.business_name = form.business_name.trim();
      payload.business_type = form.business_type;
      payload.address = form.address.trim();
      payload.latitude = form.latitude || 28.6139;
      payload.longitude = form.longitude || 77.2090;
    } else if (role === 'ngo') {
      if (!form.organization_name.trim()) {
        toast.error('Please enter your NGO or shelter name');
        return;
      }
      if (!form.address.trim()) {
        toast.error('Please specify your shelter delivery address');
        return;
      }
      payload.organization_name = form.organization_name.trim();
      payload.registration_no = form.registration_no.trim() || undefined;
      payload.address = form.address.trim();
      payload.latitude = form.latitude || 28.6139;
      payload.longitude = form.longitude || 77.2090;
      payload.capacity = parseInt(form.capacity, 10) || 100;
    } else if (role === 'volunteer') {
      payload.vehicle_type = form.vehicle_type;
      payload.max_distance_km = parseFloat(form.max_distance_km) || 15;
    }

    setSubmitting(true);
    try {
      await completeProfile(payload);
      toast.success('🎉 Profile completed successfully! Welcome to FoodRescue.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Profile completion error:', err);
      toast.error(
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        'Failed to save profile. Please verify your information.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F9FAFB] dark:bg-[#050505] text-neutral-900 dark:text-white flex items-center justify-center p-3.5 sm:p-6 lg:p-8 font-sans transition-colors duration-200">
      <div className="w-full max-w-4xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] rounded-2xl sm:rounded-[28px] p-5 sm:p-9 shadow-xl shadow-black/5 dark:shadow-black/80 space-y-6 sm:space-y-8 animate-fade-in relative transition-colors">
        
        {/* Top Bar with Brand Logo and Sign Out Option */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-[#232328] pb-5">
          <Logo to="/" size="md" showText={true} subtitle="Profile Setup" />
          <div className="flex items-center gap-3">
            <ThemeToggle variant="icon" />
            <button
              type="button"
              onClick={logout}
              className="text-xs font-semibold text-neutral-500 hover:text-red-500 dark:text-neutral-400 dark:hover:text-red-400 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Mandatory Requirement Banner */}
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/40 flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#39FF14] text-black font-bold flex items-center justify-center flex-shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
              Complete your profile to access your FoodRescue dashboard.
            </h2>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5 leading-relaxed">
              Google authentication verified your email <span className="font-semibold text-neutral-900 dark:text-white">({user.email})</span>. Select your platform role and complete required operational details below.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* STEP 1: SELECT ROLE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase font-bold tracking-wider text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-neutral-900 text-white dark:bg-emerald-500/20 dark:text-emerald-400 dark:border dark:border-emerald-500/30 text-[11px] font-bold flex items-center justify-center">1</span>
                Choose Your Role in FoodRescue <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-neutral-500">Pick one to adapt your workspace</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {roleOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = role === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value)}
                    className={`p-4 rounded-2xl border text-left transition-all duration-150 flex flex-col justify-between relative cursor-pointer ${
                      isSelected
                        ? 'border-neutral-900 bg-neutral-100 text-neutral-900 dark:border-white dark:bg-[#1c1c20] dark:text-white shadow-md ring-1 ring-neutral-900/10 dark:ring-white/20'
                        : 'border-neutral-200 bg-neutral-50/60 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:border-[#232328] dark:bg-[#0c0c0e] dark:text-neutral-400 dark:hover:border-[#383842] dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isSelected ? 'bg-neutral-900 text-white dark:bg-[#25252c] dark:text-emerald-400 dark:border dark:border-emerald-500/30' : 'bg-neutral-200/70 text-neutral-700 dark:bg-[#1a1a20] dark:text-neutral-300'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-[#39FF14] text-black flex items-center justify-center shadow-xs">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-bold leading-snug">{opt.label}</div>
                      <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">{opt.tagline}</div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed line-clamp-2">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: PERSONAL & CONTACT INFORMATION */}
          <div className="space-y-4 border-t border-neutral-200 dark:border-[#232328] pt-6">
            <label className="text-xs uppercase font-bold tracking-wider text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-neutral-900 text-white dark:bg-emerald-500/20 dark:text-emerald-400 dark:border dark:border-emerald-500/30 text-[11px] font-bold flex items-center justify-center">2</span>
              Contact & Representative Details
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                  Full Name / Contact Person <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => update('full_name', e.target.value)}
                  className="input text-sm"
                  placeholder="e.g. Maya Sharma"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-neutral-500 dark:text-neutral-400 select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={handlePhoneChange}
                    className="input pl-12 text-sm font-medium"
                    placeholder="9876543210 (10 digits)"
                    maxLength={10}
                    required
                  />
                  <Phone className="w-4 h-4 text-neutral-400 absolute right-3 pointer-events-none" />
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">Used for delivery dispatch & verification SMS alerts</p>
              </div>
            </div>
          </div>

          {/* STEP 3: ROLE-SPECIFIC MANDATORY FIELDS */}
          <div className="space-y-4 border-t border-neutral-200 dark:border-[#232328] pt-6">
            <label className="text-xs uppercase font-bold tracking-wider text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-neutral-900 text-white dark:bg-emerald-500/20 dark:text-emerald-400 dark:border dark:border-emerald-500/30 text-[11px] font-bold flex items-center justify-center">3</span>
              {role === 'provider'
                ? 'Provider & Business Logistics'
                : role === 'ngo'
                ? 'NGO & Shelter Operations'
                : 'Volunteer Transport Logistics'}
            </label>

            {/* Provider Form Fields */}
            {role === 'provider' && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                      Business or Commercial Kitchen Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.business_name}
                      onChange={(e) => update('business_name', e.target.value)}
                      className="input text-sm"
                      placeholder="e.g. Green Leaf Cafe & Bakery"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                      Establishment Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.business_type}
                      onChange={(e) => update('business_type', e.target.value)}
                      className="input text-sm font-medium"
                    >
                      <option value="restaurant">Restaurant / Bistro</option>
                      <option value="bakery">Bakery / Confectionery</option>
                      <option value="cafe">Cafe / Coffee Shop</option>
                      <option value="grocery">Grocery / Supermarket</option>
                      <option value="catering">Catering Service / Banquet</option>
                      <option value="corporate_cafeteria">Corporate Cafeteria</option>
                      <option value="other">Other Food Facility</option>
                    </select>
                  </div>
                </div>

                {/* Pickup Address & Coordinates */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Primary Pickup Location Address <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setMapOpen(true)}
                      className="text-xs font-bold text-neutral-900 dark:text-white inline-flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Pick on Map</span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => update('address', e.target.value)}
                      className="input pl-9 text-sm"
                      placeholder="e.g. 14 Market Road, Connaught Place, New Delhi"
                      required
                    />
                    <MapPin className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>

                  {/* Coordinates pill */}
                  <div className="mt-2 flex items-center justify-between p-2.5 bg-neutral-50 dark:bg-[#0c0c0e] rounded-xl border border-neutral-200 dark:border-[#232328] text-xs">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      GPS coordinates for rescue matching:
                    </span>
                    <span className="font-mono text-neutral-900 dark:text-white bg-neutral-200/80 dark:bg-[#1a1a20] px-2 py-0.5 rounded border border-neutral-300 dark:border-[#282830]">
                      {form.latitude?.toFixed(4)}, {form.longitude?.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* NGO Form Fields */}
            {role === 'ngo' && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                      Organization or Shelter Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.organization_name}
                      onChange={(e) => update('organization_name', e.target.value)}
                      className="input text-sm"
                      placeholder="e.g. Hope Harvest Community Kitchen"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                      Registration / Trust No. <span className="text-neutral-400 text-[11px]">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={form.registration_no}
                      onChange={(e) => update('registration_no', e.target.value)}
                      className="input text-sm"
                      placeholder="e.g. NGO-DL-2024-8971 or 80G No."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                      Daily Beneficiary Capacity (Meals/day)
                    </label>
                    <input
                      type="number"
                      value={form.capacity}
                      onChange={(e) => update('capacity', e.target.value)}
                      className="input text-sm"
                      placeholder="e.g. 250"
                      min="10"
                      max="10000"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Shelter / Distribution Address <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setMapOpen(true)}
                        className="text-xs font-bold text-neutral-900 dark:text-white inline-flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Pick on Map</span>
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={form.address}
                        onChange={(e) => update('address', e.target.value)}
                        className="input pl-9 text-sm"
                        placeholder="e.g. Shelter Site 4, Ring Road Community Complex"
                        required
                      />
                      <MapPin className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Volunteer Form Fields */}
            {role === 'volunteer' && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                      Vehicle Type for Deliveries <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.vehicle_type}
                      onChange={(e) => update('vehicle_type', e.target.value)}
                      className="input text-sm font-medium"
                    >
                      <option value="bike">Bicycle</option>
                      <option value="scooter">Motorcycle / Scooter</option>
                      <option value="car">Car / Sedan</option>
                      <option value="van">Van / SUV</option>
                      <option value="on_foot">On Foot (Walkable radius)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                      Maximum Delivery Radius (km)
                    </label>
                    <input
                      type="number"
                      value={form.max_distance_km}
                      onChange={(e) => update('max_distance_km', e.target.value)}
                      className="input text-sm"
                      placeholder="e.g. 15"
                      min="1"
                      max="100"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-4 border-t border-neutral-200 dark:border-[#232328]">
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary w-full py-4 rounded-2xl text-base font-bold shadow-lg shadow-[#39FF14]/30 disabled:opacity-50 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2.5 tracking-wide"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <span>Complete Profile & Access Dashboard</span>
                  <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                </>
              )}
            </button>
            <p className="text-center text-xs text-neutral-500 mt-2.5">
              By submitting, you confirm the accuracy of your details and agree to FoodRescue safety guidelines.
            </p>
          </div>
        </form>
      </div>

      {/* Interactive Map Picker Modal */}
      <MapAddressPickerModal
        isOpen={mapOpen}
        onClose={() => setMapOpen(false)}
        onSelectLocation={handleLocationSelected}
        initialAddress={form.address}
        initialLat={form.latitude}
        initialLng={form.longitude}
        title={`Pinpoint ${role === 'provider' ? 'Pickup' : 'Shelter'} Location`}
      />
    </div>
  );
}
