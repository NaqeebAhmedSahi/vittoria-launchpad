import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/StatusChip";
import { Search, Shield, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SourceReliabilityListItem } from "@/types/reliability";

const scoreBuckets = [
  { value: "all", label: "All scores", range: [0, 1] },
  { value: "80+", label: "80% and above", range: [0.8, 1] },
  { value: "60-79", label: "60% - 79%", range: [0.6, 0.79] },
  { value: "<60", label: "Below 60%", range: [0, 0.59] },
];

const formatPercent = (value?: number) => (value !== undefined ? `${(value * 100).toFixed(0)}%` : "—");

const getChipVariant = (score: number) => {
  if (score >= 0.8) return "success";
  if (score >= 0.6) return "warning";
  return "destructive";
};

export default function ReliabilityPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [scoreFilter, setScoreFilter] = useState(scoreBuckets[0].value);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [sources, setSources] = useState<SourceReliabilityListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchSources = async () => {
      try {
        const response = await window.api.reliability.listSources();
        if (mounted) {
          setSources(response.items || []);
        }
      } catch (error: any) {
        console.error("Failed to load reliability data", error);
        toast({
          title: "Unable to load reliability data",
          description: error?.message || "Check that PostgreSQL is running and try again.",
          variant: "destructive",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSources();

    return () => {
      mounted = false;
    };
  }, [toast]);

  const uniqueRoles = useMemo(() => {
    const roles = new Set<string>();
    sources.forEach((item) => roles.add(item.source.role));
    return Array.from(roles);
  }, [sources]);

  const uniqueSectors = useMemo(() => {
    const sectors = new Set<string>();
    sources.forEach((item) => item.source.sectors.forEach((sector) => sectors.add(sector)));
    return Array.from(sectors);
  }, [sources]);

  const filteredSources = useMemo(() => {
    const { range } = scoreBuckets.find((bucket) => bucket.value === scoreFilter) ?? scoreBuckets[0];
    const [minScore, maxScore] = range;

    return sources.filter(({ source, reliability_profile }) => {
      const searchMatches =
        search.trim() === "" ||
        source.name.toLowerCase().includes(search.toLowerCase()) ||
        source.organisation.toLowerCase().includes(search.toLowerCase());

      const roleMatches = roleFilter === "all" || source.role === roleFilter;
      const sectorMatches = sectorFilter === "all" || source.sectors.includes(sectorFilter);

      if (!reliability_profile) {
        return searchMatches && roleMatches && sectorMatches && minScore === 0;
      }

      const scoreMatches =
        reliability_profile.reliability_score >= minScore && reliability_profile.reliability_score <= maxScore;

      return searchMatches && roleMatches && sectorMatches && scoreMatches;
    });
  }, [roleFilter, scoreFilter, search, sectorFilter, sources]);

  const aggregateStats = useMemo(() => {
    const evaluated = sources.reduce(
      (acc, item) => {
        if (!item.reliability_profile) return acc;
        return {
          totalEvaluated: acc.totalEvaluated + item.reliability_profile.evaluated_recommendations,
          averageScore: acc.averageScore + item.reliability_profile.reliability_score,
          highPerformers: acc.highPerformers + (item.reliability_profile.reliability_score >= 0.8 ? 1 : 0),
        };
      },
      { totalEvaluated: 0, averageScore: 0, highPerformers: 0 }
    );

    const profiledCount = sources.filter((item) => !!item.reliability_profile).length;

    return {
      totalEvaluated: evaluated.totalEvaluated,
      averageScore: profiledCount ? evaluated.averageScore / profiledCount : undefined,
      highPerformers: evaluated.highPerformers,
      profiledCount,
    };
  }, [sources]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading source reliability…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Reliability</p>
          <h1 className="text-2xl font-semibold text-foreground">Source Reliability Overview</h1>
          <p className="text-sm text-muted-foreground">
            Track accuracy, consistency, and impact for every internal source.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => navigate("/admin/reliability/settings")}>
            Adjust weights
          </Button>
          <Button className="gap-2" onClick={() => navigate("/mandates")}>
            <Shield className="h-4 w-4" />
            Manage outcomes
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Average reliability</CardDescription>
            <CardTitle className="text-3xl">{formatPercent(aggregateStats.averageScore)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Evaluated recommendations</CardDescription>
            <CardTitle className="text-3xl">{aggregateStats.totalEvaluated}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>High reliability sources</CardDescription>
            <CardTitle className="text-3xl">{aggregateStats.highPerformers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Sources profiled</CardDescription>
            <CardTitle className="text-3xl">{aggregateStats.profiledCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[220px]">
              <label className="text-xs font-medium text-muted-foreground">Search</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by source or organisation"
                  className="pl-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
            <div className="min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground">Reliability range</label>
              <Select value={scoreFilter} onValueChange={setScoreFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All scores" />
                </SelectTrigger>
                <SelectContent>
                  {scoreBuckets.map((bucket) => (
                    <SelectItem key={bucket.value} value={bucket.value}>
                      {bucket.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {uniqueRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground">Sector</label>
              <Select value={sectorFilter} onValueChange={setSectorFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All sectors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sectors</SelectItem>
                  {uniqueSectors.map((sector) => (
                    <SelectItem key={sector} value={sector}>
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name & role</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead className="text-center">Reliability</TableHead>
                <TableHead className="text-center">Accuracy</TableHead>
                <TableHead className="text-center">Consistency</TableHead>
                <TableHead className="text-center">Impact</TableHead>
                <TableHead className="text-center">Evaluated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSources.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    No sources match the selected filters.
                  </TableCell>
                </TableRow>
              )}
              {filteredSources.map(({ source, reliability_profile }) => (
                  <TableRow key={source.id}>
                    <TableCell>
                      <div className="font-medium">{source.name}</div>
                      <div className="text-xs text-muted-foreground">{source.role}</div>
                    </TableCell>
                    <TableCell>
                      <div>{source.organisation}</div>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {source.sectors.slice(0, 2).map((sector) => (
                          <Badge key={sector} variant="outline" className="text-xs">
                            {sector}
                          </Badge>
                        ))}
                        {source.sectors.length > 2 && (
                          <span className="text-xs text-muted-foreground">+{source.sectors.length - 2}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {reliability_profile ? (
                        <StatusChip
                          status={`${formatPercent(reliability_profile.reliability_score)}`}
                          variant={getChipVariant(reliability_profile.reliability_score)}
                        />
                      ) : (
                        <Badge variant="outline">Not evaluated</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {reliability_profile ? formatPercent(reliability_profile.components.accuracy) : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {reliability_profile ? formatPercent(reliability_profile.components.consistency) : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {reliability_profile ? formatPercent(reliability_profile.components.impact) : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {reliability_profile?.evaluated_recommendations ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/reliability/sources/${source.id}`)}>
                        View detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
