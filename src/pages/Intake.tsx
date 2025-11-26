import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusChip } from "@/components/StatusChip";
import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FolderPlus, Search, FileText, Eye, Copy, Award, CheckCircle, XCircle, Clock, Edit, X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// NEW: overlay spinner
import { ParsingOverlay } from "@/components/ParsingOverlay";
import { DragDropUploadDialog } from "@/components/DragDropUploadDialog";
import { DeferCandidateDialog } from "@/components/DeferCandidateDialog";
import { EditCvDialog } from "@/components/EditCvDialog";

// Shape used by the UI
type IntakeItem = {
  id: number;
  fileName: string;
  candidate: string;
  type: string;
  source: string;
  uploadedBy: string;
  uploadedAt: string;
  status: string;
  variant: "info" | "warning" | "success" | "destructive" | "error" | "neutral";
  qualityScore?: number;
  candidateId?: number;
};

const statusFilters = [
  "All",
  "New",
  "Parsed",
  "Needs review",
  "Approved",
  "Rejected",
  "Deferred",
];

function mapDbRowToItem(row: IntakeDbRow): IntakeItem {
  // Format date properly - PostgreSQL returns Date objects
  let uploadedAtStr = "";
  if (row.uploaded_at) {
    const date = new Date(row.uploaded_at);
    uploadedAtStr = date.toLocaleString();
  }

  return {
    id: row.id,
    fileName: row.file_name,
    candidate: row.candidate ?? "",
    type: row.type ?? "PDF",
    source: row.source ?? "",
    uploadedBy: row.uploaded_by ?? "",
    uploadedAt: uploadedAtStr,
    status: row.status ?? "New",
    variant: (row.variant || "info") as IntakeItem["variant"],
    qualityScore: row.quality_score,
    candidateId: row.candidate_id,
  };
}

