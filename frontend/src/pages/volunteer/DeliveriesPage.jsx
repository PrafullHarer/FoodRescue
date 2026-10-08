import { useEffect, useState } from 'react';
import api from '../../api/client';
import { Truck, CheckCircle2, Clock, MapPin, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const { data } = await api.get('/volunteers/my-deliveries');
      setDeliveries(data.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try {
      await api.patch(`/deliveries/${id}/status`, { status });
      toast.success(`Status updated to ${status.replace('_', ' ')}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setUpdating(null); }
  };

  const nextAction = {
    pending: { label: 'Accept Mission', status: 'accepted' },
    accepted: { label: 'Mark Picked Up', status: 'picked_up' },
    picked_up: { label: 'In Transit', status: 'in_transit' },
    in_transit: { label: 'Mark Delivered', status: 'delivered' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="border-b border-[#232328] pb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">My Volunteer Delivery Missions</h1>
        <p className="text-neutral-400 text-sm mt-1">Manage food pickup and dropoff routes for assigned shelter packages.</p>
      </div>

      {deliveries.length === 0 ? (
        <div className="text-center py-20 bg-[#121214] border border-[#232328] rounded-2xl p-8">
          <Truck className="w-12 h-12 mx-auto mb-3 text-neutral-600 stroke-1" />
          <p className="text-white font-semibold text-base">No active delivery assignments</p>
          <p className="text-xs text-neutral-400 mt-1">You will receive notifications when new donation routes open near you.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {deliveries.map((d) => (
            <div key={d.id} className="bg-[#121214] rounded-2xl border border-[#232328] p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#232328] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white text-black flex items-center justify-center flex-shrink-0">
                    <Truck className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{d.donation_title || 'Surplus Food Delivery'}</h3>
                    <span className="badge badge-neutral uppercase text-[10px] font-bold mt-1">
                      {d.status?.replace('_',' ')}
                    </span>
                  </div>
                </div>

                {nextAction[d.status] && (
                  <button
                    onClick={() => updateStatus(d.id, nextAction[d.status].status)}
                    disabled={updating === d.id}
                    className="btn btn-primary text-xs flex items-center gap-2 self-start sm:self-auto"
                  >
                    {updating === d.id ? (
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <><CheckCircle2 className="w-4 h-4" /> {nextAction[d.status].label}</>
                    )}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-neutral-300">
                <div className="p-3.5 bg-[#0c0c0e] rounded-xl border border-[#232328] space-y-1">
                  <div className="flex items-center gap-1.5 text-neutral-500 font-bold uppercase text-[10px]">
                    <MapPin className="w-3.5 h-3.5 text-white" /> Pickup From Donor
                  </div>
                  <p className="text-white font-medium">{d.pickup_address || 'Address pending'}</p>
                </div>

                <div className="p-3.5 bg-[#0c0c0e] rounded-xl border border-[#232328] space-y-1">
                  <div className="flex items-center gap-1.5 text-neutral-500 font-bold uppercase text-[10px]">
                    <MapPin className="w-3.5 h-3.5 text-white" /> Deliver To Shelter
                  </div>
                  <p className="text-white font-medium">{d.ngo_name || 'NGO'} — {d.ngo_address || 'Address pending'}</p>
                </div>
              </div>

              {(d.pickup_time || d.delivery_time) && (
                <div className="flex items-center gap-4 text-[11px] text-neutral-500 pt-1">
                  {d.pickup_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Picked up: {new Date(d.pickup_time).toLocaleTimeString()}
                    </span>
                  )}
                  {d.delivery_time && (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Delivered: {new Date(d.delivery_time).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
