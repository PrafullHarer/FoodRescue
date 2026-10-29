import { useState, useEffect } from 'react';
import { Star, ShieldCheck, CheckCircle2, MessageSquare, ArrowRight, User } from 'lucide-react';
import api from '../../api/client';
import SubmitReviewModal from './SubmitReviewModal';

export default function ReviewEligibilityIndicator({
  deliveryId,
  onReviewSubmitted,
  className = '',
}) {
  const [loading, setLoading] = useState(true);
  const [eligibilityData, setEligibilityData] = useState(null);
  const [activeModalTarget, setActiveModalTarget] = useState(null);

  const fetchEligibility = async () => {
    if (!deliveryId) return;
    try {
      setLoading(true);
      const res = await api.get(`/reviews/eligibility/${deliveryId}`);
      setEligibilityData(res.data?.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEligibility();
  }, [deliveryId]);

  if (loading || !eligibilityData || !eligibilityData.eligible) return null;

  const targets = eligibilityData.targets || [];
  if (targets.length === 0) return null;

  return (
    <div className={`p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-accent)]/30 shadow-xs space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)]/15 text-[var(--color-accent)] flex items-center justify-center font-bold">
            <Star className="w-4 h-4 fill-current" />
          </div>
          <div>
            <span className="font-bold text-xs text-[var(--color-text)] block">
              Verified Transaction Feedback
            </span>
            <span className="text-[11px] text-[var(--color-text-muted)]">
              Help build community trust by reviewing your counterparties
            </span>
          </div>
        </div>

        <span className="badge badge-success text-[10px]">Handover Completed</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        {targets.map((target, idx) => (
          <div
            key={idx}
            className="p-3 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider block">
                {target.targetRole === 'provider' ? 'Food Provider' : target.targetRole === 'volunteer' ? 'Volunteer Courier' : 'NGO Shelter'}
              </span>
              <span className="font-bold text-xs text-[var(--color-text)] truncate block">
                {target.targetName}
              </span>
            </div>

            {target.alreadyReviewed ? (
              <button
                type="button"
                onClick={() => setActiveModalTarget(target)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer"
                title="Click to view or edit your review"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Reviewed ({target.existingReview?.rating}★)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveModalTarget(target)}
                className="btn btn-primary text-xs py-1 px-3 shadow-xs flex items-center gap-1 flex-shrink-0 cursor-pointer"
              >
                <Star className="w-3 h-3 fill-current" />
                <span>Leave Review</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {activeModalTarget && (
        <SubmitReviewModal
          isOpen={!!activeModalTarget}
          onClose={() => setActiveModalTarget(null)}
          deliveryId={deliveryId}
          donationId={eligibilityData.delivery?.donation_id}
          revieweeId={activeModalTarget.targetUserId}
          revieweeName={activeModalTarget.targetName}
          revieweeRole={activeModalTarget.targetRole}
          donationTitle={eligibilityData.delivery?.donation_title}
          existingReview={activeModalTarget.existingReview}
          onReviewSubmitted={(newRev) => {
            fetchEligibility();
            if (onReviewSubmitted) onReviewSubmitted(newRev);
          }}
        />
      )}
    </div>
  );
}
