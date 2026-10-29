import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import {
  ShieldAlert, CheckCircle2, MessageSquare, ShieldCheck, ChevronLeft, ChevronRight,
  Search, Filter, Clock, Eye, X, Loader2, AlertCircle, Download,
  RotateCcw, UserCheck, Flame, Scale, ChevronDown, Send, FileText,
  ExternalLink, HelpCircle, Tag, Building2, User
} from 'lucide-react';
import toast from 'react-hot-toast';
import { COMPLAINT_CATEGORIES } from '../../components/complaints/RaiseComplaintModal';

const PAGE_LIMIT = 15;

const STATUS_CONFIG = {
  submitted: { label: 'Submitted', class: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  under_review: { label: 'Under Review', class: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
  assigned: { label: 'Assigned', class: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' },
  awaiting_user_response: { label: 'Awaiting User Response', class: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  escalated: { label: 'Escalated', class: 'bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold animate-pulse' },
  resolved: { label: 'Resolved', class: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  rejected: { label: 'Rejected', class: 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20' },
  closed: { label: 'Closed', class: 'bg-neutral-600/10 text-neutral-400 border border-neutral-600/20' },
  reopened: { label: 'Reopened', class: 'bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold' },
};

const PRIORITY_CONFIG = {
  low: 'text-neutral-400 bg-neutral-500/10 border-neutral-500/20',
  medium: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  high: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  critical: 'text-rose-400 bg-rose-500/10 border-rose-500/20 font-bold',
};

const VALID_TRANSITIONS = {
  submitted: ['under_review', 'assigned', 'rejected', 'closed'],
  under_review: ['assigned', 'awaiting_user_response', 'escalated', 'resolved', 'rejected', 'closed'],
  assigned: ['under_review', 'awaiting_user_response', 'escalated', 'resolved', 'rejected', 'closed'],
  awaiting_user_response: ['under_review', 'assigned', 'escalated', 'resolved', 'rejected', 'closed'],
  escalated: ['under_review', 'assigned', 'awaiting_user_response', 'resolved', 'rejected', 'closed'],
  resolved: ['closed', 'reopened'],
  rejected: ['closed', 'reopened'],
  closed: ['reopened'],
  reopened: ['under_review', 'assigned', 'escalated', 'resolved', 'rejected', 'closed'],
};

export default function ComplaintsPage() {
  const { user } = useAuth();

  // Data states
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');

  // Slide-over Drawer & Detail States
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingDrawer, setLoadingDrawer] = useState(false);

  // Communication & Notes in drawer
  const [activeThreadTab, setActiveThreadTab] = useState('user'); // 'user' or 'internal'
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Status Modals
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveSummary, setResolveSummary] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);

  // Fetch KPI Stats
  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/complaints/stats');
      setStats(res.data?.data);
    } catch {
      // stats fallback
    }
  };

  // Fetch Complaints List
  const fetchComplaints = useCallback(async (pageNum = 1) => {
    try {
      setLoading(true);
      const params = { page: pageNum, limit: PAGE_LIMIT };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (dateRange !== 'all') params.dateRange = dateRange;
      if (assignedFilter !== 'all') params.assigned_admin_id = assignedFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/admin/complaints', { params });
      const { complaints: data = [], pagination: meta = {} } = res.data?.data || {};
      setComplaints(data);
      setPagination({ total: meta.total ?? 0, totalPages: meta.totalPages ?? 1 });
    } catch {
      toast.error('Failed to load complaints queue');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, priorityFilter, dateRange, assignedFilter, search]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchComplaints(page);
  }, [fetchComplaints, page]);

  // Open Drawer and load messages + audit history
  const openDrawer = async (complaint) => {
    setSelectedComplaint(complaint);
    setLoadingDrawer(true);
    try {
      const [detailRes, msgsRes, histRes] = await Promise.allSettled([
        api.get(`/admin/complaints/${complaint.id}`),
        api.get(`/admin/complaints/${complaint.id}/messages`),
        api.get(`/admin/complaints/${complaint.id}/history`),
      ]);

      if (detailRes.status === 'fulfilled') {
        setSelectedComplaint(detailRes.value.data?.data);
      }
      if (msgsRes.status === 'fulfilled') {
        setMessages(msgsRes.value.data?.data || []);
      }
      if (histRes.status === 'fulfilled') {
        setHistory(histRes.value.data?.data || []);
      }
    } catch {
      toast.error('Failed to load complete complaint history');
    } finally {
      setLoadingDrawer(false);
    }
  };

  const closeDrawer = () => {
    setSelectedComplaint(null);
    setMessages([]);
    setHistory([]);
    setMessageInput('');
  };

  // CSV Export
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (dateRange !== 'all') params.dateRange = dateRange;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/admin/complaints/export', {
        params,
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `foodrescue-complaints-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Filtered complaints exported to CSV');
    } catch {
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  // Assign to logged-in admin
  const handleAssignToMe = async () => {
    if (!selectedComplaint) return;
    try {
      await api.post(`/admin/complaints/${selectedComplaint.id}/assign`, {
        admin_user_id: user.id,
        notes: `Assigned to ${user.name || 'administrator'}`,
      });
      toast.success('Complaint assigned to you');
      openDrawer(selectedComplaint);
      fetchComplaints(page);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign complaint');
    }
  };

  // Update Status
  const handleStatusChange = async (newStatus) => {
    if (!selectedComplaint) return;
    try {
      await api.patch(`/admin/complaints/${selectedComplaint.id}/status`, {
        status: newStatus,
        reason: `Status updated by administrator ${user.name || ''}`,
      });
      toast.success(`Status updated to ${newStatus}`);
      openDrawer(selectedComplaint);
      fetchComplaints(page);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status transition failed');
    }
  };

  // Update Priority
  const handlePriorityChange = async (newPriority) => {
    if (!selectedComplaint) return;
    try {
      await api.patch(`/admin/complaints/${selectedComplaint.id}/priority`, {
        priority: newPriority,
        reason: `Priority adjusted to ${newPriority}`,
      });
      toast.success(`Priority set to ${newPriority}`);
      openDrawer(selectedComplaint);
      fetchComplaints(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update priority');
    }
  };

  // Resolve complaint
  const handleResolve = async (e) => {
    e.preventDefault();
    if (!resolveSummary.trim() || resolveSummary.trim().length < 5) {
      return toast.error('A detailed resolution summary (min 5 characters) is required');
    }
    setActionInProgress(true);
    try {
      await api.post(`/admin/complaints/${selectedComplaint.id}/resolve`, {
        resolution_summary: resolveSummary.trim(),
      });
      toast.success('Complaint successfully marked as resolved');
      setShowResolveModal(false);
      setResolveSummary('');
      openDrawer(selectedComplaint);
      fetchComplaints(page);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resolve complaint');
    } finally {
      setActionInProgress(false);
    }
  };

  // Reject complaint
  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      return toast.error('A rejection reason (min 5 characters) is required');
    }
    setActionInProgress(true);
    try {
      await api.post(`/admin/complaints/${selectedComplaint.id}/reject`, {
        rejection_reason: rejectReason.trim(),
      });
      toast.success('Complaint marked as rejected');
      setShowRejectModal(false);
      setRejectReason('');
      openDrawer(selectedComplaint);
      fetchComplaints(page);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject complaint');
    } finally {
      setActionInProgress(false);
    }
  };

  // Reopen complaint
  const handleReopen = async (e) => {
    e.preventDefault();
    if (!reopenReason.trim() || reopenReason.trim().length < 5) {
      return toast.error('A reason (min 5 characters) is required to reopen this ticket');
    }
    setActionInProgress(true);
    try {
      await api.post(`/admin/complaints/${selectedComplaint.id}/reopen`, {
        reason: reopenReason.trim(),
      });
      toast.success('Complaint reopened');
      setShowReopenModal(false);
      setReopenReason('');
      openDrawer(selectedComplaint);
      fetchComplaints(page);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reopen complaint');
    } finally {
      setActionInProgress(false);
    }
  };

  // Send message / internal note
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    setSendingMessage(true);
    try {
      await api.post(`/admin/complaints/${selectedComplaint.id}/messages`, {
        message: messageInput.trim(),
        visibility: activeThreadTab, // 'user' or 'internal'
      });
      setMessageInput('');
      toast.success(activeThreadTab === 'internal' ? 'Internal note added' : 'Response sent to user');
      // Refresh messages
      const msgsRes = await api.get(`/admin/complaints/${selectedComplaint.id}/messages`);
      setMessages(msgsRes.data?.data || []);
      const histRes = await api.get(`/admin/complaints/${selectedComplaint.id}/history`);
      setHistory(histRes.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send response');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setPriorityFilter('all');
    setDateRange('all');
    setAssignedFilter('all');
    setPage(1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232328] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Complaints & Dispute Management
            </h1>
          </div>
          <p className="text-neutral-400 text-xs sm:text-sm">
            Investigate quality, safety, and operational complaints with full two-way communication and SLA tracking.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold"
        >
          <Download className="w-3.5 h-3.5" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* KPI Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <div className="bg-[#121214] border border-[#232328] rounded-xl p-3 space-y-1">
            <span className="text-[10px] text-neutral-400 uppercase font-bold block">Total</span>
            <span className="text-lg font-bold text-white tracking-tight">{stats.total_complaints}</span>
          </div>

          <div className="bg-[#121214] border border-[#232328] rounded-xl p-3 space-y-1">
            <span className="text-[10px] text-blue-400 uppercase font-bold block">New</span>
            <span className="text-lg font-bold text-blue-400 tracking-tight">{stats.new_complaints}</span>
          </div>

          <div className="bg-[#121214] border border-[#232328] rounded-xl p-3 space-y-1">
            <span className="text-[10px] text-purple-400 uppercase font-bold block">Open</span>
            <span className="text-lg font-bold text-purple-400 tracking-tight">{stats.open_complaints}</span>
          </div>

          <div className="bg-[#121214] border border-[#232328] rounded-xl p-3 space-y-1">
            <span className="text-[10px] text-rose-400 uppercase font-bold block">High Priority</span>
            <span className="text-lg font-bold text-rose-400 tracking-tight">{stats.high_priority_complaints}</span>
          </div>

          <div className="bg-[#121214] border border-[#232328] rounded-xl p-3 space-y-1">
            <span className="text-[10px] text-amber-400 uppercase font-bold block">Awaiting User</span>
            <span className="text-lg font-bold text-amber-400 tracking-tight">{stats.awaiting_response_complaints}</span>
          </div>

          <div className="bg-[#121214] border border-[#232328] rounded-xl p-3 space-y-1">
            <span className="text-[10px] text-emerald-400 uppercase font-bold block">Resolved</span>
            <span className="text-lg font-bold text-emerald-400 tracking-tight">{stats.resolved_complaints}</span>
          </div>

          <div className="bg-[#121214] border border-[#232328] rounded-xl p-3 space-y-1">
            <span className="text-[10px] text-rose-400 uppercase font-bold block">SLA Overdue</span>
            <span className="text-lg font-bold text-rose-400 tracking-tight">{stats.overdue_complaints}</span>
          </div>

          <div className="bg-[#121214] border border-[#232328] rounded-xl p-3 space-y-1">
            <span className="text-[10px] text-neutral-400 uppercase font-bold block">Avg Res. Time</span>
            <span className="text-lg font-bold text-white tracking-tight">{stats.avg_resolution_hours}h</span>
          </div>
        </div>
      )}

      {/* Filter Control Bar */}
      <div className="bg-[#121214] border border-[#232328] rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search reference, title, reporter email..."
              className="input text-xs pl-9 w-full bg-[#18181b] border-[#27272e] text-white"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="input text-xs w-full bg-[#18181b] border-[#27272e] text-white"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted (New)</option>
              <option value="under_review">Under Review</option>
              <option value="assigned">Assigned</option>
              <option value="awaiting_user_response">Awaiting User Response</option>
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
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
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

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="input text-xs w-full bg-[#18181b] border-[#27272e] text-white"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical Priority</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>

          {/* Date Range */}
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
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            {(statusFilter !== 'all' || categoryFilter !== 'all' || priorityFilter !== 'all' || dateRange !== 'all' || search) && (
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

      {/* Complaints Table */}
      <div className="bg-[#121214] border border-[#232328] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c0c0e] border-b border-[#232328] text-neutral-400 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Complaint Title & Category</th>
                <th className="py-3 px-4">Complainant</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned Admin</th>
                <th className="py-3 px-4">Submitted</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232328]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-white/50" />
                    Loading complaint tickets...
                  </td>
                </tr>
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-neutral-500">
                    <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-neutral-600 stroke-1" />
                    <p className="font-semibold text-white text-sm">No complaints found</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      No active tickets match the current search or filter criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                complaints.map((c) => {
                  const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.submitted;
                  const priorityClass = PRIORITY_CONFIG[c.priority] || PRIORITY_CONFIG.medium;
                  const catObj = COMPLAINT_CATEGORIES.find((cat) => cat.value === c.category);

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-[#18181b]/50 transition-colors"
                    >
                      {/* Reference & SLA alert */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-white bg-[#18181b] px-2 py-0.5 rounded border border-[#27272e]">
                          {c.complaint_reference}
                        </span>
                        {c.is_overdue && (
                          <span className="block mt-1 text-[9px] text-rose-400 font-bold uppercase tracking-wider">
                            ⚠️ SLA Overdue
                          </span>
                        )}
                      </td>

                      {/* Title & Category */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-bold text-white truncate">{c.title}</p>
                        <span className="text-[10px] text-neutral-400">
                          {catObj ? catObj.label : c.category}
                        </span>
                      </td>

                      {/* Complainant */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-white block">{c.complainant_name || 'User'}</span>
                        <span className="text-[10px] text-neutral-500 block truncate max-w-[140px]">
                          {c.complainant_email}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-neutral-400">
                          {c.complainant_role}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${priorityClass}`}>
                          {c.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusCfg.class}`}>
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Assigned Admin */}
                      <td className="py-3.5 px-4">
                        <span className="text-neutral-300">
                          {c.assigned_admin_name || (
                            <span className="text-neutral-500 italic">Unassigned</span>
                          )}
                        </span>
                      </td>

                      {/* Created date */}
                      <td className="py-3.5 px-4 text-neutral-400 whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString(undefined, { dateStyle: 'short' })}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openDrawer(c)}
                          className="btn btn-secondary text-xs py-1.5 px-3 font-bold hover:text-white"
                        >
                          <Eye className="w-3.5 h-3.5" /> Manage
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-[#232328] bg-[#0c0c0e] text-xs">
            <span className="text-neutral-400">
              Page {page} of {pagination.totalPages} ({pagination.total} complaints)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn btn-secondary text-xs py-1 px-3 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="btn btn-secondary text-xs py-1 px-3 disabled:opacity-40"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Investigation Drawer */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm animate-fade-in flex justify-end">
          <div className="w-full max-w-2xl bg-[#121214] border-l border-[#232328] h-full overflow-y-auto shadow-2xl flex flex-col animate-slide-left">
            {/* Drawer Header */}
            <div className="p-6 border-b border-[#232328] flex items-center justify-between sticky top-0 bg-[#121214]/95 backdrop-blur z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-white bg-[#18181b] px-2 py-0.5 rounded border border-[#27272e]">
                    {selectedComplaint.complaint_reference}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_CONFIG[selectedComplaint.status]?.class || ''}`}>
                    {STATUS_CONFIG[selectedComplaint.status]?.label || selectedComplaint.status}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${PRIORITY_CONFIG[selectedComplaint.priority] || ''}`}>
                    {selectedComplaint.priority} Priority
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {selectedComplaint.title}
                </h2>
              </div>
              <button
                onClick={closeDrawer}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-[#18181b] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6 flex-1 text-xs">
              {/* Quick Action Control Center */}
              <div className="p-4 bg-[#0c0c0e] rounded-2xl border border-[#232328] space-y-3">
                <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider block">
                  Investigation & Lifecycle Actions
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Status Transition dropdown */}
                  <div>
                    <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1">
                      Update Status (State Machine)
                    </label>
                    <select
                      value={selectedComplaint.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="input text-xs w-full bg-[#18181b] border-[#27272e] text-white"
                    >
                      <option value={selectedComplaint.status} disabled>
                        Current: {STATUS_CONFIG[selectedComplaint.status]?.label || selectedComplaint.status}
                      </option>
                      {(VALID_TRANSITIONS[selectedComplaint.status] || []).map((t) => (
                        <option key={t} value={t}>
                          → Transition to: {STATUS_CONFIG[t]?.label || t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Priority Change */}
                  <div>
                    <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-1">
                      Adjust Priority
                    </label>
                    <select
                      value={selectedComplaint.priority}
                      onChange={(e) => handlePriorityChange(e.target.value)}
                      className="input text-xs w-full bg-[#18181b] border-[#27272e] text-white"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="critical">Critical Priority</option>
                    </select>
                  </div>
                </div>

                {/* Specific State Actions */}
                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[#1c1c22]">
                  {selectedComplaint.assigned_admin_user_id !== user.id && (
                    <button
                      onClick={handleAssignToMe}
                      className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 font-bold"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Assign to Me
                    </button>
                  )}

                  {!['resolved', 'closed'].includes(selectedComplaint.status) && (
                    <button
                      onClick={() => setShowResolveModal(true)}
                      className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1 font-bold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resolve Complaint
                    </button>
                  )}

                  {!['rejected', 'closed', 'resolved'].includes(selectedComplaint.status) && (
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 font-bold text-rose-400 hover:text-rose-300 border-rose-500/20"
                    >
                      <X className="w-3.5 h-3.5" /> Reject Complaint
                    </button>
                  )}

                  {['resolved', 'rejected', 'closed'].includes(selectedComplaint.status) && (
                    <button
                      onClick={() => setShowReopenModal(true)}
                      className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 font-bold text-amber-400 hover:text-amber-300 border-amber-500/20"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reopen Ticket
                    </button>
                  )}
                </div>
              </div>

              {/* Profiles & Related Entities */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Complainant card */}
                <div className="p-3 bg-[#18181b] rounded-xl border border-[#27272e] space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold flex items-center gap-1">
                    <User className="w-3 h-3" /> Complainant Details
                  </span>
                  <p className="font-bold text-white text-xs">
                    {selectedComplaint.complainant_name || 'Complainant'}
                  </p>
                  <p className="text-neutral-400 text-[11px] truncate">
                    {selectedComplaint.complainant_email}
                  </p>
                  <span className="badge badge-neutral uppercase text-[9px] font-bold">
                    Role: {selectedComplaint.complainant_role}
                  </span>
                </div>

                {/* Related Transaction */}
                <div className="p-3 bg-[#18181b] rounded-xl border border-[#27272e] space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Related Transaction
                  </span>
                  {selectedComplaint.donation_id ? (
                    <div>
                      <span className="text-neutral-400 block text-[11px]">Donation:</span>
                      <Link
                        to={`/donations/${selectedComplaint.donation_id}`}
                        className="text-white hover:underline inline-flex items-center gap-1 font-medium truncate"
                      >
                        {selectedComplaint.donation_title || 'View Donation'} <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  ) : (
                    <span className="text-neutral-500">No donation attached</span>
                  )}

                  {selectedComplaint.delivery_id && (
                    <div>
                      <span className="text-neutral-400 block text-[11px] mt-1">Delivery:</span>
                      <span className="font-mono text-[10px] text-neutral-300">
                        {selectedComplaint.delivery_id.slice(0, 16)}...
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Original Statement */}
              <div className="p-4 bg-[#18181b] rounded-xl border border-[#27272e] space-y-1">
                <span className="text-[10px] text-neutral-500 uppercase font-bold block">
                  Original Complaint Statement
                </span>
                <p className="text-neutral-200 leading-relaxed whitespace-pre-wrap">
                  {selectedComplaint.description}
                </p>
              </div>

              {/* Supporting Evidence Link */}
              {selectedComplaint.supporting_evidence_url && (
                <div className="p-3 bg-[#18181b] rounded-xl border border-[#27272e] flex items-center justify-between">
                  <span className="text-neutral-400">Attached Evidence URL:</span>
                  <a
                    href={selectedComplaint.supporting_evidence_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    Open Attachment <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Communication Thread & Internal Notes */}
              <div className="bg-[#0c0c0e] rounded-2xl border border-[#232328] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#232328] pb-2">
                  <span className="font-bold text-white text-xs">Communication & Internal Notes</span>
                  {/* Tab Selector */}
                  <div className="flex items-center gap-1 bg-[#18181b] p-0.5 rounded-lg border border-[#27272e]">
                    <button
                      type="button"
                      onClick={() => setActiveThreadTab('user')}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                        activeThreadTab === 'user'
                          ? 'bg-white text-black'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Public Response
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveThreadTab('internal')}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                        activeThreadTab === 'internal'
                          ? 'bg-amber-500 text-black'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Internal Note (Private)
                    </button>
                  </div>
                </div>

                {/* Messages Feed */}
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto p-1">
                  {messages.length === 0 ? (
                    <p className="text-center py-6 text-neutral-500">No communication recorded yet.</p>
                  ) : (
                    messages.map((m) => {
                      const isInternal = m.visibility === 'internal';
                      return (
                        <div
                          key={m.id}
                          className={`p-3 rounded-xl border text-xs leading-relaxed space-y-1 ${
                            isInternal
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                              : m.sender_role === 'admin'
                              ? 'bg-[#18181b] border-[#27272e] text-white'
                              : 'bg-[#141416] border-[#232328] text-neutral-300'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold">
                              {m.sender_name} ({m.sender_role})
                              {isInternal && (
                                <span className="ml-1.5 px-1.5 py-0.2 bg-amber-500/20 text-amber-400 rounded font-bold uppercase">
                                  Internal Staff Note
                                </span>
                              )}
                            </span>
                            <span className="text-neutral-500">
                              {new Date(m.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap">{m.message}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message / Note Input Box */}
                <form onSubmit={handleSendMessage} className="space-y-2 pt-2 border-t border-[#232328]">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    rows={2}
                    placeholder={
                      activeThreadTab === 'internal'
                        ? 'Write private internal investigation note (NOT visible to complainant)...'
                        : 'Write message visible to complainant...'
                    }
                    className="input text-xs w-full bg-[#18181b] border-[#27272e] text-white resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500">
                      {activeThreadTab === 'internal'
                        ? '🔒 Confidential: Visible ONLY to administrators.'
                        : '✉️ Public: Visible to complainant in their complaint dashboard.'}
                    </span>
                    <button
                      type="submit"
                      disabled={sendingMessage || !messageInput.trim()}
                      className="btn btn-primary text-xs py-1.5 px-3.5 font-bold flex items-center gap-1 disabled:opacity-40"
                    >
                      <Send className="w-3 h-3" />
                      {activeThreadTab === 'internal' ? 'Save Note' : 'Send Response'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Audit Timeline */}
              {history.length > 0 && (
                <div className="p-4 bg-[#18181b] rounded-xl border border-[#27272e] space-y-3">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold block">
                    Append-Only Audit History
                  </span>
                  <div className="space-y-2.5">
                    {history.map((h, i) => (
                      <div key={h.id || i} className="flex items-start gap-2.5 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white capitalize">
                              {h.action_type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-neutral-500 text-[10px]">
                              {new Date(h.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {h.reason && <p className="text-neutral-400">{h.reason}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121214] border border-[#232328] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#232328] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Resolve Complaint
              </h3>
              <button onClick={() => setShowResolveModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-neutral-400">
              Document the resolution outcome reached with participants. This explanation is appended to the communication thread and visible to the complainant.
            </p>
            <form onSubmit={handleResolve} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-neutral-300 uppercase mb-1">
                  Resolution Summary *
                </label>
                <textarea
                  value={resolveSummary}
                  onChange={(e) => setResolveSummary(e.target.value)}
                  rows={4}
                  required
                  placeholder="Detail the actions taken, replacement batches sent, or agreements reached..."
                  className="input text-xs w-full bg-[#18181b] border-[#27272e] text-white resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#232328]">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="btn btn-secondary text-xs py-1.5 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress || !resolveSummary.trim()}
                  className="btn btn-primary text-xs py-1.5 px-4 font-bold"
                >
                  {actionInProgress ? 'Resolving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121214] border border-[#232328] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#232328] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <X className="w-4 h-4 text-rose-400" />
                Reject Complaint
              </h3>
              <button onClick={() => setShowRejectModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-neutral-400">
              Provide a valid operational justification for rejecting this complaint. This reason will be communicated to the complainant.
            </p>
            <form onSubmit={handleReject} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-neutral-300 uppercase mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  required
                  placeholder="Explain why this complaint does not warrant administrative action..."
                  className="input text-xs w-full bg-[#18181b] border-[#27272e] text-white resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#232328]">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="btn btn-secondary text-xs py-1.5 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress || !rejectReason.trim()}
                  className="btn btn-secondary text-xs py-1.5 px-4 font-bold text-rose-400 hover:text-rose-300"
                >
                  {actionInProgress ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reopen Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121214] border border-[#232328] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#232328] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                Reopen Complaint
              </h3>
              <button onClick={() => setShowReopenModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleReopen} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-neutral-300 uppercase mb-1">
                  Reason for Reopening *
                </label>
                <textarea
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  rows={4}
                  required
                  placeholder="Explain why this ticket is being reopened for investigation..."
                  className="input text-xs w-full bg-[#18181b] border-[#27272e] text-white resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#232328]">
                <button
                  type="button"
                  onClick={() => setShowReopenModal(false)}
                  className="btn btn-secondary text-xs py-1.5 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress || !reopenReason.trim()}
                  className="btn btn-primary text-xs py-1.5 px-4 font-bold"
                >
                  {actionInProgress ? 'Reopening...' : 'Confirm Reopen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
