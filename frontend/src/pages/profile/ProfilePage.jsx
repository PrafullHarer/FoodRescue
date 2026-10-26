import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';
import {
  User, Mail, Phone, MapPin, Building2, Calendar,
  Shield, Edit3, Check, X, Loader2, Briefcase, Truck, Hash
} from 'lucide-react';
import toast from 'react-hot-toast';

const roleLabel = {
  provider: 'Food Provider',
  ngo: 'NGO / Shelter',
  volunteer: 'Volunteer',
  admin: 'Administrator',
};

const roleBadgeClass = {
  provider: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  ngo: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  volunteer: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  admin: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
};

export default function ProfilePage() {
  const { user, fetchUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '' });

  useEffect(() => {
    if (user?.id) loadProfile();
  }, [user?.id]);

  const loadProfile = async () => {
    try {
      const { data } = await api.get(`/users/${user.id}`);
      setProfile(data.data);
      setForm({
        full_name: data.data.full_name || '',
        phone: data.data.phone || '',
      });
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/users/${user.id}`, {
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
      });
      toast.success('Profile updated');
      await fetchUser();
      await loadProfile();
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
    });
    setEditing(false);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getOrganizationName = () => {
    if (!profile?.profile) return null;
    return profile.profile.business_name || profile.profile.organization_name || null;
  };

  const getAddress = () => {
    if (!profile?.profile) return null;
    return profile.profile.address || null;
  };

  const getRoleSpecificFields = () => {
    const p = profile?.profile;
    if (!p) return [];
    const fields = [];

    if (profile.role === 'provider') {
      if (p.business_type) fields.push({ icon: Briefcase, label: 'Business Type', value: p.business_type });
      if (p.operating_hours) {
        const hours = typeof p.operating_hours === 'string' ? p.operating_hours : JSON.stringify(p.operating_hours);
        fields.push({ icon: Calendar, label: 'Operating Hours', value: hours });
      }
    } else if (profile.role === 'ngo') {
      if (p.registration_no) fields.push({ icon: Hash, label: 'Registration No.', value: p.registration_no });
      if (p.capacity) fields.push({ icon: User, label: 'Capacity', value: `${p.capacity} people` });
    } else if (profile.role === 'volunteer') {
      if (p.vehicle_type) fields.push({ icon: Truck, label: 'Vehicle Type', value: p.vehicle_type });
      if (p.max_distance_km) fields.push({ icon: MapPin, label: 'Max Distance', value: `${p.max_distance_km} km` });
    }

    return fields;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-400 text-sm">Unable to load profile.</p>
      </div>
    );
  }

  const orgName = getOrganizationName();
  const address = getAddress();
  const roleFields = getRoleSpecificFields();

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232328] pb-5 sm:pb-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">
            My Profile
          </h1>
          <p className="text-neutral-400 text-xs sm:text-sm mt-1">
            View and manage your account information.
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="btn btn-secondary text-xs sm:text-sm self-start w-full sm:w-auto justify-center"
          >
            <Edit3 className="w-4 h-4" /> Edit Profile
          </button>
        )}
      </div>

      {/* Avatar + Identity Card */}
      <div className="bg-[#121214] rounded-2xl border border-[#232328] p-5 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-[#232328]"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#1c1c20] border-2 border-[#232328] flex items-center justify-center">
                <span className="text-xl sm:text-2xl font-bold text-white">
                  {getInitials(profile.full_name)}
                </span>
              </div>
            )}
            <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#121214] flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          </div>

          {/* Name + Role */}
          <div className="text-center sm:text-left flex-1 min-w-0">
            {editing ? (
              <input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="input-field text-lg sm:text-xl font-bold mb-2 w-full"
                placeholder="Full Name"
                autoFocus
              />
            ) : (
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
                {profile.full_name}
              </h2>
            )}
            {orgName && (
              <p className="text-sm text-neutral-400 mt-0.5 truncate">
                <Building2 className="w-3.5 h-3.5 inline-block mr-1.5 relative -top-px" />
                {orgName}
              </p>
            )}
            <span className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${roleBadgeClass[profile.role] || 'badge-neutral'}`}>
              <Shield className="w-3 h-3" />
              {roleLabel[profile.role] || profile.role}
            </span>
          </div>
        </div>
      </div>

      {/* Contact & Account Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contact Info */}
        <div className="bg-[#121214] rounded-2xl border border-[#232328] p-5 sm:p-6 space-y-4">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Contact</h3>

          <div className="space-y-3.5">
            {/* Email */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1c1c20] border border-[#27272e] flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-neutral-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-neutral-500 uppercase font-bold">Email</p>
                <p className="text-sm text-white truncate">{profile.email}</p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1c1c20] border border-[#27272e] flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 text-neutral-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-neutral-500 uppercase font-bold">Phone</p>
                {editing ? (
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="input-field text-sm py-1.5 mt-0.5"
                    placeholder="Phone number"
                  />
                ) : (
                  <p className="text-sm text-white truncate">
                    {profile.phone || <span className="text-neutral-500 italic">Not provided</span>}
                  </p>
                )}
              </div>
            </div>

            {/* Address */}
            {address && (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#1c1c20] border border-[#27272e] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-neutral-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold">Address</p>
                  <p className="text-sm text-white">{address}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-[#121214] rounded-2xl border border-[#232328] p-5 sm:p-6 space-y-4">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Account</h3>

          <div className="space-y-3.5">
            {/* Status */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1c1c20] border border-[#27272e] flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-neutral-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-neutral-500 uppercase font-bold">Status</p>
                <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                  profile.status === 'active' ? 'text-emerald-400' :
                  profile.status === 'suspended' ? 'text-amber-400' : 'text-red-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    profile.status === 'active' ? 'bg-emerald-400' :
                    profile.status === 'suspended' ? 'bg-amber-400' : 'bg-red-400'
                  }`} />
                  {profile.status ? profile.status.charAt(0).toUpperCase() + profile.status.slice(1) : 'Unknown'}
                </span>
              </div>
            </div>

            {/* Member Since */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1c1c20] border border-[#27272e] flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-neutral-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-neutral-500 uppercase font-bold">Member Since</p>
                <p className="text-sm text-white">
                  {profile.created_at
                    ? new Date(profile.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Unknown'}
                </p>
              </div>
            </div>

            {/* User ID */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1c1c20] border border-[#27272e] flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-neutral-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-neutral-500 uppercase font-bold">User ID</p>
                <p className="text-sm text-white font-mono truncate">{profile.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role-Specific Details */}
      {roleFields.length > 0 && (
        <div className="bg-[#121214] rounded-2xl border border-[#232328] p-5 sm:p-6 space-y-4">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
            {profile.role === 'provider' ? 'Business Details' :
             profile.role === 'ngo' ? 'Organization Details' : 'Volunteer Details'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {roleFields.map((field, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#1c1c20] border border-[#27272e] flex items-center justify-center flex-shrink-0">
                  <field.icon className="w-4 h-4 text-neutral-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold">{field.label}</p>
                  <p className="text-sm text-white truncate capitalize">{field.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Actions */}
      {editing && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary text-sm flex-1 sm:flex-none justify-center"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="btn-secondary text-sm flex-1 sm:flex-none justify-center"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
        </div>
      )}
    </div>
  );
}
