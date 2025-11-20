import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import type { FirmArchetype } from "@/types/intelligence";

export default function FirmArchetypeMap() {
  const [archetypes, setArchetypes] = useState<FirmArchetype[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArchetypes();
  }, []);

  const loadArchetypes = async () => {
    try {
      setLoading(true);
      const data = await window.electron.invoke("intelligence:get-archetypes");
      setArchetypes(data);
    } catch (error) {
      console.error("Failed to load archetypes:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Firm Archetype Map</h1>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          Firm Archetype Map
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Strategic categorization of firm types in the financial services ecosystem
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {archetypes.map((archetype) => (
          <Card key={archetype.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{archetype.name}</CardTitle>
                  <CardDescription className="mt-1">{archetype.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Key Characteristics
                </div>
                <div className="space-y-2">
                  {archetype.key_characteristics.map((char, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{char}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-sm">About Firm Archetypes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            The Firm Archetype Map categorizes financial services firms into strategic archetypes based on their operational model,
            market positioning, and organizational structure.
          </p>
          <p>
            Understanding these archetypes helps identify cultural fit, compensation structures, and career trajectory patterns
            when executing senior-level searches.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
