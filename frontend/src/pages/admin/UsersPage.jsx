import { useEffect, useState } from 'react';
import api from '../../api/client';
import { Users, Search, Filter, ShieldCheck, UserX, UserCheck, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data.data?.users || res.data.data || []);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleStatusChange = async (userId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.patch(`/users/${userId}/status`, { status: nextStatus });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: nextStatus } : u));
      toast.success(`User status changed to ${nextStatus}`);
    } catch (err) {
      toast.error('Failed to change user status');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
                          (u.email || '').toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-3">
            <Users className="w-7 h-7 text-primary-500" />
            User Management
          </h1>
          <p className="text-surface-500 text-sm mt-1">
            Directory of all registered donors, volunteers, NGOs, and platform admins.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-surface-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-surface-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input py-2 text-sm"
          >
            <option value="all">All Roles</option>
            <option value="provider">Food Providers</option>
            <option value="ngo">NGOs</option>
            <option value="volunteer">Volunteers</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-surface-400">
            <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            Loading users directory...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-surface-400">
            <Users className="w-12 h-12 mx-auto mb-3 text-surface-300 stroke-1" />
            <p className="font-medium text-surface-700">No users found</p>
            <p className="text-sm text-surface-400 mt-1">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-50 text-surface-500 uppercase text-[11px] font-semibold tracking-wider border-b border-surface-200">
                  <th className="py-3.5 px-6">User</th>
                  <th className="py-3.5 px-6">Role</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Joined</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 text-sm">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center flex-shrink-0">
                          {(u.full_name || u.email || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-surface-900">{u.full_name || 'Anonymous User'}</div>
                          <div className="text-xs text-surface-400 flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email}</span>
                            {u.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {u.phone}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`badge uppercase text-[10px] font-bold ${
                        u.role === 'admin' ? 'badge-danger' :
                        u.role === 'provider' ? 'badge-primary' :
                        u.role === 'ngo' ? 'badge-warning' : 'badge-neutral'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`badge text-xs ${
                        u.status === 'suspended' ? 'bg-red-50 text-red-700 border border-red-200' : 'badge-success'
                      }`}>
                        {u.status || 'active'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-surface-500 text-xs">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleStatusChange(u.id, u.status || 'active')}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                          u.status === 'suspended'
                            ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            : 'border-red-200 text-red-600 hover:bg-red-50'
                        }`}
                      >
                        {u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
