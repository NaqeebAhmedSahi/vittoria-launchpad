import { useState, useEffect } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusChip } from "@/components/StatusChip";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  LayoutGrid,
  List,
  Briefcase,
  Trash2,
  Play,
  Edit,
  Users,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { MandateFormDialog } from "@/components/MandateFormDialog";
import { CandidateMatchModal } from "@/components/CandidateMatchModal";
import { useToast } from "@/hooks/use-toast";

// --- Types ---------------------------------------------------

export interface Firm {
  id: number;
  name: string;
  short_name?: string | null;
  sector_focus: string[];
  asset_classes: string[];
  regions: string[];
  platform_type?: string | null;
  website?: string | null;
  notes_text?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Mandate {
  id: number;
  name: string;
  firm_id: number;
  location?: string | null;
  primary_sector?: string | null;
  sectors: string[];
  functions: string[];
  asset_classes: string[];
  regions: string[];
  seniority_min?: string | null;
  seniority_max?: string | null;
  status: string; // 'OPEN' | 'ON_HOLD' | 'CLOSED' | etc
  raw_brief?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MandateFormValues {
  name: string;
  firm_id: number;
  location?: string;
  primary_sector?: string;
  sectors: string[];
  functions: string[];
  asset_classes: string[];
  regions: string[];
  seniority_min?: string;
  seniority_max?: string;
  status: string;
  raw_brief?: string;
}

// -------------------------------------------------------------

export default function Mandates() {
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingMandate, setEditingMandate] = useState<Mandate | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [selectedMandate, setSelectedMandate] = useState<number | null>(null);
  const [matchScores, setMatchScores] = useState<any[]>([]); // kept for future scoring UI
  const [loading, setLoading] = useState(true);

  // Candidate Match Modal
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchModalMandate, setMatchModalMandate] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const { toast } = useToast();

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Load scores when a mandate is selected
  useEffect(() => {
    if (selectedMandate) {
      loadMatchScoresForMandate(selectedMandate);
    }
  }, [selectedMandate]);

