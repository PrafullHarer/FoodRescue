import { Link } from 'react-router-dom';
import logoImg from '../../assets/logo with bg.png.png';

/**
 * Universal FoodRescue Logo Component
 * Uses the official brand logo from frontend/src/assets/logo with bg.png.png
 */
export default function Logo({
  to = '/',
  size = 'md',
  showText = true,
  subtitle = null,
  className = '',
  imageClassName = '',
  asLink = true,
}) {
  const sizeMap = {
    xs: { img: 'w-6 h-6', text: 'text-xs', subtitle: 'text-[9px]' },
    sm: { img: 'w-8 h-8', text: 'text-sm', subtitle: 'text-[10px]' },
    md: { img: 'w-9 h-9 sm:w-10 sm:h-10', text: 'text-base sm:text-lg', subtitle: 'text-[11px]' },
    lg: { img: 'w-12 h-12', text: 'text-xl', subtitle: 'text-xs' },
    xl: { img: 'w-14 h-14 sm:w-16 sm:h-16', text: 'text-2xl', subtitle: 'text-xs' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const content = (
    <div className={`flex items-center gap-2.5 sm:gap-3 group select-none ${className}`}>
      <div className={`relative overflow-hidden rounded-xl border border-neutral-200 dark:border-[#232328] shadow-sm flex items-center justify-center bg-white dark:bg-[#121214] shrink-0 transition-transform duration-200 group-hover:scale-105 ${currentSize.img} ${imageClassName}`}>
        <img
          src={logoImg}
          alt="FoodRescue Logo"
          className="w-full h-full object-cover object-center"
          loading="eager"
        />
      </div>

      {showText && (
        <div className="min-w-0">
          <span className={`font-bold tracking-tight block leading-none text-neutral-900 dark:text-white transition-colors ${currentSize.text}`}>
            FoodRescue
          </span>
          {subtitle && (
            <span className={`text-neutral-500 dark:text-neutral-400 font-medium tracking-normal block leading-tight mt-0.5 truncate transition-colors ${currentSize.subtitle}`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (asLink && to) {
    return (
      <Link to={to} className="inline-flex items-center focus:outline-none focus:ring-2 focus:ring-emerald-500/30 rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
}
