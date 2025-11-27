import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateSourceRequest } from "@/types/similarity";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLES = [
  "Partner",
  "Managing Director",
  "Principal",
  "Vice President",
  "Senior Associate",
  "Associate",
  "Analyst",
];

const SENIORITY_LEVELS = [
  "Partner",
  "Managing Director",
  "Principal",
  "Vice President",
  "Senior Associate",
  "Associate",
  "Analyst",
];

const AVAILABLE_SECTORS = [
  "Technology",
  "Healthcare",
  "Financial Services",
  "Consumer",
  "Infrastructure",
  "Industrial",
  "Energy",
  "SaaS",
  "AI/ML",
  "Biotech",
  "Life Sciences",
  "Fintech",
  "E-commerce",
  "Manufacturing",
  "Logistics",
  "Banking",
  "Insurance",
  "Enterprise Software",
  "Retail",
  "Automotive",
  "Utilities",
];

const AVAILABLE_GEOGRAPHIES = [
  "North America",
  "Europe",
  "Asia",
  "Middle East",
  "Latin America",
  "Africa",
  "Australia",
];

// validators
const isAlphabeticName = (value: string): boolean =>
  /^[A-Za-z\s.'\-]+$/.test(value.trim());

const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export default function SourceManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState<CreateSourceRequest>({
    name: "",
    email: "",
    role: "",
    organisation: "",
    sectors: [],
    geographies: [],
    seniority_level: "",
  });

  const [sectorInput, setSectorInput] = useState("");
  const [geographyInput, setGeographyInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const validationErrors: Record<string, string> = {};

    // Name: required + alphabetic only
    if (!formData.name.trim()) {
      validationErrors.name = "Name is required.";
    } else if (!isAlphabeticName(formData.name)) {
      validationErrors.name = "Name must contain only letters (no numbers).";
    }

    // Email: optional, but if present must be valid
    if (formData.email.trim() && !isValidEmail(formData.email)) {
      validationErrors.email = "Please enter a valid email address.";
    }

    // Role: required
    if (!formData.role) {
      validationErrors.role = "Role is required.";
    }

    // Organisation: required
    if (!formData.organisation.trim()) {
      validationErrors.organisation = "Organisation is required.";
    }

    // Seniority: required
    if (!formData.seniority_level) {
      validationErrors.seniority_level = "Seniority level is required.";
    }

    // Sectors: at least one
    if (formData.sectors.length === 0) {
      validationErrors.sectors = "Please add at least one sector.";
    }

    // Geographies: at least one
    if (formData.geographies.length === 0) {
      validationErrors.geographies = "Please add at least one geography.";
    }

    setErrors(validationErrors);
    return validationErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length) {
      toast({
        title: "Validation Error",
        description: "Please fix the highlighted fields before saving.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await window.api.source.create(formData);

      if (result.success) {
        toast({
          title: "Source Created",
          description: `${formData.name} has been added to the source directory`,
        });
        navigate("/admin/sources");
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create source",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating source:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while creating the source",
        variant: "destructive",
      });
    }
  };

  const addSector = (sector: string) => {
    if (sector && !formData.sectors.includes(sector)) {
      setFormData({ ...formData, sectors: [...formData.sectors, sector] });
      if (errors.sectors) clearError("sectors");
    }
    setSectorInput("");
  };

  const removeSector = (sector: string) => {
    setFormData({
      ...formData,
      sectors: formData.sectors.filter((s) => s !== sector),
    });
  };

  const addGeography = (geography: string) => {
    if (geography && !formData.geographies.includes(geography)) {
      setFormData({
        ...formData,
        geographies: [...formData.geographies, geography],
      });
      if (errors.geographies) clearError("geographies");
    }
    setGeographyInput("");
  };

  const removeGeography = (geography: string) => {
    setFormData({
      ...formData,
      geographies: formData.geographies.filter((g) => g !== geography),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Source Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add or update source records for similarity scoring
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin/sources")}>
          View All Sources
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Create New Source</CardTitle>
            <CardDescription>
              Enter source details to build your organization's source profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Sarah Chen"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    clearError("name");
                  }}
                  required
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g., sarah.chen@example.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    clearError("email");
                  }}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">
                  Role <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => {
                    setFormData({ ...formData, role: value });
                    clearError("role");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-destructive">{errors.role}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="seniority">
                  Seniority Level <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.seniority_level}
                  onValueChange={(value) => {
                    setFormData({ ...formData, seniority_level: value });
                    clearError("seniority_level");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select seniority" />
                  </SelectTrigger>
                  <SelectContent>
                    {SENIORITY_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.seniority_level && (
                  <p className="text-sm text-destructive">
                    {errors.seniority_level}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organisation">
                Organisation <span className="text-red-500">*</span>
              </Label>
              <Input
                id="organisation"
                placeholder="e.g., TechVentures Capital"
                value={formData.organisation}
                onChange={(e) => {
                  setFormData({ ...formData, organisation: e.target.value });
                  clearError("organisation");
                }}
                required
              />
              {errors.organisation && (
                <p className="text-sm text-destructive">
                  {errors.organisation}
                </p>
              )}
            </div>

            {/* Sectors */}
            <div className="space-y-2">
              <Label>
                Sectors <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Select
                  value={sectorInput}
                  onValueChange={addSector}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Add sectors" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_SECTORS.filter(
                      (s) => !formData.sectors.includes(s)
                    ).map((sector) => (
                      <SelectItem key={sector} value={sector}>
                        {sector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.sectors.map((sector) => (
                  <Badge key={sector} variant="secondary" className="gap-1">
                    {sector}
                    <button
                      type="button"
                      onClick={() => removeSector(sector)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {formData.sectors.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No sectors added yet
                  </p>
                )}
              </div>
              {errors.sectors && (
                <p className="text-sm text-destructive">{errors.sectors}</p>
              )}
            </div>

            {/* Geographies */}
            <div className="space-y-2">
              <Label>
                Geographies <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Select
                  value={geographyInput}
                  onValueChange={addGeography}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Add geographies" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_GEOGRAPHIES.filter(
                      (g) => !formData.geographies.includes(g)
                    ).map((geography) => (
                      <SelectItem key={geography} value={geography}>
                        {geography}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.geographies.map((geography) => (
                  <Badge
                    key={geography}
                    variant="secondary"
                    className="gap-1"
                  >
                    {geography}
                    <button
                      type="button"
                      onClick={() => removeGeography(geography)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {formData.geographies.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No geographies added yet
                  </p>
                )}
              </div>
              {errors.geographies && (
                <p className="text-sm text-destructive">
                  {errors.geographies}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Create Source
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/sources")}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
