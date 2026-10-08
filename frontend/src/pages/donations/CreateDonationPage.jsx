import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { Package, MapPin, Clock, ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const categories = [
  { value: 'cooked_meals', label: '🍲 Cooked Meals' },
  { value: 'raw_ingredients', label: '🥬 Raw Ingredients' },
  { value: 'packaged_food', label: '📦 Packaged Food' },
  { value: 'beverages', label: '🥤 Beverages' },
  { value: 'bakery', label: '🍞 Bakery' },
  { value: 'dairy', label: '🥛 Dairy' },
  { value: 'fruits_vegetables', label: '🍎 Fruits & Vegetables' },
  { value: 'other', label: '🍽️ Other' },
];

export default function CreateDonationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category: 'cooked_meals',
    quantity: '', unit: 'servings', weight_kg: '',
    pickup_address: '', latitude: 28.6139, longitude: 77.209,
    pickup_window_start: '', pickup_window_end: '',
    expiry_time: '', special_instructions: '',
  });

  const update = (field, value) => setForm({ ...form, [field]: value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        quantity: parseInt(form.quantity, 10),
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined,
        pickup_window_start: new Date(form.pickup_window_start).toISOString(),
        pickup_window_end: new Date(form.pickup_window_end).toISOString(),
        expiry_time: new Date(form.expiry_time).toISOString(),
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

  // Set defaults for datetime fields
  const now = new Date();
  const defaultStart = new Date(now.getTime() + 30 * 60000).toISOString().slice(0, 16);
  const defaultEnd = new Date(now.getTime() + 4 * 3600000).toISOString().slice(0, 16);
  const defaultExpiry = new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 16);

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-surface-500 hover:text-surface-700 mb-6 text-sm font-medium">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="glass-card p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-surface-900">Post a Donation</h1>
            <p className="text-sm text-surface-500">Share surplus food with those in need</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Food Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-surface-700 text-sm uppercase tracking-wider">Food Details</h3>
            <div>
              <label className="text-sm font-medium text-surface-700 mb-1.5 block">Title</label>
              <input type="text" value={form.title} onChange={(e) => update('title', e.target.value)}
                className="input-field" placeholder="e.g. Leftover Biryani — 50 servings" required />
            </div>
            <div>
              <label className="text-sm font-medium text-surface-700 mb-1.5 block">Description</label>
              <textarea value={form.description} onChange={(e) => update('description', e.target.value)}
                className="input-field min-h-[80px] resize-none" placeholder="Describe the food items..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-surface-700 mb-1.5 block">Category</label>
                <select value={form.category} onChange={(e) => update('category', e.target.value)} className="input-field">
                  {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700 mb-1.5 block">Quantity</label>
                <input type="number" value={form.quantity} onChange={(e) => update('quantity', e.target.value)}
                  className="input-field" placeholder="50" required min="1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-surface-700 mb-1.5 block">Unit</label>
                <select value={form.unit} onChange={(e) => update('unit', e.target.value)} className="input-field">
                  <option value="servings">Servings</option>
                  <option value="kg">Kilograms</option>
                  <option value="items">Items</option>
                  <option value="packets">Packets</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700 mb-1.5 block">Weight (kg, optional)</label>
                <input type="number" value={form.weight_kg} onChange={(e) => update('weight_kg', e.target.value)}
                  className="input-field" placeholder="25" step="0.1" />
              </div>
            </div>
          </div>

          {/* Pickup Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-surface-700 text-sm uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Pickup Details
            </h3>
            <div>
              <label className="text-sm font-medium text-surface-700 mb-1.5 block">Pickup Address</label>
              <input type="text" value={form.pickup_address} onChange={(e) => update('pickup_address', e.target.value)}
                className="input-field" placeholder="Full address for pickup" required />
            </div>
          </div>

          {/* Timing */}
          <div className="space-y-4">
            <h3 className="font-semibold text-surface-700 text-sm uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4" /> Timing
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-surface-700 mb-1.5 block">Pickup Window Start</label>
                <input type="datetime-local" value={form.pickup_window_start || defaultStart}
                  onChange={(e) => update('pickup_window_start', e.target.value)}
                  className="input-field" required />
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700 mb-1.5 block">Pickup Window End</label>
                <input type="datetime-local" value={form.pickup_window_end || defaultEnd}
                  onChange={(e) => update('pickup_window_end', e.target.value)}
                  className="input-field" required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-surface-700 mb-1.5 block">Expiry Time</label>
              <input type="datetime-local" value={form.expiry_time || defaultExpiry}
                onChange={(e) => update('expiry_time', e.target.value)}
                className="input-field" required />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-surface-700 mb-1.5 block">Special Instructions (optional)</label>
            <textarea value={form.special_instructions} onChange={(e) => update('special_instructions', e.target.value)}
              className="input-field min-h-[60px] resize-none" placeholder="Any special handling instructions..." />
          </div>

          <button type="submit" disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Save className="w-4 h-4" /> Post Donation</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
