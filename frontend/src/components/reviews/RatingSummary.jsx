import StarRating from './StarRating';
import { ShieldCheck, Award, HeartHandshake } from 'lucide-react';

export default function RatingSummary({
  averageRating = 0,
  totalReviews = 0,
  ratingPercentages = {},
  className = '',
}) {
  const avg = parseFloat(averageRating) || 0;
  const count = parseInt(totalReviews, 10) || 0;

  // Calculate percentage of 4-star and 5-star reviews (positive sentiment)
  const posPct = count > 0
    ? ((ratingPercentages[5] || 0) + (ratingPercentages[4] || 0))
    : 0;

  return (
    <div
      className={`p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm flex flex-col sm:flex-row items-center sm:items-stretch gap-6 ${className}`}
    >
      {/* Big Score Block */}
      <div className="flex flex-col items-center justify-center text-center sm:border-r border-[var(--color-border)] sm:pr-8 min-w-[140px]">
        <div className="text-4xl sm:text-5xl font-black text-[var(--color-text)] tracking-tight">
          {count > 0 ? avg.toFixed(1) : '—'}
        </div>
        <div className="my-1.5">
          <StarRating value={avg} size="md" />
        </div>
        <p className="text-xs text-[var(--color-text-muted)] font-medium">
          {count > 0 ? (
            <>
              Based on <strong className="text-[var(--color-text)]">{count}</strong> verified review{count === 1 ? '' : 's'}
            </>
          ) : (
            'No reviews yet'
          )}
        </p>
      </div>

      {/* Trust Highlights */}
      <div className="flex-1 flex flex-col justify-center space-y-2.5 text-xs">
        <div className="flex items-center gap-2.5 text-[var(--color-text)]">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <div>
            <span className="font-bold">100% Verified Community Feedback</span>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              Only organizations and couriers who successfully completed this specific donation/delivery can review.
            </p>
          </div>
        </div>

        {count > 0 && (
          <div className="flex items-center gap-2.5 text-[var(--color-text)]">
            <div className="w-6 h-6 rounded-lg bg-[var(--color-accent)]/15 text-[var(--color-accent)] flex items-center justify-center flex-shrink-0">
              <Award className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-bold">{posPct}% Positive Experience Score</span>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Rated 4 or 5 stars by receiving shelters and partner couriers.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
