import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { Package, MapPin, Clock, ArrowLeft, Save, Calendar as CalendarIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { CalendarRange } from '../../components/common/DonationCalendarRange';

const categories = [
  { value: 'cooked_meals', label: 'Cooked Meals' },
  { value: 'raw_ingredients', label: 'Raw Ingredients' },
  { value: 'packaged_food', label: 'Packaged Food' },
  { value: 'beverages', label: 'Beverages' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'fruits_vegetables', label: 'Fruits & Vegetables' },
  { value: 'other', label: 'Other Food' },
];

export default function CreateDonationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const defaultStart = new Date(now.getTime() + 30 * 60000).toISOString().slice(0, 16);
  const defaultEnd = new Date(now.getTime() + 24 * 3600000).toISOString().slice(0, 16);
  const defaultExpiry = new Date(now.getTime() + 36 * 3600000).toISOString().slice(0, 16);

  const [dateRange, setDateRange] = useState({
    from: now,
    to: new Date(now.getTime() + 24 * 3600000),
  });

  const [form, setForm] = useState({
    title: '', description: '', category: 'cooked_meals',
    quantity: '', unit: 'servings', weight_kg: '',
    pickup_address: '', latitude: 28.6139, longitude: 77.209,
    pickup_window_start: defaultStart, pickup_window_end: defaultEnd,
    expiry_time: defaultExpiry, special_instructions: '',
  });

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    if (range?.from) {
      const startIso = new Date(range.from);
      startIso.setHours(9, 0, 0, 0);
      update('pickup_window_start', startIso.toISOString().slice(0, 16));

      if (range.to) {
        const endIso = new Date(range.to);
        endIso.setHours(20, 0, 0, 0);
        update('pickup_window_end', endIso.toISOString().slice(0, 16));

        const expiryIso = new Date(range.to);
        expiryIso.setHours(23, 59, 0, 0);
        update('expiry_time', expiryIso.toISOString().slice(0, 16));
      } else {
        const endIso = new Date(range.from);
        endIso.setHours(20, 0, 0, 0);
        update('pickup_window_end', endIso.toISOString().slice(0, 16));

        const expiryIso = new Date(range.from);
        expiryIso.setHours(23, 59, 0, 0);
        update('expiry_time', expiryIso.toISOString().slice(0, 16));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        quantity: parseInt(form.quantity, 10),
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined,
        pickup_window_start: new Date(form.pickup_window_start || defaultStart).toISOString(),
        pickup_window_end: new Date(form.pickup_window_end || defaultEnd).toISOString(),
        expiry_time: new Date(form.expiry_time || defaultExpiry).toISOString(),
      };
      await api.post('/donations', payload);
      toast.success('Donation posted successfully!');
      navigate('/donations');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post donation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1b1b1f] hover:bg-[#26262c] text-xs font-medium text-neutral-400 hover:text-white transition-all"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      <div className="bg-[#121214] border border-[#232328] rounded-[24px] p-7 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center gap-3.5 border-b border-[#232328] pb-6">
          <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center flex-shrink-0 shadow-md shadow-white/5">
            <Package className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Post a Surplus Food Donation</h1>
            <p className="text-xs text-neutral-400 mt-0.5">List excess food parcels for immediate shelter pickup</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Food Info */}
          <div className="space-y-4">
            <h3 className="font-bold text-neutral-300 text-xs uppercase tracking-wider">Food Details</h3>
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1.5">Donation Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                className="input"
                placeholder="e.g. Fresh Baked Sourdough Loaves & Pastries"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1.5">Description & Dietary Details</label>
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                className="input min-h-[80px] resize-none"
                placeholder="Describe packaging, ingredients, dietary flags (e.g. vegetarian, nut-free)..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1.5">Food Category</label>
                <select
                  value={form.category}
                  onChange={(e) => update('category', e.target.value)}
                  className="input"
                >
                  {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1.5">Quantity</label>
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1.5">Unit of Measure</label>
                <select
                  value={form.unit}
                  onChange={(e) => update('unit', e.target.value)}
                  className="input"
                >
                  <option value="servings">Servings</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="items">Items / Loaves</option>
                  <option value="packets">Packets / Trays</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1.5">Approx. Weight (kg, optional)</label>
                <input
                  type="number"
                  value={form.weight_kg}
                  onChange={(e) => update('weight_kg', e.target.value)}
                  className="input"
                  placeholder="e.g. 15.5"
                  step="0.1"
                />
              </div>
            </div>
          </div>

          {/* Pickup Info */}
          <div className="space-y-4 border-t border-[#232328] pt-6">
            <h3 className="font-bold text-neutral-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-white" /> Pickup Location
            </h3>
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1.5">Pickup Address</label>
              <input
                type="text"
                value={form.pickup_address}
                onChange={(e) => update('pickup_address', e.target.value)}
                className="input"
                placeholder="e.g. 124 Market St, Ground Floor Kitchen"
                required
              />
            </div>
          </div>

          {/* Timing & Calendar Range Picker */}
          <div className="space-y-4 border-t border-[#232328] pt-6">
            <h3 className="font-bold text-neutral-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-white" /> Window & Expiry Timing
            </h3>

            {/* Interactive Calendar Date Range Component */}
            <CalendarRange
              dateRange={dateRange}
              onDateRangeChange={handleDateRangeChange}
              className="my-2"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1.5">Pickup Window Start</label>
                <input
                  type="datetime-local"
                  value={form.pickup_window_start || defaultStart}
                  onChange={(e) => update('pickup_window_start', e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1.5">Pickup Window End</label>
                <input
                  type="datetime-local"
                  value={form.pickup_window_end || defaultEnd}
                  onChange={(e) => update('pickup_window_end', e.target.value)}
                  className="input"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1.5">Expiry / Best Before</label>
              <input
                type="datetime-local"
                value={form.expiry_time || defaultExpiry}
                onChange={(e) => update('expiry_time', e.target.value)}
                className="input"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-300 block mb-1.5">Special Handling Instructions (optional)</label>
            <textarea
              value={form.special_instructions}
              onChange={(e) => update('special_instructions', e.target.value)}
              className="input min-h-[60px] resize-none"
              placeholder="e.g. Bring thermal insulated bag, ring back doorbell..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-neutral-200 text-black font-semibold py-3.5 rounded-xl text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-white/5 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <><Save className="w-4 h-4" /> Publish Donation Listing</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
