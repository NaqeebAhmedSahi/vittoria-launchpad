import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, BarChart3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { EdgeDataService } from "@/services/edgeDataService";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";

export default function DealHeatIndex() {
  const dealHeat = EdgeDataService.getDealHeatIndex();
  const navigate = useNavigate();
  
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [showHighOnly, setShowHighOnly] = useState(false);
  const [chartView, setChartView] = useState(false);

  const filteredData = useMemo(() => {
    return dealHeat.filter(item => {
      const matchesSector = sectorFilter === "all" || item.sector === sectorFilter;
      const matchesRegion = regionFilter === "all" || item.region === regionFilter;
      const matchesActivity = !showHighOnly || item.activityBand === "High";
      return matchesSector && matchesRegion && matchesActivity;
    });
  }, [dealHeat, sectorFilter, regionFilter, showHighOnly]);

  const sectors = Array.from(new Set(dealHeat.map(d => d.sector)));
  const regions = Array.from(new Set(dealHeat.map(d => d.region)));

  const handleCardClick = (sector: string, region: string) => {
    navigate(`/deals?sector=${encodeURIComponent(sector)}&region=${encodeURIComponent(region)}`);
  };

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

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by Sector" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sectors</SelectItem>
            {sectors.map((sector) => (
              <SelectItem key={sector} value={sector}>{sector}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={regionFilter} onValueChange={setRegionFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            {regions.map((region) => (
              <SelectItem key={region} value={region}>{region}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch checked={showHighOnly} onCheckedChange={setShowHighOnly} id="high-only" />
          <Label htmlFor="high-only" className="text-sm cursor-pointer">Show only High activity</Label>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Switch checked={chartView} onCheckedChange={setChartView} id="chart-view" />
          <Label htmlFor="chart-view" className="text-sm cursor-pointer">Chart View</Label>
        </div>
      </div>

      <div className="grid gap-6">
        {Object.entries(groupedBySector).map(([sector, items]) => {
          const filteredItems = filteredData.filter(item => item.sector === sector);
          if (filteredItems.length === 0) return null;
          
          return (
            <Card key={sector}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  {sector}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartView ? (
                  <div className="space-y-3">
                    {filteredItems.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{item.region}</span>
                          <Badge className={getBandColor(item.activityBand)}>
                            {item.activityBand}
                          </Badge>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              item.activityBand === 'High' ? 'bg-status-error' :
                              item.activityBand === 'Medium' ? 'bg-status-warning' :
                              'bg-muted-foreground'
                            }`}
                            style={{ width: `${(item.dealCount || 0) * 5}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {filteredItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 border rounded-lg space-y-2 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleCardClick(item.sector, item.region)}
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
                )}
              </CardContent>
            </Card>
          );
        })}
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
