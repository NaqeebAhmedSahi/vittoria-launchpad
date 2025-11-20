import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Target } from "lucide-react";
import { EdgeDataService } from "@/services/edgeDataService";

export default function StrategicThemeAlignment() {
  const themes = EdgeDataService.getStrategicThemes();
  const alignments = EdgeDataService.getCandidateThemeAlignments();

  const getAlignmentColor = (alignment: string) => {
    switch (alignment) {
      case 'Strong': return 'default';
      case 'Moderate': return 'secondary';
      case 'Emerging': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Target className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Strategic Theme Alignment</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Candidate alignment with key strategic themes (banded view)
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {themes.map((theme) => (
          <Card key={theme.id}>
            <CardHeader>
              <CardTitle className="text-sm">{theme.theme}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{theme.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Candidate Alignment Grid</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                {themes.map((theme) => (
                  <TableHead key={theme.id} className="text-center">
                    {theme.theme}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {alignments.map((candidate) => (
                <TableRow key={candidate.candidateId}>
                  <TableCell className="font-medium">{candidate.candidateName}</TableCell>
                  {themes.map((theme) => {
                    const alignment = candidate.themes.find(t => t.themeId === theme.id);
                    return (
                      <TableCell key={theme.id} className="text-center">
                        {alignment ? (
                          <Badge variant={getAlignmentColor(alignment.alignment) as any}>
                            {alignment.alignment}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Alignment is shown in bands (Emerging / Moderate / Strong) only. 
            No weaknesses, red flags, or internal risk assessments are visible in this view.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
