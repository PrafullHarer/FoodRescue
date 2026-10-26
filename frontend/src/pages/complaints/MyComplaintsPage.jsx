import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';
import {
  ShieldAlert, Plus, ChevronRight, Clock, Search as SearchIcon,
  CheckCircle2, AlertCircle, Loader2, X, Send
} from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { value: 'food_quality', label: 'Food Quality Issue' },
  { value: 'late_pickup', label: 'Late Pickup' },
  { value: 'missed_delivery', label: 'Missed Delivery' },
  { value: 'wrong_quantity', label: 'Wrong Quantity' },
  { value: 'communication', label: 'Communication Issue' },
  { value: 'platform_bug', label: 'Platform / Technical Bug' },
  { value: 'safety_concern', label: 'Safety Concern' },
  { value: 'other', label: 'Other' },
];

const STATUS_CONFIG = {
  open: { label: 'Open', class: 'badge-danger', icon: AlertCircle },
  investigating: { label: 'Investigating', class: 'badge-warning', icon: SearchIcon },
  resolved: { label: 'Resolved', class: 'badge-primary', icon: CheckCircle2 },
  dismissed: { label: 'Dismissed', class: 'badge-neutral', icon: X },
};

export default function MyComplaintsPage() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('');

  const [form, setForm] = useState({
    subject: '',
    category: '',
    description: '',
    donation_id: '',
  });

  useEffect(() => {
    fetchComplaints();
  }, [filter]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const params = { limit: 50 };
      if (filter) params.status = filter;
      const res = await api.get('/complaints', { params });
      setComplaints(res.data?.data?.complaints || []);
    } catch {
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim()) return toast.error('Title is required');
    if (!form.category) return toast.error('Category is required');
    if (!form.description.trim()) return toast.error('Description is required');
    if (form.subject.trim().length > 255) return toast.error('Title must be 255 characters or less');
    if (form.description.trim().length > 5000) return toast.error('Description must be 5000 characters or less');

    setSubmitting(true);
    try {
      await api.post('/complaints', {
        subject: form.subject.trim(),
        category: form.category,
        description: form.description.trim(),
        donation_id: form.donation_id.trim() || undefined,
      });
      toast.success('Complaint submitted successfully');
      setForm({ subject: '', category: '', description: '', donation_id: '' });
      setShowForm(false);
      fetchComplaints();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = complaints;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232328] pb-5 sm:pb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">My Complaints</h1>
          <p className="text-neutral-400 text-xs sm:text-sm mt-1">
            Submit and track your complaints. Our team will review and respond.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary text-xs sm:text-sm self-start w-full sm:w-auto justify-center"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Raise Complaint'}
        </button>
      </div>

      {/* New Complaint Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[#121214] rounded-2xl border border-[#232328] p-5 sm:p-6 space-y-4 animate-slide-up">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">New Complaint</h3>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-neutral-500 uppercase font-bold block mb-1.5">Title *</label>
              <input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="input-field text-sm"
                placeholder="Brief summary of the issue"
                maxLength={255}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-neutral-500 uppercase font-bold block mb-1.5">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="input-field text-sm"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-neutral-500 uppercase font-bold block mb-1.5">Related Donation ID</label>
                <input
                  value={form.donation_id}
                  onChange={(e) => setForm({ ...form, donation_id: e.target.value })}
                  className="input-field text-sm"
                  placeholder="Optional – paste donation ID"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-neutral-500 uppercase font-bold block mb-1.5">Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-field text-sm"
                rows={4}
                placeholder="Describe the issue in detail..."
                maxLength={5000}
              />
              <p className="text-[10px] text-neutral-500 mt-1 text-right">{form.description.length}/5000</p>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary text-xs sm:text-sm"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { value: '', label: 'All' },
          { value: 'open', label: 'Open' },
          { value: 'investigating', label: 'Investigating' },
          { value: 'resolved', label: 'Resolved' },
          { value: 'dismissed', label: 'Dismissed' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
              filter === tab.value
                ? 'bg-white text-black'
                : 'bg-[#18181b] text-neutral-400 hover:text-white border border-[#232328]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Complaints List */}
      <div className="bg-[#121214] rounded-2xl border border-[#232328] overflow-hidden divide-y divide-[#232328]">
        {loading ? (
          <div className="p-12 text-center text-neutral-500">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
            Loading complaints...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            <ShieldAlert className="w-10 h-10 mx-auto mb-3 text-neutral-600 stroke-1" />
            <p className="font-semibold text-white text-sm">No complaints found</p>
            <p className="text-xs text-neutral-400 mt-1">
              {filter ? 'Try a different filter.' : 'Click "Raise Complaint" to submit one.'}
            </p>
          </div>
        ) : (
          filtered.map((c) => {
            const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.open;
            const categoryLabel = CATEGORIES.find((cat) => cat.value === c.category)?.label || c.category || '—';

            return (
              <Link
                key={c.id}
                to={`/complaints/${c.id}`}
                className="block p-4 sm:p-5 hover:bg-[#18181b]/50 transition-colors group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`badge uppercase text-[9px] sm:text-[10px] font-bold ${statusCfg.class}`}>
                        {statusCfg.label}
                      </span>
                      <span className="badge badge-neutral uppercase text-[9px] font-bold">
                        {categoryLabel}
                      </span>
                    </div>
                    <p className="font-semibold text-sm text-white truncate">{c.subject}</p>
                    <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">{c.description}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-neutral-500">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Recent'}
                      </p>
                      {c.resolution_notes && (
                        <p className="text-[10px] text-emerald-400 font-medium">Has response</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
