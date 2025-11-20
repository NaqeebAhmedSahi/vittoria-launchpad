import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Image } from "lucide-react";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface ExpenseUploadZoneProps {
  entity: 'business' | 'personal';
  onFilesAdded?: (files: File[]) => void;
}

export function ExpenseUploadZone({ entity, onFilesAdded }: ExpenseUploadZoneProps) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      addFiles(files);
    }
  };

  const addFiles = (files: File[]) => {
    const validFiles = files.filter(f => 
      f.type.includes('pdf') || 
      f.type.includes('image') || 
      f.type.includes('csv')
    );

    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid files",
        description: "Only PDF, images, and CSV files are accepted",
        variant: "destructive",
      });
    }

    setPendingFiles(prev => [...prev, ...validFiles]);
    onFilesAdded?.(validFiles);

    toast({
      title: "Files added",
      description: `${validFiles.length} file(s) ready for processing`,
    });
  };

  const removeFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (file.type.includes('image')) return <Image className="h-5 w-5 text-blue-500" />;
    return <FileText className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload Receipts & Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border'
          }`}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-foreground mb-2">
            Drag and drop files here, or click to select
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Accepts PDF receipts, images (JPG, PNG), and CSV bank statements
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Select Files
          </Button>
        </div>

        {/* Pending Files */}
        {pendingFiles.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">
              Pending Review ({pendingFiles.length})
            </div>
            <div className="space-y-2">
              {pendingFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getFileIcon(file)}
                    <div>
                      <div className="text-sm font-medium text-foreground">{file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(idx)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TODO: Add OCR/parsing status and results */}
      </CardContent>
    </Card>
  );
}