export default function Intake() {
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
  const [jsonContent, setJsonContent] = useState<string | null>(null);
  const [jsonTitle, setJsonTitle] = useState<string>("Parsed CV JSON");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState<IntakeItem[]>([]);
  const [candidateDialogOpen, setCandidateDialogOpen] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [candidateSelectedFiles, setCandidateSelectedFiles] = useState<File[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<{ [intakeId: number]: number }>({});
  const [currentParsingId, setCurrentParsingId] = useState<number | null>(null);
  const [parsingStage, setParsingStage] = useState<"ocr" | "ai" | null>(null);
  const [dragDropDialogOpen, setDragDropDialogOpen] = useState(false);
  const [deferDialogOpen, setDeferDialogOpen] = useState(false);
  const [deferCandidateItem, setDeferCandidateItem] = useState<IntakeItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editIntakeItem, setEditIntakeItem] = useState<IntakeItem | null>(null);
  const [folderPreviewOpen, setFolderPreviewOpen] = useState(false);
  const [folderFiles, setFolderFiles] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const candidateFileRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  // Access API (cast to any to satisfy TS global augmentation ordering)
  const api = (window as any).api;

  // Listen for OCR progress events
  useEffect(() => {
    const handleOcrProgress = (data: { intakeId: number; progress: number; status: string }) => {
      console.log(`[Intake] OCR Progress - ID: ${data.intakeId}, Progress: ${data.progress}%, Status: ${data.status}`);
      setOcrProgress((prev) => ({
        ...prev,
        [data.intakeId]: data.progress,
      }));
      
      // When OCR completes, switch to AI stage
      if (data.status === "complete" && data.progress >= 100) {
        setParsingStage("ai");
        // Clear progress after a short delay
        setTimeout(() => {
          setOcrProgress((prev) => {
            const newProgress = { ...prev };
            delete newProgress[data.intakeId];
            return newProgress;
          });
        }, 500);
      }
    };

    api.on("intake:ocr-progress", handleOcrProgress);

    return () => {
      api.off("intake:ocr-progress", handleOcrProgress);
    };
  }, [api]);

  // Load initial data from SQLite
  useEffect(() => {
    api.intake
      .list()
      .then((rows) => setData(rows.map(mapDbRowToItem)))
      .catch((err) => {
        console.error(err);
        toast({
          title: "Error loading intake data",
          description: String(err),
          variant: "destructive",
        });
      });
  }, [toast]);

  // Handler for drag-drop dialog
  const handleDragDropDialogFiles = async (files: File[]) => {
    try {
      const payload = await Promise.all(
        files.map(async (file) => {
          const buffer = await file.arrayBuffer();
          
          // Determine file type
          let fileType = "DOC";
          if (file.type.includes("pdf")) {
            fileType = "PDF";
          } else if (file.type.includes("image")) {
            fileType = "IMAGE";
          } else if (file.type.includes("word") || file.name.toLowerCase().endsWith(".docx")) {
            fileType = "DOC";
          }
          
          return {
            fileName: file.name,
            buffer: Array.from(new Uint8Array(buffer)),
            type: fileType,
            source: "Drag & drop dialog",
            uploadedBy: "Admin",
          };
        })
      );

      const rows = await api.intake.addFiles(payload);
      setData(rows.map(mapDbRowToItem));
      toast({
        title: "Files uploaded",
        description: `${files.length} file(s) uploaded successfully`,
      });
    } catch (err) {
      console.error("Upload error:", err);
      toast({
        title: "Upload failed",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  const filteredData = data.filter((item) => {
    const matchesStatus =
      selectedStatus === "All" || item.status === selectedStatus;
    const matchesSearch =
      searchQuery === "" ||
      item.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.candidate.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const toggleRow = (id: number) => {
    setSelectedRows((prev) =>
      prev.includes(id)
        ? prev.filter((rowId) => rowId !== id)
        : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedRows((prev) =>
      prev.length === filteredData.length
        ? []
        : filteredData.map((item) => item.id)
    );
  };

  const refreshFromDb = () => {
    api.intake
      .list()
      .then((rows) => setData(rows.map(mapDbRowToItem)))
      .catch(console.error);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const payload = await Promise.all(
        Array.from(files).map(async (file) => {
          const buffer = await file.arrayBuffer();
          
          // Determine file type
          let fileType = "DOC";
          if (file.type.includes("pdf")) {
            fileType = "PDF";
          } else if (file.type.includes("image")) {
            fileType = "IMAGE";
          } else if (file.type.includes("word") || file.name.toLowerCase().endsWith(".docx")) {
            fileType = "DOC";
          }
          
          return {
            fileName: file.name,
            buffer: Array.from(new Uint8Array(buffer)), // Convert to array for IPC
            type: fileType,
            source: "Manual upload",
            uploadedBy: "Admin",
          };
        })
      );

      const rows = await api.intake.addFiles(payload);
      setData(rows.map(mapDbRowToItem));
      toast({
        title: "Files uploaded",
        description: `${files.length} file(s) uploaded successfully`,
      });
    } catch (err) {
      console.error("Upload error:", err);
      toast({
        title: "Upload failed",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  const handleCandidateFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) {
      setCandidateSelectedFiles([]);
      return;
    }
    setCandidateSelectedFiles(Array.from(files));
  };

  const handleConfirmAdd = async () => {
    if (!candidateName || !candidateName.trim()) {
      toast({
        title: "Candidate name required",
        description: "Please enter the detected candidate name before uploading",
        variant: "destructive",
      });
      return;
    }
    if (!candidateSelectedFiles || candidateSelectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please choose one or more files to upload",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = await Promise.all(
        candidateSelectedFiles.map(async (file) => {
          const buffer = await file.arrayBuffer();
          
          // Determine file type
          let fileType = "DOC";
          if (file.type.includes("pdf")) {
            fileType = "PDF";
          } else if (file.type.includes("image")) {
            fileType = "IMAGE";
          } else if (file.type.includes("word") || file.name.toLowerCase().endsWith(".docx")) {
            fileType = "DOC";
          }
          
          return {
            fileName: file.name,
            buffer: Array.from(new Uint8Array(buffer)),
            type: fileType,
            source: "Manual upload",
            uploadedBy: "Admin",
            candidate: candidateName,
          };
        })
      );

      const rows = await api.intake.addFiles(payload);
      setData(rows.map(mapDbRowToItem));
      toast({
        title: "Files uploaded",
        description: `${candidateSelectedFiles.length} file(s) uploaded for ${candidateName}`,
      });
      setCandidateDialogOpen(false);
      setCandidateName("");
      setCandidateSelectedFiles([]);
    } catch (err) {
      console.error("Upload error:", err);
      toast({
        title: "Upload failed",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Show preview dialog with all files
    setFolderFiles(Array.from(files));
    setFolderPreviewOpen(true);
    
    // Reset the input so the same folder can be selected again
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleConfirmFolderUpload = async () => {
    if (folderFiles.length === 0) {
      setFolderPreviewOpen(false);
      return;
    }

    try {
      const payload = await Promise.all(
        folderFiles.map(async (file) => {
          const buffer = await file.arrayBuffer();
          
          // Determine file type
          let fileType = "DOC";
          if (file.type.includes("pdf")) {
            fileType = "PDF";
          } else if (file.type.includes("image")) {
            fileType = "IMAGE";
          } else if (file.type.includes("word") || file.name.toLowerCase().endsWith(".docx")) {
            fileType = "DOC";
          }
          
          return {
            fileName: file.name,
            buffer: Array.from(new Uint8Array(buffer)),
            type: fileType,
            source: "Manual upload",
            uploadedBy: "Admin",
          };
        })
      );

      const rows = await api.intake.addFiles(payload);
      setData(rows.map(mapDbRowToItem));
      toast({
        title: "Folder uploaded",
        description: `${folderFiles.length} file(s) from folder uploaded successfully`,
      });
      
      // Close dialog and reset
      setFolderPreviewOpen(false);
      setFolderFiles([]);
    } catch (err) {
      console.error("Upload error:", err);
      toast({
        title: "Upload failed",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  const handleRemoveFolderFile = (index: number) => {
    setFolderFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddMoreFiles = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.tif,.webp";
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        setFolderFiles(prev => [...prev, ...Array.from(target.files!)]);
      }
    };
    input.click();
  };

  const handleParseAndShowJson = (item: IntakeItem) => {
    (async () => {
      setIsParsing(true);
      setCurrentParsingId(item.id);
      try {
        if (item.status === "Parsed") {
          toast({
            title: "Opening parsed CV",
            description: "Loading saved JSON from the database",
          });
        } else {
          toast({
            title: "Parsing...",
            description: "Extracting text and sending to AI",
          });
        }

        // Backend can reuse cached JSON for already-parsed items
        const parsed = await api.intake.parseAndGenerate(item.id);
        const json = JSON.stringify(parsed, null, 2);

        setJsonContent(json);
        setJsonTitle(`Parsed CV JSON – ${item.fileName}`);
        setJsonDialogOpen(true);

        // Only update status the first time
        if (item.status !== "Parsed") {
          await api.intake.updateStatus(item.id, "Parsed");
          refreshFromDb();
        }
      } catch (err) {
        console.error("Parse failed:", err);
        toast({
          title: "Parse failed",
          description: String(err),
          variant: "destructive",
        });
      } finally {
        setIsParsing(false);
        setCurrentParsingId(null);
      }
    })();
  };

  const handlePreview = async (item: IntakeItem) => {
    try {
      const resp = await api.intake.preview(item.id);
      if (!resp) {
        toast({ title: "Preview not available", variant: "destructive" });
        return;
      }

      const { fileName, mimeType, base64 } = resp as {
        fileName: string;
        mimeType: string;
        base64: string;
      };

      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: mimeType || "application/octet-stream",
      });

      const url = URL.createObjectURL(blob);

      // PDF / images → open in new window
      if (
        mimeType?.startsWith("application/pdf") ||
        mimeType?.startsWith("image/")
      ) {
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        return;
      }

      // DOC / DOCX and other types → trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      toast({
        title: "File downloaded",
        description:
          "Open the file in Word or your default office app to preview.",
      });
    } catch (err) {
      console.error("Preview error:", err);
      toast({
        title: "Preview failed",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  const handleCopyJson = async () => {
    if (!jsonContent) return;
    try {
      await navigator.clipboard.writeText(jsonContent);
      toast({
        title: "Copied",
        description: "JSON copied to clipboard",
      });
    } catch (err) {
      console.error("Copy failed:", err);
      toast({
        title: "Copy failed",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  const handleScoreCV = async (item: IntakeItem) => {
    // Check if it's an image type
    const isImageType = item.type === "IMAGE";
    
    // Always use parsing overlay, but track the stage
    setIsParsing(true);
    setCurrentParsingId(item.id);
    setParsingStage(isImageType ? "ocr" : "ai");
    
    try {
      // Call the CV processing pipeline
      const result = await (window.api as any).intake.processCV(item.id);

      toast({
        title: "CV Scored Successfully",
        description: result.candidateId
          ? `Quality: ${(result.cvQualityScore * 100).toFixed(1)}% | Fit: ${result.fitScore?.toFixed(1)}% | Draft candidate created`
          : `Quality: ${(result.cvQualityScore * 100).toFixed(1)}% | Needs review`,
        variant: result.candidateId ? "default" : "destructive",
      });

      // Refresh the table
      refreshFromDb();
    } catch (err) {
      console.error("Scoring failed:", err);
      
      toast({
        title: "Scoring failed",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
      setCurrentParsingId(null);
      setParsingStage(null);
    }
  };

  const handleApproveCandidate = async (item: IntakeItem) => {
    if (!item.candidateId) {
      toast({
        title: "No candidate",
        description: "This intake file doesn't have an associated candidate",
        variant: "destructive",
      });
      return;
    }

    try {
      await (window.api as any).candidate.approve(item.candidateId);
      toast({
        title: "Candidate Approved",
        description: "Candidate status changed to ACTIVE",
      });
      refreshFromDb();
    } catch (err) {
      console.error("Approval failed:", err);
      toast({
        title: "Approval failed",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  const handleRejectCandidate = async (item: IntakeItem) => {
    if (!item.candidateId) {
      toast({
        title: "No candidate",
        description: "This intake file doesn't have an associated candidate",
        variant: "destructive",
      });
      return;
    }

    try {
      await (window.api as any).candidate.reject(item.candidateId);
      toast({
        title: "Candidate Rejected",
        description: "Candidate status changed to ARCHIVED",
      });
      refreshFromDb();
    } catch (err) {
      console.error("Rejection failed:", err);
      toast({
        title: "Rejection failed",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  const handleDeferCandidate = (item: IntakeItem) => {
    if (!item.candidateId) {
      toast({
        title: "No candidate",
        description: "This intake file doesn't have an associated candidate",
        variant: "destructive",
      });
      return;
    }
    setDeferCandidateItem(item);
    setDeferDialogOpen(true);
  };

  const confirmDeferCandidate = async (reason: string, reminderDate: string | null) => {
    if (!deferCandidateItem || !deferCandidateItem.candidateId) return;

    try {
      await (window.api as any).candidate.defer({
        candidateId: deferCandidateItem.candidateId,
        reason,
        reminderDate,
      });
      toast({
        title: "Candidate Deferred",
        description: "Candidate status changed to DEFERRED",
      });
      refreshFromDb();
    } catch (err) {
      console.error("Deferral failed:", err);
      toast({
        title: "Deferral failed",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  const handleEditCV = async (item: IntakeItem) => {
    try {
      // Fetch the full intake record with parsed_json
      const intakes = await (window.api as any).intake.list();
      const fullIntake = intakes.find((i: any) => i.id === item.id);
      
      if (!fullIntake || !fullIntake.parsed_json) {
        toast({
          title: "Cannot Edit",
          description: "This CV hasn't been parsed yet. Click 'Score CV' first.",
          variant: "destructive",
        });
        return;
      }

      setEditIntakeItem({ ...item, parsedJson: fullIntake.parsed_json } as any);
      setEditDialogOpen(true);
    } catch (err) {
      console.error("Error loading CV data:", err);
      toast({
        title: "Load Failed",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  const getQualityBadge = (score?: number) => {
    if (score === undefined || score === null) {
      return <Badge variant="outline" className="text-xs whitespace-nowrap">Not Scored</Badge>;
    }

    const percentage = score * 100;

    if (percentage >= 70) {
      return (
        <Badge className="bg-green-500 hover:bg-green-600 text-xs whitespace-nowrap">
          {percentage.toFixed(1)}% Excellent
        </Badge>
      );
    } else if (percentage >= 40) {
      return (
        <Badge className="bg-yellow-500 hover:bg-yellow-600 text-xs whitespace-nowrap">
          {percentage.toFixed(1)}% Review Needed
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="text-xs whitespace-nowrap">
          {percentage.toFixed(1)}% Poor
        </Badge>
      );
    }
  };


  return (
    <div className="space-y-6">
      {/* Page header – matches Firms/Candidates layout */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Intake
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload CVs and documents, parse and approve them into the database
          </p>
        </div>
      </div>

      <Card>
        {/* Candidate dialog removed – auto-detection now handled backend */}

        {/* Filters / actions */}
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            {/* Hidden file inputs */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.tif,.webp"
              className="hidden"
            />
            <input
              type="file"
              ref={folderInputRef}
              onChange={handleFolderUpload}
              multiple
              // @ts-ignore - webkitdirectory is not in React types but works
              webkitdirectory=""
              directory=""
              className="hidden"
            />

            {/* Upload buttons – left cluster */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Add Intake
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => setDragDropDialogOpen(true)}
              >
                <Upload className="h-4 w-4" />
                Drag & Drop
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => folderInputRef.current?.click()}
              >
                <FolderPlus className="h-4 w-4" />
                Add folder
              </Button>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[220px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search files or candidates..."
                  className="pl-9 h-9 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Status filters */}
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={selectedStatus === status ? "default" : "outline"}
                  onClick={() => setSelectedStatus(status)}
                  className="text-xs"
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        {/* Table */}
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        filteredData.length > 0 &&
                        selectedRows.length === filteredData.length
                      }
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Detected Candidate</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Uploaded At</TableHead>
                  <TableHead>Quality Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow
                    key={item.id}
                    className="hover:bg-muted/30 cursor-pointer"
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.includes(item.id)}
                        onCheckedChange={() => toggleRow(item.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">
                          {item.fileName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {item.candidate}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.type}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.source}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.uploadedBy}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.uploadedAt}
                    </TableCell>
                    <TableCell>
                      {getQualityBadge(item.qualityScore)}
                    </TableCell>
                    <TableCell>
                      <StatusChip
                        status={item.status}
                        variant={item.variant}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(item);
                          }}
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleParseAndShowJson(item);
                          }}
                        >
                          {item.status === "Parsed"
                            ? "View JSON"
                            : "Parse JSON"}
                        </Button>
                        {(item.status === "Parsed" || item.qualityScore !== undefined) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-1 border-blue-500 text-blue-600 hover:bg-blue-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCV(item);
                            }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                        )}
                        {item.status === "Parsed" || item.qualityScore !== undefined ? (
                          <>
                            {!item.candidateId && (
                              <Button
                                size="sm"
                                variant="default"
                                className="text-xs gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleScoreCV(item);
                                }}
                              >
                                <Award className="h-3.5 w-3.5" />
                                Score CV
                              </Button>
                            )}
                            {item.candidateId && item.status !== "APPROVED" && item.status !== "REJECTED" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="text-xs gap-1 bg-green-600 hover:bg-green-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleApproveCandidate(item);
                                  }}
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="text-xs gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRejectCandidate(item);
                                  }}
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs gap-1 border-orange-500 text-orange-600 hover:bg-orange-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeferCandidate(item);
                                  }}
                                >
                                  <Clock className="h-3.5 w-3.5" />
                                  Defer
                                </Button>
                              </>
                            )}
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            className="text-xs gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleScoreCV(item);
                            }}
                          >
                            <Award className="h-3.5 w-3.5" />
                            Score CV
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredData.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="py-12 text-center"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground mb-1">
                            No files found
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {searchQuery || selectedStatus !== "All" 
                              ? "Try adjusting your filters or search query"
                              : "Click 'Add Intake', 'Drag & Drop', or 'Add folder' to get started"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Large centered JSON dialog */}
      <Dialog open={jsonDialogOpen} onOpenChange={setJsonDialogOpen}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[85vh] p-0">
          <DialogHeader className="flex flex-row items-center justify-between px-4 md:px-5 pt-4 md:pt-5 pb-3 border-b">
            <DialogTitle className="text-base md:text-lg font-semibold">
              {jsonTitle}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyJson}
                disabled={!jsonContent}
                className="gap-1"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy JSON
              </Button>
            </div>
          </DialogHeader>

          <div className="px-4 md:px-5 pb-4 md:pb-5 pt-3">
            <ScrollArea className="h-[60vh] rounded-md border bg-muted/40">
              <pre className="p-4 text-xs md:text-sm font-mono whitespace-pre-wrap break-words text-left">
                {jsonContent}
              </pre>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-screen parsing overlay - shows OCR then AI stages */}
      <ParsingOverlay
        open={isParsing}
        label={
          parsingStage === "ocr" 
            ? "Extracting Text from Image..." 
            : "Parsing CV with AI..."
        }
        sublabel={
          parsingStage === "ocr"
            ? "Using OCR technology to read the image"
            : "Extracting entities, contact details, skills, and experience from the document"
        }
        progress={
          parsingStage === "ocr" && currentParsingId !== null 
            ? ocrProgress[currentParsingId] 
            : undefined
        }
      />

      {/* Drag & Drop Upload Dialog */}
      <DragDropUploadDialog
        open={dragDropDialogOpen}
        onOpenChange={setDragDropDialogOpen}
        onFilesSelected={handleDragDropDialogFiles}
      />

      {/* Defer Candidate Dialog */}
      <DeferCandidateDialog
        open={deferDialogOpen}
        onOpenChange={setDeferDialogOpen}
        candidateName={deferCandidateItem?.candidate || "Unknown"}
        onConfirm={confirmDeferCandidate}
      />

      {/* Edit CV Dialog */}
      {editIntakeItem && (
        <EditCvDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          intakeId={editIntakeItem.id}
          parsedJson={(editIntakeItem as any).parsedJson}
          onSave={refreshFromDb}
        />
      )}

      {/* Folder Files Preview Dialog */}
      <Dialog open={folderPreviewOpen} onOpenChange={setFolderPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Review Folder Files</DialogTitle>
            <DialogDescription>
              Review and manage files before uploading. You can add more files or remove unwanted ones.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {folderFiles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No files selected
                  </div>
                ) : (
                  folderFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                            {file.type && ` • ${file.type.split('/')[1]?.toUpperCase() || 'File'}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => handleRemoveFolderFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleAddMoreFiles}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add More Files
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setFolderPreviewOpen(false);
                  setFolderFiles([]);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmFolderUpload}
                disabled={folderFiles.length === 0}
              >
                Upload {folderFiles.length} {folderFiles.length === 1 ? 'File' : 'Files'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}