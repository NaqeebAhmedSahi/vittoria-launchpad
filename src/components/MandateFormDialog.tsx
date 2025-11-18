import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";

// Minimal types used inside this component.
// These don't need to perfectly match your global types, just the fields we use.
interface FirmOption {
  id: number;
  name: string;
}

interface MandateEditData {
  id: number;
  name: string;
  firm_id: number;
  location: string | null;
  primary_sector: string | null;
  sectors: string[];
  functions: string[];
  asset_classes: string[];
  regions: string[];
  seniority_min: string | null;
  seniority_max: string | null;
  status: string;
  raw_brief: string | null;
}

interface MandateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;

  // optional for edit flow
  mode?: "create" | "edit";
  initialData?: MandateEditData;

  // optional so TopBar can still use this without passing firms
  firms?: FirmOption[];
}

export function MandateFormDialog({
  open,
  onOpenChange,
  onSubmit,
  mode = "create",
  initialData,
  firms,
}: MandateFormDialogProps) {
  const [name, setName] = useState("");
  const [firmId, setFirmId] = useState<string>(""); // Select stores string
  const [location, setLocation] = useState("");
  const [primarySector, setPrimarySector] = useState("");
  const [sectors, setSectors] = useState("");
  const [functionsVal, setFunctionsVal] = useState("");
  const [assetClasses, setAssetClasses] = useState("");
  const [regions, setRegions] = useState("");
  const [seniorityMin, setSeniorityMin] = useState("");
  const [seniorityMax, setSeniorityMax] = useState("");
  const [status, setStatus] = useState<string>("OPEN");
  const [rawBrief, setRawBrief] = useState("");

  const safeFirms: FirmOption[] = firms ?? [];

  useEffect(() => {
    if (open && mode === "edit" && initialData) {
      setName(initialData.name || "");
      setFirmId(String(initialData.firm_id));
      setLocation(initialData.location || "");
      setPrimarySector(initialData.primary_sector || "");
      setSectors((initialData.sectors || []).join(", "));
      setFunctionsVal((initialData.functions || []).join(", "));
      setAssetClasses((initialData.asset_classes || []).join(", "));
      setRegions((initialData.regions || []).join(", "));
      setSeniorityMin(initialData.seniority_min || "");
      setSeniorityMax(initialData.seniority_max || "");
      setStatus(initialData.status || "OPEN");
      setRawBrief(initialData.raw_brief || "");
    }

    if (open && mode === "create" && !initialData) {
      resetForm();
    }
  }, [open, mode, initialData]);

  const resetForm = () => {
    setName("");
    setFirmId("");
    setLocation("");
    setPrimarySector("");
    setSectors("");
    setFunctionsVal("");
    setAssetClasses("");
    setRegions("");
    setSeniorityMin("");
    setSeniorityMax("");
    setStatus("OPEN");
    setRawBrief("");
  };

  const parseCsv = (value: string): string[] =>
    value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // If no firms provided (e.g. from TopBar), we can't set firm_id;
    // You could extend this later to let user type a firm name, etc.
    if (!firmId && safeFirms.length > 0) {
      return; // basic guard
    }

    const payload = {
      name: name.trim(),
      // If you use this from TopBar without firms, you'll need to adapt this field later.
      firm_id: safeFirms.length > 0 ? Number(firmId) : undefined,
      location: location.trim() || undefined,
      primary_sector: primarySector.trim() || undefined,
      sectors: parseCsv(sectors),
      functions: parseCsv(functionsVal),
      asset_classes: parseCsv(assetClasses),
      regions: parseCsv(regions),
      seniority_min: seniorityMin.trim() || undefined,
      seniority_max: seniorityMax.trim() || undefined,
      status: status || "OPEN",
      raw_brief: rawBrief.trim() || undefined,
    };

    onSubmit(payload);

    if (mode === "create") {
      resetForm();
    }
  };

  const title = mode === "create" ? "New Mandate" : "Edit Mandate";

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) resetForm();
        onOpenChange(value);
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Mandate name + status */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">Mandate Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g., ECM - Global Bank - London"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={status}
                onValueChange={(val) => setStatus(val)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Firm + location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firm_id">
                Client Firm {safeFirms.length > 0 && "*"}
              </Label>

              {safeFirms.length === 0 ? (
                <Input
                  id="firm_id"
                  disabled
                  placeholder="No firms available. Create a firm first."
                />
              ) : (
                <Select
                  value={firmId}
                  onValueChange={(val) => setFirmId(val)}
                >
                  <SelectTrigger id="firm_id">
                    <SelectValue placeholder="Select firm" />
                  </SelectTrigger>
                  <SelectContent>
                    {safeFirms.map((firm) => (
                      <SelectItem
                        key={firm.id}
                        value={String(firm.id)}
                      >
                        {firm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., London, UK"
              />
            </div>
          </div>

          {/* Row 3: Primary sector + sectors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary_sector">Primary Sector</Label>
              <Input
                id="primary_sector"
                value={primarySector}
                onChange={(e) => setPrimarySector(e.target.value)}
                placeholder="e.g., ECM, M&A, FIG"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sectors">
                Sector Tags{" "}
                <span className="text-xs text-muted-foreground">
                  (comma separated)
                </span>
              </Label>
              <Input
                id="sectors"
                value={sectors}
                onChange={(e) => setSectors(e.target.value)}
                placeholder="e.g., TMT, Healthcare, FIG"
              />
            </div>
          </div>

          {/* Row 4: Functions / Asset classes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="functions">
                Functions{" "}
                <span className="text-xs text-muted-foreground">
                  (comma separated)
                </span>
              </Label>
              <Input
                id="functions"
                value={functionsVal}
                onChange={(e) => setFunctionsVal(e.target.value)}
                placeholder="e.g., Origination, Coverage, Syndicate"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset_classes">
                Asset Classes{" "}
                <span className="text-xs text-muted-foreground">
                  (comma separated)
                </span>
              </Label>
              <Input
                id="asset_classes"
                value={assetClasses}
                onChange={(e) => setAssetClasses(e.target.value)}
                placeholder="e.g., Public Equity, Private Equity, Credit"
              />
            </div>
          </div>

          {/* Row 5: Regions / Seniority */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2 col-span-1">
              <Label htmlFor="regions">
                Regions{" "}
                <span className="text-xs text-muted-foreground">
                  (comma separated)
                </span>
              </Label>
              <Input
                id="regions"
                value={regions}
                onChange={(e) => setRegions(e.target.value)}
                placeholder="e.g., UK, EMEA, Americas, APAC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seniority_min">Seniority Min</Label>
              <Input
                id="seniority_min"
                value={seniorityMin}
                onChange={(e) => setSeniorityMin(e.target.value)}
                placeholder="e.g., VP"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seniority_max">Seniority Max</Label>
              <Input
                id="seniority_max"
                value={seniorityMax}
                onChange={(e) => setSeniorityMax(e.target.value)}
                placeholder="e.g., MD"
              />
            </div>
          </div>

          {/* Row 6: Scope / Notes */}
          <div className="space-y-2">
            <Label htmlFor="raw_brief">Scope & Notes</Label>
            <Textarea
              id="raw_brief"
              value={rawBrief}
              onChange={(e) => setRawBrief(e.target.value)}
              rows={4}
              placeholder="Paste client brief, internal notes, nuances, etc."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {mode === "create" ? "Create Mandate" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
