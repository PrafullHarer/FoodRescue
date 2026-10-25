import { useEffect, useState } from 'react';
import api from '../../api/client';
import { Package, MapPin, Clock, Search, CheckCircle2, Map, LayoutGrid } from 'lucide-react';
import toast from 'react-hot-toast';
import DonationMapView from '../../components/common/DonationMapView';
import ClaimDonationModal from '../../components/common/ClaimDonationModal';

export default function BrowseDonationsPage() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [claiming, setClaiming] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'
  const [selectedDonationToClaim, setSelectedDonationToClaim] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const { data } = await api.get('/donations', { params: { status: 'posted', limit: 50 } });
      setDonations(data.data?.donations || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const handleInitiateClaim = (donation) => {
    setSelectedDonationToClaim(donation);
  };

  const handleConfirmClaim = async (donationId, pickupType) => {
    setClaiming(donationId);
    try {
      const { data } = await api.post(`/donations/${donationId}/claim`, { pickupType });
      toast.success(data.message || 'Donation claimed successfully!');
      setDonations(prev => prev.filter(d => d.id !== donationId));
      setSelectedDonationToClaim(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to claim donation');
    } finally { setClaiming(null); }
  };

  const filtered = donations.filter(d => d.title?.toLowerCase().includes(search.toLowerCase()) || d.pickup_address?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232328] pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Browse Available Surplus Food</h1>
          <p className="text-neutral-400 text-sm mt-1">Discover, reserve, and claim surplus food for your shelter network.</p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-[#141416] border border-[#232328] rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'grid'
                ? 'bg-white text-black shadow-md shadow-white/5'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Cards</span>
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'map'
                ? 'bg-white text-black shadow-md shadow-white/5'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Map View</span>
          </button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
          placeholder="Search by title, category, or address..."
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
      ) : viewMode === 'map' ? (
        <div className="space-y-4">
          <div className="bg-[#121214] rounded-2xl border border-[#232328] p-4 flex items-center justify-between text-xs text-neutral-400">
            <span>Showing <strong className="text-white">{filtered.length}</strong> food donation listings on the map</span>
            <span>Click on any pin badge to inspect and get directions</span>
          </div>
          <DonationMapView
            donations={filtered}
            onClaimDonation={handleInitiateClaim}
            className="h-[580px] shadow-2xl"
          />
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

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleInitiateClaim(d)}
                    disabled={claiming === d.id}
                    className="flex-1 bg-white hover:bg-neutral-200 text-black font-semibold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {claiming === d.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <><CheckCircle2 className="w-3.5 h-3.5" /> Claim</>
                    )}
                  </button>

                  {d.latitude && d.longitude && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${d.latitude},${d.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2.5 rounded-xl border border-[#282830] bg-[#18181b] hover:bg-[#23232a] text-neutral-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-1"
                      title="Navigate"
                    >
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Claim Options Modal (Self Pickup vs Volunteer Delivery) */}
      {selectedDonationToClaim && (
        <ClaimDonationModal
          isOpen={Boolean(selectedDonationToClaim)}
          onClose={() => setSelectedDonationToClaim(null)}
          donation={selectedDonationToClaim}
          onConfirmClaim={handleConfirmClaim}
          isClaiming={claiming === selectedDonationToClaim.id}
        />
      )}
    </div>
  );
}
