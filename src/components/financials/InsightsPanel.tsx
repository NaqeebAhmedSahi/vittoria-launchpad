import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FinancialRecommendation } from "@/types/financial";
import { TrendingUp, AlertTriangle, Info } from "lucide-react";

interface InsightsPanelProps {
  recommendations: FinancialRecommendation[];
  onDismiss?: (id: string) => void;
}

export function InsightsPanel({ recommendations, onDismiss }: InsightsPanelProps) {
  if (recommendations.length === 0) {
    return null;
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <TrendingUp className="h-4 w-4" />;
      case 'low':
        return <Info className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Financial Insights & Recommendations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 flex-1">
                <div className="mt-0.5">{getPriorityIcon(rec.priority)}</div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium">{rec.title}</h4>
                    <Badge variant={getPriorityColor(rec.priority)} className="text-xs">
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                  {rec.actionRequired && (
                    <p className="text-xs text-primary font-medium mt-1">
                      → {rec.actionRequired}
                    </p>
                  )}
                </div>
              </div>
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDismiss(rec.id)}
                  className="text-xs"
                >
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
