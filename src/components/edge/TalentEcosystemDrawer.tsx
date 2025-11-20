import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PlatformType {
  id: string;
  name: string;
  description: string;
  exampleFirms: string[];
  keyRoles: string[];
}

interface TalentEcosystemDrawerProps {
  platform: PlatformType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TalentEcosystemDrawer({ platform, open, onOpenChange }: TalentEcosystemDrawerProps) {
  const navigate = useNavigate();

  if (!platform) return null;

  const handleViewMandates = () => {
    navigate(`/mandates?segment=${encodeURIComponent(platform.id)}`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{platform.name}</SheetTitle>
          <SheetDescription>{platform.description}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Key Roles</h3>
            <ul className="space-y-2">
              {platform.keyRoles.map((role, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{role}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button onClick={handleViewMandates} className="w-full">
            View Relevant Mandates
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
