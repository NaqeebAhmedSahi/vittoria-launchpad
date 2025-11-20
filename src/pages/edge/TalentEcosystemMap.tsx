import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { EdgeDataService } from "@/services/edgeDataService";

export default function TalentEcosystemMap() {
  const platformTypes = EdgeDataService.getPlatformTypes();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Talent Ecosystem Map</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Platform types and firm categories across the market
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {platformTypes.map((platform) => (
          <Card key={platform.id} className="hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle className="text-base">{platform.name}</CardTitle>
              <CardDescription className="text-sm">
                {platform.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Example Firms:
                </div>
                <div className="flex flex-wrap gap-2">
                  {platform.exampleFirms.map((firm) => (
                    <div
                      key={firm}
                      className="px-2 py-1 bg-muted rounded text-sm text-foreground"
                    >
                      {firm}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> This view contains public-safe firm categories only. 
            No internal assessments, political risks, or confidential client information is shown.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
