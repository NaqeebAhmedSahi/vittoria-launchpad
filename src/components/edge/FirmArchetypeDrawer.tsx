import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface FirmArchetype {
  id: string;
  name: string;
  description: string;
  characteristics: string[];
  exampleFirms: string[];
}

interface FirmArchetypeDrawerProps {
  archetype: FirmArchetype | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FirmArchetypeDrawer({ archetype, open, onOpenChange }: FirmArchetypeDrawerProps) {
  const navigate = useNavigate();

  if (!archetype) return null;

  const handleViewMatchingFirms = () => {
    navigate(`/firms?archetype=${encodeURIComponent(archetype.id)}`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{archetype.name}</SheetTitle>
          <SheetDescription>{archetype.description}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Key Characteristics</h3>
            <ul className="space-y-2">
              {archetype.characteristics.map((char, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{char}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Example Firms</h3>
            <div className="flex flex-wrap gap-2">
              {archetype.exampleFirms.map((firm, idx) => (
                <Badge key={idx} variant="secondary">
                  {firm}
                </Badge>
              ))}
            </div>
          </div>

          <Button onClick={handleViewMatchingFirms} className="w-full">
            View Matching Firms
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
