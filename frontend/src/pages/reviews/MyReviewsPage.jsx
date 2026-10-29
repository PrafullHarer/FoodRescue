import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import RatingSummary from '../../components/reviews/RatingSummary';
import RatingDistribution from '../../components/reviews/RatingDistribution';
import ReviewList from '../../components/reviews/ReviewList';
import SubmitReviewModal from '../../components/reviews/SubmitReviewModal';
import { TrendingUp, RefreshCw, Send, Inbox } from 'lucide-react';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function MyReviewsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('received'); // 'received' | 'submitted'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('recent');
  const [ratingFilter, setRatingFilter] = useState(null);
  const [editingReview, setEditingReview] = useState(null);

  const fetchMyReviews = useCallback(async () => {
    if (user?.role === 'admin') return;
    try {
      setLoading(true);
      const params = { type: activeTab, page, limit: 10, sort };
      if (ratingFilter) params.rating = ratingFilter;

      const res = await api.get('/reviews/me', { params });
      setData(res.data?.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load your ratings & reviews.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, sort, ratingFilter, user?.role]);

  useEffect(() => {
    if (user?.role !== 'admin') {
      fetchMyReviews();
    }
  }, [fetchMyReviews, user?.role]);

  if (user?.role === 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const summary = data?.summary;
  const reliability = summary?.reliability;
  const reviews = data?.reviews || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text)] tracking-tight">
            Trust, Ratings & Reputation
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
            Track your verified community score, partner feedback, and transaction reliability.
          </p>
        </div>

        <button
          onClick={fetchMyReviews}
          className="btn btn-secondary text-xs flex items-center gap-2 self-start sm:self-auto py-2 px-3.5"
          title="Refresh Data"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Score & Distribution Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3">
          <RatingSummary
            averageRating={summary?.averageRating}
            totalReviews={summary?.totalReviews}
            ratingPercentages={summary?.ratingPercentages}
            className="h-full"
          />
        </div>

        <div className="lg:col-span-2 p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm flex flex-col justify-center">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
              Rating Breakdown
            </span>
            <span className="text-[11px] text-[var(--color-text-muted)]">Verified Stars</span>
          </div>
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

      {/* Reliability Statistics Banner */}
      {reliability && (
        <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[var(--color-accent)]" /> Performance & Reliability Stats
            </span>
            <span className="badge badge-success text-[10px]">Verified System Record</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {reliability.type === 'provider' && (
              <>
                <div className="p-3.5 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
                  <span className="text-[11px] text-[var(--color-text-muted)] block">Donations Posted</span>
                  <span className="text-xl font-black text-[var(--color-text)]">{reliability.totalDonations}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
                  <span className="text-[11px] text-[var(--color-text-muted)] block">Completed Rescues</span>
                  <span className="text-xl font-black text-emerald-500">{reliability.completedDonations}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
                  <span className="text-[11px] text-[var(--color-text-muted)] block">Success Rate</span>
                  <span className="text-xl font-black text-[var(--color-accent)]">
                    {reliability.successRate !== null ? `${reliability.successRate}%` : 'N/A'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
                  <span className="text-[11px] text-[var(--color-text-muted)] block">Cancelled / Expired</span>
                  <span className="text-xl font-black text-[var(--color-text)]">
                    {reliability.cancelledDonations} / {reliability.expiredDonations}
                  </span>
                </div>
              </>
            )}

            {reliability.type === 'volunteer' && (
              <>
                <div className="p-3.5 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
                  <span className="text-[11px] text-[var(--color-text-muted)] block">Total Missions</span>
                  <span className="text-xl font-black text-[var(--color-text)]">{reliability.totalDeliveries}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
                  <span className="text-[11px] text-[var(--color-text-muted)] block">Completed Dropoffs</span>
                  <span className="text-xl font-black text-emerald-500">{reliability.completedDeliveries}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
                  <span className="text-[11px] text-[var(--color-text-muted)] block">Delivery Success</span>
                  <span className="text-xl font-black text-[var(--color-accent)]">
                    {reliability.deliverySuccessRate !== null ? `${reliability.deliverySuccessRate}%` : 'N/A'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
                  <span className="text-[11px] text-[var(--color-text-muted)] block">On-Time Rate</span>
                  <span className="text-xl font-black text-[var(--color-accent)]">
                    {reliability.onTimeDeliveryRate !== null ? `${reliability.onTimeDeliveryRate}%` : 'Pending runs'}
                  </span>
                </div>
              </>
            )}

            {reliability.type === 'ngo' && (
              <>
                <div className="p-3.5 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
                  <span className="text-[11px] text-[var(--color-text-muted)] block">Total Claims</span>
                  <span className="text-xl font-black text-[var(--color-text)]">{reliability.totalClaims}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
                  <span className="text-[11px] text-[var(--color-text-muted)] block">Meals Distributed</span>
                  <span className="text-xl font-black text-emerald-500">{reliability.totalReceivedMeals}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
                  <span className="text-[11px] text-[var(--color-text-muted)] block">Community Trust</span>
                  <span className="text-xl font-black text-[var(--color-accent)]">Verified</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)]">
                  <span className="text-[11px] text-[var(--color-text-muted)] block">Completed Claims</span>
                  <span className="text-xl font-black text-[var(--color-text)]">{reliability.completedClaims}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tabs: Received vs Submitted */}
      <div className="border-b border-[var(--color-border)] flex items-center gap-6">
        <button
          type="button"
          onClick={() => {
            setActiveTab('received');
            setPage(1);
          }}
          className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'received'
              ? 'border-[var(--color-accent)] text-[var(--color-text)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Reviews Received</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('submitted');
            setPage(1);
          }}
          className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'submitted'
              ? 'border-[var(--color-accent)] text-[var(--color-text)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Reviews Submitted</span>
        </button>
      </div>

      {/* Reviews List */}
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
        canEdit={activeTab === 'submitted'}
        onEdit={(rev) => setEditingReview(rev)}
        emptyMessage={
          activeTab === 'received'
            ? 'No community reviews received yet. Partner ratings will show here when transactions complete.'
            : 'You have not submitted any reviews yet. Share feedback on completed donations and deliveries!'
        }
      />

      {/* Edit Review Modal */}
      {editingReview && (
        <SubmitReviewModal
          isOpen={!!editingReview}
          onClose={() => setEditingReview(null)}
          deliveryId={editingReview.delivery_id}
          donationId={editingReview.donation_id}
          revieweeId={editingReview.reviewee_id}
          revieweeName={editingReview.reviewee?.name || 'Partner'}
          revieweeRole={editingReview.reviewed_role || 'partner'}
          donationTitle={editingReview.transaction?.title || 'Food Donation'}
          existingReview={editingReview}
          onReviewSubmitted={() => {
            setEditingReview(null);
            fetchMyReviews();
          }}
        />
      )}
    </div>
  );
}
