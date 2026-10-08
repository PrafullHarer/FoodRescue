import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import {
  Package, Clock, MapPin, Phone, Mail, User, Truck, ShieldCheck,
  Star, MessageSquare, ChevronRight, CheckCircle2, AlertCircle,
  Sparkles, RefreshCw, ThumbsUp
} from 'lucide-react';
import ReviewModal from '../../components/common/ReviewModal';

export default function ClaimsPage() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'completed'
  const [selectedDonationForReview, setSelectedDonationForReview] = useState(null);
  const [myReviews, setMyReviews] = useState({});

  const loadClaimsAndReviews = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch claimed donations
      const [donationsRes, reviewsRes] = await Promise.all([
        api.get('/donations', { params: { limit: 100 } }),
        api.get('/reviews/my').catch(() => ({ data: { data: [] } })),
      ]);

      const allDonations = donationsRes.data.data?.donations || [];
      // Filter donations that are claimed, volunteer_assigned, collected, delivered, completed
      const claimedDonations = allDonations.filter(d =>
        ['claimed', 'volunteer_assigned', 'collected', 'delivered', 'completed'].includes(d.status) || d.claim_id
      );

      setClaims(claimedDonations);

      // Map my reviews by donation_id
      const reviewsMap = {};
      const userReviews = reviewsRes.data?.data || [];
      userReviews.forEach(r => {
        reviewsMap[r.donation_id] = r;
      });
      setMyReviews(reviewsMap);
    } catch (err) {
      console.error('Failed to load claims:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClaimsAndReviews();
  }, [loadClaimsAndReviews]);

  const handleReviewSubmitted = (newReview) => {
    if (newReview?.donation_id) {
      setMyReviews(prev => ({
        ...prev,
        [newReview.donation_id]: newReview,
      }));
    }
    loadClaimsAndReviews();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return { label: 'Delivered', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'collected':
        return { label: 'In Transit', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 'volunteer_assigned':
        return { label: 'Volunteer Assigned', class: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      case 'claimed':
      default:
        return { label: 'Claimed (Pending Pickup)', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    }
  };

  const filteredClaims = claims.filter(c => {
    if (filter === 'active') {
      return ['claimed', 'volunteer_assigned', 'collected'].includes(c.status);
    }
    if (filter === 'completed') {
      return ['delivered', 'completed'].includes(c.status);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232328] pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Reserved Food Claims</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Manage claimed supplies, view food provider and assigned volunteer pickup details, and submit reviews.
          </p>
        </div>

        <button
          onClick={loadClaimsAndReviews}
          className="p-2.5 rounded-xl border border-[#27272e] bg-[#141416] text-neutral-400 hover:text-white hover:border-[#383842] transition-colors self-start sm:self-auto flex items-center gap-2 text-xs"
          title="Refresh claims"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#232328] pb-3">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            filter === 'all'
              ? 'bg-white text-black shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-[#18181c]'
          }`}
        >
          All Claims ({claims.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            filter === 'active'
              ? 'bg-white text-black shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-[#18181c]'
          }`}
        >
          In Progress ({claims.filter(c => ['claimed', 'volunteer_assigned', 'collected'].includes(c.status)).length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            filter === 'completed'
              ? 'bg-white text-black shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-[#18181c]'
          }`}
        >
          Delivered ({claims.filter(c => ['delivered', 'completed'].includes(c.status)).length})
        </button>
      </div>

      {/* Claims List */}
      {filteredClaims.length === 0 ? (
        <div className="text-center py-20 bg-[#121214] border border-[#232328] rounded-3xl p-8">
          <Package className="w-12 h-12 mx-auto mb-3 text-neutral-600 stroke-1" />
          <p className="text-white font-semibold text-base">No claims found</p>
          <p className="text-xs text-neutral-400 mt-1">
            {filter !== 'all' ? 'No claims match this filter.' : 'Browse available donations to reserve surplus food for your shelter.'}
          </p>
          <Link to="/browse" className="btn btn-primary text-xs mt-4 inline-flex">
            Browse Available Donations
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClaims.map((d) => {
            const statusBadge = getStatusBadge(d.status);
            const review = myReviews[d.id];
            const hasVolunteer = Boolean(d.volunteer_name || d.volunteer_id);

            return (
              <div
                key={d.id}
                className="bg-[#121214] rounded-3xl border border-[#232328] overflow-hidden shadow-xl hover:border-[#383842] transition-all"
              >
                {/* Header Bar */}
                <div className="p-5 sm:p-6 border-b border-[#232328] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center flex-shrink-0 shadow-md">
                      <Package className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
                          {d.category?.replace(/_/g, ' ')}
                        </span>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${statusBadge.class}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-white tracking-tight mt-1">
                        {d.title}
                      </h2>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {d.quantity} {d.unit || 'servings'} {d.weight_kg ? `· ${d.weight_kg} kg` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2">
                    <div className="text-right text-xs text-neutral-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {d.created_at ? new Date(d.created_at).toLocaleDateString() : 'Recent'}
                    </div>
                    <Link
                      to={`/donations/${d.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-white/80 hover:text-white group"
                    >
                      View Full Listing
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>

                {/* Details Section: 2 Columns (Food Provider & Assigned Volunteer) */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#232328] bg-[#0d0d0f]">
                  {/* Column 1: Food Provider Details */}
                  <div className="p-5 sm:p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                          Food Provider
                        </span>
                        {d.provider_is_verified && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                            <ShieldCheck className="w-3 h-3" /> Verified
                          </span>
                        )}
                      </div>
                      {d.provider_business_type && (
                        <span className="text-[11px] text-neutral-500 font-medium capitalize">
                          {d.provider_business_type}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-bold text-white">
                        {d.provider_name || 'Donor Provider'}
                      </p>

                      {d.provider_contact && (
                        <div className="flex items-center gap-2 text-xs text-neutral-300">
                          <User className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                          <span>Contact: <strong className="text-white font-medium">{d.provider_contact}</strong></span>
                        </div>
                      )}

                      {d.provider_phone && (
                        <div className="flex items-center gap-2 text-xs text-neutral-300">
                          <Phone className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                          <a href={`tel:${d.provider_phone}`} className="hover:text-white underline underline-offset-2">
                            {d.provider_phone}
                          </a>
                        </div>
                      )}

                      {d.provider_email && (
                        <div className="flex items-center gap-2 text-xs text-neutral-300">
                          <Mail className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                          <a href={`mailto:${d.provider_email}`} className="hover:text-white truncate">
                            {d.provider_email}
                          </a>
                        </div>
                      )}

                      <div className="flex items-start gap-2 text-xs text-neutral-400 pt-1">
                        <MapPin className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0 mt-0.5" />
                        <span className="leading-relaxed">
                          {d.pickup_address || d.provider_address || 'Address on record'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Assigned Volunteer Pickup Details */}
                  <div className="p-5 sm:p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-white" /> Pickup Volunteer
                      </span>
                      {hasVolunteer && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Assigned
                        </span>
                      )}
                    </div>

                    {hasVolunteer ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-white">
                            {d.volunteer_name || 'Assigned Volunteer'}
                          </p>
                          {d.volunteer_rating > 0 && (
                            <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20">
                              <Star className="w-3 h-3 fill-amber-400" />
                              {Number(d.volunteer_rating).toFixed(1)}
                            </span>
                          )}
                        </div>

                        {d.volunteer_phone && (
                          <div className="flex items-center gap-2 text-xs text-neutral-300">
                            <Phone className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                            <a href={`tel:${d.volunteer_phone}`} className="hover:text-white underline underline-offset-2">
                              {d.volunteer_phone}
                            </a>
                          </div>
                        )}

                        {d.volunteer_vehicle_type && (
                          <div className="flex items-center gap-2 text-xs text-neutral-300">
                            <Truck className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                            <span>Vehicle: <strong className="text-white capitalize">{d.volunteer_vehicle_type}</strong></span>
                          </div>
                        )}

                        {d.volunteer_total_deliveries !== undefined && (
                          <div className="flex items-center gap-2 text-xs text-neutral-400">
                            <CheckCircle2 className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                            <span>{d.volunteer_total_deliveries} successful rescues completed</span>
                          </div>
                        )}

                        {d.delivery_status && (
                          <div className="pt-1">
                            <span className="text-[11px] text-neutral-400">
                              Current Delivery Stage:{' '}
                              <strong className="text-white uppercase text-[10px] tracking-wider px-1.5 py-0.5 bg-[#1f1f24] rounded border border-[#2a2a30]">
                                {d.delivery_status.replace('_', ' ')}
                              </strong>
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-4 text-center bg-[#121214] rounded-2xl border border-dashed border-[#27272e] p-4 space-y-1.5">
                        <AlertCircle className="w-6 h-6 mx-auto text-neutral-500 stroke-1" />
                        <p className="text-xs font-semibold text-white">No Volunteer Assigned Yet</p>
                        <p className="text-[11px] text-neutral-400">
                          A nearby volunteer will accept this delivery shortly, or your team can self-pickup.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Bar: Reviews & Action */}
                <div className="p-4 sm:p-5 bg-[#141416] border-t border-[#232328] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {review ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= review.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-neutral-600'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-white">
                        {review.rating}/5 Rated
                      </span>
                      {review.comment && (
                        <p className="text-xs text-neutral-400 italic truncate max-w-sm">
                          "{review.comment}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <Sparkles className="w-4 h-4 text-white" />
                      <span>Have you received this delivery? Share your feedback.</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
                    {['collected', 'volunteer_assigned'].includes(d.status) && (
                      <Link
                        to="/qr-scan"
                        className="btn btn-primary text-xs flex items-center gap-1.5 py-2 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/10"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Scan Dropoff QR
                      </Link>
                    )}

                    {review ? (
                      <button
                        onClick={() => setSelectedDonationForReview(d)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#1c1c20] hover:bg-[#25252b] border border-[#27272e] text-xs font-semibold text-neutral-300 hover:text-white transition-colors"
                      >
                        Edit Review
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedDonationForReview(d)}
                        className="btn btn-secondary text-xs flex items-center gap-1.5 py-2 px-4"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" /> Rate & Review
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {selectedDonationForReview && (
        <ReviewModal
          isOpen={Boolean(selectedDonationForReview)}
          onClose={() => setSelectedDonationForReview(null)}
          donation={selectedDonationForReview}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}
    </div>
  );
}
