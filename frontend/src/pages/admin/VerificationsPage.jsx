import { useEffect, useState } from 'react';
import api from '../../api/client';
import { ShieldCheck, Check, X, Building, UserCheck, AlertCircle } from 'lucide-react';
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
      <div>
        <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-primary-500" />
          Pending Verifications
        </h1>
        <p className="text-surface-500 text-sm mt-1">
          Review documents and trust credentials for NGOs and corporate food donors before granting verified badge status.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-surface-400">
            <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            Loading verification queue...
          </div>
        ) : verifications.length === 0 ? (
          <div className="p-12 text-center text-surface-400">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-emerald-400 stroke-1" />
            <p className="font-medium text-surface-700">Verification Queue is Empty</p>
            <p className="text-sm text-surface-400 mt-1">All registered NGOs and providers have been reviewed.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {verifications.map((item) => (
              <div key={item.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-50/60 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                    {item.type === 'ngo' ? <Building className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-surface-900">{item.name || item.organization_name || item.full_name}</h3>
                      <span className="badge badge-warning uppercase text-[10px] font-bold">
                        {item.type || 'NGO'}
                      </span>
                    </div>
                    <p className="text-sm text-surface-500 mt-0.5">{item.email} • {item.phone || 'No phone provided'}</p>
                    <p className="text-xs text-surface-400 mt-1">
                      Registration / Tax ID: <span className="font-mono text-surface-600">{item.tax_id || item.reg_number || 'N/A'}</span>
                    </p>
                    {item.address && (
                      <p className="text-xs text-surface-400 mt-0.5">Address: {item.address}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => handleAction(item.type || 'ngo', item.id, 'reject')}
                    className="btn border border-red-200 text-red-600 hover:bg-red-50 text-sm flex items-center gap-1.5"
                  >
                    <X className="w-4 h-4" /> Reject
                  </button>
                  <button
                    onClick={() => handleAction(item.type || 'ngo', item.id, 'approve')}
                    className="btn btn-primary text-sm flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Approve & Verify
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
