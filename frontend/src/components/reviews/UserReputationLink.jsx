import { useReputation } from '../../contexts/ReputationContext';
import { ShieldCheck } from 'lucide-react';
import UserRatingBadge from './UserRatingBadge';

export default function UserReputationLink({
  userId,
  name = 'Community Member',
  role,
  isVerified = false,
  rating,
  reviewsCount,
  showBadge = false,
  showVerified = true,
  className = '',
}) {
  const { openReputation } = useReputation();

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (userId) {
      openReputation(userId);
    }
  };

  if (!userId || role === 'admin') {
    return (
      <span className={`inline-flex items-center gap-1 font-medium text-[var(--color-text)] ${className}`}>
        <span>{name}</span>
        {isVerified && showVerified && (
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" title="Verified Organization" />
        )}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`group inline-flex items-center gap-1.5 text-left font-medium text-[var(--color-text)] hover:text-[var(--color-accent)] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded-md ${className}`}
      title="Click to view trust & reputation profile"
    >
      <span className="font-semibold group-hover:underline underline-offset-2 tracking-tight">
        {name}
      </span>

      {isVerified && showVerified && (
        <span
          className="inline-flex items-center text-emerald-500 dark:text-emerald-400 flex-shrink-0"
          title="Verified Organization / Identity"
        >
          <ShieldCheck className="w-3.5 h-3.5 fill-emerald-500/10 stroke-[2.5]" />
        </span>
      )}

      {showBadge && rating !== undefined && (
        <UserRatingBadge rating={rating} reviewsCount={reviewsCount} size="xs" />
      )}
    </button>
  );
}
