import { Star } from 'lucide-react';

export default function RatingDistribution({
  distribution = {},
  percentages = {},
  total = 0,
  selectedRating = null,
  onSelectRating,
  className = '',
}) {
  const stars = [5, 4, 3, 2, 1];

  return (
    <div className={`space-y-2 text-xs ${className}`}>
      {stars.map((star) => {
        const count = distribution[star] || 0;
        const pct = percentages[star] || (total > 0 ? Math.round((count / total) * 100) : 0);
        const isSelected = selectedRating === star;

        return (
          <button
            type="button"
            key={star}
            onClick={() => onSelectRating && onSelectRating(isSelected ? null : star)}
            className={`w-full flex items-center gap-2.5 py-1 px-2 rounded-lg transition-colors cursor-pointer text-left ${
              isSelected
                ? 'bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 font-semibold'
                : 'hover:bg-[var(--color-surface)]/80 text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
            title={`Filter by ${star} Star reviews (${count})`}
          >
            {/* Star label */}
            <span className="flex items-center gap-1 w-10 font-medium text-[var(--color-text)] flex-shrink-0">
              <span>{star}</span>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            </span>

            {/* Progress bar container */}
            <div className="flex-1 h-2 rounded-full bg-[var(--color-border)] overflow-hidden relative">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Percentage & count */}
            <div className="w-14 text-right flex items-center justify-end gap-1.5 flex-shrink-0 font-mono text-[11px]">
              <span className="text-[var(--color-text-muted)]">{pct}%</span>
              <span className="text-[var(--color-text)] font-semibold">({count})</span>
            </div>
          </button>
        );
      })}

      {selectedRating && (
        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={() => onSelectRating(null)}
            className="text-[11px] text-[var(--color-accent)] hover:underline font-semibold"
          >
            Clear rating filter (showing only {selectedRating}★)
          </button>
        </div>
      )}
    </div>
  );
}
