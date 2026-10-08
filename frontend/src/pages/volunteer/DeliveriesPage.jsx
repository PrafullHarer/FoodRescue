import { useEffect, useState } from 'react';
import api from '../../api/client';
import { Truck, CheckCircle2, Clock, MapPin, Package } from 'lucide-react';
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

  const statusColor = {
    pending: 'badge-info', accepted: 'badge-info', picked_up: 'badge-warning',
    in_transit: 'badge-warning', delivered: 'badge-success', failed: 'badge-danger',
  };

  const nextAction = {
    pending: { label: 'Accept', status: 'accepted' },
    accepted: { label: 'Mark Picked Up', status: 'picked_up' },
    picked_up: { label: 'In Transit', status: 'in_transit' },
    in_transit: { label: 'Mark Delivered', status: 'delivered' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">My Deliveries</h1>
        <p className="text-surface-500 mt-1">Manage your food pickup and delivery assignments</p>
      </div>

      {deliveries.length === 0 ? (
        <div className="text-center py-16">
          <Truck className="w-12 h-12 mx-auto mb-4 text-surface-300" />
          <p className="text-surface-500 font-medium">No active deliveries</p>
          <p className="text-sm text-surface-400 mt-1">You'll be notified when a new delivery is assigned</p>
        </div>
      ) : (
        <div className="space-y-4">
          {deliveries.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-surface-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Truck className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-surface-800">{d.donation_title}</h3>
                    <span className={`badge ${statusColor[d.status]} mt-1`}>{d.status?.replace('_',' ')}</span>
                  </div>
                </div>
                {nextAction[d.status] && (
                  <button
                    onClick={() => updateStatus(d.id, nextAction[d.status].status)}
                    disabled={updating === d.id}
                    className="btn-primary text-sm flex items-center gap-2 disabled:opacity-60"
                  >
                    {updating === d.id ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <><CheckCircle2 className="w-4 h-4" /> {nextAction[d.status].label}</>
                    )}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2 text-surface-500">
                  <MapPin className="w-4 h-4 mt-0.5 text-primary-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-surface-400 uppercase">Pickup</p>
                    <p>{d.pickup_address || 'Address pending'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-surface-500">
                  <MapPin className="w-4 h-4 mt-0.5 text-accent-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-surface-400 uppercase">Deliver To</p>
                    <p>{d.ngo_name || 'NGO'} — {d.ngo_address || 'Address pending'}</p>
                  </div>
                </div>
              </div>

              {(d.pickup_time || d.delivery_time) && (
                <div className="flex items-center gap-4 mt-4 text-xs text-surface-400">
                  {d.pickup_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Picked up: {new Date(d.pickup_time).toLocaleString()}
                    </span>
                  )}
                  {d.delivery_time && (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Delivered: {new Date(d.delivery_time).toLocaleString()}
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
