import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { useState, useEffect } from "react";

interface Person {
  id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  firm_id?: number | null;
  team_id?: number | null;
  role?: string | null;
  linkedin_url?: string | null;
}

interface Firm {
  id: number;
  name: string;
}

interface Team {
  id: number;
  name: string;
}

interface PersonFormDialogProps {
  open: boolean;
  onClose: (shouldRefresh: boolean) => void;
  person?: Person | null;
  firms: Firm[];
  teams: Team[];
}

// ---- validators ----
const isAlphabeticName = (value: string): boolean => {
  // letters + spaces + kuch normal chars
  return /^[A-Za-z\s.'\-]+$/.test(value.trim());
};

const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
};

const isNumericPhone = (value: string): boolean => {
  // sirf digits, spaces, +, -, ()
  if (!value.trim()) return true;
  return /^[0-9+\-\s()]+$/.test(value.trim());
};

const isValidLinkedInUrl = (value: string): boolean => {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.hostname.toLowerCase().includes("linkedin.com");
  } catch {
    return false;
  }
};

export function PersonFormDialog({ open, onClose, person, firms, teams }: PersonFormDialogProps) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    firm_id: "",
    team_id: "",
    role: "",
    linkedin_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (person) {
      setFormData({
        first_name: person.first_name || "",
        last_name: person.last_name || "",
        email: person.email || "",
        phone: person.phone || "",
        firm_id: person.firm_id?.toString() || "",
        team_id: person.team_id?.toString() || "",
        role: person.role || "",
        linkedin_url: person.linkedin_url || "",
      });
    } else {
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        firm_id: "",
        team_id: "",
        role: "",
        linkedin_url: "",
      });
    }
    setErrors({});
  }, [person, open]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    // First name: required + alphabetic
    if (!formData.first_name.trim()) {
      nextErrors.first_name = "First name is required.";
    } else if (!isAlphabeticName(formData.first_name)) {
      nextErrors.first_name = "First name must contain only letters (no numbers).";
    }

    // Last name: required + alphabetic
    if (!formData.last_name.trim()) {
      nextErrors.last_name = "Last name is required.";
    } else if (!isAlphabeticName(formData.last_name)) {
      nextErrors.last_name = "Last name must contain only letters (no numbers).";
    }

    // Email: optional, but if present must be valid
    if (formData.email.trim() && !isValidEmail(formData.email)) {
      nextErrors.email = "Please enter a valid email address.";
    }

    // Phone: optional, but if present must be numeric-only (no letters)
    if (formData.phone.trim() && !isNumericPhone(formData.phone)) {
      nextErrors.phone = "Phone can only contain numbers and symbols like + - ( ).";
    }

    // Role: required
    if (!formData.role.trim()) {
      nextErrors.role = "Role / title is required.";
    }

    // Firm: required
    if (!formData.firm_id) {
      nextErrors.firm_id = "Firm is required.";
    }

    // Team: required
    if (!formData.team_id) {
      nextErrors.team_id = "Team is required.";
    }

    // LinkedIn URL: optional, but if present must be valid LinkedIn URL
    if (formData.linkedin_url.trim() && !isValidLinkedInUrl(formData.linkedin_url)) {
      nextErrors.linkedin_url = "Only a valid LinkedIn URL is allowed.";
    }

    setErrors(nextErrors);
    return nextErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSaving(true);

    try {
      const payload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        firm_id: parseInt(formData.firm_id, 10),
        team_id: parseInt(formData.team_id, 10),
        role: formData.role.trim(),
        linkedin_url: formData.linkedin_url.trim() || null,
      };

      let result;
      if (person) {
        result = await window.api.people.update(person.id, payload);
      } else {
        result = await window.api.people.create(payload);
      }

      if (result.success) {
        onClose(true);
      } else {
        alert("Failed to save person: " + result.error);
      }
    } catch (error) {
      console.error("Failed to save person:", error);
      alert("Failed to save person");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(false)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{person ? "Edit Person" : "New Person"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Names */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
                required
              />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
                required
              />
              {errors.last_name && (
                <p className="text-sm text-destructive">{errors.last_name}</p>
              )}
            </div>
          </div>

          {/* Email / Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="person@example.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+1 (555) 000-0000"
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">Role / Title *</Label>
            <Input
              id="role"
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              placeholder="e.g., Managing Director, Analyst"
              required
            />
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role}</p>
            )}
          </div>

          {/* Firm / Team */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firm_id">Firm *</Label>
              <Select
                value={formData.firm_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, firm_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a firm" />
                </SelectTrigger>
                <SelectContent>
                  {firms.map((firm) => (
                    <SelectItem key={firm.id} value={firm.id.toString()}>
                      {firm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.firm_id && (
                <p className="text-sm text-destructive">{errors.firm_id}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="team_id">Team *</Label>
              <Select
                value={formData.team_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, team_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.team_id && (
                <p className="text-sm text-destructive">{errors.team_id}</p>
              )}
            </div>
          </div>

          {/* LinkedIn */}
          <div className="space-y-2">
            <Label htmlFor="linkedin_url">LinkedIn URL</Label>
            <Input
              id="linkedin_url"
              type="url"
              value={formData.linkedin_url}
              onChange={(e) =>
                setFormData({ ...formData, linkedin_url: e.target.value })
              }
              placeholder="https://linkedin.com/in/..."
            />
            {errors.linkedin_url && (
              <p className="text-sm text-destructive">{errors.linkedin_url}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : person ? "Update Person" : "Create Person"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default PersonFormDialog;