  const loadData = async () => {
    try {
      setLoading(true);

      // 1) Firms
      const firmResult = await window.api.firm.list();
      if (firmResult.success && firmResult.firms) {
        setFirms(firmResult.firms);
      }

      // 2) Mandates
      const mandateResult = await window.api.mandate.list();
      if (mandateResult.success && mandateResult.mandates) {
        setMandates(mandateResult.mandates);
        console.log("[Mandates] Loaded mandates:", mandateResult.mandates);
      } else {
        toast({
          title: "Error",
          description: "Failed to load mandates",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[Mandates] Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMatchScoresForMandate = async (mandateId: number) => {
    try {
      const result =
        await window.api.scoring.listMatchScoresForMandate(mandateId);
      if (result.success && result.scores) {
        setMatchScores(result.scores);
        console.log(
          "[Mandates] Match scores for mandate:",
          result.scores
        );
      }
    } catch (error) {
      console.error("[Mandates] Error loading match scores:", error);
    }
  };

  // ---- CRUD -------------------------------------------------

  const handleSubmit = async (
    values: MandateFormValues,
    mode: "create" | "edit",
    mandateToEdit?: Mandate | null
  ) => {
    try {
      if (mode === "create") {
        console.log("[Mandates] Creating mandate:", values);
        const result = await window.api.mandate.create(values);
        if (!result.success) {
          toast({
            title: "Error",
            description: result.error || "Failed to create mandate",
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Mandate created",
          description: `${values.name} has been added successfully`,
        });
      } else if (mode === "edit" && mandateToEdit) {
        console.log("[Mandates] Updating mandate:", {
          id: mandateToEdit.id,
          values,
        });
        const result = await window.api.mandate.update(mandateToEdit.id, values);
        if (!result.success) {
          toast({
            title: "Error",
            description: result.error || "Failed to update mandate",
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Mandate updated",
          description: `${values.name} has been updated`,
        });
      }

      await loadData();
      setDialogOpen(false);
      setEditingMandate(null);
    } catch (error) {
      console.error("[Mandates] Error saving mandate:", error);
      toast({
        title: "Error",
        description: "Failed to save mandate",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMandate = async (
    mandateId: number,
    mandateName: string
  ) => {
    if (!confirm(`Are you sure you want to delete ${mandateName}?`)) {
      return;
    }

    try {
      const result = await window.api.mandate.delete(mandateId);
      if (result.success) {
        toast({
          title: "Mandate deleted",
          description: `${mandateName} has been removed.`,
        });
        if (selectedMandate === mandateId) {
          setSelectedMandate(null);
        }
        await loadData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete mandate",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[Mandates] Error deleting mandate:", error);
      toast({
        title: "Error",
        description: "Failed to delete mandate",
        variant: "destructive",
      });
    }
  };

  const handleFindCandidates = (mandateId: number, mandateName: string) => {
    setMatchModalMandate({ id: mandateId, name: mandateName });
    setMatchModalOpen(true);
  };

  const handleRunScoring = async (mandateId: number, mandateName: string) => {
    try {
      console.log(
        `[Mandates] Running scoring for mandate: ${mandateId}`
      );
      toast({
        title: "Scoring started",
        description: `Running fit scoring for ${mandateName}...`,
      });

      // TODO: call a dedicated scoring IPC if you have it
      await loadMatchScoresForMandate(mandateId);

      toast({
        title: "Scoring complete",
        description: `Fit scoring completed for ${mandateName}`,
      });
    } catch (error) {
      console.error("[Mandates] Error running scoring:", error);
      toast({
        title: "Error",
        description: "Failed to run scoring",
        variant: "destructive",
      });
    }
  };

  // ---- Derived data -----------------------------------------

  const filteredMandates = mandates.filter((mandate) => {
    const firm = firms.find((f) => f.id === mandate.firm_id);
    const matchesSearch =
      searchQuery === "" ||
      mandate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (firm?.name || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || mandate.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const selectedMandateData = mandates.find(
    (m) => m.id === selectedMandate
  );
  const selectedFirmData = selectedMandateData
    ? firms.find((f) => f.id === selectedMandateData.firm_id)
    : null;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "OPEN":
        return "success" as const;
      case "ON_HOLD":
        return "warning" as const;
      case "CLOSED":
        return "neutral" as const;
      default:
        return "neutral" as const;
    }
  };

  // ---- UI ---------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            Loading mandates...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <MandateFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingMandate(null);
        }}
        mode={dialogMode}
        initialData={editingMandate || undefined}
        firms={firms}
        onSubmit={(values) =>
          handleSubmit(values, dialogMode, editingMandate)
        }
      />

      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">
              Mandates / Projects
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your active search mandates
            </p>
          </div>
          <Button
            className="gap-2"
            onClick={() => {
              setDialogMode("create");
              setEditingMandate(null);
              setDialogOpen(true);
            }}
          >
            <span>+ New Mandate</span>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search mandates by name or firm..."
                    className="pl-9 h-9 text-sm"
                    value={searchQuery}
                    onChange={(e) =>
                      setSearchQuery(e.target.value)
                    }
                  />
                </div>
              </div>

              {/* Status filter */}
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-40 h-9 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Button
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>

              {/* View toggle */}
              <div className="flex gap-1 border border-border rounded-md p-0.5">
                <Button
                  size="sm"
                  variant={
                    viewMode === "table" ? "default" : "ghost"
                  }
                  onClick={() => setViewMode("table")}
                  className="h-7 px-2"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={
                    viewMode === "kanban" ? "default" : "ghost"
                  }
                  onClick={() => setViewMode("kanban")}
                  className="h-7 px-2"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Table View */}
            {viewMode === "table" && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mandate Name</TableHead>
                      <TableHead>Client Firm</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Primary Sector</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Seniority</TableHead>
                      <TableHead className="text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMandates.map((mandate) => {
                      const firm = firms.find(
                        (f) => f.id === mandate.firm_id
                      );
                      return (
                        <TableRow
                          key={mandate.id}
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() =>
                            setSelectedMandate(mandate.id)
                          }
                        >
                          <TableCell>
                            <span className="text-sm font-medium text-foreground">
                              {mandate.name}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-foreground">
                            {firm?.name || "Unknown"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {mandate.location || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {mandate.primary_sector || "—"}
                          </TableCell>
                          <TableCell>
                            <StatusChip
                              status={mandate.status}
                              variant={getStatusVariant(
                                mandate.status
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {mandate.seniority_min || "?"} -{" "}
                            {mandate.seniority_max || "?"}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            {/* <Button
                              variant="ghost"
                              size="icon"
                              title="Run scoring"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRunScoring(
                                  mandate.id,
                                  mandate.name
                                );
                              }}
                            >
                              <Play className="h-4 w-4" />
                            </Button> */}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Find Candidates"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFindCandidates(
                                  mandate.id,
                                  mandate.name
                                );
                              }}
                            >
                              <Users className="h-4 w-4 text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDialogMode("edit");
                                setEditingMandate(mandate);
                                setDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMandate(
                                  mandate.id,
                                  mandate.name
                                );
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredMandates.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          No mandates found with the current filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Kanban View */}
            {viewMode === "kanban" && (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {["OPEN", "ON_HOLD", "CLOSED"].map((stage) => (
                  <div key={stage} className="flex-shrink-0 w-72">
                    <div className="bg-muted/50 rounded-lg p-3 mb-3">
                      <h3 className="text-sm font-semibold text-foreground">
                        {stage.replace("_", " ")}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {
                          filteredMandates.filter(
                            (m) => m.status === stage
                          ).length
                        }{" "}
                        mandates
                      </span>
                    </div>
                    <div className="space-y-3">
                      {filteredMandates
                        .filter((m) => m.status === stage)
                        .map((mandate) => {
                          const firm = firms.find(
                            (f) => f.id === mandate.firm_id
                          );
                          return (
                            <Card
                              key={mandate.id}
                              className="hover:shadow-md transition-shadow cursor-pointer"
                              onClick={() =>
                                setSelectedMandate(mandate.id)
                              }
                            >
                              <CardContent className="p-3">
                                <h4 className="text-sm font-medium text-foreground mb-2">
                                  {mandate.name}
                                </h4>
                                <p className="text-xs text-muted-foreground mb-2">
                                  {firm?.name || "Unknown"}
                                </p>
                                <div className="flex items-center justify-between text-xs mb-2">
                                  <span className="text-muted-foreground">
                                    {mandate.location || "—"}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {mandate.primary_sector || "—"}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {mandate.sectors
                                    .slice(0, 3)
                                    .map((sector, idx) => (
                                      <Badge
                                        key={idx}
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {sector}
                                      </Badge>
                                    ))}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Candidate Match Modal */}
      {matchModalMandate && (
        <CandidateMatchModal
          open={matchModalOpen}
          onClose={() => setMatchModalOpen(false)}
          mandateId={matchModalMandate.id}
          mandateName={matchModalMandate.name}
        />
      )}
    </>
  );
}
