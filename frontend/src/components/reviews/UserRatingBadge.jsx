import { Star, ShieldCheck } from 'lucide-react';

export default function UserRatingBadge({
  rating = 0,
  reviewsCount = 0,
  size = 'sm',
  showCount = true,
  className = '',
}) {
  const numericRating = parseFloat(rating) || 0;
  const count = parseInt(reviewsCount, 10) || 0;

  if (count === 0 && numericRating === 0) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] ${className}`}
        title="No verified reviews yet"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
        New
      </span>
    );
  }

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1',
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-sm px-2.5 py-1 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 shadow-xs ${sizeClasses[size] || sizeClasses.sm} ${className}`}
      title={`${numericRating.toFixed(1)} out of 5 stars based on ${count} verified review${count === 1 ? '' : 's'}`}
    >
      <Star className="w-3 h-3 fill-amber-400 text-amber-400 -mt-0.5" />
      <span>{numericRating.toFixed(1)}</span>
      {showCount && (
        <span className="text-[10px] font-normal opacity-80 text-[var(--color-text-muted)]">
          ({count})
        </span>
      )}
    </span>
  );
}
