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
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- Simple validators ---
const isAlphabeticName = (value: string): boolean => {
  // letters, spaces and a few punctuation chars allowed
  return /^[A-Za-z\s.'\-&]+$/.test(value.trim());
};

const isValidUrl = (value: string): boolean => {
  try {
    const url = new URL(value.trim());
    // basic guard: must have protocol + hostname
    return !!url.protocol && !!url.hostname;
  } catch {
    return false;
  }
};

// If you have these types elsewhere, adjust/remove these local defs
export interface FirmFormValues {
  name: string;
  short_name?: string;
  sector_focus: string[];
  asset_classes: string[];
  regions: string[];
  platform_type?: string;
  website?: string;
  notes_text?: string;
}

export interface Firm {
  id: number;
  name: string;
  short_name?: string | null;
  sector_focus: string[];
  asset_classes: string[];
  regions: string[];
  platform_type?: string | null;
  website?: string | null;
  notes_text?: string | null;
  created_at: string;
  updated_at: string;
}

interface FirmFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: Firm;
  onSubmit: (data: FirmFormValues) => void;
}

export function FirmFormDialog({
                                 open,
                                 onOpenChange,
                                 mode,
                                 initialData,
                                 onSubmit,
                               }: FirmFormDialogProps) {
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [sectorFocus, setSectorFocus] = useState("");
  const [assetClasses, setAssetClasses] = useState("");
  const [regions, setRegions] = useState("");
  const [platformType, setPlatformType] = useState<string>("none");
  const [website, setWebsite] = useState("");
  const [notesText, setNotesText] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing
  useEffect(() => {
    if (open && mode === "edit" && initialData) {
      setName(initialData.name || "");
      setShortName(initialData.short_name || "");
      setSectorFocus(initialData.sector_focus.join(", "));
      setAssetClasses(initialData.asset_classes.join(", "));
      setRegions(initialData.regions.join(", "));
      setPlatformType(initialData.platform_type || "none");
      setWebsite(initialData.website || "");
      setNotesText(initialData.notes_text || "");
      setErrors({});
    }

    if (open && mode === "create" && !initialData) {
      resetForm();
    }
  }, [open, mode, initialData]);

  const resetForm = () => {
    setName("");
    setShortName("");
    setSectorFocus("");
    setAssetClasses("");
    setRegions("");
    setPlatformType("none");
    setWebsite("");
    setNotesText("");
    setErrors({});
  };

  const parseCsv = (value: string): string[] =>
    value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    // Firm name: required + letters only
    if (!name.trim()) {
      nextErrors.name = "Firm name is required.";
    } else if (!isAlphabeticName(name)) {
      nextErrors.name = "Firm name must contain only letters and spaces.";
    }

    // Short name: optional but if present, letters only
    if (shortName.trim() && !isAlphabeticName(shortName)) {
      nextErrors.short_name = "Short name must contain only letters and spaces.";
    }

    // Website: optional but if present must be a valid URL
    if (website.trim() && !isValidUrl(website)) {
      nextErrors.website = "Please enter a valid website URL (e.g. https://example.com).";
    }

    // Sector focus: required (at least one)
    if (parseCsv(sectorFocus).length === 0) {
      nextErrors.sector_focus = "Sector focus is required (add at least one sector).";
    }

    // Asset classes: required
    if (parseCsv(assetClasses).length === 0) {
      nextErrors.asset_classes = "Asset classes are required (add at least one).";
    }

    // Regions: required
    if (parseCsv(regions).length === 0) {
      nextErrors.regions = "Regions are required (add at least one).";
    }

    setErrors(nextErrors);
    return nextErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const normalizedPlatformType =
      platformType === "none" ? undefined : platformType;

    const payload: FirmFormValues = {
      name: name.trim(),
      short_name: shortName.trim() || undefined,
      sector_focus: parseCsv(sectorFocus),
      asset_classes: parseCsv(assetClasses),
      regions: parseCsv(regions),
      platform_type: normalizedPlatformType,
      website: website.trim() || undefined,
      notes_text: notesText.trim() || undefined,
    };

    onSubmit(payload);

    if (mode === "create") {
      resetForm();
    }
  };

  const title = mode === "create" ? "New Firm" : "Edit Firm";

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) resetForm();
        onOpenChange(value);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Name + Short Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Firm Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="short_name">Short Name</Label>
              <Input
                id="short_name"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="Optional, e.g. GS, MS"
              />
              {errors.short_name && (
                <p className="text-sm text-destructive">{errors.short_name}</p>
              )}
            </div>
          </div>

          {/* Row 2: Platform + Website */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="platform_type">Platform Type</Label>
              <Select
                value={platformType}
                onValueChange={(val) => setPlatformType(val)}
              >
                <SelectTrigger id="platform_type">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="Bulge Bracket">
                    Bulge Bracket
                  </SelectItem>
                  <SelectItem value="Boutique">Boutique</SelectItem>
                  <SelectItem value="Asset Manager">
                    Asset Manager
                  </SelectItem>
                  <SelectItem value="Private Equity">
                    Private Equity
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
              />
              {errors.website && (
                <p className="text-sm text-destructive">{errors.website}</p>
              )}
            </div>
          </div>

          {/* Row 3: Sector / Asset classes */}
          <div className="space-y-2">
            <Label htmlFor="sector_focus">
              Sector Focus{" "}
              <span className="text-xs text-muted-foreground">
                (comma separated)
              </span>
            </Label>
            <Input
              id="sector_focus"
              value={sectorFocus}
              onChange={(e) => setSectorFocus(e.target.value)}
              placeholder="e.g. TMT, Healthcare, FIG"
              required
            />
            {errors.sector_focus && (
              <p className="text-sm text-destructive">
                {errors.sector_focus}
              </p>
            )}
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
              placeholder="e.g. Public Equity, Private Equity, Credit"
              required
            />
            {errors.asset_classes && (
              <p className="text-sm text-destructive">
                {errors.asset_classes}
              </p>
            )}
          </div>

          {/* Row 4: Regions */}
          <div className="space-y-2">
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
              placeholder="e.g. UK, EMEA, Americas, APAC"
              required
            />
            {errors.regions && (
              <p className="text-sm text-destructive">{errors.regions}</p>
            )}
          </div>

          {/* Row 5: Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes_text">Notes</Label>
            <Textarea
              id="notes_text"
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              rows={4}
              placeholder="Internal notes about the firm, coverage, nuances, etc."
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
              {mode === "create" ? "Create Firm" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
