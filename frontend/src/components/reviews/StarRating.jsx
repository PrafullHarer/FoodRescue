import { useState } from 'react';
import { Star } from 'lucide-react';

export default function StarRating({
  value = 0,
  onChange,
  interactive = false,
  size = 'md',
  showValue = false,
  className = '',
}) {
  const [hoverValue, setHoverValue] = useState(0);

  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-7 h-7 sm:w-8 sm:h-8',
  };

  const starSize = sizeClasses[size] || sizeClasses.md;
  const currentRating = interactive ? hoverValue || value : value;

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <div className="flex items-center gap-0.5" role={interactive ? 'radiogroup' : undefined}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= currentRating;
          const isHalf = !isFilled && star - 0.5 <= currentRating && !interactive;

          if (interactive) {
            return (
              <button
                type="button"
                key={star}
                onClick={() => onChange && onChange(star)}
                onMouseEnter={() => setHoverValue(star)}
                onMouseLeave={() => setHoverValue(0)}
                className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                aria-label={`${star} Star${star > 1 ? 's' : ''}`}
              >
                <Star
                  className={`${starSize} transition-colors ${
                    isFilled
                      ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]'
                      : 'text-neutral-500 hover:text-amber-300'
                  }`}
                />
              </button>
            );
          }

          return (
            <div key={star} className="relative inline-block">
              {isHalf ? (
                <div className="relative">
                  <Star className={`${starSize} text-neutral-600 dark:text-neutral-700`} />
                  <div className="absolute inset-0 overflow-hidden w-[50%]">
                    <Star className={`${starSize} fill-amber-400 text-amber-400`} />
                  </div>
                </div>
              ) : (
                <Star
                  className={`${starSize} ${
                    isFilled
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-neutral-400/40 dark:text-neutral-700'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {showValue && (
        <span className="font-bold text-xs text-[var(--color-text)] ml-1">
          {Number(value).toFixed(1)}
        </span>
      )}
    </div>
  );
}
