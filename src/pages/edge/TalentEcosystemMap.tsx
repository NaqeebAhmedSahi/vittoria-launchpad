import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import type { TalentSegment } from "@/types/intelligence";

export default function TalentEcosystemMap() {
  const [segments, setSegments] = useState<TalentSegment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSegments();
  }, []);

  const loadSegments = async () => {
    try {
      setLoading(true);
      const data = await window.electron.invoke("intelligence:get-talent-segments");
      setSegments(data);
    } catch (error) {
      console.error("Failed to load talent segments:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Talent Ecosystem Map</h1>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Network className="h-6 w-6" />
          Talent Ecosystem Map
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of platform types and example firms in the executive search landscape
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {segments.map((segment) => (
          <Card key={segment.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{segment.name}</CardTitle>
                  <CardDescription className="mt-1">{segment.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Example Firms
                </div>
                <div className="flex flex-wrap gap-2">
                  {segment.example_firms.map((firm, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {firm}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-sm">About This Map</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            The Talent Ecosystem Map provides a taxonomy of platform types across the financial services and investment landscape.
          </p>
          <p>
            This categorization helps identify talent mobility patterns and competitive intelligence when executing searches.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
