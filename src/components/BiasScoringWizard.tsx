/**
 * BiasScoringWizard
 * 
 * A three-step wizard for configuring and visualizing bias-aware candidate scoring.
 * 
 * Step 1: Signals - Add/edit source signals (CV, notes, etc.) with domain and similarity tags
 * Step 2: Scores - View computed expertise/similarity/reliability scores with override capability
 * Step 3: Ranking Impact - See how scores affect candidate rankings (expertise-led vs similarity-only)
 * 
 * This is a FRONTEND-ONLY component. All persistence calls are stubbed with TODOs.
 */

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  CandidateContext,
  CandidateScoreSummary,
  SourceSignal,
  summariseCandidateScores,
  rankCandidatesByComposite,
  rankCandidatesBySimilarityOnly,
  buildSourceProfile,
} from "@/services/biasAwareScoringFlow";
import { Pencil, Trash2, Plus, ArrowUp, ArrowDown, Minus, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// =======================================================
// TYPES AND HELPERS
// =======================================================

interface BiasScoringWizardProps {
  mandateId: string;
  mandateName: string;
  candidates: CandidateContext[];
  onSave?: (updatedSignals: Record<string, SourceSignal[]>) => void;
}

interface SourceFormData {
  id: string;
  label: string;
  type: "cv" | "mandate_note" | "voice_note" | "market_data" | "manual";
  domainTags: string[];
  similarityTags: string[];
  totalUses: number;
  correctUses: number;
}

interface ScoreOverride {
  expertise?: number;
  similarity?: number;
  reliability?: number;
}

/**
 * Build initial signals from candidate contexts.
 * If candidates already have sources, use them; otherwise start with empty arrays.
 */
function buildInitialSignalsFromProps(
  candidates: CandidateContext[]
): Record<string, SourceSignal[]> {
  const result: Record<string, SourceSignal[]> = {};
  
  for (const candidate of candidates) {
    result[candidate.id] = candidate.sources || [];
  }
  
  return result;
}

/**
 * Apply overrides to source signals for scoring calculations.
 */
function applyOverridesToSignals(
  signals: SourceSignal[],
  overrides: Record<string, ScoreOverride>
): SourceSignal[] {
  return signals.map((signal) => {
    const override = overrides[signal.id];
    if (!override) return signal;
    
    return {
      ...signal,
      // Override would affect how buildSourceProfile calculates scores
      // For now, we'll handle this in the display logic
    };
  });
}

/**
 * Generate mock candidates for demo purposes
 */
function generateMockCandidates(): CandidateContext[] {
  return [
    {
      id: "1",
      name: "Alex Morgan",
      mandateId: "m1",
      mandateTags: ["Private Equity", "M&A", "Financial Analysis", "Deal Sourcing"],
      candidateTags: ["Private Equity", "M&A", "Goldman Sachs", "Harvard"],
      baseMatchScore: 0.75,
      sources: [
        {
          id: "s1",
          type: "cv",
          label: "CV - Financial Services",
          domainTags: ["Private Equity", "M&A", "Financial Analysis"],
          similarityTags: ["Goldman Sachs", "Harvard"],
          accuracyHistory: { totalUses: 10, correctUses: 8 },
        },
        {
          id: "s2",
          type: "voice_note",
          label: "Phone Screen Notes",
          domainTags: ["Deal Sourcing", "Portfolio Management"],
          similarityTags: ["London", "Previously at Blackstone"],
          accuracyHistory: { totalUses: 5, correctUses: 4 },
        },
      ],
    },
    {
      id: "2",
      name: "Jordan Chen",
      mandateId: "m1",
      mandateTags: ["Private Equity", "M&A", "Financial Analysis", "Deal Sourcing"],
      candidateTags: ["Investment Banking", "Capital Markets", "JP Morgan", "Wharton"],
      baseMatchScore: 0.68,
      sources: [
        {
          id: "s3",
          type: "cv",
          label: "CV - Investment Banking",
          domainTags: ["Investment Banking", "Capital Markets", "Corporate Finance"],
          similarityTags: ["JP Morgan", "Wharton"],
          accuracyHistory: { totalUses: 8, correctUses: 7 },
        },
      ],
    },
    {
      id: "3",
      name: "Sam Patel",
      mandateId: "m1",
      mandateTags: ["Private Equity", "M&A", "Financial Analysis", "Deal Sourcing"],
      candidateTags: ["Strategy Consulting", "Financial Modeling", "McKinsey", "Cambridge"],
      baseMatchScore: 0.72,
      sources: [
        {
          id: "s4",
          type: "cv",
          label: "CV - Consulting Background",
          domainTags: ["Strategy Consulting", "Financial Modeling", "Due Diligence"],
          similarityTags: ["McKinsey", "Cambridge", "New York"],
          accuracyHistory: { totalUses: 12, correctUses: 10 },
        },
        {
          id: "s5",
          type: "manual",
          label: "Partner Recommendation",
          domainTags: ["Private Equity", "Growth Equity"],
          similarityTags: ["Known from previous firm"],
          accuracyHistory: { totalUses: 3, correctUses: 3 },
        },
      ],
    },
  ];
}

// =======================================================
// MAIN COMPONENT
// =======================================================

export function BiasScoringWizard(props: BiasScoringWizardProps) {
  const { toast } = useToast();
  
  // Use mock data if no candidates provided
  const workingCandidates = props.candidates.length > 0 
    ? props.candidates 
    : generateMockCandidates();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  
  // Step 1: Signals management
  const [candidateSignals, setCandidateSignals] = useState<Record<string, SourceSignal[]>>(
    () => buildInitialSignalsFromProps(workingCandidates)
  );
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    workingCandidates[0]?.id || null
  );
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSignal, setEditingSignal] = useState<SourceSignal | null>(null);
  
  // Step 2: Score overrides
  const [overrides, setOverrides] = useState<Record<string, ScoreOverride>>({});
  
  // Form state for add/edit dialog
  const [formData, setFormData] = useState<SourceFormData>({
    id: "",
    label: "",
    type: "cv",
    domainTags: [],
    similarityTags: [],
    totalUses: 0,
    correctUses: 0,
  });
  const [domainTagInput, setDomainTagInput] = useState("");
  const [similarityTagInput, setSimilarityTagInput] = useState("");
  
  // Get current candidate
  const selectedCandidate = workingCandidates.find(c => c.id === selectedCandidateId);
  const currentSignals = selectedCandidateId ? (candidateSignals[selectedCandidateId] || []) : [];
  
  // Sync: When candidateSignals change, we need to recalculate everything
  // This ensures all steps show consistent data
  
  // =======================================================
  // STEP 1: SIGNALS
  // =======================================================
  
  const openAddDialog = () => {
    setFormData({
      id: `s${Date.now()}`,
      label: "",
      type: "cv",
      domainTags: [],
      similarityTags: [],
      totalUses: 0,
      correctUses: 0,
    });
    setDomainTagInput("");
    setSimilarityTagInput("");
    setEditingSignal(null);
    setIsAddDialogOpen(true);
  };
  
  const openEditDialog = (signal: SourceSignal) => {
    setFormData({
      id: signal.id,
      label: signal.label,
      type: signal.type,
      domainTags: [...signal.domainTags],
      similarityTags: [...signal.similarityTags],
      totalUses: signal.accuracyHistory.totalUses,
      correctUses: signal.accuracyHistory.correctUses,
    });
    setDomainTagInput("");
    setSimilarityTagInput("");
    setEditingSignal(signal);
    setIsAddDialogOpen(true);
  };
  
  const handleSaveSignal = () => {
    if (!selectedCandidateId || !formData.label) {
      toast({
        title: "Validation Error",
        description: "Please provide a label for the source.",
        variant: "destructive",
      });
      return;
    }
    
    const newSignal: SourceSignal = {
      id: formData.id,
      type: formData.type,
      label: formData.label,
      domainTags: formData.domainTags,
      similarityTags: formData.similarityTags,
      accuracyHistory: {
        totalUses: formData.totalUses,
        correctUses: formData.correctUses,
      },
    };
    
    setCandidateSignals(prev => {
      const updated = { ...prev };
      const signals = [...(updated[selectedCandidateId] || [])];
      
      if (editingSignal) {
        // Update existing
        const index = signals.findIndex(s => s.id === editingSignal.id);
        if (index >= 0) {
          signals[index] = newSignal;
        }
      } else {
        // Add new
        signals.push(newSignal);
      }
      
      updated[selectedCandidateId] = signals;
      return updated;
    });
    
    setIsAddDialogOpen(false);
    toast({
      title: editingSignal ? "Source Updated" : "Source Added",
      description: `Successfully ${editingSignal ? "updated" : "added"} source signal.`,
    });
  };
  
  const handleDeleteSignal = (signalId: string) => {
    if (!selectedCandidateId) return;
    
    setCandidateSignals(prev => {
      const updated = { ...prev };
      updated[selectedCandidateId] = (updated[selectedCandidateId] || []).filter(
        s => s.id !== signalId
      );
      return updated;
    });
    
    toast({
      title: "Source Deleted",
      description: "Source signal removed successfully.",
    });
  };
  
  const addDomainTag = () => {
    if (domainTagInput.trim()) {
      setFormData(prev => ({
        ...prev,
        domainTags: [...prev.domainTags, domainTagInput.trim()],
      }));
      setDomainTagInput("");
    }
  };
  
  const addSimilarityTag = () => {
    if (similarityTagInput.trim()) {
      setFormData(prev => ({
        ...prev,
        similarityTags: [...prev.similarityTags, similarityTagInput.trim()],
      }));
      setSimilarityTagInput("");
    }
  };
  
  const removeDomainTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      domainTags: prev.domainTags.filter(t => t !== tag),
    }));
  };
  
  const removeSimilarityTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      similarityTags: prev.similarityTags.filter(t => t !== tag),
    }));
  };
  
  // =======================================================
  // STEP 2: SCORES
  // =======================================================
  
  // Compute source profiles for the selected candidate
  const sourceProfiles = useMemo(() => {
    if (!selectedCandidate || !currentSignals.length) return [];
    
    return currentSignals.map(signal => {
      const profile = buildSourceProfile(signal, selectedCandidate);
      
      // Apply overrides
      const override = overrides[signal.id];
      if (override) {
        return {
          ...profile,
          scores: {
            expertiseScore: override.expertise ?? profile.scores.expertiseScore,
            similarityScore: override.similarity ?? profile.scores.similarityScore,
            sourceReliabilityScore: override.reliability ?? profile.scores.sourceReliabilityScore,
          },
        };
      }
      
      return profile;
    });
  }, [selectedCandidate, currentSignals, overrides]);
  
  // Compute aggregate summary for selected candidate
  const candidateSummary = useMemo(() => {
    if (!selectedCandidate || !sourceProfiles.length) return null;
    
    // Build updated context with potentially overridden signals
    const updatedContext: CandidateContext = {
      ...selectedCandidate,
      sources: currentSignals,
    };
    
    return summariseCandidateScores(updatedContext);
  }, [selectedCandidate, currentSignals, sourceProfiles]);
  
  const toggleOverride = (signalId: string, field: keyof ScoreOverride, enabled: boolean) => {
    if (!enabled) {
      // Remove override
      setOverrides(prev => {
        const updated = { ...prev };
        if (updated[signalId]) {
          delete updated[signalId][field];
          if (Object.keys(updated[signalId]).length === 0) {
            delete updated[signalId];
          }
        }
        return updated;
      });
    } else {
      // Initialize override with current value
      const profile = sourceProfiles.find(p => p.id === signalId);
      if (profile) {
        const currentValue = profile.scores[`${field}Score` as keyof typeof profile.scores];
        setOverrides(prev => ({
          ...prev,
          [signalId]: {
            ...prev[signalId],
            [field]: currentValue,
          },
        }));
      }
    }
  };
  
  const updateOverride = (signalId: string, field: keyof ScoreOverride, value: number) => {
    setOverrides(prev => ({
      ...prev,
      [signalId]: {
        ...prev[signalId],
        [field]: value,
      },
    }));
  };
  
  // =======================================================
  // STEP 3: RANKING IMPACT
  // =======================================================
  
  // Build updated candidates with all signal changes
  const updatedCandidates = useMemo(() => {
    return workingCandidates.map(candidate => ({
      ...candidate,
      sources: candidateSignals[candidate.id] || [],
    }));
  }, [workingCandidates, candidateSignals]);
  
  // Compute rankings
  const expertiseRanking = useMemo(() => {
    return rankCandidatesByComposite(updatedCandidates);
  }, [updatedCandidates]);
  
  const similarityRanking = useMemo(() => {
    return rankCandidatesBySimilarityOnly(updatedCandidates);
  }, [updatedCandidates]);
  
  // Calculate rank movements
  const rankMovements = useMemo(() => {
    const movements: Record<string, { expertiseRank: number; similarityRank: number; diff: number }> = {};
    
    expertiseRanking.forEach((summary, index) => {
      const simIndex = similarityRanking.findIndex(s => s.candidateId === summary.candidateId);
      movements[summary.candidateId] = {
        expertiseRank: index + 1,
        similarityRank: simIndex + 1,
        diff: simIndex - index, // positive means moved up with expertise
      };
    });
    
    return movements;
  }, [expertiseRanking, similarityRanking]);
  
  // Calculate average divergence
  const avgDivergence = useMemo(() => {
    const diffs = Object.values(rankMovements).map(m => Math.abs(m.diff));
    return diffs.length > 0 ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;
  }, [rankMovements]);
  
  // =======================================================
  // SAVE CONFIGURATION
  // =======================================================
  
  const handleSaveConfiguration = async () => {
    // TODO: Connect to backend API when available
    console.log("Saving bias configuration (stub)", {
      mandateId: props.mandateId,
      candidateSignals,
      overrides,
    });
    
    // Call parent callback if provided
    if (props.onSave) {
      props.onSave(candidateSignals);
    }
    
    toast({
      title: "Configuration Saved",
      description: "Bias-aware scoring updated for this mandate.",
    });
  };
  
  // =======================================================
  // NAVIGATION
  // =======================================================
  
  const canProceedFromStep1 = selectedCandidateId && currentSignals.length > 0;
  const canProceedFromStep2 = true; // Always can proceed from step 2
  
  // =======================================================
  // RENDER
  // =======================================================
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Bias-Aware Scoring</CardTitle>
        <CardDescription>
          Configure expertise, similarity, and reliability for sources to see their impact on candidate rankings
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Stepper */}
        <div className="flex items-center gap-2">
          <Button
            variant={currentStep === 1 ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentStep(1)}
          >
            1. Signals
          </Button>
          <div className="h-px flex-1 bg-border" />
          <Button
            variant={currentStep === 2 ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentStep(2)}
            disabled={!canProceedFromStep1}
          >
            2. Scores
          </Button>
          <div className="h-px flex-1 bg-border" />
          <Button
            variant={currentStep === 3 ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentStep(3)}
            disabled={!canProceedFromStep1}
          >
            3. Ranking Impact
          </Button>
        </div>
        
        {/* Step Content */}
        <div className="min-h-[400px]">
          {/* STEP 1: SIGNALS */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label>Select Candidate:</Label>
                <Select value={selectedCandidateId || ""} onValueChange={setSelectedCandidateId}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Choose a candidate" />
                  </SelectTrigger>
                  <SelectContent>
                    {workingCandidates.map(candidate => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        {candidate.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedCandidateId && (
                <>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Source Signals</h3>
                    <Button onClick={openAddDialog} size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Source
                    </Button>
                  </div>
                  
                  {currentSignals.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No source signals yet. Add at least one source to compute bias-aware scores.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Source</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Domain Tags</TableHead>
                          <TableHead>Similarity Tags</TableHead>
                          <TableHead>Accuracy</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentSignals.map(signal => (
                          <TableRow key={signal.id}>
                            <TableCell className="font-medium">{signal.label}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{signal.type}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {signal.domainTags.slice(0, 3).map((tag, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {signal.domainTags.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{signal.domainTags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {signal.similarityTags.slice(0, 3).map((tag, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {signal.similarityTags.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{signal.similarityTags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {signal.accuracyHistory.correctUses} / {signal.accuracyHistory.totalUses}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(signal)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteSignal(signal.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  
                  <Alert>
                    <AlertDescription className="text-sm">
                      These signals will be used to compute expertise, similarity, and reliability scores
                      for each candidate. You can refine them at any time.
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </div>
          )}
          
          {/* STEP 2: SCORES */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {candidateSummary && (
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Aggregate Scores: {selectedCandidate?.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Expertise</div>
                        <div className="text-2xl font-bold text-blue-500">
                          {(candidateSummary.avgExpertiseScore * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Similarity</div>
                        <div className="text-2xl font-bold text-amber-500">
                          {(candidateSummary.avgSimilarityScore * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Reliability</div>
                        <div className="text-2xl font-bold text-green-500">
                          {(candidateSummary.avgReliabilityScore * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Composite</div>
                        <div className="text-2xl font-bold">
                          {(candidateSummary.compositeScore * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <h3 className="text-lg font-semibold">Source-Level Scores</h3>
              
              {sourceProfiles.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No source profiles to display. Add sources in Step 1.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {sourceProfiles.map(profile => {
                    const override = overrides[profile.id] || {};
                    const hasExpertiseOverride = override.expertise !== undefined;
                    const hasSimilarityOverride = override.similarity !== undefined;
                    const hasReliabilityOverride = override.reliability !== undefined;
                    
                    return (
                      <Card key={profile.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-sm">{profile.label}</CardTitle>
                              <CardDescription className="text-xs">
                                {profile.type}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Expertise Score */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Expertise Score</Label>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-blue-500">
                                  {(profile.scores.expertiseScore * 100).toFixed(0)}%
                                </span>
                                <Switch
                                  checked={hasExpertiseOverride}
                                  onCheckedChange={(checked) => 
                                    toggleOverride(profile.id, "expertise", checked)
                                  }
                                />
                                <span className="text-xs text-muted-foreground">Override</span>
                              </div>
                            </div>
                            {hasExpertiseOverride && (
                              <Slider
                                value={[override.expertise! * 100]}
                                onValueChange={([value]) => 
                                  updateOverride(profile.id, "expertise", value / 100)
                                }
                                min={0}
                                max={100}
                                step={1}
                                className="w-full"
                              />
                            )}
                          </div>
                          
                          {/* Similarity Score */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Similarity Score</Label>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-amber-500">
                                  {(profile.scores.similarityScore * 100).toFixed(0)}%
                                </span>
                                <Switch
                                  checked={hasSimilarityOverride}
                                  onCheckedChange={(checked) => 
                                    toggleOverride(profile.id, "similarity", checked)
                                  }
                                />
                                <span className="text-xs text-muted-foreground">Override</span>
                              </div>
                            </div>
                            {hasSimilarityOverride && (
                              <Slider
                                value={[override.similarity! * 100]}
                                onValueChange={([value]) => 
                                  updateOverride(profile.id, "similarity", value / 100)
                                }
                                min={0}
                                max={100}
                                step={1}
                                className="w-full"
                              />
                            )}
                          </div>
                          
                          {/* Reliability Score */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Reliability Score</Label>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-green-500">
                                  {(profile.scores.sourceReliabilityScore * 100).toFixed(0)}%
                                </span>
                                <Switch
                                  checked={hasReliabilityOverride}
                                  onCheckedChange={(checked) => 
                                    toggleOverride(profile.id, "reliability", checked)
                                  }
                                />
                                <span className="text-xs text-muted-foreground">Override</span>
                              </div>
                            </div>
                            {hasReliabilityOverride && (
                              <Slider
                                value={[override.reliability! * 100]}
                                onValueChange={([value]) => 
                                  updateOverride(profile.id, "reliability", value / 100)
                                }
                                min={0}
                                max={100}
                                step={1}
                                className="w-full"
                              />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          {/* STEP 3: RANKING IMPACT */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Expertise-Led Ranking */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Expertise-Led Ranking</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Rank</TableHead>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Composite</TableHead>
                        <TableHead>Movement</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expertiseRanking.map((summary, index) => {
                        const movement = rankMovements[summary.candidateId];
                        return (
                          <TableRow key={summary.candidateId}>
                            <TableCell className="font-bold">{index + 1}</TableCell>
                            <TableCell className="font-medium">{summary.name}</TableCell>
                            <TableCell>
                              {(summary.compositeScore * 100).toFixed(0)}%
                            </TableCell>
                            <TableCell>
                              {movement.diff > 0 && (
                                <div className="flex items-center gap-1 text-green-600">
                                  <ArrowUp className="h-4 w-4" />
                                  <span className="text-xs">+{movement.diff}</span>
                                </div>
                              )}
                              {movement.diff < 0 && (
                                <div className="flex items-center gap-1 text-red-600">
                                  <ArrowDown className="h-4 w-4" />
                                  <span className="text-xs">{movement.diff}</span>
                                </div>
                              )}
                              {movement.diff === 0 && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Minus className="h-4 w-4" />
                                  <span className="text-xs">0</span>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Similarity-Only Ranking */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Similarity-Only Ranking</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Rank</TableHead>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Similarity</TableHead>
                        <TableHead>Movement</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {similarityRanking.map((summary, index) => {
                        const movement = rankMovements[summary.candidateId];
                        return (
                          <TableRow key={summary.candidateId}>
                            <TableCell className="font-bold">{index + 1}</TableCell>
                            <TableCell className="font-medium">{summary.name}</TableCell>
                            <TableCell>
                              {(summary.avgSimilarityScore * 100).toFixed(0)}%
                            </TableCell>
                            <TableCell>
                              {movement.diff > 0 && (
                                <div className="flex items-center gap-1 text-red-600">
                                  <ArrowDown className="h-4 w-4" />
                                  <span className="text-xs">↓{movement.diff}</span>
                                </div>
                              )}
                              {movement.diff < 0 && (
                                <div className="flex items-center gap-1 text-green-600">
                                  <ArrowUp className="h-4 w-4" />
                                  <span className="text-xs">↑{Math.abs(movement.diff)}</span>
                                </div>
                              )}
                              {movement.diff === 0 && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Minus className="h-4 w-4" />
                                  <span className="text-xs">0</span>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              {/* Summary Analysis */}
              <Alert>
                <AlertDescription>
                  {avgDivergence < 0.5 ? (
                    <span>
                      <strong>Low Bias Impact:</strong> Similarity signals are not materially distorting 
                      the ranking. Average rank difference: {avgDivergence.toFixed(1)} positions.
                    </span>
                  ) : avgDivergence < 1.5 ? (
                    <span>
                      <strong>Moderate Bias Impact:</strong> Some candidates are being affected by similarity 
                      signals. Average rank difference: {avgDivergence.toFixed(1)} positions. Review key sources.
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">
                      <strong>⚠️ High Bias Impact:</strong> Similarity is pulling the ranking significantly 
                      away from expertise. Average rank difference: {avgDivergence.toFixed(1)} positions. 
                      You may want to review tags and weights for key sources.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
              
              <div className="flex justify-end">
                <Button onClick={handleSaveConfiguration} size="lg">
                  Save Configuration
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex justify-between border-t pt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1) as 1 | 2 | 3)}
            disabled={currentStep === 1}
          >
            Back
          </Button>
          <Button
            onClick={() => setCurrentStep(prev => Math.min(3, prev + 1) as 1 | 2 | 3)}
            disabled={
              currentStep === 3 || 
              (currentStep === 1 && !canProceedFromStep1)
            }
          >
            Next
          </Button>
        </div>
      </CardContent>
      
      {/* Add/Edit Source Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSignal ? "Edit Source" : "Add Source"}</DialogTitle>
            <DialogDescription>
              Configure the source signal that will feed into bias-aware scoring
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Label</Label>
              <Input
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., CV - Financial Services"
              />
            </div>
            
            <div>
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, type: value as SourceFormData["type"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cv">CV</SelectItem>
                  <SelectItem value="mandate_note">Mandate Note</SelectItem>
                  <SelectItem value="voice_note">Voice Note</SelectItem>
                  <SelectItem value="market_data">Market Data</SelectItem>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Domain Tags (expertise indicators)</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={domainTagInput}
                  onChange={(e) => setDomainTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDomainTag())}
                  placeholder="e.g., Private Equity, M&A"
                />
                <Button onClick={addDomainTag} type="button" size="sm">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {formData.domainTags.map((tag, i) => (
                  <Badge key={i} variant="secondary">
                    {tag}
                    <button
                      onClick={() => removeDomainTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <Label>Similarity Tags (affinity indicators)</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={similarityTagInput}
                  onChange={(e) => setSimilarityTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSimilarityTag())}
                  placeholder="e.g., Goldman Sachs, Harvard"
                />
                <Button onClick={addSimilarityTag} type="button" size="sm">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {formData.similarityTags.map((tag, i) => (
                  <Badge key={i} variant="outline">
                    {tag}
                    <button
                      onClick={() => removeSimilarityTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Total Uses</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.totalUses}
                  onChange={(e) => 
                    setFormData(prev => ({ ...prev, totalUses: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
              <div>
                <Label>Correct Uses</Label>
                <Input
                  type="number"
                  min={0}
                  max={formData.totalUses}
                  value={formData.correctUses}
                  onChange={(e) => 
                    setFormData(prev => ({ 
                      ...prev, 
                      correctUses: Math.min(parseInt(e.target.value) || 0, prev.totalUses) 
                    }))
                  }
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSignal}>
              {editingSignal ? "Update" : "Add"} Source
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// =======================================================
// WRAPPER FOR MANDATE DETAIL PAGE
// =======================================================

interface MandateBiasWizardDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mandateId: string;
  mandateName: string;
  candidates: CandidateContext[];
}

export function MandateBiasWizardDrawer(props: MandateBiasWizardDrawerProps) {
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[90vw] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Bias-Aware Scoring</SheetTitle>
          <SheetDescription>
            {props.mandateName}
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6">
          <BiasScoringWizard
            mandateId={props.mandateId}
            mandateName={props.mandateName}
            candidates={props.candidates}
            onSave={(updatedSignals) => {
              console.log("Signals saved from drawer", updatedSignals);
              // Parent can handle this callback
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
