import { useEffect, useState, useCallback } from 'react';
import api from '../../api/client';
import {
  MessageSquare, Star, Search, Eye, X,
  RefreshCw, ChevronLeft, ChevronRight,
  Mail, Check, MessageSquareQuote
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  NEW: { label: 'New', class: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  IN_REVIEW: { label: 'In Review', class: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  RESOLVED: { label: 'Resolved', class: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  ARCHIVED: { label: 'Archived', class: 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20' },
};

const CATEGORIES = [
  'General Feedback',
  'Suggestion',
  'Bug Report',
  'User Experience',
  'Other',
];

export default function AdminFeedbackPage() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Detail / Review Modal State
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [modalStatus, setModalStatus] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 15,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.feedback_type = typeFilter;

      const res = await api.get('/feedback', { params });
      if (res.data?.success && res.data?.data) {
        setItems(res.data.data.items || []);
        setPagination(res.data.data.pagination || { total: 0, totalPages: 1 });
        if (res.data.data.stats) {
          setStats(res.data.data.stats);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load feedback records.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleOpenDetail = (item) => {
    setSelectedFeedback(item);
    setModalStatus(item.status);
    setModalNotes(item.admin_notes || '');
  };

  const handleCloseDetail = () => {
    setSelectedFeedback(null);
    setModalStatus('');
    setModalNotes('');
  };

  const handleUpdateStatus = async () => {
    if (!selectedFeedback) return;
    setIsUpdatingStatus(true);
    try {
      const res = await api.patch(`/feedback/${selectedFeedback.id}/status`, {
        status: modalStatus,
        admin_notes: modalNotes.trim() || null,
      });

      if (res.data?.success) {
        toast.success(`Feedback status updated to ${modalStatus}.`);
        // Update local state
        setItems((prev) =>
          prev.map((it) =>
            it.id === selectedFeedback.id
              ? { ...it, status: modalStatus, admin_notes: modalNotes.trim() || null }
              : it
          )
        );
        setSelectedFeedback((prev) =>
          prev ? { ...prev, status: modalStatus, admin_notes: modalNotes.trim() || null } : null
        );
        // Refresh summary counts
        fetchFeedback();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update feedback status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const renderStars = (rating) => {
    if (!rating) return <span className="text-neutral-500 text-xs italic">Unrated</span>;
    return (
      <div className="flex items-center gap-0.5 text-amber-400" title={`${rating} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-3.5 h-3.5 ${s <= rating ? 'fill-current' : 'text-neutral-700'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-[#232328] pb-5 sm:pb-6 transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-neutral-100 dark:bg-[#18181b] border border-neutral-200 dark:border-[#232328] text-neutral-900 dark:text-white">
              <MessageSquareQuote className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
              Feedback Management
            </h1>
          </div>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm mt-0.5">
            Review community feedback, suggestions, and issue reports submitted by visitors and members.
          </p>
        </div>

        <button
          onClick={fetchFeedback}
          className="btn btn-secondary text-xs sm:text-sm self-start sm:self-auto flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="stat-card p-4 rounded-2xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] shadow-sm">
          <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total Feedback</p>
          <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mt-1.5">{stats?.total || 0}</p>
          <p className="text-[11px] text-neutral-500 mt-0.5">All-time public submissions</p>
        </div>

        <div className="stat-card p-4 rounded-2xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] shadow-sm">
          <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">New Pending</p>
          <p className="text-2xl sm:text-3xl font-bold text-amber-500 mt-1.5">{stats?.newCount || 0}</p>
          <p className="text-[11px] text-neutral-500 mt-0.5">Awaiting first review</p>
        </div>

        <div className="stat-card p-4 rounded-2xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] shadow-sm">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider">In Review</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-500 mt-1.5">{stats?.inReviewCount || 0}</p>
          <p className="text-[11px] text-neutral-500 mt-0.5">Being evaluated</p>
        </div>

        <div className="stat-card p-4 rounded-2xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] shadow-sm">
          <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Resolved</p>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-500 mt-1.5">{stats?.resolvedCount || 0}</p>
          <p className="text-[11px] text-neutral-500 mt-0.5">Addressed or completed</p>
        </div>

        <div className="stat-card p-4 rounded-2xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] col-span-2 lg:col-span-1 shadow-sm">
          <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Average Rating</p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
              {stats?.avgRating ? stats.avgRating.toFixed(1) : '—'}
            </p>
            <span className="text-xs text-neutral-500">/ 5.0</span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            {stats?.ratedCount || 0} rated responses
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by subject, message keyword, or submitter..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-50 dark:bg-[#18181b] border border-neutral-200 dark:border-[#232328] text-neutral-900 dark:text-white text-xs sm:text-sm placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 dark:focus:border-white transition-colors"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-neutral-50 dark:bg-[#18181b] border border-neutral-200 dark:border-[#232328] text-neutral-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-white transition-colors"
          >
            <option value="all">All Statuses</option>
            <option value="NEW">New</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="RESOLVED">Resolved</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-neutral-50 dark:bg-[#18181b] border border-neutral-200 dark:border-[#232328] text-neutral-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-white transition-colors"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Feedback List Table / Cards */}
      <div className="rounded-2xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] overflow-hidden shadow-sm">
        {loading && items.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-neutral-400/30 border-t-neutral-900 dark:border-white/20 dark:border-t-white rounded-full animate-spin mx-auto" />
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Loading feedback submissions...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <MessageSquare className="w-10 h-10 text-neutral-400 dark:text-neutral-600 mx-auto stroke-1" />
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">No feedback submissions found</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
              {search || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try broadening your search or resetting filters.'
                : 'No community feedback has been recorded yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-neutral-50 dark:bg-[#18181b] text-neutral-500 dark:text-neutral-400 uppercase text-[11px] font-bold tracking-wider border-b border-neutral-200 dark:border-[#232328]">
                <tr>
                  <th className="py-3.5 px-4">Subject & Message</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Rating</th>
                  <th className="py-3.5 px-4">Submitter</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-[#232328]">
                {items.map((item) => {
                  const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.NEW;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-neutral-50 dark:hover:bg-[#18181b]/50 transition-colors cursor-pointer group"
                      onClick={() => handleOpenDetail(item)}
                    >
                      {/* Subject & Preview */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-semibold text-neutral-900 dark:text-white truncate group-hover:text-amber-500 transition-colors">
                          {item.subject}
                        </p>
                        <p className="text-neutral-500 dark:text-neutral-400 text-xs truncate mt-0.5">
                          {item.message}
                        </p>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-neutral-100 dark:bg-[#1c1c20] text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-[#27272e]">
                          {item.feedback_type}
                        </span>
                      </td>

                      {/* Rating */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderStars(item.rating)}
                      </td>

                      {/* Submitter */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.is_anonymous ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/60 px-2 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-700/40">
                            Anonymous
                          </span>
                        ) : (
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-white text-xs truncate max-w-[130px]">
                              {item.name || 'Public Visitor'}
                            </p>
                            {item.email && (
                              <p className="text-neutral-500 text-[10px] truncate max-w-[130px]">
                                {item.email}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusConf.class}`}>
                          {statusConf.label}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-neutral-500 dark:text-neutral-400 text-xs">
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(item);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-[#18181b] border border-neutral-200 dark:border-[#232328] hover:border-neutral-400 dark:hover:border-neutral-500 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-all text-xs font-medium inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-neutral-200 dark:border-[#232328] flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50/50 dark:bg-transparent">
            <span>
              Showing {items.length} of {pagination.total} submissions
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-white dark:bg-[#18181b] border border-neutral-200 dark:border-[#232328] text-neutral-800 dark:text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-100 dark:hover:bg-[#232328] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                Page {page} of {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg bg-white dark:bg-[#18181b] border border-neutral-200 dark:border-[#232328] text-neutral-800 dark:text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-100 dark:hover:bg-[#232328] transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail & Status Change Modal */}
      {selectedFeedback && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={handleCloseDetail}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-neutral-200 dark:border-[#232328] flex items-start justify-between gap-4 bg-neutral-50 dark:bg-[#18181b]">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-200 dark:bg-[#232328] text-neutral-700 dark:text-neutral-300">
                    {selectedFeedback.feedback_type}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_CONFIG[selectedFeedback.status]?.class}`}>
                    {STATUS_CONFIG[selectedFeedback.status]?.label}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
                  {selectedFeedback.subject}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseDetail}
                className="p-1.5 rounded-xl hover:bg-neutral-200 dark:hover:bg-[#232328] text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-sm">
              {/* Rating & Submitter Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-[#18181b] border border-neutral-200 dark:border-[#232328] text-xs">
                <div>
                  <span className="text-neutral-500 block">Rating:</span>
                  <div className="mt-1">{renderStars(selectedFeedback.rating)}</div>
                </div>

                <div>
                  <span className="text-neutral-500 block">Submitter:</span>
                  <p className="font-semibold text-neutral-900 dark:text-white mt-1">
                    {selectedFeedback.is_anonymous ? 'Anonymous' : (selectedFeedback.name || 'Public Visitor')}
                  </p>
                </div>

                <div>
                  <span className="text-neutral-500 block">Date Submitted:</span>
                  <p className="font-medium text-neutral-900 dark:text-white mt-1">
                    {new Date(selectedFeedback.created_at).toLocaleString()}
                  </p>
                </div>

                {selectedFeedback.email && (
                  <div className="col-span-full pt-2 border-t border-neutral-200 dark:border-[#232328]">
                    <span className="text-neutral-500 block">Contact Email:</span>
                    <a
                      href={`mailto:${selectedFeedback.email}`}
                      className="font-medium text-amber-500 hover:underline flex items-center gap-1.5 mt-0.5"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>{selectedFeedback.email}</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Complete Message */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block mb-2">
                  Feedback Message
                </label>
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-[#18181b] border border-neutral-200 dark:border-[#232328] text-neutral-900 dark:text-white whitespace-pre-wrap leading-relaxed text-sm">
                  {selectedFeedback.message}
                </div>
              </div>

              {/* Status Update Control */}
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-[#18181b] border border-neutral-200 dark:border-[#232328] space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block mb-2">
                    Update Workflow Status
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['NEW', 'IN_REVIEW', 'RESOLVED', 'ARCHIVED'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setModalStatus(st)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                          modalStatus === st
                            ? 'bg-neutral-900 dark:bg-white text-white dark:text-black border-neutral-900 dark:border-white shadow-sm'
                            : 'bg-white dark:bg-[#121214] text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-[#232328] hover:text-neutral-900 dark:hover:text-white hover:border-neutral-400 dark:hover:border-neutral-600'
                        }`}
                      >
                        {STATUS_CONFIG[st]?.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block mb-2">
                    Internal Admin Notes <span className="text-neutral-400 font-normal">(Private)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    placeholder="Document any action taken, shelter contacted, bug tracker link, or resolution reasoning..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] text-neutral-900 dark:text-white text-xs sm:text-sm placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 dark:focus:border-white transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-neutral-200 dark:border-[#232328] bg-neutral-50 dark:bg-[#18181b] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseDetail}
                className="btn btn-secondary text-xs sm:text-sm px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={handleUpdateStatus}
                className="btn btn-primary text-xs sm:text-sm px-5 py-2 flex items-center gap-2"
              >
                {isUpdatingStatus ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
