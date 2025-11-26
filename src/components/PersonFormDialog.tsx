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
  }, [person, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || null,
        phone: formData.phone || null,
        firm_id: formData.firm_id ? parseInt(formData.firm_id) : null,
        team_id: formData.team_id ? parseInt(formData.team_id) : null,
        role: formData.role || null,
        linkedin_url: formData.linkedin_url || null,
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
        alert('Failed to save person: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to save person:', error);
      alert('Failed to save person');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(false)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{person ? 'Edit Person' : 'New Person'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="person@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role / Title</Label>
            <Input
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder="e.g., Managing Director, Analyst"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firm_id">Firm</Label>
              <Select
                value={formData.firm_id}
                onValueChange={(value) => setFormData({ ...formData, firm_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a firm (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No firm</SelectItem>
                  {firms.map(firm => (
                    <SelectItem key={firm.id} value={firm.id.toString()}>
                      {firm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="team_id">Team</Label>
              <Select
                value={formData.team_id}
                onValueChange={(value) => setFormData({ ...formData, team_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin_url">LinkedIn URL</Label>
            <Input
              id="linkedin_url"
              type="url"
              value={formData.linkedin_url}
              onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
              placeholder="https://linkedin.com/in/..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : person ? 'Update Person' : 'Create Person'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default PersonFormDialog;
