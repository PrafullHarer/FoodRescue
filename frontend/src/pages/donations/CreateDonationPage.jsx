import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import DateTimePicker from '../../components/common/DateTimePicker';
import {
  Package, MapPin, Clock, ArrowLeft, Save, Sparkles,
  Utensils, CheckCircle2, AlertCircle, Info, ShieldCheck,
  Flame, Leaf, Apple, Milk, Wheat, Heart
} from 'lucide-react';
import toast from 'react-hot-toast';

const categories = [
  { value: 'cooked_meals', label: 'Cooked Meals', icon: Utensils, desc: 'Hot or chilled meals, curries, pastas' },
  { value: 'bakery', label: 'Bakery', icon: Wheat, desc: 'Bread, pastries, bagels, muffins' },
  { value: 'fruits_vegetables', label: 'Produce', icon: Apple, desc: 'Fresh fruits, vegetables, greens' },
  { value: 'packaged_food', label: 'Packaged Food', icon: Package, desc: 'Canned goods, dry rations, snacks' },
  { value: 'dairy', label: 'Dairy & Eggs', icon: Milk, desc: 'Milk, cheese, yogurt, eggs' },
  { value: 'beverages', label: 'Beverages', icon: Heart, desc: 'Juices, packaged water, smoothies' },
];

const dietaryTagsList = [
  'Vegetarian', 'Vegan', 'Halal', 'Nut-Free', 'Gluten-Free', 'Dairy-Free', 'Organic'
];

