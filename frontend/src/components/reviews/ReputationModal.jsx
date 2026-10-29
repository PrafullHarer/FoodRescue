import { useState, useEffect, useCallback } from 'react';
import RatingSummary from './RatingSummary';
import RatingDistribution from './RatingDistribution';
import ReviewList from './ReviewList';
import {
  X, ShieldCheck, Store, HeartHandshake, Truck, User,
  TrendingUp, Sparkles, Calendar, RefreshCw
} from 'lucide-react';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function ReputationModal({ userId, isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('recent');
  const [ratingFilter, setRatingFilter] = useState(null);

  const fetchReputation = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const params = { page, limit: 8, sort };
      if (ratingFilter) params.rating = ratingFilter;

      const res = await api.get(`/reviews/users/${userId}`, { params });
      setData(res.data?.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load user reputation profile.');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [userId, page, sort, ratingFilter, onClose]);

  useEffect(() => {
    if (isOpen && userId) {
      fetchReputation();
    }
  }, [isOpen, userId, fetchReputation]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const profile = data?.profile;
  const summary = data?.summary;
  const reliability = summary?.reliability;
  const reviews = data?.reviews || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  const roleMeta = {
    provider: { label: 'Food Provider', icon: Store, color: 'text-lime-500' },
    ngo: { label: 'NGO / Shelter', icon: HeartHandshake, color: 'text-sky-500' },
    volunteer: { label: 'Volunteer Courier', icon: Truck, color: 'text-amber-500' },
    admin: { label: 'Platform Administrator', icon: ShieldCheck, color: 'text-purple-500' },
  }[profile?.role] || { label: 'Member', icon: User, color: 'text-neutral-400' };

  const RoleIcon = roleMeta.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl sm:rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl animate-slide-up flex flex-col">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-6 border-b border-[var(--color-border)] flex items-start justify-between gap-4 sticky top-0 bg-[var(--color-surface)]/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3.5">
            {/* Avatar */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--color-background)] border border-[var(--color-border)] flex items-center justify-center font-bold text-lg text-[var(--color-text)] flex-shrink-0 overflow-hidden shadow-xs">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
              ) : (
                <span>{(profile?.organization_name || profile?.full_name || 'U').charAt(0).toUpperCase()}</span>
              )}
            </div>

            {/* Identity & Badges */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text)] tracking-tight">
                  {profile?.organization_name || profile?.business_name || profile?.full_name}
                </h2>

                {profile?.is_verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                    Verified Partner
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1 text-xs text-[var(--color-text-muted)] flex-wrap">
                <span className="flex items-center gap-1 font-semibold text-[var(--color-text)]">
                  <RoleIcon className="w-3.5 h-3.5" />
                  {roleMeta.label}
                </span>

                {profile?.business_name && profile?.organization_name && (
                  <>
                    <span>•</span>
                    <span>{profile.full_name}</span>
                  </>
                )}

                {profile?.created_at && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Member since {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-background)] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto">
          {loading && !data ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-[var(--color-text-muted)]">Loading verified community reputation...</p>
            </div>
          ) : (
            <>
              {/* Reliability & Transaction Performance Metrics */}
              {reliability && (
                <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-background)] border border-[var(--color-border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                      Transaction Reliability Metrics
                    </span>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      Supported by database activity records
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {reliability.type === 'provider' && (
                      <>
                        <div className="stat-card p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                          <span className="text-[11px] text-[var(--color-text-muted)] block">Listings Posted</span>
                          <span className="text-lg font-black text-[var(--color-text)]">{reliability.totalDonations}</span>
                        </div>
                        <div className="stat-card p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                          <span className="text-[11px] text-[var(--color-text-muted)] block">Completed Rescues</span>
                          <span className="text-lg font-black text-emerald-500">{reliability.completedDonations}</span>
                        </div>
                        <div className="stat-card p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                          <span className="text-[11px] text-[var(--color-text-muted)] block">Success Rate</span>
                          <span className="text-lg font-black text-[var(--color-accent)]">
                            {reliability.successRate !== null ? `${reliability.successRate}%` : 'N/A'}
                          </span>
                        </div>
                        <div className="stat-card p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                          <span className="text-[11px] text-[var(--color-text-muted)] block">Cancelled / Expired</span>
                          <span className="text-lg font-black text-[var(--color-text)]">
                            {reliability.cancelledDonations} / {reliability.expiredDonations}
                          </span>
                        </div>
                      </>
                    )}

                    {reliability.type === 'volunteer' && (
                      <>
                        <div className="stat-card p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                          <span className="text-[11px] text-[var(--color-text-muted)] block">Completed Runs</span>
                          <span className="text-lg font-black text-emerald-500">{reliability.completedDeliveries}</span>
                        </div>
                        <div className="stat-card p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                          <span className="text-[11px] text-[var(--color-text-muted)] block">Success Rate</span>
                          <span className="text-lg font-black text-[var(--color-accent)]">
                            {reliability.deliverySuccessRate !== null ? `${reliability.deliverySuccessRate}%` : 'N/A'}
                          </span>
                        </div>
                        <div className="stat-card p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                          <span className="text-[11px] text-[var(--color-text-muted)] block">On-Time Rate</span>
                          <span className="text-lg font-black text-[var(--color-accent)]">
                            {reliability.onTimeDeliveryRate !== null ? `${reliability.onTimeDeliveryRate}%` : 'Pending runs'}
                          </span>
                        </div>
                        <div className="stat-card p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                          <span className="text-[11px] text-[var(--color-text-muted)] block">Vehicle / Transport</span>
                          <span className="text-xs font-bold text-[var(--color-text)] capitalize mt-1 block">
                            {profile.vehicle_type || 'Eco Courier'}
                          </span>
                        </div>
                      </>
                    )}

                    {reliability.type === 'ngo' && (
                      <>
                        <div className="stat-card p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                          <span className="text-[11px] text-[var(--color-text-muted)] block">Total Claims</span>
                          <span className="text-lg font-black text-[var(--color-text)]">{reliability.totalClaims}</span>
                        </div>
                        <div className="stat-card p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                          <span className="text-[11px] text-[var(--color-text-muted)] block">Meals Distributed</span>
                          <span className="text-lg font-black text-emerald-500">{reliability.totalReceivedMeals}</span>
                        </div>
                        <div className="stat-card p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                          <span className="text-[11px] text-[var(--color-text-muted)] block">Community Trust</span>
                          <span className="text-lg font-black text-[var(--color-accent)]">Verified</span>
                        </div>
                        <div className="stat-card p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                          <span className="text-[11px] text-[var(--color-text-muted)] block">Completed Claims</span>
                          <span className="text-lg font-black text-[var(--color-text)]">{reliability.completedClaims}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Rating Summary & Distribution Grid */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="md:col-span-3">
                  <RatingSummary
                    averageRating={summary?.averageRating}
                    totalReviews={summary?.totalReviews}
                    ratingPercentages={summary?.ratingPercentages}
                    className="h-full"
                  />
                </div>

                <div className="md:col-span-2 p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm flex flex-col justify-center">
                  <span className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider mb-2 block">
                    Rating Breakdown
                  </span>
                  <RatingDistribution
                    distribution={summary?.ratingDistribution}
                    percentages={summary?.ratingPercentages}
                    total={summary?.totalReviews}
                    selectedRating={ratingFilter}
                    onSelectRating={(r) => {
                      setRatingFilter(r);
                      setPage(1);
                    }}
                  />
                </div>
              </div>

              {/* Top Community Tags */}
              {summary?.topTags && summary.topTags.length > 0 && (
                <div className="p-4 rounded-2xl bg-[var(--color-background)] border border-[var(--color-border)] space-y-2">
                  <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Top Feedback Keywords
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {summary.topTags.map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] shadow-2xs"
                      >
                        <span className="font-semibold">{t.tag}</span>
                        <span className="text-[10px] text-[var(--color-text-muted)] font-mono">({t.count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Verified Reviews Section */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold text-[var(--color-text)] tracking-tight">
                    Verified Reviews & Feedback ({pagination.total})
                  </h3>
                  <button
                    onClick={fetchReputation}
                    className="p-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                    title="Refresh Reviews"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <ReviewList
                  reviews={reviews}
                  total={pagination.total}
                  page={page}
                  totalPages={pagination.totalPages}
                  onPageChange={(p) => setPage(p)}
                  sort={sort}
                  onSortChange={(s) => {
                    setSort(s);
                    setPage(1);
                  }}
                  ratingFilter={ratingFilter}
                  onRatingFilterChange={(r) => {
                    setRatingFilter(r);
                    setPage(1);
                  }}
                  loading={loading}
                  emptyMessage="No verified reviews recorded for this user yet."
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
