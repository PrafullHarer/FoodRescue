import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';
import {
  ShieldAlert, Plus, ChevronRight, Clock, Search as SearchIcon,
  CheckCircle2, AlertCircle, Loader2, X, MessageSquare, Filter,
  Calendar, RotateCcw, ArrowUpRight, Flame, ShieldCheck, ChevronLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import RaiseComplaintModal, { COMPLAINT_CATEGORIES } from '../../components/complaints/RaiseComplaintModal';

const STATUS_CONFIG = {
  submitted: { label: 'Submitted', class: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  under_review: { label: 'Under Review', class: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
  assigned: { label: 'Assigned', class: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' },
  awaiting_user_response: { label: 'Awaiting Response', class: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' },
  escalated: { label: 'Escalated', class: 'bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold' },
  resolved: { label: 'Resolved', class: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  rejected: { label: 'Rejected', class: 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20' },
  closed: { label: 'Closed', class: 'bg-neutral-600/10 text-neutral-400 border border-neutral-600/20' },
  reopened: { label: 'Reopened', class: 'bg-orange-500/10 text-orange-400 border border-orange-500/20' },
};

const PRIORITY_CONFIG = {
  low: 'text-neutral-400 bg-neutral-500/10 border-neutral-500/20',
  medium: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  high: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  critical: 'text-rose-400 bg-rose-500/10 border-rose-500/20 font-bold',
};

export default function MyComplaintsPage() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [page, setPage] = useState(1);

  // Raise Complaint Modal
  const [showRaiseModal, setShowRaiseModal] = useState(false);

  const fetchComplaints = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      if (status !== 'all') params.status = status;
      if (category !== 'all') params.category = category;
      if (dateRange !== 'all') params.dateRange = dateRange;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/complaints/me', { params });
      setComplaints(res.data?.data?.complaints || []);
      setPagination(res.data?.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch {
      toast.error('Failed to load your complaints');
    } finally {
      setLoading(false);
    }
  }, [page, status, category, dateRange, search]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleResetFilters = () => {
    setSearch('');
    setStatus('all');
    setCategory('all');
    setDateRange('all');
    setPage(1);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232328] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">My Complaints</h1>
          </div>
          <p className="text-neutral-400 text-xs sm:text-sm">
            Track reported issues, communicate directly with platform administrators, and monitor resolution outcomes.
          </p>
        </div>

        <button
          onClick={() => setShowRaiseModal(true)}
          className="btn btn-primary text-xs py-2.5 px-4 font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-primary/20 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Raise a Complaint
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-[#121214] border border-[#232328] rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by reference or title..."
              className="input text-xs pl-9 w-full bg-[#18181b] border-[#27272e] text-white"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="input text-xs w-full bg-[#18181b] border-[#27272e] text-white"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="assigned">Assigned</option>
              <option value="awaiting_user_response">Awaiting My Response</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
              <option value="closed">Closed</option>
              <option value="reopened">Reopened</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="input text-xs w-full bg-[#18181b] border-[#27272e] text-white"
            >
              <option value="all">All Categories</option>
              {COMPLAINT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                setPage(1);
              }}
              className="input text-xs w-full bg-[#18181b] border-[#27272e] text-white"
            >
              <option value="all">Any Date</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            {(status !== 'all' || category !== 'all' || dateRange !== 'all' || search) && (
              <button
                onClick={handleResetFilters}
                title="Reset filters"
                className="p-2 rounded-lg bg-[#18181b] text-neutral-400 hover:text-white border border-[#27272e] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Complaints List / Cards */}
      {loading ? (
        <div className="p-12 text-center text-neutral-500 bg-[#121214] rounded-2xl border border-[#232328]">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-white/50" />
          <p className="text-xs">Loading your complaints queue...</p>
        </div>
      ) : complaints.length === 0 ? (
        <div className="p-16 text-center bg-[#121214] rounded-2xl border border-[#232328] space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No complaints found</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {status !== 'all' || category !== 'all' || search
              ? 'No complaints match your current filter criteria.'
              : 'You have not raised any operational or quality complaints. Operations are in order.'}
          </p>
          {(status !== 'all' || category !== 'all' || search) && (
            <button
              onClick={handleResetFilters}
              className="btn btn-secondary text-xs py-1.5 px-3"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => {
            const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.submitted;
            const priorityClass = PRIORITY_CONFIG[c.priority] || PRIORITY_CONFIG.medium;
            const catObj = COMPLAINT_CATEGORIES.find((cat) => cat.value === c.category);

            return (
              <div
                key={c.id}
                className="bg-[#121214] border border-[#232328] hover:border-[#383842] rounded-2xl p-5 transition-all shadow-md space-y-3"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-white bg-[#18181b] px-2 py-0.5 rounded border border-[#27272e]">
                      {c.complaint_reference}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusCfg.class}`}>
                      {statusCfg.label}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${priorityClass}`}>
                      {c.priority} Priority
                    </span>
                    {catObj && (
                      <span className="text-[11px] text-neutral-400 bg-[#18181b] px-2 py-0.5 rounded">
                        {catObj.label}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-neutral-500">
                    Raised: {new Date(c.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </span>
                </div>

                {/* Complaint Title */}
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    {c.title}
                  </h3>
                </div>

                {/* Meta details & latest message snippet */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#0c0c0e] rounded-xl p-3 border border-[#1c1c22]">
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-0.5">
                      Assigned Administrator
                    </span>
                    <span className="text-neutral-300 font-medium">
                      {c.assigned_admin_name || 'Under Administrative Queue'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-0.5">
                      Communication Thread
                    </span>
                    <span className="text-neutral-300 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
                      {c.message_count || 0} response{c.message_count !== 1 ? 's' : ''}
                      {c.latest_message && (
                        <span className="text-neutral-500 truncate max-w-[180px]">
                          — "{c.latest_message}"
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Resolution / Rejection Banner if complete */}
                {c.status === 'resolved' && c.resolution_summary && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 space-y-1">
                    <span className="font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resolution Outcome:
                    </span>
                    <p className="text-neutral-300 leading-relaxed text-[11px]">
                      {c.resolution_summary}
                    </p>
                  </div>
                )}

                {c.status === 'rejected' && c.rejection_reason && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 space-y-1">
                    <span className="font-bold flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Rejection Explanation:
                    </span>
                    <p className="text-neutral-300 leading-relaxed text-[11px]">
                      {c.rejection_reason}
                    </p>
                  </div>
                )}

                {/* Footer action bar */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-neutral-500">
                    Last update: {new Date(c.updated_at || c.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                  </span>

                  <Link
                    to={`/complaints/${c.id}`}
                    className="btn btn-secondary text-xs py-1.5 px-3.5 font-bold flex items-center gap-1.5 hover:text-white"
                  >
                    View Details & Chat
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}

          {/* Pagination controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-[#232328] text-xs">
              <span className="text-neutral-400">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="btn btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="btn btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Raise Complaint Modal */}
      <RaiseComplaintModal
        isOpen={showRaiseModal}
        onClose={() => setShowRaiseModal(false)}
        onSuccess={() => {
          fetchComplaints();
        }}
      />
    </div>
  );
}
