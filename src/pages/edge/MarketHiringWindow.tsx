import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { EdgeDataService } from "@/services/edgeDataService";
import { HiringWindowDrawer } from "@/components/edge/HiringWindowDrawer";
import { useState } from "react";

export default function MarketHiringWindow() {
  const hiringWindows = EdgeDataService.getHiringWindows();
  const [selectedPeriod, setSelectedPeriod] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handlePeriodClick = (period: any) => {
    setSelectedPeriod(period);
    setDrawerOpen(true);
  };

  const getWindowColor = (window: string) => {
    switch (window) {
      case 'Open': return 'bg-status-success/20 text-status-success border-status-success';
      case 'Selective': return 'bg-status-warning/20 text-status-warning border-status-warning';
      case 'Quiet': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Calendar className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Market Hiring Window</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quarterly hiring activity outlook
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {hiringWindows.map((period, idx) => (
          <Card 
            key={idx} 
            className="hover:border-primary transition-colors cursor-pointer"
            onClick={() => handlePeriodClick(period)}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="font-semibold text-lg text-foreground">
                      {period.quarter} {period.year}
                    </div>
                    <Badge className={getWindowColor(period.window)}>
                      {period.window}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {period.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Hiring Window Key</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-3">
            <Badge className={getWindowColor('Open')}>Open</Badge>
            <span className="text-sm text-muted-foreground">
              Strong hiring appetite, multiple active searches
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={getWindowColor('Selective')}>Selective</Badge>
            <span className="text-sm text-muted-foreground">
              Focused hiring for critical roles only
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={getWindowColor('Quiet')}>Quiet</Badge>
            <span className="text-sm text-muted-foreground">
              Limited hiring activity, seasonal slowdown
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> This is a general market view based on aggregated signals. 
          No firm-specific hiring plans or confidential mandate details are exposed.
          </p>
        </CardContent>
      </Card>

      <HiringWindowDrawer
        period={selectedPeriod}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
