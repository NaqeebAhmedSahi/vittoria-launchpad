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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { TagInputField } from "@/components/TagInputField";

interface FirmOption {
  id: number;
  name: string;
}

interface MandateEditData {
  id: number;
  name: string;
  firm_id: number;
  location?: string | null;
  primary_sector?: string | null;
  sectors: string[];
  functions: string[];
  asset_classes: string[];
  regions: string[];
  seniority_min?: string | null;
  seniority_max?: string | null;
  status: string;
  raw_brief?: string | null;
}

interface MandateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  mode?: "create" | "edit";
  initialData?: MandateEditData;
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
  const [firmId, setFirmId] = useState<string>("");
  const [location, setLocation] = useState("");
  const [primarySector, setPrimarySector] = useState("");
  const [sectors, setSectors] = useState<string[]>([]);
  const [functionsVal, setFunctionsVal] = useState<string[]>([]);
  const [assetClasses, setAssetClasses] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [seniorityMin, setSeniorityMin] = useState("");
  const [seniorityMax, setSeniorityMax] = useState("");
  const [status, setStatus] = useState<string>("OPEN");
  const [rawBrief, setRawBrief] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const safeFirms: FirmOption[] = firms ?? [];

  useEffect(() => {
    if (open && mode === "edit" && initialData) {
      setName(initialData.name || "");
      setFirmId(String(initialData.firm_id));
      setLocation(initialData.location || "");
      setPrimarySector(initialData.primary_sector || "");
      setSectors(initialData.sectors || []);
      setFunctionsVal(initialData.functions || []);
      setAssetClasses(initialData.asset_classes || []);
      setRegions(initialData.regions || []);
      setSeniorityMin(initialData.seniority_min || "");
      setSeniorityMax(initialData.seniority_max || "");
      setStatus(initialData.status || "OPEN");
      setRawBrief(initialData.raw_brief || "");
      setErrors({});
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
    setSectors([]);
    setFunctionsVal([]);
    setAssetClasses([]);
    setRegions([]);
    setSeniorityMin("");
    setSeniorityMax("");
    setStatus("OPEN");
    setRawBrief("");
    setErrors({});
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) nextErrors.name = "Mandate name is required.";
    if (safeFirms.length > 0 && !firmId)
      nextErrors.firm_id = "Client firm is required.";
    if (!location.trim()) nextErrors.location = "Location is required.";
    if (!primarySector.trim())
      nextErrors.primary_sector = "Primary sector is required.";
    if (!sectors.length)
      nextErrors.sectors = "At least one sector is required.";
    if (!functionsVal.length)
      nextErrors.functions = "At least one function is required.";
    if (!assetClasses.length)
      nextErrors.asset_classes = "At least one asset class is required.";
    if (!regions.length)
      nextErrors.regions = "At least one region is required.";
    if (!seniorityMin.trim())
      nextErrors.seniority_min = "Seniority min is required.";
    if (!seniorityMax.trim())
      nextErrors.seniority_max = "Seniority max is required.";
    if (!status) nextErrors.status = "Status is required.";

    setErrors(nextErrors);
    return nextErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const payload = {
      name: name.trim(),
      firm_id: safeFirms.length > 0 ? Number(firmId) : undefined,
      location: location.trim(),
      primary_sector: primarySector.trim(),
      sectors,
      functions: functionsVal,
      asset_classes: assetClasses,
      regions,
      seniority_min: seniorityMin.trim(),
      seniority_max: seniorityMax.trim(),
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
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto pt-6 pb-6">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={status} onValueChange={(val) => setStatus(val)}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-sm text-destructive">{errors.status}</p>
              )}
            </div>
          </div>

          {/* Row 2: Firm + location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firm_id">
                Client Firm {safeFirms.length > 0 && "*"}
              </Label>

              {safeFirms.length === 0 ? (
                <>
                  <Input
                    id="firm_id"
                    disabled
                    placeholder="No firms available. Create a firm first."
                  />
                  {errors.firm_id && (
                    <p className="text-sm text-destructive">{errors.firm_id}</p>
                  )}
                </>
              ) : (
                <>
                  <Select
                    value={firmId}
                    onValueChange={(val) => setFirmId(val)}
                  >
                    <SelectTrigger id="firm_id">
                      <SelectValue placeholder="Select firm" />
                    </SelectTrigger>
                    <SelectContent>
                      {safeFirms.map((firm) => (
                        <SelectItem key={firm.id} value={String(firm.id)}>
                          {firm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.firm_id && (
                    <p className="text-sm text-destructive">{errors.firm_id}</p>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., London, UK"
                required
              />
              {errors.location && (
                <p className="text-sm text-destructive">{errors.location}</p>
              )}
            </div>
          </div>

          {/* Row 3: Primary sector + sectors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary_sector">Primary Sector *</Label>
              <Input
                id="primary_sector"
                value={primarySector}
                onChange={(e) => setPrimarySector(e.target.value)}
                placeholder="e.g., ECM, M&A, FIG"
                required
              />
              {errors.primary_sector && (
                <p className="text-sm text-destructive">
                  {errors.primary_sector}
                </p>
              )}
            </div>
            <TagInputField
              id="sectors"
              label="Sector Tags"
              tags={sectors}
              onChange={setSectors}
              placeholder="Add a sector and press Add/Enter"
              required
              error={errors.sectors}
            />
          </div>

          {/* Row 4: Functions / Asset classes */}
          <div className="grid grid-cols-2 gap-4">
            <TagInputField
              id="functions"
              label="Functions"
              tags={functionsVal}
              onChange={setFunctionsVal}
              placeholder="e.g., Origination"
              required
              error={errors.functions}
            />
            <TagInputField
              id="asset_classes"
              label="Asset Classes"
              tags={assetClasses}
              onChange={setAssetClasses}
              placeholder="e.g., Public Equity"
              required
              error={errors.asset_classes}
            />
          </div>

          {/* Row 5: Regions / Seniority */}
          <div className="grid grid-cols-3 gap-4">
            <TagInputField
              id="regions"
              label="Regions"
              tags={regions}
              onChange={setRegions}
              placeholder="e.g., UK, EMEA"
              required
              error={errors.regions}
              className="col-span-1"
            />
            <div className="space-y-2">
              <Label htmlFor="seniority_min">Seniority Min *</Label>
              <Input
                id="seniority_min"
                value={seniorityMin}
                onChange={(e) => setSeniorityMin(e.target.value)}
                placeholder="e.g., VP"
                required
              />
              {errors.seniority_min && (
                <p className="text-sm text-destructive">
                  {errors.seniority_min}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="seniority_max">Seniority Max *</Label>
              <Input
                id="seniority_max"
                value={seniorityMax}
                onChange={(e) => setSeniorityMax(e.target.value)}
                placeholder="e.g., MD"
                required
              />
              {errors.seniority_max && (
                <p className="text-sm text-destructive">
                  {errors.seniority_max}
                </p>
              )}
            </div>
          </div>

          {/* Row 6: Scope / Notes (optional for now) */}
          {/*
          <div className="space-y-2">
            <Label htmlFor="raw_brief">Scope & Notes *</Label>
            <Textarea
              id="raw_brief"
              value={rawBrief}
              onChange={(e) => setRawBrief(e.target.value)}
              rows={4}
              placeholder="Paste client brief, internal notes, nuances, etc."
              required
            />
            {errors.raw_brief && (
              <p className="text-sm text-destructive">{errors.raw_brief}</p>
            )}
          </div>
          */}

          <DialogFooter className="pt-2">
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

