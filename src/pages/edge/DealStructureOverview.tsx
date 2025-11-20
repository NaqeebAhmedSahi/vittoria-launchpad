import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EdgeDataService } from "@/services/edgeDataService";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function DealStructureOverview() {
  const dealStructures = EdgeDataService.getDealStructures();
  const navigate = useNavigate();
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  const toggleExpanded = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(idx)) {
      newExpanded.delete(idx);
    } else {
      newExpanded.add(idx);
    }
    setExpandedCards(newExpanded);
  };

  const handleDealTypeClick = (dealType: string) => {
    navigate(`/deals?deal_type=${encodeURIComponent(dealType.toLowerCase().replace(/ /g, '-'))}`);
  };

  const handleSectorClick = (sector: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/deals?sector=${encodeURIComponent(sector)}`);
  };

  const handleRegionClick = (region: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/deals?region=${encodeURIComponent(region)}`);
  };

  const mockDeals = [
    { name: "Project Atlas", sector: "Infrastructure", region: "Europe", stage: "Due Diligence" },
    { name: "Nordic Energy Refi", sector: "Renewables", region: "Europe", stage: "Negotiation" },
    { name: "APAC Digital Assets", sector: "Digital Infrastructure", region: "APAC", stage: "Closing" }
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <BarChart className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Deal Structure Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aggregated deal types, sectors, and regions
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {dealStructures.map((structure, idx) => (
          <Card 
            key={idx} 
            className="hover:border-primary transition-colors cursor-pointer"
            onClick={() => handleDealTypeClick(structure.dealType)}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-muted rounded-lg">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="font-semibold text-foreground">{structure.dealType}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {structure.count} deals tracked
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          Sectors:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {structure.sectors.map((sector) => (
                            <Badge 
                              key={sector} 
                              variant="outline" 
                              className="text-xs cursor-pointer hover:bg-primary/10 transition-colors"
                              onClick={(e) => handleSectorClick(sector, e)}
                            >
                              {sector}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          Regions:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {structure.regions.map((region) => (
                            <Badge 
                              key={region} 
                              variant="secondary" 
                              className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
                              onClick={(e) => handleRegionClick(region, e)}
                            >
                              {region}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {expandedCards.has(idx) && (
                        <div className="pt-3 border-t">
                          <div className="text-xs font-medium text-muted-foreground mb-2">
                            Sample Deals:
                          </div>
                          <div className="space-y-2">
                            {mockDeals.map((deal, dealIdx) => (
                              <div key={dealIdx} className="p-2 bg-muted/50 rounded text-xs">
                                <div className="font-medium text-foreground">{deal.name}</div>
                                <div className="text-muted-foreground mt-1">
                                  {deal.sector} • {deal.region} • {deal.stage}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-2">
                  <div>
                    <div className="text-3xl font-bold text-primary">
                      {structure.count}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      deals
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => toggleExpanded(idx, e)}
                    className="flex items-center gap-1"
                  >
                    {expandedCards.has(idx) ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        <span className="text-xs">Hide</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        <span className="text-xs">Details</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> All data is fully aggregated. No individual deal names, 
            valuations, or client-specific details are shown.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
