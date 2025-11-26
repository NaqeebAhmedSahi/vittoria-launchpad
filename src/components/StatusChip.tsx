import { cn } from "@/lib/utils";

interface StatusChipProps {
  status: string;
  variant?: "info" | "warning" | "success" | "error" | "neutral" | "destructive";
  className?: string;
}

export function StatusChip({ status, variant = "neutral", className }: StatusChipProps) {
  const variants = {
    info: "border-blue-500 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
    warning: "border-yellow-500 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30",
    success: "border-green-500 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30",
    error: "border-red-500 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30",
    neutral: "border-gray-300 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/30",
    destructive: "border-red-600 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30",
  };

  return (
    <span
      className={cn(
        "inline-block px-2 py-0.5 rounded border text-xs font-medium whitespace-nowrap",
        variants[variant as keyof typeof variants] || variants.neutral,
        className
      )}
    >
      {status}
    </span>
  );
}
