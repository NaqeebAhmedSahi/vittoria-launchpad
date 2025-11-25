import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, TrendingUp, Users, Activity, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { OrgPatternProfile } from "@/types/similarity";

export default function OrgPatternOverview() {
  const navigate = useNavigate();
  const [pattern, setPattern] = useState<OrgPatternProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrgPattern = async () => {
      try {
        const result = await window.api.source.getOrgPattern();
        if (result.success) {
          setPattern(result.pattern);
        }
      } catch (error) {
        console.error("Error fetching org pattern:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrgPattern();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getTopItems = (distribution: Record<string, number>, limit: number = 5) => {
    return Object.entries(distribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit);
  };

  const getTotalCount = (distribution: Record<string, number>) => {
    return Object.values(distribution).reduce((sum, val) => sum + val, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pattern) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Organization Pattern</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your organization's historical source usage profile
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No data available. Add sources to see your organization pattern.</p>
            <Button className="mt-4" onClick={() => navigate("/admin/sources/manage")}>
              Add Sources
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Organization Pattern</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your organization's historical source usage profile
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/admin/similarity/import-history")}>
            <Upload className="h-4 w-4 mr-2" />
            Import Data
          </Button>
          <Button onClick={() => navigate("/admin/sources")}>
            View Sources
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sources</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pattern.interaction_stats.total_sources}</div>
            <p className="text-xs text-muted-foreground">
              Active in your network
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pattern.interaction_stats.total_interactions}</div>
            <p className="text-xs text-muted-foreground">
              Recommendations recorded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Source</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pattern.interaction_stats.avg_interactions_per_source.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              Interactions per source
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Roles Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Role Distribution</CardTitle>
            <CardDescription>
              Most common source roles in your network
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {getTopItems(pattern.roles_distribution).map(([role, count]) => {
              const total = getTotalCount(pattern.roles_distribution);
              const percentage = (count / total) * 100;
              return (
                <div key={role} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{role}</span>
                    <span className="text-muted-foreground">
                      {count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Industry Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Industry Distribution</CardTitle>
            <CardDescription>
              Primary sectors covered by your sources
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {getTopItems(pattern.industry_distribution).map(([industry, count]) => {
              const total = getTotalCount(pattern.industry_distribution);
              const percentage = (count / total) * 100;
              return (
                <div key={industry} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{industry}</span>
                    <span className="text-muted-foreground">
                      {count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Geography Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Geography Distribution</CardTitle>
            <CardDescription>
              Regional coverage of your source network
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {getTopItems(pattern.geography_distribution).map(([geography, count]) => {
              const total = getTotalCount(pattern.geography_distribution);
              const percentage = (count / total) * 100;
              return (
                <div key={geography} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{geography}</span>
                    <span className="text-muted-foreground">
                      {count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Seniority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Seniority Distribution</CardTitle>
            <CardDescription>
              Seniority levels across your source base
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {getTopItems(pattern.seniority_distribution).map(([seniority, count]) => {
              const total = getTotalCount(pattern.seniority_distribution);
              const percentage = (count / total) * 100;
              return (
                <div key={seniority} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{seniority}</span>
                    <span className="text-muted-foreground">
                      {count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Last Updated Info */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Pattern last updated: {formatDate(pattern.last_updated_at)}
            </span>
            <Badge variant="outline" className="text-xs">
              ID: {pattern.id}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
