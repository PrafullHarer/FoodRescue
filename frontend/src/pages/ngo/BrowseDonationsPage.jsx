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

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="border-b border-[#232328] pb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Browse Available Surplus Food</h1>
        <p className="text-neutral-400 text-sm mt-1">Discover, reserve, and claim surplus food for your shelter network.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
          placeholder="Search available food listings..."
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-[#121214] border border-[#232328] rounded-2xl p-8">
          <Package className="w-12 h-12 mx-auto mb-3 text-neutral-600 stroke-1" />
          <p className="text-white font-semibold text-base">No available donations right now</p>
          <p className="text-xs text-neutral-400 mt-1">New surplus food is posted regularly by local donors.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((d) => (
            <div
              key={d.id}
              className="bg-[#121214] rounded-2xl border border-[#232328] hover:border-neutral-500 transition-all p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-white text-base leading-snug">{d.title}</h3>
                  <span className="badge badge-neutral uppercase text-[10px] font-bold">
                    {d.category?.replace('_', ' ') || 'Food'}
                  </span>
                </div>
                {d.provider_name && (
                  <p className="text-xs text-neutral-400 mb-2">by <span className="text-white font-medium">{d.provider_name}</span></p>
                )}
                <p className="text-xs text-neutral-400 mb-4 line-clamp-2 leading-relaxed">
                  {d.description || 'Prepared surplus food ready for immediate distribution.'}
                </p>
              </div>

              <div className="space-y-3 border-t border-[#232328] pt-3 text-xs text-neutral-400">
                <div className="flex items-center justify-between font-semibold text-white">
                  <span>{d.quantity} {d.unit}</span>
                  <span className="text-neutral-500 font-normal">{d.weight_kg ? `${d.weight_kg} kg` : ''}</span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-500 truncate">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{d.pickup_address}</span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-500">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Expires: {d.expiry_time ? new Date(d.expiry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Soon'}</span>
                </div>

                <button
                  onClick={() => handleClaim(d.id)}
                  disabled={claiming === d.id}
                  className="w-full bg-white hover:bg-neutral-200 text-black font-semibold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {claiming === d.id ? (
                    <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <><CheckCircle2 className="w-3.5 h-3.5" /> Claim This Donation</>
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
