import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface ModuleExplanationModalProps {
  moduleName: string;
  score?: number;
  confidence: number;
  summary: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModuleExplanationModal({ 
  moduleName, 
  score, 
  confidence, 
  summary,
  open, 
  onOpenChange 
}: ModuleExplanationModalProps) {
  const getModuleDetails = () => {
    const details: Record<string, { description: string; factors: string[] }> = {
      'candidate_fit_matrix': {
        description: 'Analyzes candidate alignment with mandate requirements across technical skills, cultural fit, and career trajectory.',
        factors: ['Technical skill match', 'Years of experience alignment', 'Sector expertise relevance', 'Leadership style compatibility']
      },
      'market_mapping': {
        description: 'Evaluates competitive landscape and positioning for target firms and candidates.',
        factors: ['Market share analysis', 'Competitive positioning', 'Industry trends alignment', 'Geographic coverage']
      },
      'urgency_detector': {
        description: 'Identifies time-sensitive opportunities and risks requiring immediate attention.',
        factors: ['Mandate timeline pressure', 'Candidate availability window', 'Market timing factors', 'Competitive threat level']
      },
      'culture_decoder': {
        description: 'Assesses cultural compatibility between candidates and target organizations.',
        factors: ['Work style preferences', 'Decision-making approach', 'Communication patterns', 'Team dynamics fit']
      }
    };

    return details[moduleName] || {
      description: 'Intelligence module providing automated insights and scoring.',
      factors: ['Multiple data points analyzed', 'Pattern recognition applied', 'Historical benchmarks considered']
    };
  };

  const details = getModuleDetails();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Module: {moduleName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </DialogTitle>
          <DialogDescription>{details.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {score !== undefined && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Score</span>
                <Badge variant={score >= 75 ? 'default' : score >= 50 ? 'secondary' : 'outline'}>
                  {score}/100
                </Badge>
              </div>
              <Progress value={score} className="h-2" />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Confidence</span>
              <Badge variant="outline">{confidence}%</Badge>
            </div>
            <Progress value={confidence} className="h-2" />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Key Factors Analyzed</h4>
            <ul className="space-y-2">
              {details.factors.map((factor, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-foreground">{summary}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
