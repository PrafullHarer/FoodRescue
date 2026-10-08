import { useEffect, useState } from 'react';
import api from '../../api/client';
import { Package, CheckCircle2, Clock } from 'lucide-react';

export default function ClaimsPage() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    try {
      const { data } = await api.get('/donations', { params: { status: 'claimed', limit: 50 } });
      setDonations(data.data?.donations || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const statusColor = {
    claimed: 'badge-warning', volunteer_assigned: 'badge-warning',
    collected: 'badge-info', delivered: 'badge-success', completed: 'badge-success',
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
        <h1 className="text-2xl font-bold text-surface-900">My Claims</h1>
        <p className="text-surface-500 mt-1">Track donations you've claimed</p>
      </div>

      {donations.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 mx-auto mb-4 text-surface-300" />
          <p className="text-surface-500 font-medium">No claims yet</p>
          <p className="text-sm text-surface-400 mt-1">Browse available donations to claim food</p>
        </div>
      ) : (
        <div className="space-y-4">
          {donations.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-surface-200 p-5 flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
                  <Package className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-surface-800">{d.title}</h3>
                  <p className="text-sm text-surface-500">{d.quantity} {d.unit} · {d.category?.replace('_',' ')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right text-sm">
                  <div className="flex items-center gap-1 text-surface-400">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(d.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span className={`badge ${statusColor[d.status] || 'badge-info'}`}>
                  {d.status?.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
