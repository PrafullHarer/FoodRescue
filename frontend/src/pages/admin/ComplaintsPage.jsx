import { useEffect, useState } from 'react';
import api from '../../api/client';
import { ShieldAlert, CheckCircle2, MessageSquare, ShieldCheck } from 'lucide-react';
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
      <div className="border-b border-[#232328] pb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Complaints & Disputes</h1>
        <p className="text-neutral-400 text-sm mt-1">
          Review community disputes regarding food quality, late pickups, or missed delivery handoffs.
        </p>
      </div>

      <div className="bg-[#121214] rounded-2xl border border-[#232328] overflow-hidden divide-y divide-[#232328]">
        {loading ? (
          <div className="p-16 text-center text-neutral-500">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
            Loading complaints queue...
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-16 text-center text-neutral-500">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-neutral-600 stroke-1" />
            <p className="font-semibold text-white text-base">No unresolved complaints</p>
            <p className="text-xs text-neutral-400 mt-1">Platform operations are running smoothly without active dispute tickets.</p>
          </div>
        ) : (
          complaints.map((c) => (
            <div key={c.id} className="p-6 space-y-3 hover:bg-[#18181b]/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">{c.subject || 'Dispute Ticket'}</span>
                    <span className={`badge uppercase text-[10px] font-bold ${
                      c.status === 'resolved' ? 'badge-primary' : 'badge-danger'
                    }`}>
                      {c.status || 'open'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Reported by: <span className="font-medium text-white">{c.reporter_name || c.user_email || 'User'}</span> •
                    Date: {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Recent'}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-[#0c0c0e] rounded-xl text-neutral-300 text-xs border border-[#232328] leading-relaxed">
                {c.description || c.message || 'No description provided'}
              </div>

              {c.status !== 'resolved' ? (
                resolvingId === c.id ? (
                  <div className="mt-3 p-4 bg-[#0c0c0e] rounded-xl border border-[#232328] space-y-3">
                    <textarea
                      placeholder="Write resolution notes (e.g. Warning issued to donor, verified spoilage refund)..."
                      value={resolutionText}
                      onChange={(e) => setResolutionText(e.target.value)}
                      className="input w-full text-xs"
                      rows={2}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setResolvingId(null); setResolutionText(''); }}
                        className="btn btn-secondary text-xs py-1.5 px-3"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleResolve(c.id)}
                        className="btn btn-primary text-xs py-1.5 px-3"
                      >
                        Confirm Resolution
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setResolvingId(c.id)}
                    className="btn btn-secondary text-xs flex items-center gap-1.5 mt-2 py-2 px-3.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Resolve Complaint
                  </button>
                )
              ) : (
                c.resolution_notes && (
                  <div className="text-xs text-neutral-300 bg-[#151d16] p-3 rounded-xl border border-[#2b4c2d] mt-2">
                    <span className="font-semibold text-white">Resolution:</span> {c.resolution_notes}
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
