import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { Package, Plus, Search, MapPin, Clock } from 'lucide-react';

export default function DonationsPage() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({});

  useEffect(() => { loadDonations(); }, [statusFilter]);

  const loadDonations = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 12 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/donations', { params });
      setDonations(data.data?.donations || []);
      setPagination(data.data?.pagination || {});
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const filtered = donations.filter((d) =>
    d.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232328] pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Food Donations</h1>
          <p className="text-neutral-400 text-sm mt-1">Manage, list, and monitor your surplus food listings.</p>
        </div>
        <Link to="/donations/new" className="btn btn-primary text-xs sm:text-sm self-start">
          <Plus className="w-4 h-4" /> Post New Donation
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
            placeholder="Search by food title or description..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-auto min-w-[170px]"
        >
          <option value="">All Statuses</option>
          {['posted','matched','claimed','volunteer_assigned','collected','delivered','completed','expired','cancelled']
            .map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-[#121214] border border-[#232328] rounded-2xl p-8">
          <Package className="w-12 h-12 mx-auto mb-3 text-neutral-600 stroke-1" />
          <p className="text-white font-semibold text-base">No donations found</p>
          <p className="text-xs text-neutral-400 mt-1">Post a surplus meal listing to make it available for rescue.</p>
          <Link to="/donations/new" className="btn btn-primary text-xs mt-4 inline-flex">
            <Plus className="w-3.5 h-3.5" /> Post First Donation
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filtered.map((d) => (
            <Link
              key={d.id}
              to={`/donations/${d.id}`}
              className="bg-[#121214] rounded-2xl border border-[#232328] overflow-hidden hover:border-neutral-500 transition-all p-5 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <h3 className="font-bold text-white text-base group-hover:underline underline-offset-2">
                    {d.title}
                  </h3>
                  <span className={`badge uppercase text-[10px] font-bold flex-shrink-0 ${
                    d.status === 'delivered' || d.status === 'completed' ? 'badge-primary' :
                    d.status === 'claimed' ? 'badge-warning' : 'badge-neutral'
                  }`}>
                    {d.status?.replace('_',' ')}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mb-4 line-clamp-2 leading-relaxed">
                  {d.description || 'Prepared surplus food ready for immediate pickup.'}
                </p>
              </div>

              <div className="space-y-2 border-t border-[#232328] pt-3 text-xs text-neutral-400">
                <div className="flex items-center justify-between font-medium">
                  <span className="text-white font-semibold flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-neutral-400" /> {d.quantity} {d.unit}
                  </span>
                  <span className="capitalize text-neutral-400">{d.category?.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-500 truncate">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{d.pickup_address || 'Local Address'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-500">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Expires: {d.expiry_time ? new Date(d.expiry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Soon'}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => loadDonations(p)}
              className={`w-9 h-9 rounded-xl text-xs font-bold transition-colors ${
                p === pagination.page
                  ? 'bg-white text-black'
                  : 'bg-[#121214] text-neutral-400 border border-[#232328] hover:border-neutral-500 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
