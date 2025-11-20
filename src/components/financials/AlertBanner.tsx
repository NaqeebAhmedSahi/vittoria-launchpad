import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FinancialAlert } from "@/types/financial";
import { AlertCircle, AlertTriangle, Info, X } from "lucide-react";

interface AlertBannerProps {
  alerts: FinancialAlert[];
  onDismiss?: (id: string) => void;
}

export function AlertBanner({ alerts, onDismiss }: AlertBannerProps) {
  const visibleAlerts = alerts.filter((a) => !a.dismissed);

  if (visibleAlerts.length === 0) {
    return null;
  }

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getAlertVariant = (severity: string): "default" | "destructive" => {
    return severity === 'critical' ? 'destructive' : 'default';
  };

  return (
    <div className="space-y-2">
      {visibleAlerts.map((alert) => (
        <Alert key={alert.id} variant={getAlertVariant(alert.severity)}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1">
              {getAlertIcon(alert.severity)}
              <div className="space-y-1 flex-1">
                <div className="font-medium text-sm">{alert.title}</div>
                <AlertDescription className="text-sm">
                  {alert.message}
                </AlertDescription>
              </div>
            </div>
            {onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => onDismiss(alert.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Alert>
      ))}
    </div>
  );
}
