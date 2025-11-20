import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import type { StrategicTheme, CandidateThemeAlignment } from "@/types/intelligence";

export default function StrategicThemeAlignment() {
  const [themes, setThemes] = useState<StrategicTheme[]>([]);
  const [alignments, setAlignments] = useState<CandidateThemeAlignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [themesData, alignmentsData] = await Promise.all([
        window.electron.invoke("intelligence:get-themes"),
        window.electron.invoke("intelligence:get-candidate-theme-alignments")
      ]);
      setThemes(themesData);
      setAlignments(alignmentsData);
    } catch (error) {
      console.error("Failed to load theme data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getBandForCandidateTheme = (candidateId: number, themeId: number) => {
    const alignment = alignments.find(
      a => a.candidate_id === candidateId && a.theme_id === themeId
    );
    return alignment?.band;
  };

  const getBandBadge = (band?: string) => {
    if (!band) return <span className="text-muted-foreground">—</span>;

    const variants: Record<string, { variant: any; label: string }> = {
      strong: { variant: "default", label: "Strong" },
      moderate: { variant: "secondary", label: "Moderate" },
      emerging: { variant: "outline", label: "Emerging" }
    };

    const config = variants[band] || variants.emerging;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Group alignments by candidate
  const candidateIds = [...new Set(alignments.map(a => a.candidate_id))];
  const candidateMap = alignments.reduce((acc, a) => {
    if (!acc[a.candidate_id]) {
      acc[a.candidate_id] = a.candidate_name;
    }
    return acc;
  }, {} as Record<number, string>);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Strategic Theme Alignment</h1>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Target className="h-6 w-6" />
          Strategic Theme Alignment
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Candidate alignment to key strategic investment themes
        </p>
      </div>

      {/* Theme Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {themes.map((theme) => (
          <Card key={theme.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <CardTitle className="text-sm font-medium">{theme.name}</CardTitle>
                  <CardDescription className="text-xs mt-1">{theme.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Alignment Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Candidate-Theme Alignment Matrix</CardTitle>
          <CardDescription>
            Shows candidate expertise and experience alignment to strategic themes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {candidateIds.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No candidate-theme alignments recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Candidate</TableHead>
                    {themes.map((theme) => (
                      <TableHead key={theme.id} className="text-center min-w-[120px]">
                        {theme.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidateIds.map((candidateId) => (
                    <TableRow key={candidateId}>
                      <TableCell className="font-medium">
                        {candidateMap[candidateId]}
                      </TableCell>
                      {themes.map((theme) => (
                        <TableCell key={theme.id} className="text-center">
                          {getBandBadge(getBandForCandidateTheme(candidateId, theme.id))}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-sm">Alignment Bands</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="default">Strong</Badge>
              <span className="text-muted-foreground">Proven track record and deep expertise</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Moderate</Badge>
              <span className="text-muted-foreground">Relevant experience, developing expertise</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Emerging</Badge>
              <span className="text-muted-foreground">Early exposure, learning curve</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
