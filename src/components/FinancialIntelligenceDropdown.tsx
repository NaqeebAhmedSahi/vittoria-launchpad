import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FinancialAlert, FinancialRecommendation } from "@/types/financial";
import { FinancialIntelligenceEngine } from "@/services/financialIntelligenceEngine";
import { 
  sample13WeekCashflow, 
  sampleBusinessLedgerSummary, 
  sampleTaxDeadlines 
} from "@/data/sampleFinancials";
import { AlertCircle, AlertTriangle, Info, TrendingUp, X, Lightbulb } from "lucide-react";

interface FinancialIntelligenceDropdownProps {
  children: React.ReactNode;
}

export function FinancialIntelligenceDropdown({ children }: FinancialIntelligenceDropdownProps) {
  const [alerts, setAlerts] = useState<FinancialAlert[]>([]);
  const [recommendations, setRecommendations] = useState<FinancialRecommendation[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Run financial intelligence analysis with sample data
    // TODO: Replace with actual data from API when DB integration is complete
    const analysis = FinancialIntelligenceEngine.runFullAnalysis({
      cashflow: sample13WeekCashflow,
      ledger: sampleBusinessLedgerSummary,
      taxDeadlines: sampleTaxDeadlines,
      currentSalary: 8000 * 12, // Annual salary
    });

    setAlerts(analysis.alerts);
    setRecommendations(analysis.recommendations);
  }, []);

  const handleDismissAlert = (id: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, dismissed: true } : alert
    ));
  };

  const handleDismissRecommendation = (id: string) => {
    setRecommendations(recommendations.filter(rec => rec.id !== id));
  };

  const visibleAlerts = alerts.filter(a => !a.dismissed);
  const criticalCount = visibleAlerts.filter(a => a.severity === 'critical').length;
  const warningCount = visibleAlerts.filter(a => a.severity === 'warning').length;
  const totalInsights = visibleAlerts.length + recommendations.length;

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'low':
        return <Lightbulb className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

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

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[420px] p-0">
        <div className="p-4 pb-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-base">Financial Intelligence</h3>
            <div className="flex items-center gap-2">
              {criticalCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {criticalCount} Critical
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                  {warningCount} Warning
                </Badge>
              )}
            </div>
          </div>
          
          {totalInsights === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>All clear! No alerts or recommendations.</p>
            </div>
          ) : (
            <Tabs defaultValue="alerts" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="alerts" className="text-xs">
                  Alerts ({visibleAlerts.length})
                </TabsTrigger>
                <TabsTrigger value="recommendations" className="text-xs">
                  Insights ({recommendations.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="alerts" className="mt-3">
                <ScrollArea className="h-[400px] pr-4">
                  {visibleAlerts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <Info className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <p>No active alerts</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {visibleAlerts.map((alert, index) => (
                        <div key={alert.id}>
                          <div className={`p-3 rounded-lg border ${
                            alert.severity === 'critical' 
                              ? 'bg-destructive/5 border-destructive/20' 
                              : alert.severity === 'warning'
                              ? 'bg-yellow-500/5 border-yellow-500/20'
                              : 'bg-blue-500/5 border-blue-500/20'
                          }`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 flex-1">
                                <div className="mt-0.5">{getAlertIcon(alert.severity)}</div>
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-medium">{alert.title}</h4>
                                    <Badge variant="outline" className="text-xs">
                                      {alert.category}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {alert.message}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => handleDismissAlert(alert.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {index < visibleAlerts.length - 1 && (
                            <Separator className="my-2" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="recommendations" className="mt-3">
                <ScrollArea className="h-[400px] pr-4">
                  {recommendations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <Lightbulb className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <p>No recommendations at this time</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recommendations.map((rec, index) => (
                        <div key={rec.id}>
                          <div className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 flex-1">
                                <div className="mt-0.5">{getPriorityIcon(rec.priority)}</div>
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-medium">{rec.title}</h4>
                                    <Badge variant={getPriorityColor(rec.priority)} className="text-xs">
                                      {rec.priority}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {rec.category}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {rec.description}
                                  </p>
                                  {rec.actionRequired && (
                                    <p className="text-xs text-primary font-medium mt-1">
                                      → {rec.actionRequired}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => handleDismissRecommendation(rec.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {index < recommendations.length - 1 && (
                            <Separator className="my-2" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
