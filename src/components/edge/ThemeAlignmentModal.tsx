import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface ThemeAlignmentModalProps {
  candidateName: string;
  themeName: string;
  alignment: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ThemeAlignmentModal({ 
  candidateName, 
  themeName, 
  alignment, 
  open, 
  onOpenChange 
}: ThemeAlignmentModalProps) {
  const getReasons = () => {
    const reasons: Record<string, string[]> = {
      Strong: [
        "Demonstrated 10+ years of direct experience in this domain",
        "Led multiple high-impact initiatives with measurable outcomes",
        "Recognized thought leader with published articles and speaking engagements",
        "Strong network connections in relevant sector"
      ],
      Moderate: [
        "5-7 years of relevant experience with proven track record",
        "Active participation in industry working groups",
        "Growing expertise with recent project involvement",
        "Solid understanding of key challenges and opportunities"
      ],
      Emerging: [
        "2-4 years of foundational experience in adjacent areas",
        "Recently completed relevant certifications or training",
        "Expressed strong interest and commitment to develop expertise",
        "Transferable skills from related domains"
      ]
    };

    return reasons[alignment] || ["Assessment pending detailed review"];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Theme Alignment: {candidateName}</DialogTitle>
          <DialogDescription>
            Why is this candidate rated <Badge variant="outline" className="ml-1">{alignment}</Badge> on {themeName}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <ul className="space-y-3">
            {getReasons().map((reason, idx) => (
              <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>

          <div className="pt-4 text-xs text-muted-foreground border-t">
            <strong>Note:</strong> This assessment is based on CV analysis, interview notes, 
            and intelligence module scoring. For detailed breakdown, view the full candidate intelligence report.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
