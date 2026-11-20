import { useEffect, useState, useMemo } from 'react';
import api from '../../api/client';
import { Package, MapPin, Clock, Search, CheckCircle2, Map, LayoutGrid, XCircle, Building2, Compass } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import DonationMapView from '../../components/common/DonationMapView';
import ClaimDonationModal from '../../components/common/ClaimDonationModal';
import MapAddressPickerModal from '../../components/common/MapAddressPickerModal';
import UserReputationLink from '../../components/reviews/UserReputationLink';

export default function BrowseDonationsPage() {
  const { user, fetchUser } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [claiming, setClaiming] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'
  const [selectedDonationToClaim, setSelectedDonationToClaim] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [radiusFilter, setRadiusFilter] = useState('20'); // '20' | '50' | '100' | 'all'

  useEffect(() => { load('20'); }, []);

  useEffect(() => {
    if (user?.id) {
      api.get(`/users/${user.id}`)
        .then((res) => setUserProfile(res.data?.data))
        .catch(() => {});
    }
  }, [user?.id]);

  const ngoLocation = useMemo(() => {
    const lat = user?.latitude ?? userProfile?.latitude ?? user?.profile?.latitude ?? userProfile?.profile?.latitude;
    const lng = user?.longitude ?? userProfile?.longitude ?? user?.profile?.longitude ?? userProfile?.profile?.longitude;
    const name = user?.profile?.organization_name ?? userProfile?.profile?.organization_name ?? user?.full_name ?? userProfile?.full_name ?? 'My Shelter Base';
    const addr = user?.address ?? userProfile?.address ?? user?.profile?.address ?? userProfile?.profile?.address ?? '';

    if (lat != null && lng != null && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
      return {
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        name,
        address: addr,
      };
    }
    return null;
  }, [user, userProfile]);

  const load = async (activeRadius = radiusFilter) => {
    setLoading(true);
    try {
      const params = { status: 'posted', limit: 50 };
      if (activeRadius && activeRadius !== 'all') {
        params.radius_km = activeRadius;
      } else if (activeRadius === 'all') {
        params.radius_km = 'all';
      }
      const { data } = await api.get('/donations', { params });
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
      toast.success(data.message || 'Claim request submitted! Awaiting provider selection.');
      // Mark as claim requested so the NGO knows it's pending review
      setDonations(prev => prev.map(d => d.id === donationId ? { ...d, my_claim_status: 'pending' } : d));
      setSelectedDonationToClaim(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to claim donation');
    } finally { setClaiming(null); }
  };

  const filtered = donations.filter(
    (d) =>
      d.title?.toLowerCase().includes(search.toLowerCase()) ||
      d.donation_code?.toLowerCase().includes(search.toLowerCase()) ||
      d.category?.toLowerCase().includes(search.toLowerCase()) ||
      d.pickup_address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-[#232328] pb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">Browse Available Surplus Food</h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Discover, reserve, and claim surplus food for your shelter network.</p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-[#141416] border border-neutral-200 dark:border-[#232328] rounded-xl self-start sm:self-auto shadow-xs">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-neutral-900 text-white dark:bg-[#25252b] dark:text-white dark:border dark:border-[#383842] shadow-sm font-bold'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Cards</span>
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'map'
                ? 'bg-neutral-900 text-white dark:bg-[#25252b] dark:text-white dark:border dark:border-[#383842] shadow-sm font-bold'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Map View</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
            placeholder="Search by ID, title, category, or address..."
          />
        </div>

        {/* Proximity / Matching Radius Filter */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-[#141416] border border-neutral-200 dark:border-[#232328] rounded-xl overflow-x-auto self-start sm:self-auto shadow-xs">
          <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 px-2 flex items-center gap-1 select-none">
            <Compass className="w-3.5 h-3.5 text-emerald-500" /> Radius:
          </span>
          {[
            { id: '20', label: '20 km (Smart Match)' },
            { id: '50', label: '50 km' },
            { id: '100', label: '100 km' },
            { id: 'all', label: 'All Distances' },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setRadiusFilter(r.id);
                load(r.id);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                radiusFilter === r.id
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-[#121214] border border-[#232328] rounded-2xl p-8 max-w-xl mx-auto">
          <Package className="w-12 h-12 mx-auto mb-3 text-neutral-600 stroke-1" />
          <p className="text-white font-semibold text-base">
            {radiusFilter === '20' 
              ? 'No surplus food within your 20 km Smart Match radius'
              : 'No available donations matching your search'}
          </p>
          <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
            {radiusFilter === '20' 
              ? 'FoodRescue restricts active surplus food dispatches within 20 km of your shelter base to guarantee prompt transit and hot meal safety.'
              : 'Check back soon as local food providers post surplus batches regularly.'}
          </p>
          {radiusFilter === '20' && (
            <button
              onClick={() => {
                setRadiusFilter('all');
                load('all');
              }}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer"
            >
              Expand to All Distances
            </button>
          )}
        </div>
      ) : viewMode === 'map' ? (
        <div className="space-y-4">
          <div className="bg-[#121214] rounded-2xl border border-[#232328] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-400">
            <div className="flex items-center gap-2 flex-wrap">
              <span>Showing <strong className="text-white">{filtered.length}</strong> food donation listings on the map</span>
              {ngoLocation ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 font-medium">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                  <span>Base: <strong className="text-white">{ngoLocation.name}</strong></span>
                  {ngoLocation.address && <span className="opacity-75 truncate max-w-[200px]">({ngoLocation.address})</span>}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-medium">
                  <span>⚠️ Shelter GPS not pinned</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setShowLocationPicker(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs border border-neutral-700 transition-colors cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-purple-400" />
                <span>{ngoLocation ? 'Update Shelter Base' : 'Pin My Shelter Base'}</span>
              </button>
            </div>
          </div>

          <DonationMapView
            donations={filtered}
            ngoLocation={ngoLocation}
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
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  {d.donation_code && (
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#18181b] border border-[#39FF14]/30 text-[#39FF14]">
                      {d.donation_code}
                    </span>
                  )}
                  <span className="badge badge-neutral uppercase text-[10px] font-bold">
                    {d.category?.replace('_', ' ') || 'Food'}
                  </span>
                  {d.my_claim_status === 'pending' && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Request Pending
                    </span>
                  )}
                  {d.my_claim_status === 'accepted' && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Awarded to You
                    </span>
                  )}
                  {d.my_claim_status === 'rejected' && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      Application Declined
                    </span>
                  )}
                </div>
                <div className="mb-2">
                  <h3 className="font-bold text-white text-base leading-snug">{d.title}</h3>
                </div>
                {d.provider_name && (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-2">
                    <span>by</span>
                    <UserReputationLink
                      userId={d.provider_user_id}
                      name={d.provider_name}
                      isVerified={d.provider_is_verified}
                      showBadge={true}
                    />
                  </div>
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
                <div className="flex items-center justify-between text-neutral-400 gap-2">
                  <div className="flex items-center gap-1.5 truncate flex-1 text-neutral-500">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-emerald-500" />
                    <span className="truncate">{d.pickup_address}</span>
                  </div>
                  {d.distance_km != null && (
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold shrink-0 ${
                        Number(d.distance_km) <= 20
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                      title={`${d.distance_km} km from your shelter base`}
                    >
                      {Number(d.distance_km).toFixed(1)} km
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-neutral-500">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Expires: {d.expiry_time ? new Date(d.expiry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Soon'}</span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {d.my_claim_status === 'pending' ? (
                    <button
                      disabled
                      className="flex-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-default"
                    >
                      <Clock className="w-3.5 h-3.5" /> Claim Request Pending
                    </button>
                  ) : d.my_claim_status === 'accepted' ? (
                    <button
                      disabled
                      className="flex-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-default"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Awarded to Your Shelter
                    </button>
                  ) : d.my_claim_status === 'rejected' ? (
                    <button
                      disabled
                      className="flex-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-not-allowed opacity-85"
                      title="The food provider declined your claim request for this donation"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Application Declined
                    </button>
                  ) : (
                    <button
                      onClick={() => handleInitiateClaim(d)}
                      disabled={claiming === d.id}
                      className="flex-1 bg-white hover:bg-neutral-200 text-black font-semibold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {claiming === d.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      ) : (
                        <><CheckCircle2 className="w-3.5 h-3.5" /> Claim Food</>
                      )}
                    </button>
                  )}

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

      {/* Interactive Shelter Base Location Picker Modal */}
      {showLocationPicker && (
        <MapAddressPickerModal
          isOpen={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
          initialAddress={ngoLocation?.address || ''}
          initialLat={ngoLocation?.latitude || 28.6139}
          initialLng={ngoLocation?.longitude || 77.2090}
          title="Set Shelter Base Location"
          onSelectLocation={async ({ address, latitude, longitude }) => {
            try {
              if (user?.id) {
                await api.put(`/users/${user.id}`, {
                  address,
                  latitude,
                  longitude,
                });
                toast.success('Shelter base location pinned!');
                if (fetchUser) await fetchUser();
                const res = await api.get(`/users/${user.id}`);
                setUserProfile(res.data?.data);
              }
            } catch (err) {
              toast.error(err.response?.data?.message || 'Failed to update location');
            } finally {
              setShowLocationPicker(false);
            }
          }}
        />
      )}
    </div>
  );
}
