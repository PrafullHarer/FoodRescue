import { useState } from 'react';
import StarRating from './StarRating';
import { ShieldCheck, Flag, Check, Sparkles, MessageSquare, Package, Tag, Clock } from 'lucide-react';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function ReviewCard({
  review,
  canEdit = false,
  onEdit,
  className = '',
}) {
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reported, setReported] = useState(review.moderation_status === 'flagged');

  const {
    rating = 5,
    comment = '',
    tags = [],
    created_at,
    reviewer = {},
    transaction = {},
    review_type,
  } = review;

  const roleLabels = {
    ngo: 'NGO / Shelter',
    provider: 'Food Provider',
    volunteer: 'Volunteer Courier',
    admin: 'Platform Admin',
  };

  const handleReport = async (e) => {
    e.preventDefault();
    if (!reportReason.trim()) {
      toast.error('Please specify the reason for reporting this review.');
      return;
    }

    try {
      setSubmittingReport(true);
      await api.post(`/reviews/${review.id}/report`, { reason: reportReason.trim() });
      toast.success('Thank you. Review has been submitted for moderation review.');
      setReported(true);
      setReporting(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to report review.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const formattedDate = created_at
    ? new Date(created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Recent';

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs transition-all hover:border-[var(--color-accent)]/50 ${className}`}
    >
      {/* Header: Reviewer info, verified badge, rating */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          {/* Avatar or initial */}
          <div className="w-10 h-10 rounded-full bg-[var(--color-background)] border border-[var(--color-border)] flex items-center justify-center font-bold text-sm text-[var(--color-text)] flex-shrink-0 overflow-hidden">
            {reviewer.avatar_url ? (
              <img src={reviewer.avatar_url} alt={reviewer.name} className="w-full h-full object-cover" />
            ) : (
              <span>{(reviewer.name || 'U').charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-sm text-[var(--color-text)] tracking-tight">
                {reviewer.organization_name || reviewer.name}
              </span>
              <span className="badge badge-neutral text-[10px] py-0.5">
                {roleLabels[reviewer.role] || reviewer.role || 'Member'}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--color-text-muted)]">
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                Verified Transaction
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[var(--color-text-muted)]" />
                {formattedDate}
              </span>
            </div>
          </div>
        </div>

        {/* Rating stars & Edit button if author */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <StarRating value={rating} size="sm" showValue />
          {canEdit && onEdit && (
            <button
              onClick={() => onEdit(review)}
              className="text-xs text-[var(--color-accent)] hover:underline ml-1 font-semibold"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Body: Written comment */}
      <div className="py-3 text-xs sm:text-sm text-[var(--color-text)] leading-relaxed">
        {comment ? (
          <p className="whitespace-pre-wrap">{comment}</p>
        ) : (
          <p className="italic text-[var(--color-text-muted)] text-xs">
            Rated {rating} out of 5 stars with positive handover verification.
          </p>
        )}
      </div>

      {/* Feedback tags */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-3">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text)]"
            >
              <Sparkles className="w-3 h-3 text-[var(--color-accent)]" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer: Related transaction & report button */}
      <div className="flex items-center justify-between pt-2.5 border-t border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)]">
        {transaction && transaction.title ? (
          <div className="flex items-center gap-1.5 truncate max-w-[80%]">
            <Package className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-accent)]" />
            <span className="truncate">
              Donation: <strong className="text-[var(--color-text)]">{transaction.title}</strong>
            </span>
          </div>
        ) : (
          <span className="text-[10px]">Verified FoodRescue Handoff</span>
        )}

        {/* Report action */}
        {!reported ? (
          <button
            type="button"
            onClick={() => setReporting(!reporting)}
            className="inline-flex items-center gap-1 hover:text-red-500 transition-colors p-1 rounded"
            title="Report inappropriate review"
          >
            <Flag className="w-3 h-3" />
            <span className="text-[10px]">Report</span>
          </button>
        ) : (
          <span className="text-[10px] text-amber-500 font-medium">Under Review</span>
        )}
      </div>

      {/* Inline report form */}
      {reporting && !reported && (
        <form onSubmit={handleReport} className="mt-3 p-3 rounded-xl bg-[var(--color-background)] border border-red-500/20 space-y-2 animate-fade-in">
          <p className="text-xs font-semibold text-red-500">Report this review</p>
          <textarea
            rows={2}
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Explain why this review violates community standards..."
            className="input text-xs w-full"
            required
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReporting(false)}
              className="btn btn-secondary text-xs py-1 px-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingReport}
              className="btn text-xs py-1 px-3 bg-red-600 text-white hover:bg-red-700"
            >
              {submittingReport ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
