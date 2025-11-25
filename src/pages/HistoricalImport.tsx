import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function HistoricalImport() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = [
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];
      
      if (validTypes.includes(file.type) || file.name.endsWith(".csv") || file.name.endsWith(".xlsx")) {
        setSelectedFile(file);
        setImportResult(null);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload a CSV or Excel file",
          variant: "destructive",
        });
      }
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setImportResult(null);

    try {
      // Read the CSV file
      const text = await selectedFile.text();
      const lines = text.split("\n");
      const headers = lines[0].split(",").map(h => h.trim());
      
      // Parse CSV rows
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(",").map(v => v.trim());
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });
        
        // Convert interaction_count to number if present
        if (row.interaction_count) {
          row.interaction_count = parseInt(row.interaction_count) || 0;
        }
        
        rows.push(row);
      }

      // Call backend API
      const result = await window.api.source.importHistorical(rows);

      setImportResult({
        success: result.success,
        imported: result.imported || 0,
        skipped: result.skipped || 0,
        errors: result.errors || [],
      });

      toast({
        title: "Import Complete",
        description: `Successfully imported ${result.imported} sources`,
      });
    } catch (error: any) {
      console.error("Import error:", error);
      setImportResult({
        success: false,
        imported: 0,
        skipped: 0,
        errors: [error.message || "Failed to import data"],
      });
      
      toast({
        title: "Import Failed",
        description: error.message || "An error occurred during import",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    // Mock CSV template
    const template = `external_id,name,role,organisation,sector,geography,interaction_count
src-ext-001,John Smith,Partner,Example Capital,Technology,North America,15
src-ext-002,Jane Doe,Managing Director,Global Ventures,Healthcare,Europe,22`;
    
    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "historical_sources_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Template Downloaded",
      description: "CSV template has been downloaded",
    });
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/admin/similarity/org-pattern")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Org Pattern
      </Button>

      <div>
        <h1 className="text-2xl font-semibold text-foreground">Historical Data Import</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bootstrap your organization's historical pattern by importing past source data
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left: Instructions */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Import Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <div className="font-semibold mb-1">1. Download Template</div>
              <p className="text-muted-foreground">
                Get the CSV template with required columns
              </p>
            </div>
            <div>
              <div className="font-semibold mb-1">2. Fill Your Data</div>
              <p className="text-muted-foreground">
                Add historical source records to the CSV file
              </p>
            </div>
            <div>
              <div className="font-semibold mb-1">3. Upload & Import</div>
              <p className="text-muted-foreground">
                Upload the file and review the import results
              </p>
            </div>

            <div className="pt-4 border-t">
              <div className="font-semibold mb-2">Required Columns:</div>
              <ul className="space-y-1 text-muted-foreground">
                <li>• external_id</li>
                <li>• name</li>
                <li>• role</li>
                <li>• organisation</li>
                <li>• sector</li>
                <li>• geography</li>
                <li>• interaction_count</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Right: Upload Area */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Upload Historical Data</CardTitle>
            <CardDescription>
              Import CSV or Excel files containing historical source information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-3">
              <Button variant="outline" onClick={downloadTemplate} className="flex-1">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Download CSV Template
              </Button>
            </div>

            <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-muted">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>

              {selectedFile ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">{selectedFile.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium mb-1">Drop your CSV or Excel file here</p>
                  <p className="text-xs text-muted-foreground">or click to browse</p>
                </div>
              )}

              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button variant="secondary" asChild>
                  <span>Select File</span>
                </Button>
              </label>
            </div>

            {selectedFile && (
              <Button
                onClick={handleImport}
                disabled={importing}
                className="w-full"
                size="lg"
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data
                  </>
                )}
              </Button>
            )}

            {/* Import Results */}
            {importResult && (
              <div className="space-y-3">
                <Alert className={importResult.success ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-red-500 bg-red-50 dark:bg-red-900/20"}>
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <div className="font-semibold mb-1">Import Complete</div>
                    <div className="text-sm">
                      ✓ {importResult.imported} sources imported successfully
                      {importResult.skipped > 0 && (
                        <div className="mt-1">⚠ {importResult.skipped} rows skipped</div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>

                {importResult.errors.length > 0 && (
                  <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-900/20">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertDescription className="text-amber-800 dark:text-amber-200">
                      <div className="font-semibold mb-2">Import Warnings</div>
                      <ul className="text-xs space-y-1">
                        {importResult.errors.map((error, idx) => (
                          <li key={idx}>• {error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  variant="outline"
                  onClick={() => navigate("/admin/similarity/org-pattern")}
                  className="w-full"
                >
                  View Updated Organization Pattern
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
