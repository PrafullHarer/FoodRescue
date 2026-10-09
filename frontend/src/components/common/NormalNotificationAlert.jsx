import { CheckCircle2 as CheckCircle2Icon, X, ArrowRight } from "lucide-react"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

export function AlertBasic({
  title = "Account updated successfully",
  description = "Your profile information has been saved. Changes will be reflected immediately.",
  actionLabel,
  onAction,
  onDismiss,
  className = "",
}) {
  return (
    <Alert className={`max-w-md shadow-md bg-card text-card-foreground border-border relative ${className}`}>
      <CheckCircle2Icon className="text-emerald-500 dark:text-emerald-400" />
      <div className="flex-1 min-w-0 pr-6">
        <div className="flex items-center justify-between gap-2">
          <AlertTitle className="text-sm font-bold tracking-tight">
            {title}
          </AlertTitle>
          {onDismiss && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Dismiss alert"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <AlertDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {description}
        </AlertDescription>
        {onAction && actionLabel && (
          <div className="mt-2.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
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

export default AlertBasic;
