import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';
import {
  ChevronLeft, Clock, CheckCircle2, AlertCircle, Search,
  X, MessageSquare, Calendar, Tag, FileText, Hash
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  open: { label: 'Open', class: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  investigating: { label: 'Investigating', class: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  resolved: { label: 'Resolved', class: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  dismissed: { label: 'Dismissed', class: 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20' },
};

const CATEGORIES = {
  food_quality: 'Food Quality Issue',
  late_pickup: 'Late Pickup',
  missed_delivery: 'Missed Delivery',
  wrong_quantity: 'Wrong Quantity',
  communication: 'Communication Issue',
  platform_bug: 'Platform / Technical Bug',
  safety_concern: 'Safety Concern',
  other: 'Other',
};

export default function ComplaintDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComplaint();
  }, [id]);

  const loadComplaint = async () => {
    try {
      const res = await api.get(`/complaints/${id}`);
      setComplaint(res.data?.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load complaint');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-neutral-600 stroke-1" />
        <p className="text-sm text-neutral-400">Complaint not found or access denied.</p>
        <Link to="/complaints" className="text-xs text-white underline mt-2 inline-block">
          ← Back to complaints
        </Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[complaint.status] || STATUS_CONFIG.open;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-3xl mx-auto pb-12">
      {/* Back Link */}
      <Link
        to="/complaints"
        className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Back to complaints
      </Link>

      {/* Header */}
      <div className="border-b border-[#232328] pb-5">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${statusCfg.class}`}>
            {statusCfg.label}
          </span>
          {complaint.category && (
            <span className="badge badge-neutral uppercase text-[9px] font-bold">
              {CATEGORIES[complaint.category] || complaint.category}
            </span>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          {complaint.subject}
        </h1>
      </div>

      {/* Meta Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#121214] rounded-2xl border border-[#232328] p-5 space-y-3.5">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Details</h3>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1c1c20] border border-[#27272e] flex items-center justify-center flex-shrink-0">
              <Hash className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-neutral-500 uppercase font-bold">Complaint ID</p>
              <p className="text-sm text-white font-mono truncate">{complaint.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1c1c20] border border-[#27272e] flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-neutral-500 uppercase font-bold">Submitted</p>
              <p className="text-sm text-white">
                {complaint.created_at
                  ? new Date(complaint.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
                  : 'Unknown'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1c1c20] border border-[#27272e] flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-neutral-500 uppercase font-bold">Last Updated</p>
              <p className="text-sm text-white">
                {complaint.updated_at
                  ? new Date(complaint.updated_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
                  : 'Unknown'}
              </p>
            </div>
          </div>

          {complaint.donation_id && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1c1c20] border border-[#27272e] flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-neutral-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-neutral-500 uppercase font-bold">Related Donation</p>
                <Link
                  to={`/donations/${complaint.donation_id}`}
                  className="text-sm text-white font-mono truncate hover:underline block"
                >
                  {complaint.donation_id}
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Status Card */}
        <div className="bg-[#121214] rounded-2xl border border-[#232328] p-5 space-y-3.5">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Status</h3>

          <div className="flex items-center gap-3 p-3 bg-[#0c0c0e] rounded-xl border border-[#232328]">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
              complaint.status === 'open' ? 'bg-red-400' :
              complaint.status === 'investigating' ? 'bg-amber-400' :
              complaint.status === 'resolved' ? 'bg-emerald-400' : 'bg-neutral-400'
            }`} />
            <div>
              <p className="text-sm font-semibold text-white capitalize">{complaint.status}</p>
              <p className="text-[10px] text-neutral-500">Current complaint status</p>
            </div>
          </div>

          {complaint.resolved_by_name && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1c1c20] border border-[#27272e] flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-neutral-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-neutral-500 uppercase font-bold">Handled By</p>
                <p className="text-sm text-white">{complaint.resolved_by_name}</p>
              </div>
            </div>
          )}

          {complaint.resolved_at && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1c1c20] border border-[#27272e] flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-neutral-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-neutral-500 uppercase font-bold">Resolved At</p>
                <p className="text-sm text-white">
                  {new Date(complaint.resolved_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="bg-[#121214] rounded-2xl border border-[#232328] p-5 sm:p-6">
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Description</h3>
        <div className="p-4 bg-[#0c0c0e] rounded-xl border border-[#232328] text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
          {complaint.description}
        </div>
      </div>

      {/* Admin Response */}
      {complaint.resolution_notes && (
        <div className="bg-[#121214] rounded-2xl border border-[#232328] p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Admin Response</h3>
          </div>
          <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20 text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
            {complaint.resolution_notes}
          </div>
        </div>
      )}
    </div>
  );
}
