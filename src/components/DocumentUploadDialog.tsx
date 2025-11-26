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
import { Upload } from "lucide-react";

interface Firm {
  id: number;
  name: string;
}

interface Mandate {
  id: number;
  name: string;
}

interface Candidate {
  id: number;
  name: string;
}

interface DocumentUploadDialogProps {
  open: boolean;
  onClose: (refresh?: boolean) => void;
}

export default function DocumentUploadDialog({ open, onClose }: DocumentUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  
  const [formData, setFormData] = useState({
    file_name: "",
    category: "",
    description: "",
    firm_id: "",
    mandate_id: "",
    candidate_id: "",
    tags: "",
    is_confidential: false,
  });

  useEffect(() => {
    if (open) {
      loadOptions();
    }
  }, [open]);

  const loadOptions = async () => {
    try {
      const [firmsResult, mandatesResult, candidatesResult] = await Promise.all([
        window.api.firm.list(),
        window.api.mandate.list({}),
        window.api.candidate.list(),
      ]);

      if (firmsResult.success) setFirms(firmsResult.firms || []);
      if (mandatesResult.success) setMandates(mandatesResult.mandates || []);
      setCandidates(candidatesResult || []);
    } catch (error) {
      console.error('Failed to load options:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!formData.file_name) {
        setFormData({ ...formData, file_name: file.name });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }

    setUploading(true);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const base64Content = base64Data.split(',')[1]; // Remove data:... prefix

        const metadata = {
          file_name: formData.file_name || selectedFile.name,
          file_size: selectedFile.size,
          mime_type: selectedFile.type || 'application/octet-stream',
          category: formData.category || null,
          description: formData.description || null,
          firm_id: formData.firm_id ? parseInt(formData.firm_id) : null,
          mandate_id: formData.mandate_id ? parseInt(formData.mandate_id) : null,
          candidate_id: formData.candidate_id ? parseInt(formData.candidate_id) : null,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : null,
          is_confidential: formData.is_confidential,
        };

        const result = await window.api.document.upload(base64Content, metadata);

        if (result.success) {
          setSelectedFile(null);
          setFormData({
            file_name: "",
            category: "",
            description: "",
            firm_id: "",
            mandate_id: "",
            candidate_id: "",
            tags: "",
            is_confidential: false,
          });
          onClose(true);
        } else {
          alert('Failed to upload document: ' + result.error);
        }
        setUploading(false);
      };

      reader.onerror = () => {
        alert('Failed to read file');
        setUploading(false);
      };

      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload document');
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">File *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                required
                className="flex-1"
              />
              {selectedFile && (
                <span className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file_name">Document Name *</Label>
            <Input
              id="file_name"
              value={formData.file_name}
              onChange={(e) => setFormData({ ...formData, file_name: e.target.value })}
              placeholder="e.g., Contract Agreement"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Contract">Contract</SelectItem>
                  <SelectItem value="Resume">Resume</SelectItem>
                  <SelectItem value="Report">Report</SelectItem>
                  <SelectItem value="Invoice">Invoice</SelectItem>
                  <SelectItem value="Proposal">Proposal</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="is_confidential">Confidential?</Label>
              <Select
                value={formData.is_confidential ? "yes" : "no"}
                onValueChange={(value) => setFormData({ ...formData, is_confidential: value === "yes" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the document"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Link to Entity (Optional)</Label>
            <div className="grid grid-cols-3 gap-2">
              <Select
                value={formData.firm_id}
                onValueChange={(value) => setFormData({ ...formData, firm_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Firm" />
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

              <Select
                value={formData.mandate_id}
                onValueChange={(value) => setFormData({ ...formData, mandate_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mandate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No mandate</SelectItem>
                  {mandates.map(mandate => (
                    <SelectItem key={mandate.id} value={mandate.id.toString()}>
                      {mandate.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={formData.candidate_id}
                onValueChange={(value) => setFormData({ ...formData, candidate_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Candidate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No candidate</SelectItem>
                  {candidates.map(candidate => (
                    <SelectItem key={candidate.id} value={candidate.id.toString()}>
                      {candidate.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g., legal, urgent, quarterly (comma-separated)"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose()} disabled={uploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading || !selectedFile}>
              {uploading ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-pulse" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
