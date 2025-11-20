import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Target } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EdgeDataService } from "@/services/edgeDataService";
import { ThemeAlignmentModal } from "@/components/edge/ThemeAlignmentModal";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";

export default function StrategicThemeAlignment() {
  const themes = EdgeDataService.getStrategicThemes();
  const alignments = EdgeDataService.getCandidateThemeAlignments();
  const navigate = useNavigate();
  
  const [selectedTheme, setSelectedTheme] = useState<string>("all");
  const [minAlignment, setMinAlignment] = useState<string>("any");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<any>(null);

  const filteredAlignments = useMemo(() => {
    return alignments.filter(candidate => {
      const hasThemeMatch = selectedTheme === "all" || 
        candidate.themes.some(t => t.themeId === selectedTheme);
      
      const hasMinAlignment = minAlignment === "any" ||
        candidate.themes.some(t => {
          if (minAlignment === "strong") return t.alignment === "Strong";
          if (minAlignment === "moderate") return t.alignment === "Strong" || t.alignment === "Moderate";
          return true;
        });

      return hasThemeMatch && hasMinAlignment;
    });
  }, [alignments, selectedTheme, minAlignment]);

  const handleCandidateClick = (candidateId: string) => {
    navigate(`/candidates/${candidateId}`);
  };

  const handleBadgeClick = (candidateName: string, themeId: string, alignment: string) => {
    const theme = themes.find(t => t.id === themeId);
    if (theme) {
      setModalData({ candidateName, themeName: theme.theme, alignment });
      setModalOpen(true);
    }
  };

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

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={selectedTheme} onValueChange={setSelectedTheme}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by Theme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Themes</SelectItem>
            {themes.map((theme) => (
              <SelectItem key={theme.id} value={theme.id}>{theme.theme}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={minAlignment} onValueChange={setMinAlignment}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Min Alignment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any Alignment</SelectItem>
            <SelectItem value="moderate">Moderate+</SelectItem>
            <SelectItem value="strong">Strong Only</SelectItem>
          </SelectContent>
        </Select>
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
              {filteredAlignments.map((candidate) => (
                <TableRow key={candidate.candidateId}>
                  <TableCell 
                    className="font-medium cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleCandidateClick(candidate.candidateId)}
                  >
                    {candidate.candidateName}
                  </TableCell>
                  {themes.map((theme) => {
                    const alignment = candidate.themes.find(t => t.themeId === theme.id);
                    return (
                      <TableCell key={theme.id} className="text-center">
                        {alignment ? (
                          <Badge 
                            variant={getAlignmentColor(alignment.alignment) as any}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => handleBadgeClick(candidate.candidateName, theme.id, alignment.alignment)}
                          >
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

      {modalData && (
        <ThemeAlignmentModal
          candidateName={modalData.candidateName}
          themeName={modalData.themeName}
          alignment={modalData.alignment}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      )}
    </div>
  );
}
