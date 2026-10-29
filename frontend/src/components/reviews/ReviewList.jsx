import ReviewCard from './ReviewCard';
import { ArrowUpDown, Star, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ReviewList({
  reviews = [],
  total = 0,
  page = 1,
  totalPages = 1,
  onPageChange,
  sort = 'recent',
  onSortChange,
  ratingFilter = null,
  onRatingFilterChange,
  loading = false,
  emptyMessage = 'No verified reviews found.',
  canEdit = false,
  onEdit,
  className = '',
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls Bar: Rating Filter Pills & Sort Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2">
        {/* Rating Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => onRatingFilterChange && onRatingFilterChange(null)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex-shrink-0 ${
              ratingFilter === null
                ? 'bg-[var(--color-primary)] text-[var(--color-background)] shadow-xs'
                : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            All Reviews ({total})
          </button>

          {[5, 4, 3, 2, 1].map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => onRatingFilterChange && onRatingFilterChange(ratingFilter === s ? null : s)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 flex-shrink-0 ${
                ratingFilter === s
                  ? 'bg-amber-400 text-black shadow-xs'
                  : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <span>{s}</span>
              <Star className="w-2.5 h-2.5 fill-current" />
            </button>
          ))}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
          <ArrowUpDown className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          <select
            value={sort}
            onChange={(e) => onSortChange && onSortChange(e.target.value)}
            className="input py-1 px-2.5 text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] cursor-pointer outline-none"
          >
            <option value="recent">Most Recent</option>
            <option value="highest">Highest Rating</option>
            <option value="lowest">Lowest Rating</option>
          </select>
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-border)]" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-32 bg-[var(--color-border)] rounded" />
                  <div className="h-2.5 w-24 bg-[var(--color-border)] rounded" />
                </div>
              </div>
              <div className="h-3 w-3/4 bg-[var(--color-border)] rounded" />
              <div className="h-3 w-1/2 bg-[var(--color-border)] rounded" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12 px-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2.5">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-background)] border border-[var(--color-border)] flex items-center justify-center mx-auto text-[var(--color-text-muted)]">
            <MessageSquare className="w-6 h-6 stroke-1" />
          </div>
          <p className="font-bold text-sm text-[var(--color-text)]">{emptyMessage}</p>
          <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto leading-relaxed">
            {ratingFilter
              ? `No ${ratingFilter}-star reviews matching current filters. Try selecting "All Reviews".`
              : 'As food handovers and dropoffs are completed, verified partner feedback will appear here.'}
          </p>
        </div>
      ) : (
        /* Review Cards */
        <div className="space-y-3">
          {reviews.map((rev) => (
            <ReviewCard
              key={rev.id}
              review={rev}
              canEdit={canEdit}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
          <span>
            Showing page <strong className="text-[var(--color-text)]">{page}</strong> of{' '}
            <strong className="text-[var(--color-text)]">{totalPages}</strong>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPageChange && onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onPageChange && onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
