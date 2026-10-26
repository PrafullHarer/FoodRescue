import { useEffect, useState } from 'react';
import api from '../../api/client';
import {
  ShieldAlert, CheckCircle2, MessageSquare, ShieldCheck, ChevronLeft, ChevronRight,
  Search, Filter, Clock, Eye, X, Loader2, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const PAGE_LIMIT = 20;

const STATUS_CONFIG = {
  open: { label: 'Open', class: 'badge-danger' },
  investigating: { label: 'Investigating', class: 'badge-warning' },
  resolved: { label: 'Resolved', class: 'badge-primary' },
  dismissed: { label: 'Dismissed', class: 'badge-neutral' },
};

const CATEGORIES = {
  food_quality: 'Food Quality',
  late_pickup: 'Late Pickup',
  missed_delivery: 'Missed Delivery',
  wrong_quantity: 'Wrong Quantity',
  communication: 'Communication',
  platform_bug: 'Platform Bug',
  safety_concern: 'Safety',
  other: 'Other',
};

const ROLE_LABELS = {
  provider: 'Provider',
  ngo: 'NGO',
  volunteer: 'Volunteer',
};

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Detail / Action panel
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [actionStatus, setActionStatus] = useState('');
  const [adminResponse, setAdminResponse] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchComplaints = async (pageNum = 1) => {
    try {
      setLoading(true);
      const params = { page: pageNum, limit: PAGE_LIMIT };
      if (statusFilter) params.status = statusFilter;
      if (roleFilter) params.role = roleFilter;
      if (searchQuery) params.search = searchQuery;

      const res = await api.get('/admin/complaints', { params });
      const { complaints: data = [], pagination: meta = {} } = res?.data?.data || {};
      setComplaints(data);
      setPagination({ total: meta.total ?? 0, totalPages: meta.totalPages ?? 0 });
    } catch (err) {
      console.error('Failed to load complaints', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchComplaints(1);
  }, [statusFilter, roleFilter, searchQuery]);

  useEffect(() => {
    fetchComplaints(page);
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  };

  const openDetail = (c) => {
    setSelectedComplaint(c);
    setActionStatus(c.status);
    setAdminResponse(c.resolution_notes || '');
  };

  const handleUpdateStatus = async () => {
    if (!actionStatus) return toast.error('Select a status');
    setUpdating(true);
    try {
      await api.patch(`/admin/complaints/${selectedComplaint.id}/status`, {
        status: actionStatus,
        admin_response: adminResponse.trim() || undefined,
      });
      toast.success(`Complaint status updated to ${actionStatus}`);
      setSelectedComplaint(null);
      fetchComplaints(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update complaint');
    } finally {
      setUpdating(false);
    }
  };

  const goToPage = (p) => {
    if (p < 1 || p > pagination.totalPages) return;
    setPage(p);
  };

  const startItem = complaints.length === 0 ? 0 : (page - 1) * PAGE_LIMIT + 1;
  const endItem = (page - 1) * PAGE_LIMIT + complaints.length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in pb-12">
      <div className="border-b border-[#232328] pb-5 sm:pb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Complaints & Disputes</h1>
        <p className="text-neutral-400 text-xs sm:text-sm mt-1">
          Manage complaints from all users — providers, NGOs, and volunteers.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="input-field text-sm pl-9 w-full"
            placeholder="Search by title, name, email, or ID..."
          />
        </form>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field text-xs py-2 w-auto"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input-field text-xs py-2 w-auto"
          >
            <option value="">All Roles</option>
            <option value="provider">Provider</option>
            <option value="ngo">NGO</option>
            <option value="volunteer">Volunteer</option>
          </select>
          {(statusFilter || roleFilter || searchQuery) && (
            <button
              onClick={() => { setStatusFilter(''); setRoleFilter(''); setSearchQuery(''); setSearchInput(''); }}
              className="text-xs text-neutral-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="flex items-center gap-2 text-[11px] text-neutral-500">
          <span>{pagination.total} complaint{pagination.total !== 1 ? 's' : ''}</span>
          {statusFilter && <span>• Status: {statusFilter}</span>}
          {roleFilter && <span>• Role: {roleFilter}</span>}
          {searchQuery && <span>• Search: "{searchQuery}"</span>}
        </div>
      )}

      {/* Complaints List */}
      <div className="bg-[#121214] rounded-2xl border border-[#232328] overflow-hidden divide-y divide-[#232328]">
        {loading ? (
          <div className="p-12 sm:p-16 text-center text-neutral-500">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
            Loading complaints queue...
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-12 sm:p-16 text-center text-neutral-500">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-neutral-600 stroke-1" />
            <p className="font-semibold text-white text-base">No complaints found</p>
            <p className="text-xs text-neutral-400 mt-1">
              {statusFilter || roleFilter || searchQuery
                ? 'Try adjusting your filters.'
                : 'Platform operations are running smoothly.'}
            </p>
          </div>
        ) : (
          complaints.map((c) => {
            const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.open;
            return (
              <div key={c.id} className="p-4 sm:p-5 hover:bg-[#18181b]/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`badge uppercase text-[9px] sm:text-[10px] font-bold ${statusCfg.class}`}>
                        {statusCfg.label}
                      </span>
                      <span className="badge badge-neutral uppercase text-[9px] font-bold">
                        {ROLE_LABELS[c.reporter_role] || c.reporter_role || '—'}
                      </span>
                      {c.category && (
                        <span className="badge badge-neutral uppercase text-[9px] font-bold">
                          {CATEGORIES[c.category] || c.category}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-white text-sm sm:text-base truncate">{c.subject || 'Dispute Ticket'}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      By: <span className="font-medium text-white">{c.reporter_name || 'User'}</span>
                      <span className="text-neutral-500"> • {c.reporter_email}</span>
                      <span className="text-neutral-500"> • {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Recent'}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => openDetail(c)}
                    className="btn btn-secondary text-xs py-2 px-3.5 w-full sm:w-auto flex-shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" /> Manage
                  </button>
                </div>

                {/* Inline preview */}
                <div className="mt-3 p-3 bg-[#0c0c0e] rounded-xl text-neutral-300 text-xs border border-[#232328] leading-relaxed line-clamp-2">
                  {c.description || c.message || 'No description provided'}
                </div>

                {c.resolution_notes && (
                  <div className="mt-2 p-2.5 bg-[#18181b] rounded-xl border border-[#27272e] text-xs text-neutral-400">
                    <span className="font-semibold text-white text-[10px] uppercase block mb-0.5">Response:</span>
                    <span className="line-clamp-1">{c.resolution_notes}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-neutral-500">
            Showing <span className="text-neutral-300">{startItem}–{endItem}</span> of{' '}
            <span className="text-neutral-300">{pagination.total}</span> complaints
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
              className="btn btn-secondary p-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('ellipsis-' + p);
                acc.push(p);
                return acc;
              }, [])
              .map((p) =>
                typeof p === 'string' ? (
                  <span key={p} className="px-1 text-neutral-600 text-xs select-none">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`btn text-xs py-1.5 px-3 min-w-[2rem] ${
                      p === page ? 'btn-primary' : 'btn-secondary'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

            <button
              onClick={() => goToPage(page + 1)}
              disabled={page === pagination.totalPages}
              className="btn btn-secondary p-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detail / Action Modal Overlay */}
      {selectedComplaint && (
        <>
          <div
            onClick={() => setSelectedComplaint(null)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 animate-fade-in"
          />
          <div className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg z-50 bg-[#121214] rounded-2xl border border-[#232328] overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#232328] flex-shrink-0">
              <h3 className="font-bold text-white text-sm truncate pr-4">{selectedComplaint.subject}</h3>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="p-1.5 rounded-lg hover:bg-[#1f1f24] text-neutral-400 hover:text-white transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {/* Reporter Info */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[10px] text-neutral-500 uppercase font-bold">Submitted By</p>
                  <p className="text-white font-medium">{selectedComplaint.reporter_name}</p>
                  <p className="text-neutral-400 text-[11px]">{selectedComplaint.reporter_email}</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-500 uppercase font-bold">Role</p>
                  <p className="text-white font-medium capitalize">{ROLE_LABELS[selectedComplaint.reporter_role] || selectedComplaint.reporter_role}</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-500 uppercase font-bold">Category</p>
                  <p className="text-white font-medium">{CATEGORIES[selectedComplaint.category] || selectedComplaint.category || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-500 uppercase font-bold">Date</p>
                  <p className="text-white font-medium">
                    {selectedComplaint.created_at ? new Date(selectedComplaint.created_at).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-[10px] text-neutral-500 uppercase font-bold mb-1.5">Description</p>
                <div className="p-3 bg-[#0c0c0e] rounded-xl border border-[#232328] text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {selectedComplaint.description}
                </div>
              </div>

              {/* ID */}
              <div>
                <p className="text-[10px] text-neutral-500 uppercase font-bold">Complaint ID</p>
                <p className="text-xs text-neutral-400 font-mono">{selectedComplaint.id}</p>
              </div>

              {/* Status Update */}
              <div className="space-y-3 pt-2 border-t border-[#232328]">
                <p className="text-[10px] text-neutral-500 uppercase font-bold">Update Status</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {['open', 'investigating', 'resolved', 'dismissed'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setActionStatus(s)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all capitalize ${
                        actionStatus === s
                          ? 'bg-white text-black'
                          : 'bg-[#18181b] text-neutral-400 hover:text-white border border-[#232328]'
                      }`}
                    >
                      {s === 'investigating' ? 'In Progress' : s}
                    </button>
                  ))}
                </div>

                <div>
                  <p className="text-[10px] text-neutral-500 uppercase font-bold mb-1.5">Admin Response</p>
                  <textarea
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    className="input-field text-xs w-full"
                    rows={3}
                    placeholder="Write your response or resolution notes..."
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#232328] flex-shrink-0">
              <button
                onClick={() => setSelectedComplaint(null)}
                className="btn btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={updating}
                className="btn btn-primary text-xs py-2 px-4"
              >
                {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {updating ? 'Updating...' : 'Update Complaint'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
