import { cn } from "@/lib/utils";

interface StatusChipProps {
  status: string;
  variant?: "info" | "warning" | "success" | "error" | "neutral" | "destructive";
  className?: string;
}

export function StatusChip({ status, variant = "neutral", className }: StatusChipProps) {
  const variants = {
    info: "bg-status-info text-status-info-foreground",
    warning: "bg-status-warning text-status-warning-foreground",
    success: "bg-status-success text-status-success-foreground",
    error: "bg-status-error text-status-error-foreground",
    neutral: "bg-muted text-muted-foreground",
    destructive: "bg-destructive text-destructive-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        variants[variant as keyof typeof variants] || variants.neutral,
        className
      )}
    >
      {status}
    </span>
  );
}
