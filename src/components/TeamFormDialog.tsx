import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { useState, useEffect } from "react";

interface Team {
  id: number;
  name: string;
  firm_id?: number | null;
  description?: string | null;
}

interface Firm {
  id: number;
  name: string;
}

interface TeamFormDialogProps {
  open: boolean;
  onClose: (shouldRefresh: boolean) => void;
  team?: Team | null;
  firms: Firm[];
}

export function TeamFormDialog({ open, onClose, team, firms }: TeamFormDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    firm_id: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name || "",
        firm_id: team.firm_id?.toString() || "",
        description: team.description || "",
      });
    } else {
      setFormData({
        name: "",
        firm_id: "",
        description: "",
      });
    }
  }, [team, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: formData.name,
        firm_id: formData.firm_id ? parseInt(formData.firm_id) : null,
        description: formData.description || null,
      };

      let result;
      if (team) {
        result = await window.api.team.update(team.id, payload);
      } else {
        result = await window.api.team.create(payload);
      }

      if (result.success) {
        onClose(true);
      } else {
        alert('Failed to save team: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to save team:', error);
      alert('Failed to save team');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(false)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{team ? 'Edit Team' : 'New Team'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Team Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="firm_id">Associated Firm</Label>
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="Team description, responsibilities, focus areas..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : team ? 'Update Team' : 'Create Team'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default TeamFormDialog;

