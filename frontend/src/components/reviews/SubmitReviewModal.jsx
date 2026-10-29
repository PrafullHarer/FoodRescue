import { useState, useEffect } from 'react';
import StarRating from './StarRating';
import { Star, X, Check, Sparkles, MessageSquare, ShieldCheck, HeartHandshake, User, Truck, Store } from 'lucide-react';
import api from '../../api/client';
import toast from 'react-hot-toast';

const RATING_DESCRIPTIONS = {
  1: 'Poor — Unsatisfactory handover or quality issues',
  2: 'Fair — Acceptable but needs noticeable improvement',
  3: 'Good — Standard service and acceptable food condition',
  4: 'Very Good — Fresh food and prompt, smooth coordination',
  5: 'Exceptional! — Flawless handover, highly recommended partner',
};

const DEFAULT_TAGS_BY_ROLE = {
  provider: [
    'Fresh Food',
    'Hygienic Packaging',
    'Accurate Portions',
    'Prompt Handover',
    'Clear Instructions',
    'Polite Staff',
  ],
  volunteer: [
    'Prompt Pickup',
    'Careful Food Handling',
    'Great Communication',
    'On-Time Arrival',
    'Professional & Friendly',
    'Smooth QR Verification',
  ],
  ngo: [
    'Fast Reception',
    'Instant QR Verification',
    'Reliable Partner',
    'Helpful Staff',
    'Accessible Location',
    'Respectful Cooperation',
  ],
};

export default function SubmitReviewModal({
  isOpen,
  onClose,
  deliveryId = null,
  donationId,
  claimId = null,
  revieweeId,
  revieweeName = 'Community Partner',
  revieweeRole = 'provider',
  donationTitle = 'Food Donation',
  existingReview = null,
  onReviewSubmitted,
}) {
  const [rating, setRating] = useState(existingReview?.rating || 5);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [selectedTags, setSelectedTags] = useState(existingReview?.tags || ['Fresh Food', 'Hygienic Packaging']);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating || 5);
      setComment(existingReview.comment || '');
      setSelectedTags(existingReview.tags || []);
    } else {
      setRating(5);
      setComment('');
      const defaultRoleTags = DEFAULT_TAGS_BY_ROLE[revieweeRole] || DEFAULT_TAGS_BY_ROLE.provider;
      setSelectedTags(defaultRoleTags.slice(0, 2));
    }
  }, [existingReview, revieweeRole, isOpen]);

  if (!isOpen) return null;

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const availableTags = DEFAULT_TAGS_BY_ROLE[revieweeRole] || DEFAULT_TAGS_BY_ROLE.provider;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      toast.error('Please select a star rating between 1 and 5');
      return;
    }

    try {
      setSubmitting(true);

      if (existingReview?.id) {
        // Edit existing review
        const res = await api.patch(`/reviews/${existingReview.id}`, {
          rating,
          comment: comment.trim(),
          tags: selectedTags,
        });

        toast.success('Your review was updated successfully!');
        if (onReviewSubmitted) onReviewSubmitted(res.data?.data);
        onClose();
      } else {
        // Create new review
        const res = await api.post('/reviews', {
          delivery_id: deliveryId || null,
          donation_id: donationId,
          claim_id: claimId || null,
          reviewee_id: revieweeId,
          rating,
          comment: comment.trim(),
          tags: selectedTags,
          review_type: `${revieweeRole}_review`,
        });

        toast.success('Thank you! Your verified review has been submitted.');
        if (onReviewSubmitted) onReviewSubmitted(res.data?.data);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const roleIcon = {
    provider: Store,
    volunteer: Truck,
    ngo: HeartHandshake,
  }[revieweeRole] || User;

  const RoleIcon = roleIcon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl animate-slide-up flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)] text-[var(--color-background)] flex items-center justify-center shadow-md">
              <RoleIcon className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text)] tracking-tight">
                {existingReview ? 'Edit Your Review' : `Review ${revieweeName}`}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] truncate max-w-xs">
                Ref: {donationTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-background)] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Target Banner */}
          <div className="bg-[var(--color-background)] rounded-2xl p-3 border border-[var(--color-border)] flex items-center justify-between text-xs">
            <span className="text-[var(--color-text-muted)]">Verified Recipient:</span>
            <div className="flex items-center gap-1.5 font-bold text-[var(--color-text)]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>{revieweeName}</span>
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold">
                ({revieweeRole})
              </span>
            </div>
          </div>

          {/* Interactive Star Rating */}
          <div className="text-center space-y-2 py-2">
            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider block">
              Overall Rating
            </label>
            <div className="flex items-center justify-center py-1">
              <StarRating
                value={rating}
                onChange={(r) => setRating(r)}
                interactive
                size="xl"
              />
            </div>
            <p className="text-xs font-semibold text-[var(--color-accent)] h-5 transition-all">
              {RATING_DESCRIPTIONS[rating]}
            </p>
          </div>

          {/* Predefined Quick Feedback Tags */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--color-text-muted)] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Quick Positive Feedback Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--color-primary)] text-[var(--color-background)] font-bold shadow-xs'
                        : 'bg-[var(--color-background)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)] hover:border-[var(--color-accent)]'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Written Feedback Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-muted)]">
              <label className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Written Feedback (Optional)
              </label>
              <span className="text-[11px] font-mono">{comment.length} / 1000</span>
            </div>
            <textarea
              rows={3}
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={`Share constructive observations about packaging, promptness, or coordination with ${revieweeName}...`}
              className="w-full rounded-2xl bg-[var(--color-background)] border border-[var(--color-border)] p-3 text-xs sm:text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary text-xs flex items-center gap-2 py-2.5 px-6 shadow-md"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{existingReview ? 'Update Review' : 'Submit Review'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
