import { useEffect, useState } from 'react';
import api from '../../api/client';
import { Clock, FileText, Search } from 'lucide-react';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232328] pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Audit Logs & Security Trail</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Tamper-evident logs of administrative actions, verifications, and platform events.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 text-xs"
          />
        </div>
      </div>

      <div className="bg-[#121214] rounded-2xl border border-[#232328] overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-neutral-500">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
            Loading audit trail...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center text-neutral-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-neutral-600 stroke-1" />
            <p className="font-semibold text-white text-base">No audit logs found</p>
            <p className="text-xs text-neutral-400 mt-1">System events will appear here in chronological order.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#232328] font-mono text-xs">
            {filteredLogs.map((log, index) => (
              <div key={log.id || index} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-[#18181b] transition-colors">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 bg-[#1c1c20] text-neutral-200 border border-[#27272e] rounded font-semibold text-[10px]">
                    {log.action || 'SYSTEM_EVENT'}
                  </span>
                  <span className="text-white font-sans text-xs">
                    {log.details || log.description || `Action performed on entity ${log.entity_id || ''}`}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-neutral-400 text-[11px] self-end md:self-center font-sans">
                  <span>By: <strong className="text-neutral-200 font-semibold">{log.user_email || log.user_name || 'Admin'}</strong></span>
                  <span className="flex items-center gap-1 text-neutral-500">
                    <Clock className="w-3 h-3" />
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
