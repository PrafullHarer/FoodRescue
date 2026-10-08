import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import {
  Truck, CheckCircle2, Clock, MapPin, ArrowRight, QrCode,
  ShieldCheck, AlertCircle, Sparkles, User, Phone, Mail,
  Check, RefreshCw, ChevronRight, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DeliveriesPage() {
  const [activeTab, setActiveTab] = useState('my'); // 'my' | 'available'
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [availableMissions, setAvailableMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [selectedQrDelivery, setSelectedQrDelivery] = useState(null);

  const [hasSetInitialTab, setHasSetInitialTab] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [myRes, availRes] = await Promise.all([
        api.get('/volunteers/my-deliveries').catch(() => ({ data: { data: [] } })),
        api.get('/volunteers/available-missions').catch(() => ({ data: { data: [] } })),
      ]);
      const my = myRes.data?.data || [];
      const avail = availRes.data?.data || [];
      setMyDeliveries(my);
      setAvailableMissions(avail);

      if (!hasSetInitialTab) {
        if (my.length === 0 && avail.length > 0) {
          setActiveTab('available');
        }
        setHasSetInitialTab(true);
      }
    } catch (err) {
      console.error('Failed to load deliveries data:', err);
    } finally {
      setLoading(false);
    }
  }, [hasSetInitialTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClaimMission = async (deliveryId) => {
    try {
      setClaimingId(deliveryId);
      await api.post(`/volunteers/claim-mission/${deliveryId}`);
      toast.success('Pickup mission claimed! Proceed to donor location for inspection & pickup.');
      await loadData();
      setActiveTab('my');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to claim pickup mission');
    } finally {
      setClaimingId(null);
    }
  };

  const openQrModal = async (delivery) => {
    try {
      const { data } = await api.get(`/qr-codes/delivery/${delivery.id}`);
      setSelectedQrDelivery({ ...delivery, qrData: data.data });
    } catch {
      toast.error('Failed to load QR code for delivery');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232328] pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Volunteer Delivery Missions</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Claim available pickup routes, inspect food quality, and complete QR handoffs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/qr-scan"
            className="btn btn-primary text-xs flex items-center gap-2"
          >
            <QrCode className="w-4 h-4" /> Scan Pickup / Dropoff QR
          </Link>
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-[#27272e] bg-[#141416] text-neutral-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-[#232328] pb-3">
        <button
          onClick={() => setActiveTab('my')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'my'
              ? 'bg-white text-black shadow-lg shadow-white/5'
              : 'text-neutral-400 hover:text-white bg-[#141416] border border-[#232328]'
          }`}
        >
          <Truck className="w-3.5 h-3.5" /> My Active Missions ({myDeliveries.length})
        </button>

        <button
          onClick={() => setActiveTab('available')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'available'
              ? 'bg-white text-black shadow-lg shadow-white/5'
              : 'text-neutral-400 hover:text-white bg-[#141416] border border-[#232328]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Available for Pickup ({availableMissions.length})
          {availableMissions.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>
      </div>

      {/* Tab 1: My Deliveries */}
      {activeTab === 'my' && (
        <div className="space-y-4">
          {myDeliveries.length === 0 ? (
            <div className="text-center py-20 bg-[#121214] border border-[#232328] rounded-2xl p-8 space-y-4">
              <Truck className="w-12 h-12 mx-auto text-neutral-600 stroke-1" />
              <div>
                <p className="text-white font-semibold text-base">No active delivery assignments</p>
                <p className="text-xs text-neutral-400 mt-1">
                  Browse available food donations claimed by shelters and claim a pickup route!
                </p>
              </div>
              <button
                onClick={() => setActiveTab('available')}
                className="btn btn-primary text-xs inline-flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" /> Browse Available Pickups
              </button>
            </div>
          ) : (
            myDeliveries.map((d) => {
              const isAccepted = d.status === 'accepted';
              const isInTransit = d.status === 'in_transit';
              const isDelivered = d.status === 'delivered';
              const checklist = typeof d.quality_checklist === 'string'
                ? JSON.parse(d.quality_checklist || '{}')
                : (d.quality_checklist || {});

              return (
                <div key={d.id} className="bg-[#121214] rounded-2xl border border-[#232328] p-6 space-y-5 shadow-xl">
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232328] pb-4">
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-[#1c1c20] border border-[#2c2c34] flex items-center justify-center flex-shrink-0">
                        <Truck className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            isDelivered ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            isInTransit ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {d.status?.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {d.category?.replace(/_/g, ' ')} • {d.quantity} {d.unit || 'servings'}
                          </span>
                        </div>
                        <h3 className="font-bold text-white text-lg">{d.donation_title || 'Food Rescue Package'}</h3>
                      </div>
                    </div>

                    {/* Actions depending on stage */}
                    <div className="flex items-center gap-2.5">
                      {isAccepted && (
                        <Link
                          to="/qr-scan"
                          className="btn btn-primary text-xs flex items-center gap-2"
                        >
                          <QrCode className="w-4 h-4" /> Scan Donor Pickup QR
                        </Link>
                      )}

                      {isInTransit && (
                        <button
                          onClick={() => openQrModal(d)}
                          className="btn btn-primary text-xs flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                        >
                          <QrCode className="w-4 h-4" /> Show Dropoff QR to NGO
                        </button>
                      )}

                      <Link
                        to={`/donations/${d.donation_id}`}
                        className="p-2.5 rounded-xl border border-[#2a2a32] bg-[#18181b] text-neutral-400 hover:text-white transition-colors"
                        title="View Full Listing"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>

                  {/* Route Details: Donor & NGO */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* Donor Card */}
                    <div className="p-4 bg-[#0c0c0e] rounded-xl border border-[#232328] space-y-2">
                      <div className="flex items-center justify-between text-neutral-400 text-[10px] font-bold uppercase">
                        <span className="flex items-center gap-1.5 text-white">
                          <MapPin className="w-3.5 h-3.5 text-amber-400" /> 1. Pickup (Food Donor)
                        </span>
                        {d.pickup_time ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Picked up
                          </span>
                        ) : (
                          <span className="text-amber-400">Pending Scan</span>
                        )}
                      </div>
                      <p className="text-white font-bold text-sm">{d.provider_name || 'Food Donor'}</p>
                      <p className="text-neutral-400 text-xs">{d.pickup_address || 'Address pending'}</p>
                      {d.provider_phone && (
                        <p className="text-neutral-500 text-[11px] flex items-center gap-1.5 pt-1">
                          <Phone className="w-3 h-3 text-neutral-400" /> {d.provider_phone} ({d.provider_contact_name || 'Donor'})
                        </p>
                      )}
                    </div>

                    {/* NGO Card */}
                    <div className="p-4 bg-[#0c0c0e] rounded-xl border border-[#232328] space-y-2">
                      <div className="flex items-center justify-between text-neutral-400 text-[10px] font-bold uppercase">
                        <span className="flex items-center gap-1.5 text-white">
                          <MapPin className="w-3.5 h-3.5 text-blue-400" /> 2. Dropoff (Shelter NGO)
                        </span>
                        {d.delivery_time ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Delivered
                          </span>
                        ) : (
                          <span className="text-blue-400">Awaiting Dropoff</span>
                        )}
                      </div>
                      <p className="text-white font-bold text-sm">{d.ngo_name || 'NGO Shelter'}</p>
                      <p className="text-neutral-400 text-xs">{d.ngo_address || 'Address pending'}</p>
                      {d.ngo_phone && (
                        <p className="text-neutral-500 text-[11px] flex items-center gap-1.5 pt-1">
                          <Phone className="w-3 h-3 text-neutral-400" /> {d.ngo_phone} ({d.ngo_contact_name || 'Shelter Contact'})
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quality Checklist Summary if available */}
                  {checklist?.items && checklist.items.length > 0 && (
                    <div className="p-3.5 bg-[#161917] border border-[#253629] rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5" /> Quality Inspection Completed
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          {checklist.inspected_at ? new Date(checklist.inspected_at).toLocaleTimeString() : ''}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        {checklist.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-neutral-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </div>
                        ))}
                      </div>
                      {checklist.notes && (
                        <p className="text-[11px] text-neutral-400 mt-2 italic">
                          "{checklist.notes}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Timestamps */}
                  {(d.pickup_time || d.delivery_time) && (
                    <div className="flex items-center gap-4 text-[11px] text-neutral-500 pt-1 border-t border-[#232328]">
                      {d.pickup_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Picked up: {new Date(d.pickup_time).toLocaleTimeString()}
                        </span>
                      )}
                      {d.delivery_time && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed: {new Date(d.delivery_time).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Available Pickups */}
      {activeTab === 'available' && (
        <div className="space-y-4">
          {availableMissions.length === 0 ? (
            <div className="text-center py-20 bg-[#121214] border border-[#232328] rounded-2xl p-8 space-y-2">
              <Sparkles className="w-12 h-12 mx-auto text-neutral-600 stroke-1" />
              <p className="text-white font-semibold text-base">No open pickup missions right now</p>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                When an NGO claims a food donation, it will immediately appear here for volunteer pickup claims.
              </p>
            </div>
          ) : (
            availableMissions.map((m) => (
              <div key={m.id} className="bg-[#121214] rounded-2xl border border-[#232328] p-6 space-y-4 shadow-xl hover:border-[#383842] transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232328] pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="badge badge-neutral uppercase text-[10px] font-bold">
                        {m.category?.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                        {m.quantity} {m.unit || 'servings'}
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-lg">{m.donation_title}</h3>
                    {m.donation_description && (
                      <p className="text-neutral-400 text-xs mt-1 line-clamp-2">{m.donation_description}</p>
                    )}
                  </div>

                  <button
                    onClick={() => handleClaimMission(m.id)}
                    disabled={claimingId === m.id}
                    className="btn btn-primary text-xs flex items-center gap-2 self-start sm:self-auto flex-shrink-0"
                  >
                    {claimingId === m.id ? (
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        <Truck className="w-4 h-4" /> Claim Pickup Route
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 bg-[#0c0c0e] rounded-xl border border-[#232328] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                      📍 1. Food Donor Pickup
                    </span>
                    <p className="text-white font-bold">{m.provider_name || 'Donor Provider'}</p>
                    <p className="text-neutral-400 text-xs">{m.pickup_address}</p>
                  </div>

                  <div className="p-3.5 bg-[#0c0c0e] rounded-xl border border-[#232328] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                      🏢 2. Shelter Destination
                    </span>
                    <p className="text-white font-bold">{m.ngo_name || 'NGO Shelter'}</p>
                    <p className="text-neutral-400 text-xs">{m.ngo_address}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1">
                  <span>Expiry: {m.expiry_time ? new Date(m.expiry_time).toLocaleDateString() : 'Today'}</span>
                  <Link
                    to={`/donations/${m.donation_id}`}
                    className="text-neutral-300 hover:text-white flex items-center gap-1 font-semibold"
                  >
                    View Details <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* QR Code Modal for Dropoff */}
      {selectedQrDelivery && selectedQrDelivery.qrData?.delivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#141416] border border-[#282830] rounded-[28px] max-w-md w-full p-8 shadow-2xl space-y-6 text-center animate-scale-up">
            <div>
              <span className="badge badge-primary text-[10px] font-bold uppercase mb-2">
                Dropoff Delivery Verification
              </span>
              <h3 className="text-xl font-bold text-white tracking-tight">Show this QR to NGO Shelter</h3>
              <p className="text-neutral-400 text-xs mt-1">
                The shelter receiver will scan this code to inspect your quality checklist and confirm receipt.
              </p>
            </div>

            {/* QR Image */}
            <div className="p-4 bg-white rounded-2xl inline-block shadow-xl border border-neutral-200">
              <img
                src={selectedQrDelivery.qrData.delivery.qr_image}
                alt="Delivery QR Code"
                className="w-56 h-56 mx-auto object-contain"
              />
            </div>

            {/* Code string */}
            <div className="p-3 bg-[#0c0c0e] rounded-xl border border-[#232328] font-mono font-bold text-white tracking-widest text-base">
              {selectedQrDelivery.qrData.delivery.code}
            </div>

            <button
              onClick={() => setSelectedQrDelivery(null)}
              className="btn btn-secondary w-full text-xs py-3"
            >
              Close QR Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

