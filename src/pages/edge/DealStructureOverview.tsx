import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, FileText } from "lucide-react";
import { EdgeDataService } from "@/services/edgeDataService";

export default function DealStructureOverview() {
  const dealStructures = EdgeDataService.getDealStructures();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <BarChart className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Deal Structure Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aggregated deal types, sectors, and regions
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {dealStructures.map((structure, idx) => (
          <Card key={idx} className="hover:border-primary transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-muted rounded-lg">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="font-semibold text-foreground">{structure.dealType}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {structure.count} deals tracked
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          Sectors:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {structure.sectors.map((sector) => (
                            <Badge key={sector} variant="outline" className="text-xs">
                              {sector}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          Regions:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {structure.regions.map((region) => (
                            <Badge key={region} variant="secondary" className="text-xs">
                              {region}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">
                    {structure.count}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    deals
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> All data is fully aggregated. No individual deal names, 
            valuations, or client-specific details are shown.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
