import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Search, Plus, ArrowUpDown } from "lucide-react";
import {
  formatSimilarityScore,
  getSimilarityScoreBadgeColor,
} from "@/mocks/similarityData";

type SortBy = "name" | "similarity" | "last_interaction";
type SortOrder = "asc" | "desc";

interface Source {
  id: string | number;
  name: string;
  role: string;
  organisation: string;
  sectors?: string[];
  geographies?: string[];
  similarity_score?: number | null;
  last_interaction_at?: string | null;
}

const SourceDirectory: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("similarity");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [allSources, setAllSources] = useState<Source[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const result = await window.api.source.listPaged({ page, pageSize });
        if (result && result.success) {
          setAllSources(result.sources || []);
          setTotal(result.total ?? (result.sources?.length ?? 0));
        }
      } catch (err) {
        // Optionally show error toast
      }
    })();
  }, [page, pageSize]);
       

  // Filter and sort
  const filteredSources = allSources
    .filter((item) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(query) ||
        item.role.toLowerCase().includes(query) ||
        item.organisation.toLowerCase().includes(query) ||
        (item.sectors || []).some((s) => s.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      let comparison = 0;

      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "similarity") {
        const scoreA = a.similarity_score ?? 0;
        const scoreB = b.similarity_score ?? 0;
        comparison = scoreA - scoreB;
      } else if (sortBy === "last_interaction") {
        const dateA = a.last_interaction_at
          ? new Date(a.last_interaction_at).getTime()
          : 0;
        const dateB = b.last_interaction_at
          ? new Date(b.last_interaction_at).getTime()
          : 0;
        comparison = dateA - dateB;
      }

      return sortOrder === "asc" ? comparison : -comparison;
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

  const toggleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const formatLastInteraction = (timestamp?: string | null) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Source Directory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your network of sources with similarity scoring
          </p>
        </div>
        <Button onClick={() => navigate("/admin/sources/manage")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Source
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, role, organisation, or sector..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("/admin/sources/tagging")}
            >
              Bulk Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/admin/similarity/org-pattern")}
            >
              View Org Pattern
            </Button>
          </div>
        </CardHeader>

        <CardContent>


          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    onClick={() => toggleSort("name")}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Name
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Sectors</TableHead>
                <TableHead>Geographies</TableHead>
                <TableHead>
                  <button
                    onClick={() => toggleSort("similarity")}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Similarity Score
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => toggleSort("last_interaction")}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Last Interaction
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredSources.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/admin/sources/${item.id}`)}
                >
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {item.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {item.organisation}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(item.sectors || []).slice(0, 2).map((sector) => (
                        <Badge
                          key={sector}
                          variant="secondary"
                          className="text-xs"
                        >
                          {sector}
                        </Badge>
                      ))}
                      {item.sectors && item.sectors.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{item.sectors.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(item.geographies || []).slice(0, 2).map((geo) => (
                        <Badge
                          key={geo}
                          variant="outline"
                          className="text-xs"
                        >
                          {geo}
                        </Badge>
                      ))}
                      {item.geographies && item.geographies.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{item.geographies.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.similarity_score !== undefined &&
                    item.similarity_score !== null ? (
                      <Badge
                        variant="outline"
                        className={`${getSimilarityScoreBadgeColor(
                          item.similarity_score,
                        )} font-semibold`}
                      >
                        {formatSimilarityScore(item.similarity_score)}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Not calculated
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatLastInteraction(item.last_interaction_at)}
                  </TableCell>
                </TableRow>
              ))}

              {filteredSources.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No sources found matching your search
                  </TableCell>
                </TableRow>
              )}
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
                        Showing {start}-{end} of {total} sources
                      </span>
                    );
                  })()
                ) : (
                  <span>Showing 0 sources</span>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default SourceDirectory;