export default function CreateDonationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState(['Vegetarian']);

  const now = new Date();
  const defaultStart = new Date(now.getTime() + 30 * 60000).toISOString().slice(0, 16);
  const defaultEnd = new Date(now.getTime() + 4 * 3600000).toISOString().slice(0, 16);
  const defaultExpiry = new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 16);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'cooked_meals',
    quantity: '',
    unit: 'servings',
    weight_kg: '',
    pickup_address: '',
    latitude: 28.6139,
    longitude: 77.209,
    pickup_window_start: defaultStart,
    pickup_window_end: defaultEnd,
    expiry_time: defaultExpiry,
    special_instructions: '',
  });

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Please provide a donation title');
      return;
    }
    if (!form.quantity || parseInt(form.quantity, 10) <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    if (!form.pickup_address.trim()) {
      toast.error('Please enter the pickup address');
      return;
    }

    setLoading(true);
    try {
      const fullDescription = [
        form.description.trim(),
        selectedTags.length > 0 ? `Dietary Flags: ${selectedTags.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      const payload = {
        title: form.title.trim(),
        description: fullDescription,
        category: form.category,
        quantity: parseInt(form.quantity, 10),
        unit: form.unit,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined,
        pickup_address: form.pickup_address.trim(),
        latitude: form.latitude,
        longitude: form.longitude,
        pickup_window_start: new Date(form.pickup_window_start).toISOString(),
        pickup_window_end: new Date(form.pickup_window_end).toISOString(),
        expiry_time: new Date(form.expiry_time).toISOString(),
        special_instructions: form.special_instructions.trim() || undefined,
      };

      await api.post('/donations', payload);
      toast.success('🎉 Surplus donation posted successfully!');
      navigate('/donations');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post donation listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up pb-12">
      {/* Top Bar with Back Link */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1b1b1f] hover:bg-[#26262c] text-xs font-medium text-neutral-400 hover:text-white transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <span className="text-xs text-neutral-400 font-medium flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Instant Shelter Notification Active
        </span>
      </div>

      <div className="bg-[#121214] border border-[#232328] rounded-[24px] p-6 sm:p-9 shadow-2xl shadow-black/80 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-[#232328] pb-6">
          <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center flex-shrink-0 shadow-md shadow-white/5">
            <Package className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Post Surplus Food Donation</h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
              Instantly broadcast excess meals to verified local shelters & community kitchens
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ─── SECTION 1: FOOD DETAILS ──────────────────────────── */}
          <div className="space-y-4">
            <h3 className="font-bold text-neutral-300 text-xs uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white text-black text-[11px] font-bold flex items-center justify-center">1</span>
              Food Information
            </h3>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                Donation Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                className="input text-sm"
                placeholder="e.g. 50 Fresh Hot Vegetarian Lunch Boxes"
                required
              />
            </div>

            {/* Category Cards Selector */}
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-2">Food Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {categories.map((c) => {
                  const Icon = c.icon;
                  const isSelected = form.category === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => update('category', c.value)}
                      className={`p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between ${
                        isSelected
                          ? 'border-white bg-[#1c1c20] text-white shadow-md shadow-white/5 ring-1 ring-white/20'
                          : 'border-[#232328] bg-[#0c0c0e] text-neutral-400 hover:border-[#383842] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-neutral-400'}`} />
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold leading-tight">{c.label}</p>
                        <p className="text-[10px] text-neutral-500 mt-0.5 line-clamp-1">{c.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dietary Flags */}
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-2">Dietary & Allergen Badges</label>
              <div className="flex flex-wrap gap-1.5">
                {dietaryTagsList.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-white text-black shadow-xs font-bold'
                          : 'bg-[#18181b] border border-[#232328] text-neutral-400 hover:text-white'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3 h-3" />}
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity & Units */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                  Quantity <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => update('quantity', e.target.value)}
                  className="input"
                  placeholder="e.g. 50"
                  required
                  min="1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1.5">Unit of Measure</label>
                <select
                  value={form.unit}
                  onChange={(e) => update('unit', e.target.value)}
                  className="input font-medium"
                >
                  <option value="servings">Servings / Portions</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="items">Individual Items</option>
                  <option value="packets">Packets / Trays</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1.5">Approx. Total Weight (kg)</label>
                <input
                  type="number"
                  value={form.weight_kg}
                  onChange={(e) => update('weight_kg', e.target.value)}
                  className="input"
                  placeholder="e.g. 18.5"
                  step="0.1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1.5">Description & Ingredients</label>
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                className="input min-h-[72px] resize-none text-sm"
                placeholder="Describe food contents, packaging type (sealed boxes, trays), allergens, etc..."
              />
            </div>
          </div>

          {/* ─── SECTION 2: PICKUP LOCATION ───────────────────────── */}
          <div className="space-y-4 border-t border-[#232328] pt-6">
            <h3 className="font-bold text-neutral-300 text-xs uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white text-black text-[11px] font-bold flex items-center justify-center">2</span>
              Pickup Address
            </h3>

            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                Exact Pickup Address <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={form.pickup_address}
                  onChange={(e) => update('pickup_address', e.target.value)}
                  className="input pl-9"
                  placeholder="e.g. 142 Artisan Boulevard, Commercial Kitchen Back Entrance"
                  required
                />
                <MapPin className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* ─── SECTION 3: ATTRACTIVE CUSTOM DATE & TIME PICKERS ─── */}
          <div className="space-y-4 border-t border-[#232328] pt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-neutral-300 text-xs uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-white text-black text-[11px] font-bold flex items-center justify-center">3</span>
                Pickup Window & Expiry Timings
              </h3>
              <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-white" />
                Live Countdown Enabled
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pickup Window Start */}
              <DateTimePicker
                label="Pickup Window Start"
                value={form.pickup_window_start}
                onChange={(val) => update('pickup_window_start', val)}
                presets={[
                  { label: '+30 Mins', minutes: 30 },
                  { label: '+1 Hour', minutes: 60 },
                  { label: '+2 Hours', minutes: 120 },
                ]}
              />

              {/* Pickup Window End */}
              <DateTimePicker
                label="Pickup Window End"
                value={form.pickup_window_end}
                onChange={(val) => update('pickup_window_end', val)}
                presets={[
                  { label: '+3 Hours', minutes: 180 },
                  { label: '+5 Hours', minutes: 300 },
                  { label: '+8 Hours', minutes: 480 },
                ]}
              />
            </div>

            {/* Food Expiry Timing */}
            <div className="pt-2">
              <DateTimePicker
                label="Food Expiry / Best Before (Crucial for Food Safety)"
                value={form.expiry_time}
                onChange={(val) => update('expiry_time', val)}
                presets={[
                  { label: '+6 Hours', minutes: 360 },
                  { label: '+12 Hours', minutes: 720 },
                  { label: '+24 Hours', minutes: 1440 },
                  { label: '+48 Hours', minutes: 2880 },
                ]}
              />
              <p className="text-[11px] text-neutral-500 mt-1.5 flex items-center gap-1.5">
                <Info className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                Shelters and couriers prioritize items based on the remaining freshness countdown.
              </p>
            </div>
          </div>

          {/* ─── SECTION 4: SPECIAL INSTRUCTIONS ───────────────────── */}
          <div className="space-y-4 border-t border-[#232328] pt-6">
            <h3 className="font-bold text-neutral-300 text-xs uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white text-black text-[11px] font-bold flex items-center justify-center">4</span>
              Special Handling Instructions (Optional)
            </h3>
            <textarea
              value={form.special_instructions}
              onChange={(e) => update('special_instructions', e.target.value)}
              className="input min-h-[64px] resize-none text-sm"
              placeholder="e.g. Bring thermal insulated bag, vehicle parking at bay #3, ring back door buzzer..."
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-[#232328]">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white hover:bg-neutral-200 text-black font-bold py-4 rounded-2xl text-sm sm:text-base transition-all duration-150 flex items-center justify-center gap-2.5 shadow-xl shadow-white/10 disabled:opacity-50 active:scale-[0.99] cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Publish Donation Listing Now</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
