import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
}

export function StatCard({ title, value, subtext, icon: Icon, trend }: StatCardProps) {
  const trendColors = {
    up: "text-status-success",
    down: "text-status-error",
    neutral: "text-muted-foreground",
  };

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {title}
          </p>
          <p className="text-3xl font-semibold text-foreground mb-1">{value}</p>
          {subtext && (
            <p className={`text-xs ${trend ? trendColors[trend] : "text-muted-foreground"}`}>
              {subtext}
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-3 bg-primary/10 rounded-lg">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        )}
      </div>
    </Card>
  );
}
