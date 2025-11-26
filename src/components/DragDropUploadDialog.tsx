import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

type DragDropUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFilesSelected: (files: File[]) => void;
};

export function DragDropUploadDialog({
  open,
  onOpenChange,
  onFilesSelected,
}: DragDropUploadDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types && e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX <= rect.left ||
      e.clientX >= rect.right ||
      e.clientY <= rect.top ||
      e.clientY >= rect.bottom
    ) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
  };

  const handleFiles = (files: File[]) => {
    // Filter for supported file types
    const supportedExtensions = [
      ".pdf",
      ".doc",
      ".docx",
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".bmp",
      ".tiff",
      ".tif",
      ".webp",
    ];
    const validFiles = files.filter((file) => {
      const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
      return ext && supportedExtensions.includes(ext);
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles);
      setSelectedFiles([]);
      onOpenChange(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Drag and drop your files here or click to browse. Supports PDF, DOCX, and image files.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-lg p-8 transition-all cursor-pointer
              ${
                isDragging
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
              }
            `}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <input
              id="file-input"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.tif,.webp"
              onChange={handleFileInput}
              className="hidden"
            />

            <div className="flex flex-col items-center gap-3 text-center">
              <div
                className={`h-16 w-16 rounded-full flex items-center justify-center transition-all ${
                  isDragging
                    ? "bg-primary/20 scale-110"
                    : "bg-muted"
                }`}
              >
                <Upload
                  className={`h-8 w-8 transition-all ${
                    isDragging
                      ? "text-primary animate-bounce"
                      : "text-muted-foreground"
                  }`}
                />
              </div>

              <div>
                <p className="text-base font-medium mb-1">
                  {isDragging ? "Drop files here" : "Drag & drop files here"}
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to browse from your computer
                </p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center mt-2">
                <Badge variant="secondary" className="text-xs">
                  PDF
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  DOCX
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Images
                </Badge>
              </div>
            </div>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Selected Files ({selectedFiles.length})
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFiles([])}
                  className="h-8 text-xs"
                >
                  Clear All
                </Button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-3">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-8 w-8 p-0 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedFiles([]);
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
