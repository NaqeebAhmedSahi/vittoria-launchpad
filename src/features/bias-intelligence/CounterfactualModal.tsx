import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getBiasScoredCandidates } from '@/mocks/biasIntelligence';

interface CounterfactualModalProps {
  mandateId: string;
  onClose: () => void;
}

export function CounterfactualModal({ mandateId, onClose }: CounterfactualModalProps) {
  const candidates = getBiasScoredCandidates(mandateId);
  const expertiseRanked = [...candidates].sort((a, b) => a.expertiseRank - b.expertiseRank);
  const similarityRanked = [...candidates].sort((a, b) => a.similarityRank - b.similarityRank);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Counterfactual Ranking</CardTitle>
              <CardDescription className="mt-1">
                Internal only - Alternative ranking if similarity was prioritized
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Expertise Based Ranking (Used) */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <h3 className="font-semibold text-lg">Expertise Based Ranking</h3>
                <Badge className="bg-green-100 text-green-800">Used</Badge>
              </div>
              <div className="space-y-2">
                {expertiseRanked.map((c, idx) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Expertise: {c.expertiseScore}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Similarity Based Ranking (Not Used) */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <h3 className="font-semibold text-lg">Similarity Based Ranking</h3>
                <Badge variant="outline" className="text-muted-foreground">Not Used</Badge>
              </div>
              <div className="space-y-2">
                {similarityRanked.map((c, idx) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-semibold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Similarity: {c.similarityScore}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Why This Matters</h4>
            <p className="text-sm text-blue-800">
              If we ranked only on similarity, <strong>{similarityRanked[0].name}</strong> would 
              be first because of shared firm background and prior team links. Expertise based 
              scoring keeps <strong>{expertiseRanked[0].name}</strong> first due to deeper 
              infrastructure deal track record and domain expertise.
            </p>
            <p className="text-sm text-blue-800 mt-2">
              This counterfactual view is for internal calibration only and helps identify when 
              relationship factors might be influencing rankings disproportionately.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
