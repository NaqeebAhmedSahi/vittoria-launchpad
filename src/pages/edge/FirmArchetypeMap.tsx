import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building, CheckCircle } from "lucide-react";
import { EdgeDataService } from "@/services/edgeDataService";
import { FirmArchetypeDrawer } from "@/components/edge/FirmArchetypeDrawer";
import { useState } from "react";

export default function FirmArchetypeMap() {
  const archetypes = EdgeDataService.getFirmArchetypes();
  const [selectedArchetype, setSelectedArchetype] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleArchetypeClick = (archetype: any) => {
    setSelectedArchetype({ ...archetype, exampleFirms: ["Goldman Sachs", "J.P. Morgan", "Morgan Stanley", "Barclays"] });
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Building className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Firm Archetype Map</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Public-safe firm categories and characteristics
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {archetypes.map((archetype) => (
          <Card 
            key={archetype.id} 
            className="hover:border-primary transition-colors cursor-pointer"
            onClick={() => handleArchetypeClick(archetype)}
          >
            <CardHeader>
              <CardTitle className="text-base">{archetype.name}</CardTitle>
              <CardDescription className="text-sm">
                {archetype.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Key Characteristics:
              </div>
              <div className="space-y-1">
                {archetype.characteristics.map((char, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">{char}</span>
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
            <strong>Note:</strong> Archetypes contain public-safe descriptions only. 
          No cultural assessments, political dynamics, or internal firm challenges are exposed.
          </p>
        </CardContent>
      </Card>

      <FirmArchetypeDrawer
        archetype={selectedArchetype}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
