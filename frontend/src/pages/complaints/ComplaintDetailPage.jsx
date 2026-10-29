import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';
import {
  ChevronLeft, Clock, CheckCircle2, AlertCircle, Search,
  X, MessageSquare, Calendar, Tag, FileText, Hash, Send,
  Loader2, RotateCcw, ExternalLink, ShieldCheck, UserCheck, ShieldAlert,
  RefreshCw, User, HelpCircle, Truck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { COMPLAINT_CATEGORIES } from '../../components/complaints/RaiseComplaintModal';

const STATUS_CONFIG = {
  submitted: { label: 'Submitted', class: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  under_review: { label: 'Under Review', class: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
  assigned: { label: 'Assigned', class: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' },
  awaiting_user_response: { label: 'Awaiting Your Response', class: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse font-bold' },
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

export default function ComplaintDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [complaint, setComplaint] = useState(null);
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Message reply
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Reopen modal
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [submittingReopen, setSubmittingReopen] = useState(false);

  const messagesEndRef = useRef(null);

  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const [complaintRes, messagesRes, historyRes] = await Promise.allSettled([
        api.get(`/complaints/${id}`),
        api.get(`/complaints/${id}/messages`),
        api.get(`/complaints/${id}/history`),
      ]);

      if (complaintRes.status === 'fulfilled') {
        setComplaint(complaintRes.value.data?.data);
      } else if (!isSilent) {
        toast.error('Failed to load complaint details');
      }

      if (messagesRes.status === 'fulfilled') {
        setMessages(messagesRes.value.data?.data || []);
      }

      if (historyRes.status === 'fulfilled') {
        setHistory(historyRes.value.data?.data || []);
      }
    } catch {
      if (!isSilent) toast.error('Failed to load complaint data');
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();

    // Background polling every 15 seconds to update conversation seamlessly
    const interval = setInterval(() => {
      loadData(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [loadData]);

  // Scroll to bottom whenever new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Handle Send Reply
  const handleSendReply = async (e) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || sendingReply) return;

    setSendingReply(true);
    try {
      await api.post(`/complaints/${id}/messages`, {
        message: replyText.trim(),
        visibility: 'user',
      });
      setReplyText('');
      toast.success(user?.role === 'admin' ? 'Response posted to complaint thread' : 'Message sent to administrators');
      // Reload messages & complaint (in case status auto-flipped)
      await loadData(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSendingReply(false);
    }
  };

  // Keyboard shortcut: Enter to send (Shift+Enter for newline)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply(e);
    }
  };

  // Handle Reopen
  const handleReopen = async (e) => {
    e.preventDefault();
    if (!reopenReason.trim() || reopenReason.trim().length < 5) {
      return toast.error('A detailed reason (minimum 5 characters) is required to reopen this ticket');
    }

    setSubmittingReopen(true);
    try {
      await api.post(`/complaints/${id}/reopen`, {
        reason: reopenReason.trim(),
      });
      toast.success('Complaint reopened successfully');
      setShowReopenModal(false);
      setReopenReason('');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reopen complaint');
    } finally {
      setSubmittingReopen(false);
    }
  };

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today, ${timeStr}`;
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 space-y-3">
        <Loader2 className="w-8 h-8 border-t-white text-neutral-500 animate-spin" />
        <span className="text-xs text-neutral-400">Loading complaint investigation file...</span>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="text-center py-20 bg-[#121214] rounded-2xl border border-[#232328] max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-neutral-500" />
        <h3 className="text-base font-bold text-white">Complaint Not Found</h3>
        <p className="text-xs text-neutral-400 mt-1 mb-4">
          This complaint does not exist or you do not have permission to view it.
        </p>
        <Link to="/complaints" className="btn btn-secondary text-xs py-2 px-4">
          ← Return to My Complaints
        </Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[complaint.status] || STATUS_CONFIG.submitted;
  const priorityClass = PRIORITY_CONFIG[complaint.priority] || PRIORITY_CONFIG.medium;
  const catObj = COMPLAINT_CATEGORIES.find((cat) => cat.value === complaint.category);
  const canReopen = ['resolved', 'rejected', 'closed'].includes(complaint.status);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-16">
      {/* Back Link & Admin Quick Toggle */}
      <div className="flex items-center justify-between">
        <Link
          to="/complaints"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back to My Complaints
        </Link>

        {user?.role === 'admin' && (
          <Link
            to="/admin/complaints"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Admin Complaints Console
          </Link>
        )}
      </div>

      {/* Complaint Title Card */}
      <div className="bg-[#121214] border border-[#232328] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#232328] pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-white bg-[#18181b] px-2.5 py-1 rounded border border-[#27272e]">
              {complaint.complaint_reference}
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${statusCfg.class}`}>
              {statusCfg.label}
            </span>
            <span className={`inline-flex items-center px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider border ${priorityClass}`}>
              {complaint.priority} Priority
            </span>
            {catObj && (
              <span className="text-xs text-neutral-300 bg-[#18181b] px-2.5 py-1 rounded border border-[#27272e]">
                {catObj.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            {canReopen && (
              <button
                onClick={() => setShowReopenModal(true)}
                className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold hover:text-amber-400 border-amber-500/20 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Dispute / Reopen Ticket
              </button>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {complaint.title}
          </h1>
          <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1 flex-wrap">
            <span>
              Filed on {new Date(complaint.created_at).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
            </span>
            {complaint.incident_date && (
              <>
                <span>•</span>
                <span className="text-neutral-300">
                  Incident Date: {new Date(complaint.incident_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Detailed Description */}
        <div className="p-4 bg-[#0c0c0e] rounded-xl border border-[#232328] text-xs text-neutral-200 leading-relaxed space-y-1">
          <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">
            Original Statement
          </span>
          <p className="whitespace-pre-wrap">{complaint.description}</p>
        </div>

        {/* Resolution Banner */}
        {complaint.status === 'resolved' && complaint.resolution_summary && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Case Resolved by Administration
              </span>
              {complaint.resolved_at && (
                <span className="text-[10px] text-emerald-500 font-medium">
                  {new Date(complaint.resolved_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <p className="text-neutral-200 leading-relaxed text-xs">
              {complaint.resolution_summary}
            </p>
          </div>
        )}

        {/* Rejection Banner */}
        {complaint.status === 'rejected' && complaint.rejection_reason && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 space-y-1.5">
            <span className="font-bold flex items-center gap-1.5">
              <X className="w-4 h-4 text-rose-400" />
              Complaint Closed / Rejected
            </span>
            <p className="text-neutral-200 leading-relaxed text-xs">
              {complaint.rejection_reason}
            </p>
          </div>
        )}

        {/* Action Needed Callout when Awaiting User Response */}
        {complaint.status === 'awaiting_user_response' && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-amber-400">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              Administrator Action: Your Input is Requested
            </span>
            <p className="text-neutral-200 leading-relaxed">
              The platform administrator has reviewed your complaint and requested clarification or additional information. Please reply in the communication thread below to continue the investigation.
            </p>
          </div>
        )}

        {/* Meta details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
          {/* Assigned Admin */}
          <div className="p-3 bg-[#18181b] rounded-xl border border-[#27272e]">
            <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-0.5">
              Assigned Administrator
            </span>
            <span className="text-white font-medium">
              {complaint.assigned_admin_name || 'Under Administrative Queue'}
            </span>
          </div>

          {/* Reported User / Party */}
          {complaint.subject_user_name ? (
            <div className="p-3 bg-[#18181b] rounded-xl border border-[#27272e]">
              <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-0.5">
                Reported Party
              </span>
              <span className="text-white font-medium block truncate">
                {complaint.subject_user_name}
              </span>
              {complaint.subject_user_role && (
                <span className="text-[10px] text-neutral-400 capitalize block">
                  {complaint.subject_user_role}
                </span>
              )}
            </div>
          ) : (
            <div className="p-3 bg-[#18181b] rounded-xl border border-[#27272e]">
              <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-0.5">
                Target Entity
              </span>
              <span className="text-neutral-400">General platform issue</span>
            </div>
          )}

          {/* Referenced Donation */}
          <div className="p-3 bg-[#18181b] rounded-xl border border-[#27272e]">
            <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-0.5">
              Referenced Donation
            </span>
            {complaint.donation_id ? (
              <Link
                to={`/donations/${complaint.donation_id}`}
                className="text-white font-medium hover:underline inline-flex items-center gap-1 truncate"
              >
                <span className="truncate">{complaint.donation_title || 'View Donation Record'}</span>
                <ExternalLink className="w-3 h-3 text-neutral-400 flex-shrink-0" />
              </Link>
            ) : (
              <span className="text-neutral-500">None attached</span>
            )}
          </div>

          {/* Delivery Mission */}
          <div className="p-3 bg-[#18181b] rounded-xl border border-[#27272e]">
            <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-0.5">
              Delivery Mission
            </span>
            {complaint.delivery_id ? (
              <div className="space-y-1">
                {user?.role === 'volunteer' ? (
                  <Link
                    to="/deliveries"
                    className="text-white font-mono text-[11px] hover:underline inline-flex items-center gap-1"
                  >
                    <span>{complaint.delivery_id.slice(0, 14)}...</span>
                    <ExternalLink className="w-3 h-3 text-neutral-400" />
                  </Link>
                ) : (
                  <span className="text-white font-mono text-[11px] truncate block">
                    {complaint.delivery_id.slice(0, 14)}...
                  </span>
                )}
                {complaint.delivery_status && (
                  <span className="inline-block text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {complaint.delivery_status.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-neutral-500">None attached</span>
            )}
          </div>
        </div>

        {/* Supporting evidence */}
        {complaint.supporting_evidence_url && (
          <div className="p-3 bg-[#18181b] rounded-xl border border-[#27272e] text-xs flex items-center justify-between">
            <span className="text-neutral-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-neutral-500" /> Supporting Evidence URL:
            </span>
            <a
              href={complaint.supporting_evidence_url}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:underline inline-flex items-center gap-1 font-medium"
            >
              Open External Attachment <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* Communication Thread Section (Chat) */}
      <div className="bg-[#121214] border border-[#232328] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#232328] pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Investigation & Communication Thread
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1c1c20] transition-colors cursor-pointer"
              title="Refresh messages"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Messages List Feed */}
        <div className="space-y-3 min-h-[160px] max-h-[460px] overflow-y-auto p-2">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-xs space-y-1">
              <MessageSquare className="w-8 h-8 text-neutral-600 mx-auto stroke-1 mb-2" />
              <p className="font-semibold text-neutral-400">No replies yet</p>
              <p className="text-[11px] text-neutral-500">
                Messages from the administrator will appear here. Use the reply box below to send additional evidence or remarks.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isAdmin = m.sender_role === 'admin';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.is_me ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 mb-1 px-1">
                    <span className="font-semibold text-neutral-300">
                      {m.is_me ? 'You' : m.sender_name}
                    </span>
                    {isAdmin && (
                      <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded font-bold uppercase text-[9px] border border-emerald-500/20">
                        Admin Team
                      </span>
                    )}
                    <span>• {formatMessageTime(m.created_at)}</span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                      m.is_me
                        ? 'bg-white text-black font-medium'
                        : isAdmin
                        ? 'bg-[#18181b] border border-[#27272e] text-white shadow-sm'
                        : 'bg-[#18181b] text-neutral-200'
                    }`}
                  >
                    {m.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Box */}
        {['resolved', 'closed', 'rejected'].includes(complaint.status) ? (
          <div className="p-3 bg-[#0c0c0e] rounded-xl border border-[#232328] text-center text-xs text-neutral-500">
            This ticket is {complaint.status}. To continue discussion, please dispute or reopen the complaint above.
          </div>
        ) : (
          <form onSubmit={handleSendReply} className="pt-2 border-t border-[#232328] space-y-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your response to the administrators... (Press Enter to send, Shift+Enter for new line)"
              rows={3}
              maxLength={2000}
              className="input text-xs w-full bg-[#18181b] border-[#27272e] text-white leading-relaxed resize-none"
            />
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[10px] text-neutral-500">
                {complaint.status === 'awaiting_user_response'
                  ? '💡 Sending a reply will automatically move ticket to "Under Review".'
                  : 'Replies automatically inform the assigned administrator.'}
              </span>
              <button
                type="submit"
                disabled={sendingReply || !replyText.trim()}
                className="btn btn-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                {sendingReply ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Send Reply
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Action History / Step Timeline */}
      {history.length > 0 && (
        <div className="bg-[#121214] border border-[#232328] rounded-2xl p-6 shadow-xl space-y-3">
          <div className="border-b border-[#232328] pb-3">
            <h3 className="text-sm font-bold text-white tracking-tight">
              Action Timeline & Resolution Audit
            </h3>
          </div>

          <div className="space-y-3 pt-1">
            {history.map((h, i) => (
              <div key={h.id || i} className="flex items-start gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white capitalize">
                      {h.action_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      {new Date(h.created_at).toLocaleDateString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  {h.reason && (
                    <p className="text-neutral-400 text-[11px] mt-0.5">{h.reason}</p>
                  )}
                </div>
              </div>
            ))}
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
                Dispute or Reopen Complaint
              </h3>
              <button
                onClick={() => setShowReopenModal(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              If the resolution outcome did not address the issue or if fresh incidents occurred from the same batch, document your reasons below to reopen investigation.
            </p>

            <form onSubmit={handleReopen} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
                  Reason for Reopening *
                </label>
                <textarea
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  rows={4}
                  required
                  placeholder="Explain why the current resolution or closure is disputed..."
                  className="input text-xs w-full bg-[#18181b] border-[#27272e] text-white leading-relaxed resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#232328]">
                <button
                  type="button"
                  onClick={() => setShowReopenModal(false)}
                  className="btn btn-secondary text-xs py-1.5 px-3 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReopen || !reopenReason.trim()}
                  className="btn btn-primary text-xs py-1.5 px-4 font-bold cursor-pointer"
                >
                  {submittingReopen ? 'Reopening...' : 'Confirm Reopen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
