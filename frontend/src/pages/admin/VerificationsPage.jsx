import { useEffect, useState } from 'react';
import api from '../../api/client';
import { ShieldCheck, Check, X, Building, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VerificationsPage() {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/pending-verifications');
      setVerifications(res.data.data || []);
    } catch (err) {
      console.error('Failed to load pending verifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  const handleAction = async (type, id, action) => {
    try {
      await api.post(`/admin/verify/${type}/${id}`, { action });
      toast.success(`Entity successfully ${action === 'approve' ? 'approved' : 'rejected'}`);
      setVerifications(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} entity`);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      <div className="border-b border-[#232328] pb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Pending Verifications</h1>
        <p className="text-neutral-400 text-sm mt-1">
          Review documents and trust credentials for NGOs and corporate food donors before granting verified status.
        </p>
      </div>

      <div className="bg-[#121214] rounded-2xl border border-[#232328] overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-neutral-500">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
            Loading verification queue...
          </div>
        ) : verifications.length === 0 ? (
          <div className="p-16 text-center text-neutral-500">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-neutral-600 stroke-1" />
            <p className="font-semibold text-white text-base">Verification Queue is Empty</p>
            <p className="text-xs text-neutral-400 mt-1">All registered NGOs and providers have been reviewed.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#232328]">
            {verifications.map((item) => (
              <div
                key={item.id}
                className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#18181b] transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-white text-black flex items-center justify-center flex-shrink-0">
                    {item.type === 'ngo' ? <Building className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{item.name || item.organization_name || item.full_name}</h3>
                      <span className="badge badge-neutral uppercase text-[10px] font-bold">
                        {item.type || 'NGO'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">{item.email} • {item.phone || 'No phone provided'}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Tax / Registration ID: <span className="font-mono text-neutral-300">{item.tax_id || item.reg_number || 'N/A'}</span>
                    </p>
                    {item.address && (
                      <p className="text-xs text-neutral-500 mt-0.5">Address: {item.address}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end md:self-center">
                  <button
                    onClick={() => handleAction(item.type || 'ngo', item.id, 'reject')}
                    className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                  <button
                    onClick={() => handleAction(item.type || 'ngo', item.id, 'approve')}
                    className="btn btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve & Verify
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
