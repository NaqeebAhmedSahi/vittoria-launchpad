import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface ConfidenceBadgeProps {
  confidence?: number;
  provenance?: string;
  fieldName?: string;
}

export function ConfidenceBadge({ 
  confidence = 0, 
  provenance = "No provenance information",
  fieldName = "Field"
}: ConfidenceBadgeProps) {
  // Determine confidence level and color
  const getConfidenceLevel = (score: number) => {
    if (score >= 0.9) return { label: "High", color: "bg-green-500 hover:bg-green-600" };
    if (score >= 0.7) return { label: "Good", color: "bg-blue-500 hover:bg-blue-600" };
    if (score >= 0.5) return { label: "Medium", color: "bg-yellow-500 hover:bg-yellow-600" };
    if (score >= 0.3) return { label: "Low", color: "bg-orange-500 hover:bg-orange-600" };
    return { label: "Very Low", color: "bg-red-500 hover:bg-red-600" };
  };

  const { label, color } = getConfidenceLevel(confidence);
  const percentage = Math.round(confidence * 100);

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Badge 
            variant="secondary" 
            className={`${color} text-white text-xs cursor-help inline-flex items-center gap-1`}
          >
            <Info className="h-3 w-3" />
            {percentage}%
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <div className="font-semibold text-sm">
              {fieldName} - Confidence: {label} ({percentage}%)
            </div>
            <div className="text-xs text-muted-foreground">
              <strong>Source:</strong> {provenance}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function FieldWithConfidence({ 
  label, 
  value, 
  confidence, 
  provenance 
}: { 
  label: string; 
  value: React.ReactNode; 
  confidence?: number; 
  provenance?: string; 
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1">
        <div className="text-sm text-muted-foreground mb-1">{label}</div>
        <div className="text-sm font-medium">{value || "—"}</div>
      </div>
      {confidence !== undefined && (
        <ConfidenceBadge 
          confidence={confidence} 
          provenance={provenance} 
          fieldName={label}
        />
      )}
    </div>
  );
}
