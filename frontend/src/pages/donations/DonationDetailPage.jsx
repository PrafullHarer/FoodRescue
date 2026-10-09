import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';
import {
  ArrowLeft, Package, Clock, MapPin, CheckCircle2,
  AlertTriangle, QrCode, Share2, Check, Phone, Mail,
  User, Truck, ShieldCheck, Star, Sparkles, ThumbsUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import ReviewModal from '../../components/common/ReviewModal';
import StaticRouteMap from '../../components/common/StaticRouteMap';

export default function DonationDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [donation, setDonation] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const fetchDonation = async () => {
    try {
      setLoading(true);
      const [res, qrRes] = await Promise.all([
        api.get(`/donations/${id}`),
        api.get(`/qr-codes/donation/${id}`).catch(() => ({ data: { data: null } })),
      ]);
      setDonation(res.data.data);
      setQrData(qrRes.data?.data || null);
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
    } catch {
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
  const isOwner = user?.id === donation.donor_id || user?.id === donation.provider_id || user?.id === donation.provider_user_id;
  const isNgo = user?.role === 'ngo';
  const isVolunteer = user?.role === 'volunteer';

  const hasVolunteer = Boolean(donation.volunteer_name || donation.volunteer_id);
  const reviews = donation.reviews || [];

  const steps = [
    { title: 'Listed', done: true },
    { title: 'Claimed', done: ['claimed', 'volunteer_assigned', 'collected', 'delivered', 'completed'].includes(donation.status) },
    { title: 'In Transit', done: ['collected', 'delivered', 'completed'].includes(donation.status) },
    { title: 'Delivered', done: ['delivered', 'completed'].includes(donation.status) },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
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
                {donation.category?.replace(/_/g, ' ') || 'Food Parcel'}
              </span>
              <span className={`badge uppercase text-[10px] font-bold ${
                donation.status === 'delivered' || donation.status === 'completed' ? 'badge-primary' :
                donation.status === 'claimed' ? 'badge-warning' : 'badge-neutral'
              }`}>
                {donation.status?.replace(/_/g, ' ')}
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

        {/* Location & Navigation Map */}
        {((donation.latitude && donation.longitude) || donation.pickup_address) && (
          <StaticRouteMap
            pickupLat={donation.latitude}
            pickupLng={donation.longitude}
            pickupAddress={donation.pickup_address || donation.address}
            title="Pickup & Navigation Map"
          />
        )}

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

            {/* Volunteer Actions */}
            {isVolunteer && !hasVolunteer && donation.status === 'claimed' && (
              <button
                onClick={async () => {
                  try {
                    setClaiming(true);
                    await api.post(`/volunteers/claim-mission/${id}`);
                    toast.success('Pickup mission claimed successfully! Show QR to donor on pickup.');
                    fetchDonation();
                  } catch (err) {
                    toast.error(err.response?.data?.message || 'Failed to claim pickup mission');
                  } finally {
                    setClaiming(false);
                  }
                }}
                disabled={claiming}
                className="btn btn-primary text-xs flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold shadow-lg shadow-amber-500/20"
              >
                {claiming ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <Truck className="w-4 h-4 text-black" />
                    Claim This Pickup Mission
                  </>
                )}
              </button>
            )}

            {isVolunteer && hasVolunteer && ['volunteer_assigned', 'accepted'].includes(donation.status) && (
              <Link
                to={`/qr-scan?code=${qrData?.pickup?.code || ''}`}
                className="btn btn-primary text-xs flex items-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                Scan Donor Pickup QR
              </Link>
            )}

            {isVolunteer && hasVolunteer && ['collected', 'in_transit'].includes(donation.status) && (
              <Link
                to="/deliveries"
                className="btn btn-primary text-xs flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
              >
                <QrCode className="w-4 h-4" />
                View Shelter Dropoff QR
              </Link>
            )}

            {isNgo && ['collected', 'volunteer_assigned'].includes(donation.status) && (
              <Link
                to={`/qr-scan?code=${qrData?.delivery?.code || ''}`}
                className="btn btn-primary text-xs flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
              >
                <ShieldCheck className="w-4 h-4" />
                Scan Dropoff QR & Confirm Receipt
              </Link>
            )}

            {isNgo && !isAvailable && (
              <button
                onClick={() => setShowReviewModal(true)}
                className="btn btn-secondary text-xs flex items-center gap-1.5"
              >
                <ThumbsUp className="w-3.5 h-3.5" /> Rate & Review
              </button>
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

      {/* QR Section: Food Provider Only Sees 1 Pickup QR Code */}
      {isOwner && qrData?.pickup && (
        <div className="bg-[#121214] rounded-[24px] border border-[#232328] p-6 sm:p-8 space-y-5 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#232328] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center flex-shrink-0">
                <QrCode className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Food Pickup Verification QR Code</h3>
                <p className="text-xs text-neutral-400">
                  {hasVolunteer
                    ? `Show this QR code to volunteer ${donation.volunteer_name || ''} when they arrive to inspect and collect the food.`
                    : 'A volunteer will scan this QR code upon arrival to verify food quality and begin delivery.'}
                </p>
              </div>
            </div>

            <span className={`badge uppercase text-[10px] font-bold ${
              qrData.pickup.is_scanned ? 'badge-primary' : 'badge-warning'
            }`}>
              {qrData.pickup.is_scanned ? '✓ Pickup Completed' : 'Awaiting Volunteer Scan'}
            </span>
          </div>

          <div className="max-w-md mx-auto p-6 bg-[#0c0c0e] rounded-2xl border border-[#232328] flex flex-col items-center text-center space-y-4 shadow-lg">
            {qrData.pickup.qr_image ? (
              <div className="p-4 bg-white rounded-2xl shadow-xl border border-neutral-300">
                <img
                  src={qrData.pickup.qr_image}
                  alt="Pickup Verification QR Code"
                  className="w-52 h-52 object-contain"
                />
              </div>
            ) : (
              <div className="w-48 h-48 bg-[#18181b] rounded-2xl flex items-center justify-center border border-[#282830]">
                <QrCode className="w-16 h-16 text-neutral-600" />
              </div>
            )}

            <div className="w-full">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">
                Alphanumeric Verification Token
              </span>
              <div className="p-2.5 bg-[#18181b] rounded-xl border border-[#282830] font-mono text-sm font-bold text-white tracking-widest">
                {qrData.pickup.code}
              </div>
            </div>

            <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">
              The assigned volunteer will scan this code to perform the quality checklist and begin the delivery run to the shelter.
            </p>
          </div>
        </div>
      )}

      {/* Volunteer View: Dropoff QR (Shown to Volunteer when food is in transit) */}
      {isVolunteer && ['collected', 'in_transit'].includes(donation.status) && qrData?.delivery && (
        <div className="bg-[#121214] rounded-[24px] border border-[#232328] p-6 sm:p-8 space-y-5 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#232328] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center flex-shrink-0">
                <QrCode className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Shelter Dropoff QR Code</h3>
                <p className="text-xs text-neutral-400">
                  Show this QR code to the NGO shelter upon arrival to verify delivery and complete the mission.
                </p>
              </div>
            </div>

            <span className={`badge uppercase text-[10px] font-bold ${
              qrData.delivery.is_scanned ? 'badge-primary' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            }`}>
              {qrData.delivery.is_scanned ? '✓ Delivery Completed' : 'Ready for Shelter Scan'}
            </span>
          </div>

          <div className="max-w-md mx-auto p-6 bg-[#0c0c0e] rounded-2xl border border-[#232328] flex flex-col items-center text-center space-y-4 shadow-lg">
            {qrData.delivery.qr_image && (
              <div className="p-4 bg-white rounded-2xl shadow-xl border border-neutral-300">
                <img
                  src={qrData.delivery.qr_image}
                  alt="Shelter Dropoff QR Code"
                  className="w-52 h-52 object-contain"
                />
              </div>
            )}

            <div className="w-full">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">
                Dropoff Verification Token
              </span>
              <div className="p-2.5 bg-[#18181b] rounded-xl border border-[#282830] font-mono text-sm font-bold text-white tracking-widest">
                {qrData.delivery.code}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2 Cards: Food Provider Details & Volunteer Pickup Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Food Provider Card */}
        <div className="bg-[#121214] rounded-[24px] border border-[#232328] p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#232328] pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-white" /> Food Provider Profile
            </h3>
            {donation.provider_is_verified && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" /> Verified Provider
              </span>
            )}
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <span className="text-neutral-500 uppercase text-[10px] font-bold block">Business / Organization</span>
              <p className="text-white font-bold text-sm mt-0.5">{donation.provider_name || 'Donor Provider'}</p>
            </div>

            {donation.provider_contact && (
              <div>
                <span className="text-neutral-500 uppercase text-[10px] font-bold block">Contact Person</span>
                <p className="text-neutral-300 font-medium">{donation.provider_contact}</p>
              </div>
            )}

            {donation.provider_phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                <a href={`tel:${donation.provider_phone}`} className="text-neutral-300 hover:text-white underline underline-offset-2">
                  {donation.provider_phone}
                </a>
              </div>
            )}

            {donation.provider_email && (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                <a href={`mailto:${donation.provider_email}`} className="text-neutral-300 hover:text-white truncate">
                  {donation.provider_email}
                </a>
              </div>
            )}

            {donation.provider_total_donations !== undefined && (
              <div className="flex items-center gap-2 text-neutral-400 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                <span>{donation.provider_total_donations} lifetime donations listed</span>
              </div>
            )}
          </div>
        </div>

        {/* Assigned Volunteer Card */}
        <div className="bg-[#121214] rounded-[24px] border border-[#232328] p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#232328] pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-white" /> Pickup Volunteer
            </h3>
            {hasVolunteer && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Assigned
              </span>
            )}
          </div>

          {hasVolunteer ? (
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-neutral-500 uppercase text-[10px] font-bold block">Volunteer Name</span>
                  <p className="text-white font-bold text-sm mt-0.5">{donation.volunteer_name || 'Assigned Volunteer'}</p>
                </div>
                {donation.volunteer_rating > 0 && (
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-1 rounded-lg border border-amber-400/20">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    {Number(donation.volunteer_rating).toFixed(1)}
                  </span>
                )}
              </div>

              {donation.volunteer_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                  <a href={`tel:${donation.volunteer_phone}`} className="text-neutral-300 hover:text-white underline underline-offset-2">
                    {donation.volunteer_phone}
                  </a>
                </div>
              )}

              {donation.volunteer_vehicle_type && (
                <div className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                  <span className="text-neutral-300">Vehicle: <strong className="text-white capitalize">{donation.volunteer_vehicle_type}</strong></span>
                </div>
              )}

              {donation.delivery_status && (
                <div className="pt-2">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">Live Delivery Status</span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#1a1a1f] border border-[#2a2a32] text-xs font-semibold text-white capitalize">
                    {donation.delivery_status.replace(/_/g, ' ')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center space-y-2">
              <Truck className="w-8 h-8 text-neutral-600 mx-auto stroke-1" />
              <p className="text-xs font-semibold text-white">No Volunteer Assigned</p>
              <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
                Once a volunteer accepts the pickup route, their vehicle, contact, and live status will appear here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="bg-[#121214] rounded-[24px] border border-[#232328] p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#232328] pb-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            <h3 className="text-base font-bold text-white tracking-tight">Claim Feedback & Reviews</h3>
            <span className="text-xs text-neutral-400">({reviews.length})</span>
          </div>

          {isNgo && (
            <button
              onClick={() => setShowReviewModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> Write Review
            </button>
          )}
        </div>

        {reviews.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <Star className="w-8 h-8 text-neutral-600 mx-auto stroke-1" />
            <p className="text-xs font-semibold text-white">No reviews yet for this listing</p>
            <p className="text-[11px] text-neutral-400">
              When an organization completes this claim, their ratings and reviews will be displayed here.
            </p>
          </div>
        ) : (
          <div className="space-y-4 divide-y divide-[#232328]">
            {reviews.map((rev) => (
              <div key={rev.id} className="pt-4 first:pt-0 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{rev.reviewer_name || 'NGO Reviewer'}</span>
                    <span className="text-[10px] text-neutral-500 uppercase px-1.5 py-0.2 rounded bg-[#1c1c20] border border-[#27272e]">
                      {rev.reviewer_role || 'NGO'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {rev.comment && (
                  <p className="text-xs text-neutral-300 leading-relaxed">{rev.comment}</p>
                )}

                {rev.tags && rev.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {rev.tags.map((t, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-[#18181c] border border-[#27272e] text-[10px] text-neutral-400 font-medium">
                        ✓ {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          donation={donation}
          onReviewSubmitted={() => fetchDonation()}
        />
      )}
    </div>
  );
}

