import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusChip } from "@/components/StatusChip";
import { Upload, FolderPlus, Search, FileText } from "lucide-react";
import { useState, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const intakeData = [
  {
    id: 1,
    fileName: "CV_FMB 2025.pdf",
    candidate: "Francesco Vignola",
    type: "PDF",
    source: "Manual upload",
    uploadedBy: "Admin",
    uploadedAt: "2025-01-10",
    status: "Parsed",
    variant: "info" as const,
  },
  {
    id: 2,
    fileName: "Holly Ha CV.pdf",
    candidate: "Holly Ha",
    type: "PDF",
    source: "Email import",
    uploadedBy: "System",
    uploadedAt: "2025-01-09",
    status: "Needs review",
    variant: "warning" as const,
  },
  {
    id: 3,
    fileName: "Edward Berwin CV.pdf",
    candidate: "Edward Berwin",
    type: "PDF",
    source: "Manual upload",
    uploadedBy: "Admin",
    uploadedAt: "2025-01-09",
    status: "Parsed",
    variant: "info" as const,
  },
  {
    id: 4,
    fileName: "Tamim Ahmad CV.pdf",
    candidate: "Tamim Ahmad",
    type: "PDF",
    source: "Manual upload",
    uploadedBy: "Admin",
    uploadedAt: "2025-01-08",
    status: "Approved",
    variant: "success" as const,
  },
];

const statusFilters = ["All", "New", "Parsed", "Needs review", "Approved", "Rejected"];

export default function Intake() {
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState(intakeData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const toggleRow = (id: number) => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedRows(prev =>
      prev.length === filteredData.length ? [] : filteredData.map(item => item.id)
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      toast({
        title: "Files uploaded",
        description: `${files.length} file(s) uploaded successfully`,
      });
    }
  };

  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      toast({
        title: "Folder uploaded",
        description: `${files.length} file(s) from folder uploaded successfully`,
      });
    }
  };

  const filteredData = data.filter(item => {
    const matchesStatus = selectedStatus === "All" || item.status === selectedStatus;
    const matchesSearch = searchQuery === "" || 
      item.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.candidate.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Intake</h1>
          <p className="text-sm text-muted-foreground">Upload CVs and documents, parse and approve them into the database</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept=".pdf,.doc,.docx"
              className="hidden"
            />
            <input
              type="file"
              ref={folderInputRef}
              onChange={handleFolderUpload}
              multiple
              className="hidden"
            />
            <Button size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Add files
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => folderInputRef.current?.click()}>
              <FolderPlus className="h-4 w-4" />
              Add folder
            </Button>

            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search files or candidates..."
                  className="pl-9 h-8 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
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

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-3 w-12">
                    <Checkbox
                      checked={selectedRows.length === filteredData.length && filteredData.length > 0}
                      onCheckedChange={toggleAll}
                    />
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    File Name
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Detected Candidate
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Type
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Source
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Uploaded By
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Uploaded At
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="p-3">
                      <Checkbox
                        checked={selectedRows.includes(item.id)}
                        onCheckedChange={() => toggleRow(item.id)}
                      />
                    </td>
                    <td className="p-3">
                      <StatusChip status={item.status} variant={item.variant} />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">{item.fileName}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-foreground">{item.candidate}</td>
                    <td className="p-3 text-sm text-muted-foreground">{item.type}</td>
                    <td className="p-3 text-sm text-muted-foreground">{item.source}</td>
                    <td className="p-3 text-sm text-muted-foreground">{item.uploadedBy}</td>
                    <td className="p-3 text-sm text-muted-foreground">{item.uploadedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
