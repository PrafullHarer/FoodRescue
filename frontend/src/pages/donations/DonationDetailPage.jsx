import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';
import {
  ArrowLeft, Package, Clock, MapPin, Calendar, CheckCircle2,
  AlertTriangle, Shield, User, Truck, QrCode, Share2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DonationDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [donation, setDonation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const fetchDonation = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/donations/${id}`);
      setDonation(res.data.data);
    } catch (err) {
      toast.error('Failed to load donation details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonation();
  }, [id]);

  const handleClaim = async () => {
    try {
      setClaiming(true);
      await api.post(`/donations/${id}/claim`);
      toast.success('Donation claimed successfully!');
      fetchDonation();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to claim donation');
    } finally {
      setClaiming(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this donation?')) return;
    try {
      await api.post(`/donations/${id}/cancel`);
      toast.success('Donation cancelled');
      navigate('/donations');
    } catch (err) {
      toast.error('Failed to cancel donation');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!donation) {
    return (
      <div className="max-w-xl mx-auto text-center py-12 space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-surface-900">Donation Not Found</h2>
        <p className="text-surface-500 text-sm">The donation you are looking for may have been removed or expired.</p>
        <Link to="/donations" className="btn btn-primary inline-flex">Back to Donations</Link>
      </div>
    );
  }

  const isAvailable = donation.status === 'available';
  const isOwner = user?.id === donation.donor_id || user?.id === donation.provider_id;
  const isNgo = user?.role === 'ngo';
  const isVolunteer = user?.role === 'volunteer';

  const steps = [
    { title: 'Listed', done: true, date: donation.created_at },
    { title: 'Claimed', done: ['claimed', 'assigned', 'in_transit', 'delivered', 'completed'].includes(donation.status) },
    { title: 'In Transit', done: ['in_transit', 'delivered', 'completed'].includes(donation.status) },
    { title: 'Delivered', done: ['delivered', 'completed'].includes(donation.status) },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Top navigation */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-surface-500 hover:text-surface-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Main Details Card */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="badge badge-primary capitalize">{donation.category || 'Prepared Food'}</span>
                <span className={`badge uppercase text-[10px] font-bold ${
                  donation.status === 'available' ? 'badge-success' :
                  donation.status === 'claimed' ? 'badge-warning' :
                  donation.status === 'delivered' ? 'badge-neutral' : 'badge-danger'
                }`}>
                  {donation.status}
                </span>
                {donation.dietary_flags && donation.dietary_flags.map((flag, i) => (
                  <span key={i} className="badge bg-surface-100 text-surface-600 text-[11px]">
                    {flag}
                  </span>
                ))}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-surface-900">{donation.title}</h1>
              <p className="text-surface-500 text-sm mt-1">{donation.description}</p>
            </div>

            <div className="flex sm:flex-col items-end gap-1 flex-shrink-0">
              <span className="text-2xl font-extrabold text-primary-600">
                {donation.quantity} <span className="text-base font-normal text-surface-500">{donation.unit || 'portions'}</span>
              </span>
              <span className="text-xs text-surface-400">Total Quantity</span>
            </div>
          </div>

          {/* Progress Timeline */}
          <div className="py-6 border-y border-surface-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-surface-400 mb-4">Rescue Lifecycle</h4>
            <div className="grid grid-cols-4 gap-2 text-center">
              {steps.map((step, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step.done
                        ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/20'
                        : 'bg-surface-100 text-surface-400'
                    }`}
                  >
                    {step.done ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className={`text-xs mt-2 font-medium ${step.done ? 'text-surface-900 font-semibold' : 'text-surface-400'}`}>
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Key details grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-surface-50 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-surface-500 text-xs font-semibold uppercase">
                <Clock className="w-4 h-4 text-primary-600" /> Expiry & Best Before
              </div>
              <p className="text-surface-800 font-medium text-sm">
                {donation.expires_at ? new Date(donation.expires_at).toLocaleString() : 'Consume within 6 hours'}
              </p>
            </div>

            <div className="p-4 bg-surface-50 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-surface-500 text-xs font-semibold uppercase">
                <MapPin className="w-4 h-4 text-primary-600" /> Pickup Location
              </div>
              <p className="text-surface-800 font-medium text-sm">
                {donation.pickup_address || donation.address || 'Address provided upon confirmation'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
            <div className="flex items-center gap-2">
              {isNgo && isAvailable && (
                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  {claiming ? 'Claiming...' : 'Claim This Donation'}
                </button>
              )}

              {isOwner && isAvailable && (
                <button
                  onClick={handleCancel}
                  className="btn border border-red-200 text-red-600 hover:bg-red-50 text-sm"
                >
                  Cancel Donation
                </button>
              )}

              {isVolunteer && (
                <Link
                  to="/qr-scan"
                  className="btn btn-secondary flex items-center gap-2 text-sm"
                >
                  <QrCode className="w-4 h-4 text-primary-600" />
                  Scan Handover QR
                </Link>
              )}
            </div>

            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                toast.success('Link copied to clipboard!');
              }}
              className="btn btn-secondary text-xs flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
