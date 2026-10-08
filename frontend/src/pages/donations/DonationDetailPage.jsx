import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';
import {
  ArrowLeft, Package, Clock, MapPin, CheckCircle2,
  AlertTriangle, QrCode, Share2, Check
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
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!donation) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-4 bg-[#121214] border border-[#232328] rounded-[24px] p-8">
        <AlertTriangle className="w-12 h-12 text-neutral-500 mx-auto stroke-1" />
        <h2 className="text-xl font-bold text-white">Donation Not Found</h2>
        <p className="text-neutral-400 text-xs">The listing you are looking for may have been removed or expired.</p>
        <Link to="/donations" className="btn btn-primary text-xs inline-flex">Back to Donations</Link>
      </div>
    );
  }

  const isAvailable = donation.status === 'posted' || donation.status === 'available';
  const isOwner = user?.id === donation.donor_id || user?.id === donation.provider_id;
  const isNgo = user?.role === 'ngo';
  const isVolunteer = user?.role === 'volunteer';

  const steps = [
    { title: 'Listed', done: true },
    { title: 'Claimed', done: ['claimed', 'volunteer_assigned', 'collected', 'delivered', 'completed'].includes(donation.status) },
    { title: 'In Transit', done: ['collected', 'delivered', 'completed'].includes(donation.status) },
    { title: 'Delivered', done: ['delivered', 'completed'].includes(donation.status) },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Top navigation */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1b1b1f] hover:bg-[#26262c] text-xs font-medium text-neutral-400 hover:text-white transition-all"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      {/* Main Details Card */}
      <div className="bg-[#121214] rounded-[24px] border border-[#232328] shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#232328] pb-6">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="badge badge-neutral uppercase text-[10px] font-bold">
                {donation.category?.replace('_', ' ') || 'Food Parcel'}
              </span>
              <span className={`badge uppercase text-[10px] font-bold ${
                donation.status === 'delivered' || donation.status === 'completed' ? 'badge-primary' :
                donation.status === 'claimed' ? 'badge-warning' : 'badge-neutral'
              }`}>
                {donation.status}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{donation.title}</h1>
            <p className="text-neutral-400 text-xs sm:text-sm mt-1 leading-relaxed">{donation.description}</p>
          </div>

          <div className="flex sm:flex-col items-end gap-1 flex-shrink-0 bg-[#18181b] border border-[#27272e] p-4 rounded-xl text-right">
            <span className="text-2xl font-black text-white">
              {donation.quantity} <span className="text-xs font-normal text-neutral-400">{donation.unit || 'portions'}</span>
            </span>
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Total Quantity</span>
          </div>
        </div>

        {/* Progress Timeline */}
        <div className="py-4 border-b border-[#232328]">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-4">Rescue Lifecycle</h4>
          <div className="grid grid-cols-4 gap-2 text-center">
            {steps.map((step, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                    step.done
                      ? 'bg-white text-black shadow-md shadow-white/5'
                      : 'bg-[#18181b] border border-[#27272e] text-neutral-500'
                  }`}
                >
                  {step.done ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                </div>
                <span className={`text-xs mt-2 font-medium ${step.done ? 'text-white' : 'text-neutral-500'}`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Key details grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-[#0c0c0e] rounded-xl border border-[#232328] space-y-1">
            <div className="flex items-center gap-2 text-neutral-400 text-[11px] font-semibold uppercase">
              <Clock className="w-3.5 h-3.5 text-white" /> Expiry & Best Before
            </div>
            <p className="text-white font-medium text-sm">
              {donation.expiry_time ? new Date(donation.expiry_time).toLocaleString() : 'Consume within 6 hours'}
            </p>
          </div>

          <div className="p-4 bg-[#0c0c0e] rounded-xl border border-[#232328] space-y-1">
            <div className="flex items-center gap-2 text-neutral-400 text-[11px] font-semibold uppercase">
              <MapPin className="w-3.5 h-3.5 text-white" /> Pickup Location
            </div>
            <p className="text-white font-medium text-sm">
              {donation.pickup_address || donation.address || 'Address provided upon confirmation'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2.5">
            {isNgo && isAvailable && (
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="btn btn-primary text-xs flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                {claiming ? 'Claiming...' : 'Claim This Donation'}
              </button>
            )}

            {isOwner && isAvailable && (
              <button
                onClick={handleCancel}
                className="btn border border-neutral-700 bg-transparent text-white hover:bg-neutral-800 text-xs"
              >
                Cancel Donation
              </button>
            )}

            {isVolunteer && (
              <Link
                to="/qr-scan"
                className="btn btn-secondary text-xs flex items-center gap-2"
              >
                <QrCode className="w-3.5 h-3.5 text-white" />
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
            <Share2 className="w-3.5 h-3.5" /> Share Listing
          </button>
        </div>
      </div>
    </div>
  );
}
