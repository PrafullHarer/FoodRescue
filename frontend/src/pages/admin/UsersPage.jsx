import { useEffect, useState } from 'react';
import api from '../../api/client';
import { Users, Search, Filter, Mail, Phone } from 'lucide-react';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232328] pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">User Management</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Directory of all registered donors, volunteers, NGOs, and platform admins.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#121214] p-4 rounded-2xl border border-[#232328]">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-neutral-500" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input py-2 text-xs"
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
      <div className="bg-[#121214] rounded-2xl border border-[#232328] overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-neutral-500">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
            Loading users directory...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center text-neutral-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-neutral-600 stroke-1" />
            <p className="font-semibold text-white text-base">No users found</p>
            <p className="text-xs text-neutral-400 mt-1">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0c0c0e] text-neutral-400 uppercase text-[10px] font-semibold tracking-wider border-b border-[#232328]">
                  <th className="py-3.5 px-6">User</th>
                  <th className="py-3.5 px-6">Role</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Joined</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232328] text-sm">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#18181b] transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white text-black font-bold flex items-center justify-center flex-shrink-0 text-xs">
                          {(u.full_name || u.email || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{u.full_name || 'Anonymous User'}</div>
                          <div className="text-xs text-neutral-400 flex items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-neutral-500" /> {u.email}</span>
                            {u.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-neutral-500" /> {u.phone}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="badge badge-neutral uppercase text-[10px] font-bold">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`badge uppercase text-[10px] font-bold ${
                        u.status === 'suspended' ? 'badge-danger' : 'badge-primary'
                      }`}>
                        {u.status || 'active'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-neutral-400 text-xs">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleStatusChange(u.id, u.status || 'active')}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                          u.status === 'suspended'
                            ? 'border-neutral-500 bg-white text-black hover:bg-neutral-200'
                            : 'border-[#3f3f46] text-neutral-300 hover:text-white hover:border-neutral-400'
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
