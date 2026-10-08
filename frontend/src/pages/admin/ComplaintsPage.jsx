import { useEffect, useState } from 'react';
import api from '../../api/client';
import { ShieldAlert, CheckCircle2, Clock, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionText, setResolutionText] = useState('');

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/complaints');
      setComplaints(res.data.data || []);
    } catch (err) {
      console.error('Failed to load complaints', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleResolve = async (id) => {
    if (!resolutionText.trim()) {
      toast.error('Please provide a resolution note');
      return;
    }
    try {
      await api.post(`/admin/complaints/${id}/resolve`, { resolution_notes: resolutionText });
      toast.success('Complaint marked as resolved');
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: 'resolved', resolution_notes: resolutionText } : c));
      setResolvingId(null);
      setResolutionText('');
    } catch (err) {
      toast.error('Failed to resolve complaint');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-3">
          <ShieldAlert className="w-7 h-7 text-amber-500" />
          Complaints & Disputes
        </h1>
        <p className="text-surface-500 text-sm mt-1">
          Review community disputes regarding food quality, late pickups, or missed delivery handoffs.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden divide-y divide-surface-100">
        {loading ? (
          <div className="p-12 text-center text-surface-400">
            <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            Loading complaints queue...
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-12 text-center text-surface-400">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400 stroke-1" />
            <p className="font-medium text-surface-700">No unresolved complaints</p>
            <p className="text-sm text-surface-400 mt-1">Platform operations are running smoothly without active dispute tickets.</p>
          </div>
        ) : (
          complaints.map((c) => (
            <div key={c.id} className="p-6 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-surface-900 text-base">{c.subject || 'Dispute Ticket'}</span>
                    <span className={`badge uppercase text-[10px] font-bold ${
                      c.status === 'resolved' ? 'badge-success' : 'badge-danger'
                    }`}>
                      {c.status || 'open'}
                    </span>
                  </div>
                  <p className="text-xs text-surface-400 mt-0.5">
                    Reported by: <span className="font-medium text-surface-700">{c.reporter_name || c.user_email || 'User'}</span> •
                    Date: {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Recent'}
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-surface-50 rounded-xl text-surface-700 text-sm border border-surface-100">
                {c.description || c.message || 'No description provided'}
              </div>

              {c.status !== 'resolved' ? (
                resolvingId === c.id ? (
                  <div className="mt-3 p-4 bg-primary-50/50 rounded-xl border border-primary-100 space-y-3">
                    <textarea
                      placeholder="Write resolution notes (e.g. Warning issued to donor, verified spoilage refund)..."
                      value={resolutionText}
                      onChange={(e) => setResolutionText(e.target.value)}
                      className="input w-full text-sm bg-white"
                      rows={2}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setResolvingId(null); setResolutionText(''); }}
                        className="btn border border-surface-200 text-surface-600 text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleResolve(c.id)}
                        className="btn btn-primary text-xs"
                      >
                        Confirm Resolution
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setResolvingId(c.id)}
                    className="btn btn-secondary text-xs flex items-center gap-1.5 mt-2"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Resolve Complaint
                  </button>
                )
              ) : (
                c.resolution_notes && (
                  <div className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 mt-2">
                    <span className="font-semibold">Resolution:</span> {c.resolution_notes}
                  </div>
                )
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
