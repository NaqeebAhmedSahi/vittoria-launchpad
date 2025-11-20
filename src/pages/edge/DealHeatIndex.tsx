import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, BarChart3 } from "lucide-react";
import { EdgeDataService } from "@/services/edgeDataService";

export default function DealHeatIndex() {
  const dealHeat = EdgeDataService.getDealHeatIndex();

  const getBandColor = (band: string) => {
    switch (band) {
      case 'High': return 'bg-status-error/20 text-status-error border-status-error';
      case 'Medium': return 'bg-status-warning/20 text-status-warning border-status-warning';
      case 'Low': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const groupedBySector = dealHeat.reduce((acc, item) => {
    if (!acc[item.sector]) acc[item.sector] = [];
    acc[item.sector].push(item);
    return acc;
  }, {} as Record<string, typeof dealHeat>);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <TrendingUp className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Deal Heat Index</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Market activity levels by sector and region
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {Object.entries(groupedBySector).map(([sector, items]) => (
          <Card key={sector}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                {sector}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 border rounded-lg space-y-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-foreground">{item.region}</div>
                      <Badge className={getBandColor(item.activityBand)}>
                        {item.activityBand}
                      </Badge>
                    </div>
                    {item.dealCount !== undefined && (
                      <div className="text-sm text-muted-foreground">
                        {item.dealCount} active deals
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Activity bands are aggregated indicators only. 
            No individual deal details, internal notes, or client-specific information is exposed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
