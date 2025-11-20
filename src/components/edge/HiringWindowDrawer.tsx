import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface HiringWindow {
  quarter: string;
  year: number;
  window: string;
  description: string;
}

interface HiringWindowDrawerProps {
  period: HiringWindow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HiringWindowDrawer({ period, open, onOpenChange }: HiringWindowDrawerProps) {
  const [selectedSegment, setSelectedSegment] = useState("all");

  if (!period) return null;

  const getDetailedCommentary = () => {
    const commentary: Record<string, string[]> = {
      Open: [
        "Strong hiring appetite across multiple sectors",
        "Clients actively seeking senior talent for new initiatives",
        "Budget allocations confirmed for Q1 and Q2",
        "Multiple search mandates in progress with competitive terms"
      ],
      Selective: [
        "Focused hiring for mission-critical roles only",
        "Extended interview processes and increased scrutiny",
        "Budget constraints requiring strong business cases",
        "Preference for proven performers with immediate impact potential"
      ],
      Quiet: [
        "Seasonal slowdown expected across most sectors",
        "Year-end budget freezes in effect",
        "Limited new mandate activity anticipated",
        "Focus on planning and preparation for next quarter"
      ]
    };

    return commentary[period.window] || [];
  };

  const getSuggestedActions = () => {
    const actions: Record<string, string[]> = {
      all: [
        "Prioritize Infrastructure and Real Assets mandates",
        "Engage with top-tier candidates proactively",
        "Focus on firms with confirmed hiring budgets",
        "Prepare comprehensive candidate shortlists"
      ],
      infrastructure: [
        "Target Infrastructure Credit and Debt specialists",
        "Focus on Energy Transition and Renewables expertise",
        "Engage candidates from Big 4 and tier-1 platforms"
      ],
      "real-estate": [
        "Focus on Development and Asset Management roles",
        "Target candidates with ESG and sustainability credentials",
        "Prioritize European market expertise"
      ]
    };

    return actions[selectedSegment] || actions.all;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {period.quarter} {period.year}
          </SheetTitle>
          <SheetDescription>
            <Badge variant={period.window === 'Open' ? 'default' : period.window === 'Selective' ? 'secondary' : 'outline'}>
              {period.window}
            </Badge>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Market Commentary</h3>
            <ul className="space-y-2">
              {getDetailedCommentary().map((comment, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{comment}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Suggested Actions</h3>
              <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Segments</SelectItem>
                  <SelectItem value="infrastructure">Infrastructure</SelectItem>
                  <SelectItem value="real-estate">Real Estate</SelectItem>
                  <SelectItem value="private-equity">Private Equity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ul className="space-y-2">
              {getSuggestedActions().map((action, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
