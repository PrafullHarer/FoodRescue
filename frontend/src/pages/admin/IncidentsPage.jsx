import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Search, RotateCcw, MessageSquare,
  RefreshCw, X, FileText,
  AlertCircle, AlertOctagon
} from 'lucide-react';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function IncidentsPage() {
  const [summary, setSummary] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });

  // Filters
  const [status, setStatus] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [incidentType, setIncidentType] = useState('all');
  const [source, setSource] = useState('all');
  const [search, setSearch] = useState('');

  // Selected incident for detail view
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Modals for actions
  const [actionModal, setActionModal] = useState(null); // 'assign', 'severity', 'status', 'resolve', 'reopen', 'escalate'
  const [actionInput, setActionInput] = useState('');
  const [actionSecondInput, setActionSecondInput] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // List of active admin users for assignment
  const [admins, setAdmins] = useState([]);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get('/incidents/summary');
      setSummary(res.data.data);
    } catch {}
  }, []);

  // Fetch list
  const fetchIncidents = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/incidents', {
        params: {
          page,
          limit: 15,
          status,
          severity,
          incident_type: incidentType,
          source,
          search: search.trim() || undefined,
        },
      });
      setIncidents(res.data.data.incidents);
      setPagination(res.data.data.pagination);
    } catch {
      toast.error('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, [status, severity, incidentType, source, search]);

  useEffect(() => {
    fetchSummary();
    fetchIncidents(1);
  }, [fetchSummary, fetchIncidents]);

  // Load admins for assignment dropdown
  useEffect(() => {
    api.get('/users', { params: { role: 'admin' } })
      .then(res => setAdmins(res.data?.data?.users || []))
      .catch(() => {});
  }, []);

  // Open detail
  const openDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/incidents/${id}`);
      setSelectedIncident(res.data.data);
    } catch {
      toast.error('Failed to load incident detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleResetFilters = () => {
    setStatus('all');
    setSeverity('all');
    setIncidentType('all');
    setSource('all');
    setSearch('');
  };

  // Severity styling
  const renderSeverityBadge = (sev) => {
    switch (sev) {
      case 'critical':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <AlertOctagon className="w-3 h-3" /> Critical
          </span>
        );
      case 'high':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> High
          </span>
        );
      case 'medium':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Medium
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neutral-500/15 text-neutral-600 dark:text-neutral-400 border border-neutral-500/30">
            Low
          </span>
        );
    }
  };

  // Status styling
  const renderStatusBadge = (st) => {
    const map = {
      open: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      acknowledged: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
      investigating: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      awaiting_response: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      resolved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      closed: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20',
      reopened: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${map[st] || 'bg-neutral-500/10 text-neutral-400'}`}>
        {st.replace(/_/g, ' ')}
      </span>
    );
  };

  // Action submission handlers
  const handleAcknowledge = async () => {
    if (!selectedIncident) return;
    try {
      await api.post(`/incidents/${selectedIncident.id}/acknowledge`);
      toast.success('Incident acknowledged');
      await openDetail(selectedIncident.id);
      fetchSummary();
      fetchIncidents(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to acknowledge');
    }
  };

  const handleActionSubmit = async () => {
    if (!selectedIncident) return;
    setActionSubmitting(true);
    try {
      if (actionModal === 'assign') {
        await api.post(`/incidents/${selectedIncident.id}/assign`, {
          admin_user_id: actionInput,
          notes: actionSecondInput || undefined
        });
        toast.success('Incident assigned successfully');
      } else if (actionModal === 'status') {
        await api.patch(`/incidents/${selectedIncident.id}/status`, {
          status: actionInput,
          notes: actionSecondInput || undefined
        });
        toast.success(`Status updated to ${actionInput}`);
      } else if (actionModal === 'severity') {
        await api.patch(`/incidents/${selectedIncident.id}/severity`, {
          severity: actionInput,
          reason: actionSecondInput
        });
        toast.success(`Severity updated to ${actionInput}`);
      } else if (actionModal === 'note') {
        await api.post(`/incidents/${selectedIncident.id}/notes`, {
          note: actionInput,
          is_internal: true
        });
        toast.success('Investigation note recorded');
      } else if (actionModal === 'resolve') {
        await api.post(`/incidents/${selectedIncident.id}/resolve`, {
          resolution_summary: actionInput,
          notes: actionSecondInput || undefined
        });
        toast.success('Incident resolved');
      } else if (actionModal === 'close') {
        await api.post(`/incidents/${selectedIncident.id}/close`, {
          notes: actionInput || undefined
        });
        toast.success('Incident closed');
      } else if (actionModal === 'reopen') {
        await api.post(`/incidents/${selectedIncident.id}/reopen`, {
          reason: actionInput
        });
        toast.success('Incident reopened for investigation');
      } else if (actionModal === 'escalate') {
        await api.post(`/incidents/${selectedIncident.id}/escalate`, {
          reason: actionInput
        });
        toast.success('Incident escalated to next urgency tier');
      }

      setActionModal(null);
      setActionInput('');
      setActionSecondInput('');
      await openDetail(selectedIncident.id);
      fetchSummary();
      fetchIncidents(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setActionSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232328] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Operations Control
            </span>
            <span className="text-xs text-neutral-500">Live SLA & Exception Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">Incident Management & Escalations</h1>
          <p className="text-neutral-400 text-xs sm:text-sm mt-0.5">
            Track operational exceptions, courier delays, QR verification failures, and food quality concerns.
          </p>
        </div>

        <button
          onClick={() => { fetchSummary(); fetchIncidents(pagination.page); }}
          className="btn btn-secondary text-xs flex items-center gap-1.5 py-2 px-3"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Incidents
        </button>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-[#121214] border border-[#232328] rounded-2xl p-4 shadow-md space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Open Incidents</span>
            <div className="text-2xl font-bold text-white">{summary.open_incidents}</div>
            <span className="text-[10px] text-neutral-500">Active Queue</span>
          </div>

          <div className="bg-[#121214] border border-[#232328] rounded-2xl p-4 shadow-md space-y-1">
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Critical Urgency</span>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{summary.critical_incidents}</div>
            <span className="text-[10px] text-neutral-500">Immediate Action</span>
          </div>

          <div className="bg-[#121214] border border-[#232328] rounded-2xl p-4 shadow-md space-y-1">
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Overdue SLA (&gt;24h)</span>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{summary.overdue_incidents}</div>
            <span className="text-[10px] text-neutral-500">Breaching Threshold</span>
          </div>

          <div className="bg-[#121214] border border-[#232328] rounded-2xl p-4 shadow-md space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Awaiting Assignee</span>
            <div className="text-2xl font-bold text-white">{summary.unassigned_incidents}</div>
            <span className="text-[10px] text-neutral-500">Needs Ownership</span>
          </div>

          <div className="bg-[#121214] border border-[#232328] rounded-2xl p-4 shadow-md space-y-1">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Resolved Today</span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summary.resolved_today}</div>
            <span className="text-[10px] text-neutral-500">Closed Loops</span>
          </div>

          <div className="bg-[#121214] border border-[#232328] rounded-2xl p-4 shadow-md space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Avg Resolution</span>
            <div className="text-2xl font-bold text-white">{summary.avg_resolution_hours} hrs</div>
            <span className="text-[10px] text-neutral-500">Mean TTR</span>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-[#121214] border border-[#232328] rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by incident reference (e.g. INC-2026-XXXX), title, organization..."
              className="input pl-10 text-xs py-2 w-full bg-[#18181b]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input text-xs py-1.5 bg-[#18181b]"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="investigating">Investigating</option>
              <option value="awaiting_response">Awaiting Response</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="reopened">Reopened</option>
            </select>

            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="input text-xs py-1.5 bg-[#18181b]"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="input text-xs py-1.5 bg-[#18181b]"
            >
              <option value="all">All Incident Types</option>
              <option value="late_delivery">Late Delivery</option>
              <option value="missed_pickup">Missed Pickup</option>
              <option value="stuck_in_transit">Stuck in Transit</option>
              <option value="failed_qr_scan">Failed QR Verification</option>
              <option value="food_safety_quality">Food Safety / Quality</option>
              <option value="volunteer_no_show">Volunteer No-Show</option>
              <option value="donation_cancellation">Donation Cancellation</option>
              <option value="other">Other Operational</option>
            </select>

            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="input text-xs py-1.5 bg-[#18181b]"
            >
              <option value="all">All Sources</option>
              <option value="automatic">Automatic Cron</option>
              <option value="manual">Manual Report</option>
            </select>

            <button
              onClick={handleResetFilters}
              className="btn btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1"
              title="Reset filters"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-[#121214] border border-[#232328] rounded-[24px] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#232328] text-neutral-400 text-[10px] font-bold uppercase tracking-wider bg-[#0c0c0e]">
                <th className="py-3.5 px-4">Incident Ref</th>
                <th className="py-3.5 px-4">Title & Classification</th>
                <th className="py-3.5 px-4">Severity</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Related Entity</th>
                <th className="py-3.5 px-4">Reported By</th>
                <th className="py-3.5 px-4">Assigned Admin</th>
                <th className="py-3.5 px-4">Created</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c1c22]">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={9} className="py-4 px-4 h-12 bg-[#141416]/50" />
                  </tr>
                ))
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-500">
                    No incidents found matching the selected filters.
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => (
                  <tr
                    key={inc.id}
                    className="hover:bg-[#18181b]/60 transition-colors cursor-pointer"
                    onClick={() => openDetail(inc.id)}
                  >
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-white bg-[#18181b] px-2 py-0.5 rounded border border-[#282830] tracking-wider text-[11px]">
                        {inc.incident_reference}
                      </span>
                      {inc.escalation_level > 0 && (
                        <span className="block mt-1 text-[9px] font-bold text-amber-400 uppercase tracking-tight">
                          ⚠️ Escalated L{inc.escalation_level}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-xs max-w-xs truncate">{inc.title}</div>
                      <div className="text-[10px] text-neutral-500 capitalize">
                        {inc.incident_type.replace(/_/g, ' ')} · {inc.source}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {renderSeverityBadge(inc.severity)}
                    </td>

                    <td className="py-3.5 px-4">
                      {renderStatusBadge(inc.status)}
                    </td>

                    <td className="py-3.5 px-4 text-[11px] text-neutral-300">
                      {inc.donation_title ? (
                        <div className="truncate max-w-[140px] font-medium" title={inc.donation_title}>
                          {inc.donation_title}
                        </div>
                      ) : (
                        <span className="text-neutral-500">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-[11px] text-neutral-300">
                      {inc.reporter_name || (inc.source === 'automatic' ? 'System Cron' : 'Participant')}
                    </td>

                    <td className="py-3.5 px-4 text-[11px]">
                      {inc.assigned_admin_name ? (
                        <span className="text-white font-medium">{inc.assigned_admin_name}</span>
                      ) : (
                        <span className="text-amber-400 text-[10px] font-bold uppercase">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-[11px] text-neutral-400">
                      {new Date(inc.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(inc.id);
                        }}
                        className="btn btn-secondary text-[11px] py-1 px-2.5"
                      >
                        Investigate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-[#232328] bg-[#0c0c0e] text-xs">
            <span className="text-neutral-400">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchIncidents(pagination.page - 1)}
                className="btn btn-secondary text-xs py-1 px-2.5 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchIncidents(pagination.page + 1)}
                className="btn btn-secondary text-xs py-1 px-2.5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* INCIDENT DETAIL DRAWER / SLIDE-OVER                       */}
      {/* ────────────────────────────────────────────────────────── */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121214] border-l border-[#232328] w-full max-w-2xl h-full overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-[#232328] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-white bg-[#18181b] px-2.5 py-0.5 rounded border border-[#282830]">
                      {selectedIncident.incident_reference}
                    </span>
                    {renderSeverityBadge(selectedIncident.severity)}
                    {renderStatusBadge(selectedIncident.status)}
                  </div>
                  <h2 className="text-lg font-bold text-white tracking-tight mt-2">{selectedIncident.title}</h2>
                  <p className="text-xs text-neutral-400 capitalize">
                    {selectedIncident.incident_type.replace(/_/g, ' ')} · Detected via {selectedIncident.source}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedIncident(null)}
                  className="p-2 rounded-xl bg-[#1c1c20] text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action Controls Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-[#232328] pb-4">
                {selectedIncident.status === 'open' && (
                  <button
                    onClick={handleAcknowledge}
                    className="btn btn-primary text-xs py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-black font-bold"
                  >
                    Acknowledge
                  </button>
                )}

                <button
                  onClick={() => {
                    setActionModal('assign');
                    setActionInput(selectedIncident.assigned_admin_user_id || (admins[0]?.id || ''));
                  }}
                  className="btn btn-secondary text-xs py-1.5 px-3"
                >
                  {selectedIncident.assigned_admin_name ? 'Reassign' : 'Assign Admin'}
                </button>

                <button
                  onClick={() => {
                    setActionModal('status');
                    setActionInput(selectedIncident.status);
                  }}
                  className="btn btn-secondary text-xs py-1.5 px-3"
                >
                  Update Status
                </button>

                <button
                  onClick={() => {
                    setActionModal('severity');
                    setActionInput(selectedIncident.severity);
                    setActionSecondInput('');
                  }}
                  className="btn btn-secondary text-xs py-1.5 px-3"
                >
                  Change Severity
                </button>

                <button
                  onClick={() => {
                    setActionModal('note');
                    setActionInput('');
                  }}
                  className="btn btn-secondary text-xs py-1.5 px-3"
                >
                  Add Note
                </button>

                <button
                  onClick={() => {
                    setActionModal('escalate');
                    setActionInput('');
                  }}
                  className="btn btn-secondary text-xs py-1.5 px-3 text-amber-400 border-amber-500/30"
                >
                  Escalate
                </button>

                {['open', 'acknowledged', 'investigating', 'awaiting_response'].includes(selectedIncident.status) && (
                  <button
                    onClick={() => {
                      setActionModal('resolve');
                      setActionInput('');
                    }}
                    className="btn btn-primary text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    Resolve Incident
                  </button>
                )}

                {selectedIncident.status === 'resolved' && (
                  <button
                    onClick={() => {
                      setActionModal('close');
                      setActionInput('');
                    }}
                    className="btn btn-secondary text-xs py-1.5 px-3 text-neutral-300"
                  >
                    Close Incident
                  </button>
                )}

                {['resolved', 'closed'].includes(selectedIncident.status) && (
                  <button
                    onClick={() => {
                      setActionModal('reopen');
                      setActionInput('');
                    }}
                    className="btn btn-secondary text-xs py-1.5 px-3 text-rose-400 border-rose-500/30"
                  >
                    Reopen
                  </button>
                )}
              </div>

              {/* Description */}
              <div className="bg-[#0c0c0e] p-4 rounded-2xl border border-[#232328] space-y-1">
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Incident Description</span>
                <p className="text-xs text-neutral-200 leading-relaxed whitespace-pre-wrap">{selectedIncident.description}</p>
                {selectedIncident.resolution_summary && (
                  <div className="mt-3 pt-3 border-t border-[#1c1c22]">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block">Resolution Summary</span>
                    <p className="text-xs text-neutral-300 mt-0.5">{selectedIncident.resolution_summary}</p>
                  </div>
                )}
              </div>

              {/* Related Stakeholders & Entities Card */}
              <div className="bg-[#0c0c0e] p-4 rounded-2xl border border-[#232328] space-y-3 text-xs">
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Linked Entities</span>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-neutral-500 block">Donation</span>
                    <strong className="text-white">{selectedIncident.donation_title || 'N/A'}</strong>
                    {selectedIncident.donation_category && (
                      <span className="text-neutral-400 block capitalize">
                        {selectedIncident.donation_quantity} {selectedIncident.donation_unit} ({selectedIncident.donation_category})
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-neutral-500 block">Delivery Status</span>
                    <strong className="text-white capitalize">{selectedIncident.delivery_status || 'N/A'}</strong>
                    {selectedIncident.volunteer_name && (
                      <span className="text-neutral-400 block">Courier: {selectedIncident.volunteer_name}</span>
                    )}
                  </div>

                  <div>
                    <span className="text-neutral-500 block">Food Provider</span>
                    <strong className="text-white">{selectedIncident.provider_name || 'N/A'}</strong>
                    <span className="text-neutral-400 block text-[10px]">{selectedIncident.provider_address}</span>
                  </div>

                  <div>
                    <span className="text-neutral-500 block">Destination NGO</span>
                    <strong className="text-white">{selectedIncident.ngo_name || 'N/A'}</strong>
                    <span className="text-neutral-400 block text-[10px]">{selectedIncident.ngo_address}</span>
                  </div>
                </div>
              </div>

              {/* Investigation Notes Thread */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
                    Internal Investigation Notes ({selectedIncident.notes?.length || 0})
                  </h4>
                  <button
                    onClick={() => {
                      setActionModal('note');
                      setActionInput('');
                    }}
                    className="text-[10px] text-white underline hover:text-neutral-300"
                  >
                    + Add Note
                  </button>
                </div>

                {selectedIncident.notes?.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic bg-[#0c0c0e] p-3 rounded-xl border border-[#232328]">
                    No investigation notes recorded yet.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedIncident.notes.map((n) => (
                      <div key={n.id} className="p-3 bg-[#0c0c0e] rounded-xl border border-[#232328] text-xs space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-neutral-500">
                          <strong className="text-white">{n.author_name}</strong>
                          <span>{new Date(n.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-neutral-300 text-xs">{n.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Append-Only Audit Trail */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-neutral-400" />
                  Append-Only Audit Timeline ({selectedIncident.audit_logs?.length || 0})
                </h4>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 border-l-2 border-[#232328] pl-3 ml-1 text-xs">
                  {selectedIncident.audit_logs?.map((a) => (
                    <div key={a.id} className="space-y-0.5 relative">
                      <div className="w-2 h-2 rounded-full bg-neutral-500 absolute -left-[17px] top-1" />
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-white uppercase tracking-wider">{a.action.replace(/_/g, ' ')}</span>
                        <span className="text-neutral-500">{new Date(a.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-[11px] text-neutral-400">
                        By: <strong className="text-neutral-300">{a.actor_name || a.actor_type}</strong>
                        {a.notes ? ` — "${a.notes}"` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#232328] text-right">
              <button onClick={() => setSelectedIncident(null)} className="btn btn-secondary text-xs py-2 px-4">
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ACTION DIALOG MODALS                                       */}
      {/* ────────────────────────────────────────────────────────── */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#141416] border border-[#282830] rounded-[24px] max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white capitalize">
              {actionModal === 'assign' && 'Assign Administrator'}
              {actionModal === 'status' && 'Update Incident Status'}
              {actionModal === 'severity' && 'Change Severity Level'}
              {actionModal === 'note' && 'Add Investigation Note'}
              {actionModal === 'resolve' && 'Resolve Incident'}
              {actionModal === 'close' && 'Close Incident'}
              {actionModal === 'reopen' && 'Reopen Incident'}
              {actionModal === 'escalate' && 'Escalate Incident'}
            </h3>

            {actionModal === 'assign' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">Select Administrator</label>
                  <select
                    value={actionInput}
                    onChange={(e) => setActionInput(e.target.value)}
                    className="input text-xs w-full bg-[#18181b]"
                  >
                    {admins.map((a) => (
                      <option key={a.id} value={a.id}>{a.full_name} ({a.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">Assignment Note (Optional)</label>
                  <input
                    type="text"
                    value={actionSecondInput}
                    onChange={(e) => setActionSecondInput(e.target.value)}
                    placeholder="e.g. Please lead investigation on packaging failure"
                    className="input text-xs w-full bg-[#18181b]"
                  />
                </div>
              </div>
            )}

            {actionModal === 'status' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">New Status</label>
                  <select
                    value={actionInput}
                    onChange={(e) => setActionInput(e.target.value)}
                    className="input text-xs w-full bg-[#18181b]"
                  >
                    <option value="acknowledged">Acknowledged</option>
                    <option value="investigating">Investigating</option>
                    <option value="awaiting_response">Awaiting Response</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">Transition Note (Optional)</label>
                  <input
                    type="text"
                    value={actionSecondInput}
                    onChange={(e) => setActionSecondInput(e.target.value)}
                    placeholder="Reason or update context"
                    className="input text-xs w-full bg-[#18181b]"
                  />
                </div>
              </div>
            )}

            {actionModal === 'severity' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">New Severity</label>
                  <select
                    value={actionInput}
                    onChange={(e) => setActionInput(e.target.value)}
                    className="input text-xs w-full bg-[#18181b]"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    Justification Reason (Required)
                  </label>
                  <textarea
                    rows={3}
                    value={actionSecondInput}
                    onChange={(e) => setActionSecondInput(e.target.value)}
                    placeholder="State reason for severity change (will be recorded in audit history)"
                    className="input text-xs w-full bg-[#18181b]"
                    required
                  />
                </div>
              </div>
            )}

            {actionModal === 'note' && (
              <div className="space-y-2 text-xs">
                <label className="text-[10px] uppercase font-bold text-neutral-400 block">Internal Investigation Note</label>
                <textarea
                  rows={4}
                  value={actionInput}
                  onChange={(e) => setActionInput(e.target.value)}
                  placeholder="Record findings, interview notes, or vendor communications..."
                  className="input text-xs w-full bg-[#18181b]"
                  required
                />
              </div>
            )}

            {actionModal === 'resolve' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">Resolution Summary (Required)</label>
                  <textarea
                    rows={3}
                    value={actionInput}
                    onChange={(e) => setActionInput(e.target.value)}
                    placeholder="Describe how the problem was resolved and preventative actions taken..."
                    className="input text-xs w-full bg-[#18181b]"
                    required
                  />
                </div>
              </div>
            )}

            {actionModal === 'close' && (
              <div className="space-y-2 text-xs">
                <label className="text-[10px] uppercase font-bold text-neutral-400 block">Closing Summary</label>
                <input
                  type="text"
                  value={actionInput}
                  onChange={(e) => setActionInput(e.target.value)}
                  placeholder="e.g. Confirmed completed and acknowledged by all stakeholders"
                  className="input text-xs w-full bg-[#18181b]"
                />
              </div>
            )}

            {actionModal === 'reopen' && (
              <div className="space-y-2 text-xs">
                <label className="text-[10px] uppercase font-bold text-neutral-400 block">Reason for Reopening</label>
                <textarea
                  rows={3}
                  value={actionInput}
                  onChange={(e) => setActionInput(e.target.value)}
                  placeholder="Specify new evidence or recurring failure..."
                  className="input text-xs w-full bg-[#18181b]"
                  required
                />
              </div>
            )}

            {actionModal === 'escalate' && (
              <div className="space-y-2 text-xs">
                <label className="text-[10px] uppercase font-bold text-neutral-400 block">Escalation Reason</label>
                <textarea
                  rows={3}
                  value={actionInput}
                  onChange={(e) => setActionInput(e.target.value)}
                  placeholder="State reason for manual escalation (increases urgency and notifies team leads)..."
                  className="input text-xs w-full bg-[#18181b]"
                  required
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#232328]">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="btn btn-secondary text-xs py-2 px-3"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionSubmitting || (['severity', 'resolve', 'reopen', 'escalate', 'note'].includes(actionModal) && !(actionInput || actionSecondInput))}
                onClick={handleActionSubmit}
                className="btn btn-primary text-xs py-2 px-4"
              >
                {actionSubmitting ? 'Submitting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
