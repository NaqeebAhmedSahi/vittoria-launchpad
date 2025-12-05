import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Building2,
  Briefcase,
  TrendingUp,
  Trash2,
  Edit,
} from "lucide-react";
import { FirmFormDialog } from "@/components/FirmFormDialog";
import { useToast } from "@/hooks/use-toast";

// ---- Types --------------------------------------------------

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
  firm_id: number;
  name: string;
  status: string; // e.g. "OPEN", "CLOSED"
  location?: string | null;
  sectors: string[];
}

// Form values we send to create/update
export interface FirmFormValues {
  name: string;
  short_name?: string;
  sector_focus: string[];
  asset_classes: string[];
  regions: string[];
  platform_type?: string;
  website?: string;
  notes_text?: string;
}

// -------------------------------------------------------------

export default function Firms() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [selectedFirm, setSelectedFirm] = useState<number | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingFirm, setEditingFirm] = useState<Firm | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const { toast } = useToast();

  // Load firms on mount + pagination change
  useEffect(() => {
    loadFirms();
  }, [page, pageSize]);

  // Load mandates when a firm is selected
  useEffect(() => {
    if (selectedFirm) {
      loadMandatesForFirm(selectedFirm);
    }
  }, [selectedFirm]);

  const loadFirms = async () => {
    try {
      setLoading(true);
      const result = await window.api.firm.listPaged({ page, pageSize });
      if (result.success && result.firms) {
        setFirms(result.firms);
        setTotal(result.total ?? 0);
        console.log("[Firms] Loaded firms (paged):", result.firms);
      } else {
        console.error("[Firms] Error loading firms:", result.error);
        toast({
          title: "Error",
          description: "Failed to load firms",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[Firms] Error:", error);
      toast({
        title: "Error",
        description: "Failed to load firms",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMandatesForFirm = async (firmId: number) => {
    try {
      const result = await window.api.mandate.list({ firm_id: firmId });
      if (result.success && result.mandates) {
        setMandates(result.mandates);
        console.log("[Firms] Loaded mandates for firm:", result.mandates);
      }
    } catch (error) {
      console.error("[Firms] Error loading mandates:", error);
    }
  };

  const selectedFirmData = firms.find((f) => f.id === selectedFirm) || null;
  const selectedFirmMandates = mandates.filter(
    (m) => m.firm_id === selectedFirm
  );
  const activeMandatesCount = selectedFirmMandates.filter(
    (m) => m.status === "OPEN"
  ).length;

  // Filters
  const filteredFirms = firms.filter((firm) => {
    const matchesSearch =
      firm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (firm.platform_type?.toLowerCase() || "").includes(
        searchQuery.toLowerCase()
      );
    const matchesPlatform =
      platformFilter === "all" || firm.platform_type === platformFilter;
    const matchesRegion =
      regionFilter === "all" || firm.regions.includes(regionFilter);
    return matchesSearch && matchesPlatform && matchesRegion;
  });

  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize) || 1);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  const handlePageSizeChange = (value: string) => {
    const nextSize = parseInt(value, 10) || 10;
    setPageSize(nextSize);
    setPage(1);
  };

  // ---- CRUD handlers ----------------------------------------

  const handleCreateOrUpdateFirm = async (
    data: FirmFormValues,
    mode: "create" | "edit",
    firmToEdit?: Firm | null
  ) => {
    try {
      if (mode === "create") {
        const result = await window.api.firm.create(data);
        if (result.success) {
          toast({
            title: "Firm created",
            description: `${data.name} has been added successfully.`,
          });
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to create firm",
            variant: "destructive",
          });
          return;
        }
      } else if (mode === "edit" && firmToEdit) {
        const result = await window.api.firm.update(firmToEdit.id, data);
        if (result.success) {
          toast({
            title: "Firm updated",
            description: `${data.name} has been updated successfully.`,
          });
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to update firm",
            variant: "destructive",
          });
          return;
        }
      }

      await loadFirms();
      setIsDialogOpen(false);
      setEditingFirm(null);
    } catch (error) {
      console.error("[Firms] Error saving firm:", error);
      toast({
        title: "Error",
        description: "Failed to save firm",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFirm = async (firmId: number, firmName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete ${firmName}? This will also delete all associated mandates.`
      )
    ) {
      return;
    }

    try {
      const result = await window.api.firm.delete(firmId);
      if (result.success) {
        toast({
          title: "Firm deleted",
          description: `${firmName} has been removed.`,
        });
        if (selectedFirm === firmId) {
          setSelectedFirm(null);
        }
        await loadFirms();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete firm",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[Firms] Error deleting firm:", error);
      toast({
        title: "Error",
        description: "Failed to delete firm",
        variant: "destructive",
      });
    }
  };

  // ---- UI ---------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading firms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Firms</h1>
        <Button
          onClick={() => {
            setDialogMode("create");
            setEditingFirm(null);
            setIsDialogOpen(true);
          }}
        >
          <Building2 className="h-4 w-4 mr-2" />
          Add Firm
        </Button>
      </div>

      {/* Dialog */}
      <FirmFormDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingFirm(null);
        }}
        mode={dialogMode}
        initialData={editingFirm || undefined}
        onSubmit={(values) =>
          handleCreateOrUpdateFirm(values, dialogMode, editingFirm)
        }
      />

      <div className="flex gap-6">
        {/* Left: list/filter */}
        <Card className="flex-1">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search firms..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select
                value={platformFilter}
                onValueChange={setPlatformFilter}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Platform Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="Bulge Bracket">Bulge Bracket</SelectItem>
                  <SelectItem value="Boutique">Boutique</SelectItem>
                  <SelectItem value="Asset Manager">Asset Manager</SelectItem>
                  <SelectItem value="Private Equity">Private Equity</SelectItem>
                </SelectContent>
              </Select>
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="UK">UK</SelectItem>
                  <SelectItem value="EMEA">EMEA</SelectItem>
                  <SelectItem value="Americas">Americas</SelectItem>
                  <SelectItem value="APAC">APAC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {firms.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No firms yet</p>
                <Button
                  onClick={() => {
                    setDialogMode("create");
                    setEditingFirm(null);
                    setIsDialogOpen(true);
                  }}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Add Your First Firm
                </Button>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Firm Name</TableHead>
                      <TableHead>Platform Type</TableHead>
                      <TableHead>Sectors</TableHead>
                      <TableHead>Regions</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFirms.map((firm) => (
                      <TableRow
                        key={firm.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedFirm(firm.id)}
                      >
                        <TableCell className="font-medium">
                          {firm.name}
                          {firm.short_name && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({firm.short_name})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {firm.platform_type && (
                            <Badge variant="outline">
                              {firm.platform_type}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {firm.sector_focus.slice(0, 2).map((sector, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="text-xs"
                              >
                                {sector}
                              </Badge>
                            ))}
                            {firm.sector_focus.length > 2 && (
                              <Badge
                                variant="secondary"
                                className="text-xs"
                              >
                                +{firm.sector_focus.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {firm.regions.slice(0, 2).map((region, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs"
                              >
                                {region}
                              </Badge>
                            ))}
                            {firm.regions.length > 2 && (
                              <Badge
                                variant="outline"
                                className="text-xs"
                              >
                                +{firm.regions.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDialogMode("edit");
                              setEditingFirm(firm);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFirm(firm.id, firm.name);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex flex-col md:flex-row items-center justify-between gap-3 mt-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Items per page</span>
                      <Select
                        value={String(pageSize)}
                        onValueChange={handlePageSizeChange}
                      >
                        <SelectTrigger className="h-8 w-[80px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="30">30</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {total > 0 ? (
                        (() => {
                          const start = (page - 1) * pageSize + 1;
                          const end = Math.min(page * pageSize, total);
                          return (
                            <span>
                              Showing {start}-{end} of {total} firms
                            </span>
                          );
                        })()
                      ) : (
                        <span>Showing 0 firms</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-xs"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                    >
                      {"<"}
                    </Button>
                    <div className="px-2 text-xs min-w-[56px] text-center">
                      Page {page} of {isNaN(totalPages) ? 1 : totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-xs"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= totalPages}
                    >
                      {">"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right: selected firm detail */}
        {selectedFirm && selectedFirmData && (
          <Card className="w-96">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{selectedFirmData.name}</CardTitle>
                  {selectedFirmData.short_name && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ({selectedFirmData.short_name})
                    </p>
                  )}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {selectedFirmData.platform_type && (
                      <Badge variant="secondary">
                        {selectedFirmData.platform_type}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedFirm(null)}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview">
                <TabsList className="w-full">
                  <TabsTrigger value="overview" className="flex-1">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="mandates" className="flex-1">
                    Mandates
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">
                          Mandates
                        </span>
                      </div>
                      <p className="text-2xl font-semibold">
                        {selectedFirmMandates.length}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activeMandatesCount} active
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">
                          Sectors
                        </span>
                      </div>
                      <p className="text-2xl font-semibold">
                        {selectedFirmData.sector_focus.length}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Sector Focus
                      </h4>
                      <div className="flex gap-1 flex-wrap">
                        {selectedFirmData.sector_focus.map(
                          (sector, idx) => (
                            <Badge key={idx} variant="secondary">
                              {sector}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Asset Classes
                      </h4>
                      <div className="flex gap-1 flex-wrap">
                        {selectedFirmData.asset_classes.map(
                          (asset, idx) => (
                            <Badge key={idx} variant="outline">
                              {asset}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Regions
                      </h4>
                      <div className="flex gap-1 flex-wrap">
                        {selectedFirmData.regions.map((region, idx) => (
                          <Badge key={idx} variant="outline">
                            {region}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {selectedFirmData.website && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">
                          Website
                        </h4>
                        <a
                          href={selectedFirmData.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          {selectedFirmData.website}
                        </a>
                      </div>
                    )}

                    {selectedFirmData.notes_text && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Notes</h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedFirmData.notes_text}
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="mandates">
                  <div className="space-y-3">
                    {selectedFirmMandates.length === 0 ? (
                      <div className="text-center py-8">
                        <Briefcase className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No mandates yet
                        </p>
                      </div>
                    ) : (
                      selectedFirmMandates.map((mandate) => (
                        <div
                          key={mandate.id}
                          className="p-3 border rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-medium text-sm">
                              {mandate.name}
                            </div>
                            <Badge
                              variant={
                                mandate.status === "OPEN"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {mandate.status}
                            </Badge>
                          </div>
                          {mandate.location && (
                            <div className="text-xs text-muted-foreground mb-2">
                              {mandate.location}
                            </div>
                          )}
                          <div className="flex gap-1 flex-wrap">
                            {mandate.sectors
                              .slice(0, 3)
                              .map((sector, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {sector}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
