import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ROLES = ["Partner", "Managing Director", "Principal", "Vice President", "Senior Associate", "Associate"];
const SENIORITY_LEVELS = ["Partner", "Managing Director", "Principal", "Vice President", "Senior Associate", "Associate"];

export default function SourceTagging() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [allSources, setAllSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editedSources, setEditedSources] = useState<Map<number, any>>(new Map());

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const result = await window.api.source.list();
        if (result.success) {
          // Parse JSON fields
          const parsed = result.sources.map((s: any) => ({
            ...s,
            sectors: Array.isArray(s.sectors) ? s.sectors : JSON.parse(s.sectors || '[]'),
            geographies: Array.isArray(s.geographies) ? s.geographies : JSON.parse(s.geographies || '[]')
          }));
          setAllSources(parsed);
        }
      } catch (error) {
        console.error("Error fetching sources:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSources();
  }, []);

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === allSources.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allSources.map((item) => item.id)));
    }
  };

  const updateSourceField = (id: number, field: string, value: any) => {
    const current = editedSources.get(id) || {};
    setEditedSources(new Map(editedSources.set(id, { ...current, [field]: value })));
  };

  const getDisplayValue = (sourceId: number, field: string, defaultValue: any) => {
    return editedSources.get(sourceId)?.[field] ?? defaultValue;
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: "No sources selected",
        description: "Please select at least one source to update",
        variant: "destructive",
      });
      return;
    }

    try {
      // Build updates array
      const updates = Array.from(selectedIds).map(id => {
        const edits = editedSources.get(id) || {};
        return {
          id,
          ...edits
        };
      }).filter(update => Object.keys(update).length > 1); // Only include if there are actual edits

      if (updates.length === 0) {
        toast({
          title: "No changes to save",
          description: "Please make changes to the selected sources",
          variant: "destructive",
        });
        return;
      }

      const result = await window.api.source.bulkUpdate(updates);

      if (result.success) {
        toast({
          title: "Sources Updated",
          description: `Successfully updated ${result.updated} source(s)`,
        });

        // Refresh data
        const refreshResult = await window.api.source.list();
        if (refreshResult.success) {
          const parsed = refreshResult.sources.map((s: any) => ({
            ...s,
            sectors: Array.isArray(s.sectors) ? s.sectors : JSON.parse(s.sectors || '[]'),
            geographies: Array.isArray(s.geographies) ? s.geographies : JSON.parse(s.geographies || '[]')
          }));
          setAllSources(parsed);
        }

        setSelectedIds(new Set());
        setEditedSources(new Map());
      } else {
        toast({
          title: "Update Failed",
          description: result.error || "Failed to update sources",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/admin/sources")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Sources
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Source Tagging</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bulk edit metadata for multiple sources
          </p>
        </div>
        <Button onClick={handleBulkUpdate} disabled={selectedIds.size === 0}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes ({selectedIds.size})
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Metadata Editor</CardTitle>
          <CardDescription>
            Select sources and update their metadata. Changes are saved when you click "Save Changes".
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            {selectedIds.size > 0 ? `${selectedIds.size} source(s) selected` : "No sources selected"}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === allSources.length && allSources.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Seniority Level</TableHead>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Sectors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allSources.map((source) => {
                  const isSelected = selectedIds.has(source.id);
                  const isEdited = editedSources.has(source.id);

                  return (
                    <TableRow
                      key={source.id}
                      className={`${isSelected ? "bg-muted/50" : ""} ${isEdited ? "border-l-4 border-l-blue-500" : ""}`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(source.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{source.name}</TableCell>
                      <TableCell>
                        {isSelected ? (
                          <Select
                            value={getDisplayValue(source.id, "role", source.role)}
                            onValueChange={(value) => updateSourceField(source.id, "role", value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline">{source.role}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isSelected ? (
                          <Select
                            value={getDisplayValue(source.id, "seniority_level", source.seniority_level)}
                            onValueChange={(value) => updateSourceField(source.id, "seniority_level", value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SENIORITY_LEVELS.map((level) => (
                                <SelectItem key={level} value={level}>
                                  {level}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary">{source.seniority_level}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{source.organisation}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(source.sectors || []).slice(0, 2).map((sector: string) => (
                            <Badge key={sector} variant="outline" className="text-xs">
                              {sector}
                            </Badge>
                          ))}
                          {source.sectors && source.sectors.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{source.sectors.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
