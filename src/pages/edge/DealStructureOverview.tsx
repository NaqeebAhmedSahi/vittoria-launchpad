import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Briefcase } from "lucide-react";
import { useState, useEffect } from "react";
import type { DealStructure } from "@/types/intelligence";

export default function DealStructureOverview() {
  const [structures, setStructures] = useState<DealStructure[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStructures();
  }, []);

  const loadStructures = async () => {
    try {
      setLoading(true);
      const data = await window.electron.invoke("intelligence:get-deal-structure-overview");
      setStructures(data);
    } catch (error) {
      console.error("Failed to load deal structures:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Deal Structure Overview</h1>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <BarChart className="h-6 w-6" />
          Deal Structure Overview
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Breakdown of deal types with sector and regional distribution
        </p>
      </div>

      {structures.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              No active deals found. Create deals to see structure breakdown.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {structures.map((structure, idx) => (
            <Card key={idx} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{structure.type}</CardTitle>
                      <Badge variant="secondary" className="text-lg font-bold">
                        {structure.count}
                      </Badge>
                    </div>
                    <CardDescription className="mt-1">
                      {structure.count === 1 ? '1 deal tracked' : `${structure.count} deals tracked`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {structure.sectors.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Sectors
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {structure.sectors.slice(0, 8).map((sector, sidx) => (
                        <Badge key={sidx} variant="outline" className="text-xs">
                          {sector}
                        </Badge>
                      ))}
                      {structure.sectors.length > 8 && (
                        <Badge variant="outline" className="text-xs">
                          +{structure.sectors.length - 8} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {structure.regions.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Regions
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {structure.regions.slice(0, 6).map((region, ridx) => (
                        <Badge key={ridx} variant="secondary" className="text-xs">
                          {region}
                        </Badge>
                      ))}
                      {structure.regions.length > 6 && (
                        <Badge variant="secondary" className="text-xs">
                          +{structure.regions.length - 6} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-sm">About Deal Structures</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Deal structure analysis aggregates transactions by type, providing visibility into market trends
            and sector-specific activity patterns.
          </p>
          <p>
            This data helps identify high-activity sectors and emerging opportunities across regions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
