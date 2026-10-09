import { AlertTriangleIcon, Clock, ArrowRight, X } from "lucide-react"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

export function ExpiringFoodAlert({
  title = "Food Package Expiring Soon",
  description = "This surplus food package is nearing its expiry time. Claim or deliver now to ensure zero food waste.",
  timeLeft,
  actionLabel,
  onAction,
  onDismiss,
  className = "",
}) {
  return (
    <Alert className={`border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50 shadow-md ${className}`}>
      <AlertTriangleIcon className="text-amber-600 dark:text-amber-400" />
      <div className="flex-1 min-w-0 pr-6">
        <div className="flex items-center justify-between gap-2">
          <AlertTitle className="text-sm font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
            <span>{title}</span>
            {timeLeft && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-950 dark:bg-amber-900/80 dark:text-amber-200">
                <Clock className="w-3 h-3" />
                {timeLeft}
              </span>
            )}
          </AlertTitle>
          {onDismiss && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="absolute top-3 right-3 p-1 rounded-md text-amber-700/60 hover:text-amber-950 dark:text-amber-300/60 dark:hover:text-amber-100 hover:bg-amber-200/50 dark:hover:bg-amber-900/50 transition-colors"
              aria-label="Dismiss alert"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <AlertDescription className="text-xs text-amber-800 dark:text-amber-200 mt-1 leading-relaxed">
          {description}
        </AlertDescription>
        {onAction && actionLabel && (
          <div className="mt-2.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-900 text-amber-50 dark:bg-amber-100 dark:text-amber-950 hover:bg-amber-800 dark:hover:bg-amber-200 shadow-sm transition-all"
            >
              <span>{actionLabel}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </Alert>
  )
}

export default ExpiringFoodAlert;
