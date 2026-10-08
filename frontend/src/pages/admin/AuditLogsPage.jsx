import { useEffect, useState } from 'react';
import api from '../../api/client';
import { Shield, Clock, FileText, Search } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/audit-logs');
      setLogs(res.data.data?.logs || res.data.data || []);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log =>
    (log.action || '').toLowerCase().includes(search.toLowerCase()) ||
    (log.user_email || log.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (log.details || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-3">
            <Shield className="w-7 h-7 text-primary-500" />
            Audit Logs & Security Trail
          </h1>
          <p className="text-surface-500 text-sm mt-1">
            Tamper-evident logs of administrative actions, verifications, and platform events.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-surface-400">
            <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            Loading audit trail...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-surface-400">
            <FileText className="w-12 h-12 mx-auto mb-3 text-surface-300 stroke-1" />
            <p className="font-medium text-surface-700">No audit logs found</p>
            <p className="text-sm text-surface-400 mt-1">System events will appear here in chronological order.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100 font-mono text-xs">
            {filteredLogs.map((log, index) => (
              <div key={log.id || index} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-surface-50/70 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 bg-surface-100 text-surface-700 rounded font-semibold text-[11px]">
                    {log.action || 'SYSTEM_EVENT'}
                  </span>
                  <span className="text-surface-800 font-sans text-sm">
                    {log.details || log.description || `Action performed on entity ${log.entity_id || ''}`}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-surface-400 text-[11px] self-end md:self-center">
                  <span>By: <strong className="text-surface-600">{log.user_email || log.user_name || 'Admin'}</strong></span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {log.created_at ? new Date(log.created_at).toLocaleString() : 'Just now'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
