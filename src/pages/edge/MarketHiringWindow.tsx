import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, Minus, TrendingDown } from "lucide-react";
import { useState, useEffect } from "react";
import type { MarketHiringWindow as HiringWindow } from "@/types/intelligence";

export default function MarketHiringWindow() {
  const [windows, setWindows] = useState<HiringWindow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWindows();
  }, []);

  const loadWindows = async () => {
    try {
      setLoading(true);
      const data = await window.electron.invoke("intelligence:get-hiring-windows");
      setWindows(data);
    } catch (error) {
      console.error("Failed to load hiring windows:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "open":
        return {
          variant: "default" as const,
          icon: TrendingUp,
          color: "text-green-600"
        };
      case "selective":
        return {
          variant: "secondary" as const,
          icon: Minus,
          color: "text-yellow-600"
        };
      case "quiet":
        return {
          variant: "outline" as const,
          icon: TrendingDown,
          color: "text-gray-500"
        };
      default:
        return {
          variant: "outline" as const,
          icon: Minus,
          color: "text-gray-500"
        };
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Market Hiring Window</h1>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          Market Hiring Window
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quarterly outlook for executive hiring activity across sectors
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {windows.map((window) => {
          const config = getStatusConfig(window.status);
          const Icon = config.icon;

          return (
            <Card key={window.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">{window.label}</CardTitle>
                  </div>
                  <Badge variant={config.variant} className="flex items-center gap-1">
                    <Icon className={`h-3 w-3 ${config.color}`} />
                    {window.status.charAt(0).toUpperCase() + window.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{window.summary}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Key */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-sm">Hiring Window Key</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Badge variant="default" className="flex items-center gap-1 mt-0.5">
                <TrendingUp className="h-3 w-3" />
                Open
              </Badge>
              <div className="flex-1">
                <div className="font-medium">Open</div>
                <div className="text-muted-foreground">
                  Strong hiring activity expected. Firms actively filling critical roles and planning new hires.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="secondary" className="flex items-center gap-1 mt-0.5">
                <Minus className="h-3 w-3" />
                Selective
              </Badge>
              <div className="flex-1">
                <div className="font-medium">Selective</div>
                <div className="text-muted-foreground">
                  Focused hiring. Firms prioritizing strategic additions and high-impact roles only.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="flex items-center gap-1 mt-0.5">
                <TrendingDown className="h-3 w-3" />
                Quiet
              </Badge>
              <div className="flex-1">
                <div className="font-medium">Quiet</div>
                <div className="text-muted-foreground">
                  Limited mandate activity. Seasonal slowdown with minimal new hiring expected.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
