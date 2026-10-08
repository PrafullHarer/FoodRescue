import { useEffect, useState } from 'react';
import api from '../../api/client';
import { Package, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

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
        <h1 className="text-2xl font-bold text-white tracking-tight">Reserved Food Claims</h1>
        <p className="text-neutral-400 text-sm mt-1">Track incoming rescue supplies reserved for your organization.</p>
      </div>

      {donations.length === 0 ? (
        <div className="text-center py-20 bg-[#121214] border border-[#232328] rounded-2xl p-8">
          <Package className="w-12 h-12 mx-auto mb-3 text-neutral-600 stroke-1" />
          <p className="text-white font-semibold text-base">No active claims yet</p>
          <p className="text-xs text-neutral-400 mt-1">Browse available donations to claim surplus food for your shelter.</p>
          <Link to="/browse" className="btn btn-primary text-xs mt-4 inline-flex">Browse Donations</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {donations.map((d) => (
            <Link
              key={d.id}
              to={`/donations/${d.id}`}
              className="bg-[#121214] rounded-2xl border border-[#232328] hover:border-neutral-500 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white text-black flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base group-hover:underline underline-offset-2">{d.title}</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">{d.quantity} {d.unit} · {d.category?.replace('_',' ')}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-center">
                <div className="text-right text-xs text-neutral-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(d.created_at).toLocaleDateString()}
                </div>
                <span className="badge badge-warning uppercase text-[10px] font-bold">
                  {d.status?.replace('_', ' ')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
