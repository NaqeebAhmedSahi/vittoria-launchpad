import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { EdgeDataService } from "@/services/edgeDataService";
import { TalentEcosystemDrawer } from "@/components/edge/TalentEcosystemDrawer";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function TalentEcosystemMap() {
  const platformTypes = EdgeDataService.getPlatformTypes();
  const navigate = useNavigate();
  const [selectedPlatform, setSelectedPlatform] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handlePlatformClick = (platform: any) => {
    setSelectedPlatform({
      ...platform,
      keyRoles: [
        "Managing Director - Infrastructure Credit",
        "Partner - Real Assets",
        "Head of Origination",
        "Senior Investment Professional"
      ]
    });
    setDrawerOpen(true);
  };

  const handleFirmClick = (firmName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/firms?search=${encodeURIComponent(firmName)}`);
  };

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
          <Card 
            key={platform.id} 
            className="hover:border-primary transition-colors cursor-pointer"
            onClick={() => handlePlatformClick(platform)}
          >
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
                      className="px-2 py-1 bg-muted rounded text-sm text-foreground hover:bg-primary/10 transition-colors cursor-pointer"
                      onClick={(e) => handleFirmClick(firm, e)}
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

      <TalentEcosystemDrawer
        platform={selectedPlatform}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
