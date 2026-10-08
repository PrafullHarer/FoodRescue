import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { Package, Plus, Search, Filter, MapPin, Clock } from 'lucide-react';

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

  const statusColor = {
    posted: 'badge-info', matched: 'badge-info', claimed: 'badge-warning',
    volunteer_assigned: 'badge-warning', collected: 'badge-warning',
    delivered: 'badge-success', completed: 'badge-success',
    expired: 'badge-danger', cancelled: 'badge-danger',
  };

  const categoryEmoji = {
    cooked_meals: '🍲', raw_ingredients: '🥬', packaged_food: '📦',
    beverages: '🥤', bakery: '🍞', dairy: '🥛', fruits_vegetables: '🍎', other: '🍽️',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Donations</h1>
          <p className="text-surface-500 mt-1">Manage and track food donations</p>
        </div>
        <Link to="/donations/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Post Donation
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10" placeholder="Search donations..." />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-auto min-w-[160px]">
          <option value="">All Status</option>
          {['posted','matched','claimed','volunteer_assigned','collected','delivered','completed','expired','cancelled']
            .map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 mx-auto mb-4 text-surface-300" />
          <p className="text-surface-500 font-medium">No donations found</p>
          <Link to="/donations/new" className="text-primary-600 text-sm mt-2 inline-block hover:underline">Post your first donation →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((d) => (
            <Link key={d.id} to={`/donations/${d.id}`}
              className="bg-white rounded-xl border border-surface-200 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group">
              <div className="h-3 gradient-primary" />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{categoryEmoji[d.category] || '🍽️'}</span>
                    <h3 className="font-semibold text-surface-800 group-hover:text-primary-600 transition-colors">{d.title}</h3>
                  </div>
                  <span className={`badge ${statusColor[d.status]}`}>{d.status?.replace('_',' ')}</span>
                </div>
                <p className="text-sm text-surface-500 mb-4 line-clamp-2">{d.description || 'No description'}</p>
                <div className="flex items-center gap-4 text-xs text-surface-400">
                  <span className="flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" /> {d.quantity} {d.unit}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {d.pickup_address?.slice(0,25)}...
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-surface-400 mt-2">
                  <Clock className="w-3.5 h-3.5" />
                  Expires: {new Date(d.expiry_time).toLocaleString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => loadDonations(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                p === pagination.page ? 'bg-primary-500 text-white' : 'bg-white text-surface-600 border border-surface-200 hover:bg-surface-50'
              }`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
