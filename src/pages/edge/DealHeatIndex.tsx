import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Flame } from "lucide-react";
import { useState, useEffect } from "react";
import type { DealHeatData } from "@/types/intelligence";

export default function DealHeatIndex() {
  const [heatData, setHeatData] = useState<DealHeatData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHeatData();
  }, []);

  const loadHeatData = async () => {
    try {
      setLoading(true);
      const data = await window.electron.invoke("intelligence:get-deal-heat-index");
      setHeatData(data);
    } catch (error) {
      console.error("Failed to load deal heat index:", error);
    } finally {
      setLoading(false);
    }
  };

  const getHeatBadge = (band: string) => {
    switch (band) {
      case "high":
        return <Badge variant="destructive" className="flex items-center gap-1">
          <Flame className="h-3 w-3" />
          High
        </Badge>;
      case "medium":
        return <Badge variant="default" className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          Medium
        </Badge>;
      case "low":
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Deal Heat Index</h1>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Flame className="h-6 w-6" />
          Deal Heat Index
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Deal activity levels by sector and region (last 12 months)
        </p>
      </div>

      {heatData.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              No deal activity data available. Add deals with sector and region information to see heat index.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {heatData.map((item, idx) => (
            <Card key={idx} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{item.sector}</CardTitle>
                    <CardDescription className="mt-1">{item.region}</CardDescription>
                  </div>
                  {getHeatBadge(item.heatBand)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Deals</span>
                  <span className="text-2xl font-bold">{item.dealCount}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Legend */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-sm">Heat Index Bands</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="flex items-center gap-1">
                <Flame className="h-3 w-3" />
                High
              </Badge>
              <span className="text-muted-foreground">≥25 active deals (elevated competition)</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Medium
              </Badge>
              <span className="text-muted-foreground">10-24 active deals (moderate activity)</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Low</Badge>
              <span className="text-muted-foreground">&lt;10 active deals (emerging opportunity)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
