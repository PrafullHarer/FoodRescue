import { useEffect, useState } from 'react';
import api from '../../api/client';
import { Package, MapPin, Clock, Search, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BrowseDonationsPage() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [claiming, setClaiming] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const { data } = await api.get('/donations', { params: { status: 'posted', limit: 50 } });
      setDonations(data.data?.donations || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const handleClaim = async (donationId) => {
    setClaiming(donationId);
    try {
      await api.post(`/donations/${donationId}/claim`);
      toast.success('Donation claimed successfully!');
      setDonations(prev => prev.filter(d => d.id !== donationId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to claim');
    } finally { setClaiming(null); }
  };

  const filtered = donations.filter(d => d.title?.toLowerCase().includes(search.toLowerCase()));

  const categoryEmoji = {
    cooked_meals: '🍲', raw_ingredients: '🥬', packaged_food: '📦',
    beverages: '🥤', bakery: '🍞', dairy: '🥛', fruits_vegetables: '🍎', other: '🍽️',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Browse Available Donations</h1>
        <p className="text-surface-500 mt-1">Find and claim surplus food near your organization</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10" placeholder="Search available donations..." />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 mx-auto mb-4 text-surface-300" />
          <p className="text-surface-500 font-medium">No available donations right now</p>
          <p className="text-sm text-surface-400 mt-1">Check back soon — new food gets posted regularly</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-surface-200 overflow-hidden hover:shadow-lg transition-all duration-200">
              <div className="h-2 gradient-accent" />
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{categoryEmoji[d.category] || '🍽️'}</span>
                  <h3 className="font-semibold text-surface-800">{d.title}</h3>
                </div>
                {d.provider_name && (
                  <p className="text-xs text-surface-400 mb-3">by {d.provider_name}</p>
                )}
                <p className="text-sm text-surface-500 mb-4 line-clamp-2">{d.description || 'No description'}</p>
                <div className="space-y-2 mb-4 text-xs text-surface-500">
                  <div className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" /> {d.quantity} {d.unit}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> {d.pickup_address?.slice(0,40)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Expires: {new Date(d.expiry_time).toLocaleString()}
                  </div>
                </div>
                <button onClick={() => handleClaim(d.id)} disabled={claiming === d.id}
                  className="btn-primary w-full text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                  {claiming === d.id ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Claim Donation</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
