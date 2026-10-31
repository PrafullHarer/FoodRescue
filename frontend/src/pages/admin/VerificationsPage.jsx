import { useEffect, useState, useMemo } from 'react';
import api from '../../api/client';
import {
  ShieldCheck, Check, X, Building, UserCheck, Search, Filter,
  Clock, AlertTriangle, AlertCircle, RefreshCw, Eye, Store, HeartHandshake,
  Truck, ShieldAlert, Phone, Mail, Calendar, MapPin, FileText, CheckCircle2,
  XCircle, UserX, MessageSquare, Info, Shield, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function VerificationsPage() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, suspended: 0, total: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState('PENDING'); // Prioritize pending by default
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected User Modal
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [detailUser, setDetailUser] = useState(null);
  const [roleProfile, setRoleProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Action Dialog Modals
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [requestInfoModalOpen, setRequestInfoModalOpen] = useState(false);
  const [infoNotes, setInfoNotes] = useState('');
  const [confirmSuspendOpen, setConfirmSuspendOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // 1. Fetch user verifications list
  const fetchVerifications = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 15,
        status: selectedStatus,
        role: selectedRole,
        search: searchQuery.trim() || undefined,
      };

      const res = await api.get('/admin/verifications', { params });
      const data = res?.data?.data || {};

      setUsers(data.users || []);
      if (data.stats) setStats(data.stats);
      if (data.pagination) setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to load verifications queue:', err);
      toast.error('Could not load user verifications queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications(1);
  }, [selectedStatus, selectedRole]);

  // Handle Search on Enter or debounce
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchVerifications(1);
  };

  // 2. Open User Details Modal
  const handleOpenDetail = async (userId) => {
    setSelectedUserId(userId);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/admin/verifications/${userId}`);
      const data = res?.data?.data || {};
      setDetailUser(data.user || null);
      setRoleProfile(data.roleProfile || null);
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Failed to load user detail:', err);
      toast.error('Could not load user verification profile.');
      setSelectedUserId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    setSelectedUserId(null);
    setDetailUser(null);
    setRoleProfile(null);
    setDocuments([]);
  };

  // 3. Admin Actions
  const handleApprove = async () => {
    if (!detailUser) return;
    setActionLoading(true);
    try {
      await api.patch(`/admin/verifications/${detailUser.id}/approve`);
      toast.success(`Account for ${detailUser.full_name} has been approved.`);
      setConfirmApproveOpen(false);
      closeDetail();
      fetchVerifications(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve account.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!detailUser || !rejectionReason.trim()) {
      toast.error('Please specify a rejection reason.');
      return;
    }
    setActionLoading(true);
    try {
      await api.patch(`/admin/verifications/${detailUser.id}/reject`, {
        reason: rejectionReason.trim(),
      });
      toast.success(`Registration for ${detailUser.full_name} rejected.`);
      setRejectModalOpen(false);
      setRejectionReason('');
      closeDetail();
      fetchVerifications(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject registration.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestInfo = async () => {
    if (!detailUser || !infoNotes.trim()) {
      toast.error('Please describe what additional information is required.');
      return;
    }
    setActionLoading(true);
    try {
      await api.patch(`/admin/verifications/${detailUser.id}/request-info`, {
        notes: infoNotes.trim(),
      });
      toast.success(`Information request sent to ${detailUser.full_name}.`);
      setRequestInfoModalOpen(false);
      setInfoNotes('');
      closeDetail();
      fetchVerifications(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send information request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!detailUser) return;
    setActionLoading(true);
    try {
      await api.patch(`/admin/verifications/${detailUser.id}/suspend`);
      toast.success(`Account for ${detailUser.full_name} suspended & active sessions revoked.`);
      setConfirmSuspendOpen(false);
      closeDetail();
      fetchVerifications(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to suspend account.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Clock className="w-3 h-3 animate-spin" /> Pending Approval
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-500/10 text-neutral-400 border border-neutral-500/20">
            <UserX className="w-3 h-3" /> Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-300">
            {status || 'Unknown'}
          </span>
        );
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'provider':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Store className="w-3 h-3" /> Food Provider
          </span>
        );
      case 'ngo':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <HeartHandshake className="w-3 h-3" /> NGO / Shelter
          </span>
        );
      case 'volunteer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Truck className="w-3 h-3" /> Volunteer Courier
          </span>
        );
      default:
        return <span className="text-xs text-neutral-400">{role || 'Pending Role'}</span>;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-16">
      {/* 1. Header & Live Queue Statistics */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-200 dark:border-[#232328] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-black flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
              User Registration & Verification
            </h1>
          </div>
          <p className="text-neutral-600 dark:text-neutral-400 text-xs sm:text-sm mt-1.5 max-w-2xl">
            Review submitted registration profiles, verify organization credentials for Food Providers and NGOs, and approve or reject accounts before dashboard access is permitted.
          </p>
        </div>

        <button
          onClick={() => fetchVerifications(pagination.page)}
          className="btn btn-secondary self-start lg:self-center flex items-center gap-2 text-xs py-2 px-3.5"
          title="Refresh queue"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* 2. Status Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Pending Card */}
        <div
          onClick={() => setSelectedStatus('PENDING')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            selectedStatus === 'PENDING'
              ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
              : 'bg-white dark:bg-[#121214] border-neutral-200 dark:border-[#232328] hover:border-amber-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Pending Review</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white mt-2">
            {stats.pending}
          </div>
          <p className="text-[11px] text-amber-500 font-medium mt-1">Requires admin approval</p>
        </div>

        {/* Approved Card */}
        <div
          onClick={() => setSelectedStatus('APPROVED')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            selectedStatus === 'APPROVED'
              ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30'
              : 'bg-white dark:bg-[#121214] border-neutral-200 dark:border-[#232328] hover:border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Approved</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white mt-2">
            {stats.approved}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Active platform access</p>
        </div>

        {/* Rejected Card */}
        <div
          onClick={() => setSelectedStatus('REJECTED')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            selectedStatus === 'REJECTED'
              ? 'bg-red-500/10 border-red-500/40 ring-1 ring-red-500/30'
              : 'bg-white dark:bg-[#121214] border-neutral-200 dark:border-[#232328] hover:border-red-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Rejected</span>
            <XCircle className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white mt-2">
            {stats.rejected}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Blocked registrations</p>
        </div>

        {/* Suspended Card */}
        <div
          onClick={() => setSelectedStatus('SUSPENDED')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            selectedStatus === 'SUSPENDED'
              ? 'bg-neutral-500/10 border-neutral-400/40 ring-1 ring-neutral-400/30'
              : 'bg-white dark:bg-[#121214] border-neutral-200 dark:border-[#232328] hover:border-neutral-400/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Suspended</span>
            <UserX className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white mt-2">
            {stats.suspended}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Sessions revoked</p>
        </div>
      </div>

      {/* 3. Filters and Search Bar */}
      <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] rounded-2xl p-4 sm:p-5 space-y-4">
        {/* Status Pill Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'PENDING', label: 'Pending Approval', count: stats.pending },
              { id: 'APPROVED', label: 'Approved', count: stats.approved },
              { id: 'REJECTED', label: 'Rejected', count: stats.rejected },
              { id: 'SUSPENDED', label: 'Suspended', count: stats.suspended },
              { id: 'ALL', label: 'All Registrations', count: stats.total },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedStatus === tab.id
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-black shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-[#1c1c20]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    selectedStatus === tab.id
                      ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black'
                      : 'bg-neutral-200 dark:bg-[#232328] text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Role Filter dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-neutral-500">Role:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-neutral-100 dark:bg-[#18181c] border border-neutral-200 dark:border-[#2a2a30] text-xs font-medium text-neutral-800 dark:text-neutral-200 rounded-xl px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-neutral-400"
            >
              <option value="ALL">All Roles</option>
              <option value="provider">Food Providers</option>
              <option value="ngo">NGOs / Shelters</option>
              <option value="volunteer">Volunteers</option>
            </select>
          </div>
        </div>

        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by full name, email, phone, business or NGO organization name..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#232328] text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden focus:border-neutral-400 dark:focus:border-[#3a3a44]"
            />
          </div>
          <button type="submit" className="btn btn-secondary text-xs px-4 py-2">
            Search
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                fetchVerifications(1);
              }}
              className="btn btn-secondary text-xs px-3 py-2 text-neutral-400"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* 4. Verification Queue Table */}
      <div className="bg-white dark:bg-[#121214] rounded-2xl border border-neutral-200 dark:border-[#232328] overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-16 text-center text-neutral-500">
            <div className="w-8 h-8 border-2 border-neutral-300 dark:border-neutral-700 border-t-neutral-900 dark:border-t-white rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium">Loading verification records...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-16 text-center text-neutral-500">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-neutral-400 stroke-1" />
            <p className="font-semibold text-neutral-900 dark:text-white text-base">No Users Found</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
              {selectedStatus === 'PENDING'
                ? 'All pending registration applications have been verified. Great job!'
                : 'No registered accounts match the selected status and role filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-[#232328] bg-neutral-50/70 dark:bg-[#16161a] text-neutral-500 dark:text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">User / Registrant</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Organization / Entity</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Registered</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-[#232328] text-neutral-800 dark:text-neutral-200">
                {users.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-neutral-50/80 dark:hover:bg-[#18181c] transition-colors"
                  >
                    {/* User / Registrant */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-neutral-200 dark:bg-[#202026] text-neutral-700 dark:text-neutral-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {item.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-neutral-900 dark:text-white truncate">
                            {item.full_name}
                          </div>
                          <div className="text-[11px] text-neutral-500 truncate flex items-center gap-1.5 mt-0.5">
                            <span className="truncate">{item.email}</span>
                            {item.auth_provider === 'google' && (
                              <span className="px-1.5 py-0.2 rounded-xs text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                Google
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getRoleBadge(item.role)}
                    </td>

                    {/* Organization / Entity */}
                    <td className="py-3.5 px-4">
                      {item.organization_name ? (
                        <div>
                          <div className="font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-xs">
                            {item.organization_name}
                          </div>
                          {item.business_type && (
                            <div className="text-[11px] text-neutral-500 truncate">{item.business_type}</div>
                          )}
                          {item.registration_no && (
                            <div className="text-[10px] text-neutral-400 font-mono">Reg: {item.registration_no}</div>
                          )}
                        </div>
                      ) : item.role === 'volunteer' ? (
                        <span className="text-neutral-500 text-[11px]">Courier ({item.vehicle_type || 'Vehicle'})</span>
                      ) : (
                        <span className="text-neutral-400 italic text-[11px]">Not provided</span>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-neutral-600 dark:text-neutral-300">
                      {item.phone || <span className="text-neutral-400 italic">No phone</span>}
                    </td>

                    {/* Registered Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-neutral-500">
                      {formatDateTime(item.created_at)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(item.verification_status)}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenDetail(item.id)}
                        className="btn btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 hover:border-neutral-400"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-neutral-200 dark:border-[#232328] flex items-center justify-between text-xs text-neutral-500">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total registrants)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchVerifications(pagination.page - 1)}
                className="btn btn-secondary py-1 px-3 text-xs disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchVerifications(pagination.page + 1)}
                className="btn btn-secondary py-1 px-3 text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Complete User Details Modal */}
      {selectedUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-200 dark:border-[#232328] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black flex items-center justify-center font-bold">
                  {detailUser?.full_name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <span>{detailUser?.full_name || 'Loading profile...'}</span>
                    {detailUser && getStatusBadge(detailUser.verification_status)}
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    User ID: <span className="font-mono">{detailUser?.id}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={closeDetail}
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#1f1f24] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Detailed breakdown */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {loadingDetail ? (
                <div className="py-12 text-center text-neutral-500">
                  <div className="w-7 h-7 border-2 border-neutral-300 dark:border-neutral-700 border-t-neutral-900 dark:border-t-white rounded-full animate-spin mx-auto mb-2" />
                  Loading applicant details...
                </div>
              ) : !detailUser ? (
                <div className="py-12 text-center text-neutral-500">
                  Could not retrieve user details.
                </div>
              ) : (
                <>
                  {/* Status Banner Notice if Pending */}
                  {detailUser.verification_status === 'PENDING' && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-start gap-3">
                      <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-sm text-neutral-900 dark:text-amber-400">
                          Awaiting Administrator Approval
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5">
                          This user is currently blocked from logging in and accessing dashboards. Review their registration details and either approve, reject, or request information.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Section A: Common Registrant Details */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-neutral-400" />
                      Common Registration Information
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-[#16161a] border border-neutral-200 dark:border-[#232328]">
                      <div>
                        <span className="text-neutral-500 text-[11px] block">Full Name</span>
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          {detailUser.full_name || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500 text-[11px] block">Email Address</span>
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          {detailUser.email}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500 text-[11px] block">Phone Number</span>
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          {detailUser.phone || <span className="text-neutral-400 italic">Not provided</span>}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500 text-[11px] block">Role Applied</span>
                        <span className="font-semibold text-neutral-900 dark:text-white mt-0.5 block">
                          {getRoleBadge(detailUser.role)}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500 text-[11px] block">Account Creation Method</span>
                        <span className="font-semibold text-neutral-900 dark:text-white uppercase tracking-wider text-[11px]">
                          {detailUser.auth_provider === 'google' ? 'Google OAuth 2.0' : 'Email & Password'}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500 text-[11px] block">Registration Timestamp</span>
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          {formatDateTime(detailUser.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section B: Role-Specific Details */}
                  {detailUser.role === 'provider' && (
                    <div className="space-y-3">
                      <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                        <Store className="w-4 h-4 text-blue-400" />
                        Food Provider Details
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-[#16161a] border border-neutral-200 dark:border-[#232328]">
                        <div>
                          <span className="text-neutral-500 text-[11px] block">Business / Store Name</span>
                          <span className="font-semibold text-neutral-900 dark:text-white">
                            {roleProfile?.business_name || 'Not provided'}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-500 text-[11px] block">Business Category</span>
                          <span className="font-semibold text-neutral-900 dark:text-white capitalize">
                            {roleProfile?.business_type || 'Restaurant'}
                          </span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-neutral-500 text-[11px] block">Pickup Address</span>
                          <span className="font-semibold text-neutral-900 dark:text-white">
                            {roleProfile?.address || 'Not specified'}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-500 text-[11px] block">Coordinates</span>
                          <span className="font-mono text-neutral-600 dark:text-neutral-300 text-[11px]">
                            {roleProfile?.latitude?.toFixed(4)}, {roleProfile?.longitude?.toFixed(4)}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-500 text-[11px] block">Operating Hours</span>
                          <span className="text-neutral-600 dark:text-neutral-300">
                            {roleProfile?.operating_hours
                              ? JSON.stringify(roleProfile.operating_hours)
                              : 'Standard daily business hours'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {detailUser.role === 'ngo' && (
                    <div className="space-y-3">
                      <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                        <HeartHandshake className="w-4 h-4 text-purple-400" />
                        NGO / Community Shelter Details
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-[#16161a] border border-neutral-200 dark:border-[#232328]">
                        <div>
                          <span className="text-neutral-500 text-[11px] block">Organization Name</span>
                          <span className="font-semibold text-neutral-900 dark:text-white">
                            {roleProfile?.organization_name || 'Not specified'}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-500 text-[11px] block">Registration / Tax ID</span>
                          <span className="font-mono text-neutral-900 dark:text-white">
                            {roleProfile?.registration_no || <span className="text-amber-500">Missing / Unset</span>}
                          </span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-neutral-500 text-[11px] block">Shelter Delivery Address</span>
                          <span className="font-semibold text-neutral-900 dark:text-white">
                            {roleProfile?.address || 'Not specified'}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-500 text-[11px] block">Daily Feeding Capacity</span>
                          <span className="font-semibold text-neutral-900 dark:text-white">
                            {roleProfile?.capacity || 200} meals/day
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-500 text-[11px] block">Coordinates</span>
                          <span className="font-mono text-neutral-600 dark:text-neutral-300 text-[11px]">
                            {roleProfile?.latitude?.toFixed(4)}, {roleProfile?.longitude?.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {detailUser.role === 'volunteer' && (
                    <div className="space-y-3">
                      <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                        <Truck className="w-4 h-4 text-cyan-400" />
                        Volunteer Courier Details
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-[#16161a] border border-neutral-200 dark:border-[#232328]">
                        <div>
                          <span className="text-neutral-500 text-[11px] block">Vehicle Mode</span>
                          <span className="font-semibold text-neutral-900 dark:text-white capitalize">
                            {roleProfile?.vehicle_type || 'Car / Bike'}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-500 text-[11px] block">Max Delivery Radius</span>
                          <span className="font-semibold text-neutral-900 dark:text-white">
                            {roleProfile?.max_distance_km || 10} km
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-500 text-[11px] block">Availability Status</span>
                          <span className="font-semibold text-neutral-900 dark:text-white capitalize">
                            {roleProfile?.availability || 'Offline'}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-500 text-[11px] block">Trust Rating</span>
                          <span className="font-semibold text-neutral-900 dark:text-white">
                            ★ {roleProfile?.rating ? Number(roleProfile.rating).toFixed(1) : '5.0 (New)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section C: Supporting Documents */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-neutral-400" />
                      Verification Documents & Proof
                    </h3>

                    {documents.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-neutral-300 dark:border-[#2a2a32] text-center text-neutral-500">
                        <Info className="w-5 h-5 mx-auto mb-1.5 text-neutral-400" />
                        <p className="font-medium">No external document files attached</p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          Standard digital verification was completed during online registration.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="p-3 rounded-xl bg-neutral-50 dark:bg-[#16161a] border border-neutral-200 dark:border-[#232328] flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2.5">
                              <FileText className="w-4 h-4 text-neutral-400" />
                              <div>
                                <div className="font-semibold text-neutral-900 dark:text-white">
                                  {doc.document_name}
                                </div>
                                <div className="text-[10px] text-neutral-400">{doc.document_type}</div>
                              </div>
                            </div>
                            <a
                              href={doc.document_url}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" /> View
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section D: Administrative Review History */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                      <Shield className="w-4 h-4 text-neutral-400" />
                      Administrative Trail & History
                    </h3>

                    <div className="p-4 rounded-xl bg-neutral-50 dark:bg-[#16161a] border border-neutral-200 dark:border-[#232328] space-y-2">
                      {detailUser.approved_at && (
                        <div className="text-emerald-500 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                          <span>
                            Approved by <strong>{detailUser.approved_by_name || 'Admin'}</strong> on {formatDateTime(detailUser.approved_at)}
                          </span>
                        </div>
                      )}

                      {detailUser.rejected_at && (
                        <div className="text-red-500 space-y-1">
                          <div className="flex items-center gap-2 font-semibold">
                            <XCircle className="w-4 h-4 flex-shrink-0" />
                            <span>
                              Rejected by {detailUser.rejected_by_name || 'Admin'} on {formatDateTime(detailUser.rejected_at)}
                            </span>
                          </div>
                          {detailUser.rejection_reason && (
                            <p className="text-neutral-600 dark:text-neutral-300 text-xs pl-6">
                              Reason: {detailUser.rejection_reason}
                            </p>
                          )}
                        </div>
                      )}

                      {detailUser.info_requested_at && (
                        <div className="text-amber-500 space-y-1">
                          <div className="flex items-center gap-2 font-semibold">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>Info requested on {formatDateTime(detailUser.info_requested_at)}</span>
                          </div>
                          <p className="text-neutral-600 dark:text-neutral-300 text-xs pl-6">
                            Notes: {detailUser.info_requested_notes}
                          </p>
                        </div>
                      )}

                      {detailUser.suspended_at && (
                        <div className="text-neutral-400 flex items-center gap-2">
                          <UserX className="w-4 h-4 flex-shrink-0" />
                          <span>Suspended on {formatDateTime(detailUser.suspended_at)}</span>
                        </div>
                      )}

                      {!detailUser.approved_at && !detailUser.rejected_at && !detailUser.info_requested_at && (
                        <p className="text-neutral-500 text-xs italic">
                          No prior administrative actions recorded. This registration is pending initial verification.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer: Action Buttons */}
            {detailUser && (
              <div className="p-4 sm:p-5 border-t border-neutral-200 dark:border-[#232328] bg-neutral-50 dark:bg-[#16161a] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {/* Request Info button */}
                  <button
                    onClick={() => setRequestInfoModalOpen(true)}
                    className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                    Request Information
                  </button>

                  {/* Suspend button (if approved) */}
                  {detailUser.verification_status === 'APPROVED' && (
                    <button
                      onClick={() => setConfirmSuspendOpen(true)}
                      className="btn btn-secondary text-xs py-2 px-3.5 text-neutral-400 hover:text-red-500 hover:border-red-500/30 flex items-center gap-1.5"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      Suspend User
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  {/* Reject button */}
                  <button
                    onClick={() => setRejectModalOpen(true)}
                    className="btn btn-secondary text-xs py-2 px-4 text-red-500 hover:bg-red-500/10 border-red-500/20 flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </button>

                  {/* Approve button */}
                  <button
                    onClick={() => setConfirmApproveOpen(true)}
                    className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approve User
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Approve User */}
      {confirmApproveOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-500">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">Confirm User Approval</h3>
                <p className="text-xs text-neutral-500">Grant full operational access</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Are you sure you want to approve <strong>{detailUser?.full_name}</strong> ({detailUser?.email})?
              Their status will become <strong>APPROVED</strong>, unlocking their dashboard and notifying them via in-app alert and email.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                disabled={actionLoading}
                onClick={() => setConfirmApproveOpen(false)}
                className="btn btn-secondary text-xs py-2 px-3.5"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={handleApprove}
                className="btn btn-primary text-xs py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5"
              >
                {actionLoading ? <div className="w-3 h-3 border-2 border-white rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Confirm & Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal Dialog */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">Reject Registration</h3>
                <p className="text-xs text-neutral-500">Specify reason for rejection</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300">
              Please provide an explanation for rejecting <strong>{detailUser?.full_name}</strong>. This explanation will be provided to the user.
            </p>

            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                Rejection Reason (Required)
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Invalid organization registration number, address could not be verified, or incomplete business profile."
                className="w-full text-xs p-3 rounded-xl bg-neutral-50 dark:bg-[#16161a] border border-neutral-200 dark:border-[#2a2a30] text-neutral-900 dark:text-white focus:outline-hidden focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                disabled={actionLoading}
                onClick={() => setRejectModalOpen(false)}
                className="btn btn-secondary text-xs py-2 px-3.5"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading || !rejectionReason.trim()}
                onClick={handleReject}
                className="btn btn-secondary text-xs py-2 px-4 bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-1.5"
              >
                {actionLoading ? <div className="w-3 h-3 border-2 border-white rounded-full animate-spin" /> : <X className="w-3.5 h-3.5" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Additional Information Dialog */}
      {requestInfoModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-500">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">Request Additional Info</h3>
                <p className="text-xs text-neutral-500">Applicant will remain pending</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300">
              Send a request to <strong>{detailUser?.full_name}</strong> for missing details or documentation. Dashboard access will stay blocked until approved.
            </p>

            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                Information Needed (Required)
              </label>
              <textarea
                rows={3}
                value={infoNotes}
                onChange={(e) => setInfoNotes(e.target.value)}
                placeholder="e.g. Please provide a copy of your valid NGO 80G tax exemption certificate or commercial food handler permit."
                className="w-full text-xs p-3 rounded-xl bg-neutral-50 dark:bg-[#16161a] border border-neutral-200 dark:border-[#2a2a30] text-neutral-900 dark:text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                disabled={actionLoading}
                onClick={() => setRequestInfoModalOpen(false)}
                className="btn btn-secondary text-xs py-2 px-3.5"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading || !infoNotes.trim()}
                onClick={handleRequestInfo}
                className="btn btn-primary text-xs py-2 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1.5"
              >
                {actionLoading ? <div className="w-3 h-3 border-2 border-white rounded-full animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Confirmation Dialog */}
      {confirmSuspendOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#121214] border border-neutral-200 dark:border-[#232328] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">Suspend Approved User</h3>
                <p className="text-xs text-neutral-500">Immediate access revocation</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Are you sure you want to suspend <strong>{detailUser?.full_name}</strong>? All their active sessions and refresh tokens will be immediately invalidated and their access revoked.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                disabled={actionLoading}
                onClick={() => setConfirmSuspendOpen(false)}
                className="btn btn-secondary text-xs py-2 px-3.5"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={handleSuspend}
                className="btn btn-secondary text-xs py-2 px-4 bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-1.5"
              >
                {actionLoading ? <div className="w-3 h-3 border-2 border-white rounded-full animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
