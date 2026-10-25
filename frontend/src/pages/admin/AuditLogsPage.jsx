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
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232328] pb-5 sm:pb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Audit Logs & Security Trail</h1>
          <p className="text-neutral-400 text-xs sm:text-sm mt-1">
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
          <div className="p-12 sm:p-16 text-center text-neutral-500">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
            Loading audit trail...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 sm:p-16 text-center text-neutral-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-neutral-600 stroke-1" />
            <p className="font-semibold text-white text-base">No audit logs found</p>
            <p className="text-xs text-neutral-400 mt-1">Activity will appear here as administrative actions occur.</p>
          </div>
        ) : (
          <>
            {/* Mobile Card List (< md) */}
            <div className="divide-y divide-[#232328] md:hidden">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="badge badge-neutral font-mono text-[9px] uppercase font-bold">
                      {log.action}
                    </span>
                    <span className="text-[11px] text-neutral-500 flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {log.created_at ? new Date(log.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 font-medium">{log.user_email || log.user_name || 'System Auto'}</p>
                  <p className="text-xs text-neutral-400 leading-relaxed font-mono bg-[#0c0c0e] p-2.5 rounded-lg border border-[#232328]">
                    {log.details || 'No details'}
                  </p>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block table-responsive">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0c0c0e] text-neutral-400 uppercase text-[10px] font-semibold tracking-wider border-b border-[#232328]">
                    <th className="py-3.5 px-6">Timestamp</th>
                    <th className="py-3.5 px-6">Action</th>
                    <th className="py-3.5 px-6">User / Actor</th>
                    <th className="py-3.5 px-6">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#232328] text-sm">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#18181b] transition-colors">
                      <td className="py-4 px-6 text-xs text-neutral-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-neutral-500" />
                          {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="badge badge-neutral font-mono text-[10px] uppercase font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs font-semibold text-white">
                        {log.user_email || log.user_name || 'System'}
                      </td>
                      <td className="py-4 px-6 text-xs text-neutral-400 font-mono">
                        {log.details || 'No details'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
