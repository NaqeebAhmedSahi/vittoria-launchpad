import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2, FileImage, CheckCircle2 } from "lucide-react";

type OcrProgressDialogProps = {
  open: boolean;
  progress: number; // 0-100
  fileName?: string;
  onOpenChange?: (open: boolean) => void;
};

export function OcrProgressDialog({
  open,
  progress,
  fileName = "Resume",
  onOpenChange,
}: OcrProgressDialogProps) {
  const isComplete = progress >= 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isComplete ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                OCR Complete
              </>
            ) : (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Processing Image
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isComplete
              ? "Text extraction completed successfully"
              : "Extracting text from image using OCR technology"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <FileImage className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <p className="text-xs text-muted-foreground">
                {isComplete ? "Ready for processing" : "Analyzing image..."}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Status Messages */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <div
                className={`h-2 w-2 rounded-full ${
                  progress > 0 ? "bg-green-500" : "bg-gray-300"
                }`}
              />
              <span className={progress > 0 ? "text-foreground" : "text-muted-foreground"}>
                Image preprocessing
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div
                className={`h-2 w-2 rounded-full ${
                  progress > 25 ? "bg-green-500" : "bg-gray-300"
                }`}
              />
              <span className={progress > 25 ? "text-foreground" : "text-muted-foreground"}>
                Text recognition
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div
                className={`h-2 w-2 rounded-full ${
                  progress > 75 ? "bg-green-500" : "bg-gray-300"
                }`}
              />
              <span className={progress > 75 ? "text-foreground" : "text-muted-foreground"}>
                Text extraction
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div
                className={`h-2 w-2 rounded-full ${
                  isComplete ? "bg-green-500" : "bg-gray-300"
                }`}
              />
              <span className={isComplete ? "text-foreground" : "text-muted-foreground"}>
                Finalization
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
