import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useReputation } from '../../contexts/ReputationContext';
import api from '../../api/client';
import {
  User, Mail, Phone, MapPin, Building2, Calendar,
  Shield, Edit3, Check, X, Loader2, Briefcase, Truck, Hash,
  Star, Award, ExternalLink, AlertTriangle, Trash2, Lock, Eye, EyeOff,
  KeyRound, ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import UserRatingBadge from '../../components/reviews/UserRatingBadge';
import PasswordRequirements, { evaluatePassword } from '../../components/common/PasswordRequirements';
import ResetPasswordModal from '../../components/common/ResetPasswordModal';

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
  const { user, fetchUser, logout } = useAuth();
  const navigate = useNavigate();
  const { openReputation } = useReputation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '' });

  // Password management state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passForm, setPassForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmNewPass, setShowConfirmNewPass] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passForm.current_password) {
      toast.error('Please enter your current password.');
      return;
    }
    const { isValid, criteria } = evaluatePassword(passForm.new_password);
    if (!isValid) {
      const missing = criteria.filter((c) => !c.met).map((c) => c.label).join(', ');
      toast.error(`New password requirement not met: ${missing}`);
      return;
    }
    if (!passForm.confirm_password) {
      toast.error('Please confirm your new password.');
      return;
    }
    if (passForm.new_password !== passForm.confirm_password) {
      toast.error('New password and confirm password do not match.');
      return;
    }

    setChangingPass(true);
    try {
      await api.post('/auth/change-password', passForm);
      toast.success('Password updated successfully!');
      setPassForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setShowPasswordSection(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setChangingPass(false);
    }
  };

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    if (user?.role === 'admin' || profile?.role === 'admin') {
      toast.error('Super Administrator accounts cannot be deleted.');
      return;
    }

    const isGoogleAuth = profile?.auth_provider === 'google';

    if (!isGoogleAuth && !deletePassword) {
      toast.error('Please enter your password to confirm account deletion.');
      return;
    }

    if (isGoogleAuth && deleteConfirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm account deletion.');
      return;
    }

    setDeletingAccount(true);
    try {
      await api.delete(`/users/${user.id}`, {
        data: {
          password: deletePassword,
          confirmation: deleteConfirmation,
        },
      });
      toast.success('Your account has been permanently deleted.');
      setShowDeleteModal(false);
      await logout();
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete account');
    } finally {
      setDeletingAccount(false);
    }
  };

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
      <div className="bg-white dark:bg-[#121214] rounded-2xl border border-neutral-200 dark:border-[#232328] p-5 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-neutral-200 dark:border-[#232328]"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-neutral-100 dark:bg-[#1c1c20] border-2 border-neutral-200 dark:border-[#232328] flex items-center justify-center">
                <span className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">
                  {getInitials(profile.full_name)}
                </span>
              </div>
            )}
            <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white dark:border-[#121214] flex items-center justify-center">
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
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight truncate">
                {profile.full_name}
              </h2>
            )}
            {orgName && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
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
        <div className="bg-white dark:bg-[#121214] rounded-2xl border border-neutral-200 dark:border-[#232328] p-5 sm:p-6 space-y-4 shadow-sm">
          <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Contact</h3>

          <div className="space-y-3.5">
            {/* Email */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-[#1c1c20] border border-neutral-200 dark:border-[#27272e] flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-neutral-500 uppercase font-bold">Email</p>
                <p className="text-sm text-neutral-900 dark:text-white truncate">{profile.email}</p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-[#1c1c20] border border-neutral-200 dark:border-[#27272e] flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
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
                  <p className="text-sm text-neutral-900 dark:text-white truncate">
                    {profile.phone || <span className="text-neutral-400 dark:text-neutral-500 italic">Not provided</span>}
                  </p>
                )}
              </div>
            </div>

            {/* Address */}
            {address && (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-[#1c1c20] border border-neutral-200 dark:border-[#27272e] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold">Address</p>
                  <p className="text-sm text-neutral-900 dark:text-white">{address}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-white dark:bg-[#121214] rounded-2xl border border-neutral-200 dark:border-[#232328] p-5 sm:p-6 space-y-4 shadow-sm">
          <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Account</h3>

          <div className="space-y-3.5">
            {/* Status */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-[#1c1c20] border border-neutral-200 dark:border-[#27272e] flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-neutral-500 uppercase font-bold">Status</p>
                <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                  profile.status === 'active' ? 'text-emerald-500 dark:text-emerald-400' :
                  profile.status === 'suspended' ? 'text-amber-500 dark:text-amber-400' : 'text-red-500 dark:text-red-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    profile.status === 'active' ? 'bg-emerald-500' :
                    profile.status === 'suspended' ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                  {profile.status ? profile.status.charAt(0).toUpperCase() + profile.status.slice(1) : 'Unknown'}
                </span>
              </div>
            </div>

            {/* Member Since */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-[#1c1c20] border border-neutral-200 dark:border-[#27272e] flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-neutral-500 uppercase font-bold">Member Since</p>
                <p className="text-sm text-neutral-900 dark:text-white">
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
          </div>
        </div>
      </div>

      {/* Role-Specific Details */}
      {roleFields.length > 0 && (
        <div className="bg-white dark:bg-[#121214] rounded-2xl border border-neutral-200 dark:border-[#232328] p-5 sm:p-6 space-y-4 shadow-sm">
          <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            {profile.role === 'provider' ? 'Business Details' :
             profile.role === 'ngo' ? 'Organization Details' : 'Volunteer Details'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {roleFields.map((field, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-[#1c1c20] border border-neutral-200 dark:border-[#27272e] flex items-center justify-center flex-shrink-0">
                  <field.icon className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold">{field.label}</p>
                  <p className="text-sm text-neutral-900 dark:text-white truncate capitalize">{field.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trust, Ratings & Reliability Card (Hidden for Administrators) */}
      {user?.role !== 'admin' && (
        <div className="bg-white dark:bg-[#121214] rounded-2xl border border-neutral-200 dark:border-[#232328] p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-[#232328] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-500 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                <Star className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  Ratings & Trust Profile
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Verified community feedback and reliability metrics across completed rescues.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => openReputation(user?.id)}
                className="px-3.5 py-1.5 rounded-xl border border-neutral-200 dark:border-[#282830] bg-neutral-50 hover:bg-neutral-100 dark:bg-[#1a1a1e] dark:hover:bg-[#25252a] text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Preview Public Reputation
              </button>
              <Link
                to="/reviews"
                className="btn btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5"
              >
                <Award className="w-3.5 h-3.5" /> Full Reputation Hub
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-neutral-400">Current Rating Badge:</span>
            {user?.id && <UserRatingBadge userId={user.id} showCount={true} size="md" />}
          </div>
        </div>
      )}

      {/* Security & Password Management Card */}
      <div className="bg-white dark:bg-[#121214] rounded-2xl border border-neutral-200 dark:border-[#232328] p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-[#232328] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-[#1c1c20] border border-neutral-200 dark:border-[#27272e] flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                Security & Password
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Manage your credentials, change password, or recover your account via email OTP.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Forgot Password and Change Password are available for all regular users, but NOT Super Admin */}
            {user?.role !== 'admin' && profile?.role !== 'admin' ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="px-3.5 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Forgot Password?</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className="px-3.5 py-1.5 rounded-xl border border-neutral-200 dark:border-[#282830] bg-neutral-50 hover:bg-neutral-100 dark:bg-[#1a1a1e] dark:hover:bg-[#25252a] text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{showPasswordSection ? 'Hide Change Password' : 'Change Password'}</span>
                </button>
              </>
            ) : (
              <span className="text-[10px] font-semibold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
                Super Admin Protected
              </span>
            )}
          </div>
        </div>

        {/* Regular users: Forgot Password Banner & Change Password Form */}
        {user?.role !== 'admin' && profile?.role !== 'admin' ? (
          <div className="space-y-4">
            {/* Dedicated Forgot Password Notice & Action Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 rounded-xl bg-amber-500/[0.04] dark:bg-amber-500/[0.04] border border-amber-500/20">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    <KeyRound className="w-3 h-3" /> Account Recovery
                  </span>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Forgot Password?
                  </h4>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xl">
                  Don't remember your current password? Request a secure 6-digit recovery OTP code sent directly to <strong className="text-neutral-900 dark:text-white">{profile?.email || user?.email}</strong> to set a new password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer flex-shrink-0"
              >
                <KeyRound className="w-4 h-4 stroke-[2.5]" />
                <span>Forgot Password</span>
              </button>
            </div>

            {/* Change Password Form (Expandable) */}
            {showPasswordSection ? (
              <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                    Update Account Password
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs text-amber-500 hover:underline cursor-pointer"
                  >
                    Forgot current password?
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Current Password */}
                  <div>
                    <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                      Current Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type={showCurrentPass ? 'text' : 'password'}
                        value={passForm.current_password}
                        onChange={(e) => setPassForm({ ...passForm, current_password: e.target.value })}
                        placeholder="Current password"
                        required
                        className="w-full bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#232328] focus:border-neutral-900 dark:focus:border-white focus:outline-none rounded-xl px-4 py-2.5 pl-10 pr-10 text-sm text-neutral-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
                      >
                        {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        value={passForm.new_password}
                        onChange={(e) => setPassForm({ ...passForm, new_password: e.target.value })}
                        placeholder="New password"
                        required
                        className="w-full bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#232328] focus:border-neutral-900 dark:focus:border-white focus:outline-none rounded-xl px-4 py-2.5 pl-10 pr-10 text-sm text-neutral-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
                      >
                        {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type={showConfirmNewPass ? 'text' : 'password'}
                        value={passForm.confirm_password}
                        onChange={(e) => setPassForm({ ...passForm, confirm_password: e.target.value })}
                        placeholder="Confirm new password"
                        required
                        className="w-full bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#232328] focus:border-neutral-900 dark:focus:border-white focus:outline-none rounded-xl px-4 py-2.5 pl-10 pr-10 text-sm text-neutral-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmNewPass(!showConfirmNewPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
                      >
                        {showConfirmNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Requirements */}
                <PasswordRequirements
                  password={passForm.new_password}
                  confirmPassword={passForm.confirm_password}
                />

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={changingPass}
                    className="btn btn-primary text-xs py-2.5 px-5 flex items-center gap-2 cursor-pointer font-bold"
                  >
                    {changingPass ? (
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordSection(false);
                      setPassForm({ current_password: '', new_password: '', confirm_password: '' });
                    }}
                    className="btn-secondary text-xs py-2.5 px-4 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-between pt-1">
                <span>Account password status:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Securely Protected (Encrypted with bcrypt)
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
            Super Administrator account credentials cannot be recovered or reset via public email OTP codes for platform infrastructure security.
          </div>
        )}
      </div>

      {/* Danger Zone: Delete Account (Available for all regular users, but NOT Super Admin) */}
      {user?.role !== 'admin' && profile?.role !== 'admin' ? (
        <div className="bg-white dark:bg-[#121214] rounded-2xl border border-rose-500/30 p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-3 pb-3 border-b border-neutral-200 dark:border-[#232328]">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-500 uppercase tracking-wider">
                Danger Zone
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Irreversible and destructive actions regarding your FoodRescue account.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                Delete Account
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xl leading-relaxed">
                Permanently delete your profile, organization records, rescue credentials, and all associated personal data. Once deleted, this account cannot be recovered.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setDeletePassword('');
                setDeleteConfirmation('');
                setShowDeleteModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition-all cursor-pointer flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Account</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#121214] rounded-2xl border border-purple-500/30 p-5 sm:p-6 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <span className="font-bold text-neutral-900 dark:text-white block text-sm">
              Protected Super Administrator Account
            </span>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Account self-deletion and self-service password recovery are disabled for Super Administrator accounts for system infrastructure security.
            </p>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-[#121214] border border-neutral-200 dark:border-rose-500/30 rounded-2xl shadow-2xl p-6 space-y-5 animate-scale-up">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    Delete Account Permanently
                  </h3>
                  <p className="text-xs text-rose-500 font-semibold">
                    Warning: This action is permanent and cannot be undone
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Box */}
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2 text-xs text-rose-200">
              <p className="font-semibold text-rose-300">
                Are you absolutely sure you want to delete your account?
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-neutral-300">
                <li>Your profile, contact details, and organization listing will be erased.</li>
                <li>You will immediately lose access to all active rescue workflows.</li>
                <li>Active in-progress food donations or deliveries must be completed or cancelled first.</li>
              </ul>
            </div>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              {profile?.auth_provider !== 'google' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">
                    Enter your current password to confirm:
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type={showDeletePassword ? 'text' : 'password'}
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Current account password"
                      required
                      autoFocus
                      className="w-full bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#232328] focus:border-rose-500 focus:outline-none rounded-xl px-4 py-2.5 pl-10 pr-10 text-sm text-neutral-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeletePassword(!showDeletePassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
                    >
                      {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">
                    To confirm, please type <span className="font-mono font-bold text-rose-400">DELETE</span> below:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="Type DELETE"
                    required
                    autoFocus
                    className="w-full bg-neutral-50 dark:bg-[#0c0c0e] border border-neutral-200 dark:border-[#232328] focus:border-rose-500 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-neutral-900 dark:text-white font-mono"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={deletingAccount || (profile?.auth_provider !== 'google' ? !deletePassword : deleteConfirmation !== 'DELETE')}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-600/20 transition-all"
                >
                  {deletingAccount ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Permanently Delete My Account</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deletingAccount}
                  className="btn-secondary text-xs py-2.5 px-4 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
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

      {/* Reset / Forgot Password Modal */}
      <ResetPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialEmail={profile?.email || user?.email || ''}
      />
    </div>
  );
}
