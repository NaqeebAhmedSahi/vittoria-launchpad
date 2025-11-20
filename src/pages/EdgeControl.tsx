import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Database, FileText, Building2, Users } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const edgeExportsData = [
  { id: 1, name: "Org Charts", description: "Expose organizational structure data", enabled: true, icon: Building2 },
  { id: 2, name: "Profile Packs", description: "Generate and export candidate profile packs", enabled: true, icon: Users },
  { id: 3, name: "Firm Summaries", description: "Export firm overview and statistics", enabled: false, icon: FileText },
  { id: 4, name: "Mandate Reports", description: "Generate mandate status reports", enabled: true, icon: Database },
];

const exportLogsData = [
  { type: "Org Chart", requestedBy: "James Patterson", timestamp: "2024-11-13 14:32", records: 45, location: "/exports/orgchart_20241113_1432.pdf" },
  { type: "Profile Pack", requestedBy: "Sarah Chen", timestamp: "2024-11-13 12:18", records: 8, location: "/exports/profiles_20241113_1218.zip" },
  { type: "Mandate Report", requestedBy: "Klaus Schmidt", timestamp: "2024-11-13 09:45", records: 12, location: "/exports/mandates_20241113_0945.xlsx" },
  { type: "Org Chart", requestedBy: "David Morrison", timestamp: "2024-11-12 16:22", records: 38, location: "/exports/orgchart_20241112_1622.pdf" },
  { type: "Profile Pack", requestedBy: "Emma Rodriguez", timestamp: "2024-11-12 11:05", records: 5, location: "/exports/profiles_20241112_1105.zip" },
];

export default function EdgeControl() {
  const { toast } = useToast();
  const [exports, setExports] = useState(edgeExportsData);
  const [logs, setLogs] = useState(exportLogsData);
  const [selectedExport, setSelectedExport] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const handleToggle = (id: number, currentState: boolean) => {
    setExports(prevExports =>
      prevExports.map(exp =>
        exp.id === id ? { ...exp, enabled: !currentState } : exp
      )
    );
    const exportItem = exports.find(e => e.id === id);
    toast({
      title: `${exportItem?.name} ${!currentState ? 'enabled' : 'disabled'}`,
      description: `Edge view has been ${!currentState ? 'enabled' : 'disabled'} successfully.`,
    });
  };

  const handleExportClick = (exportLog: any) => {
    setSelectedExport(exportLog);
    setDetailModalOpen(true);
  };

  const handleOpenFile = () => {
    toast({
      title: "Opening file",
      description: `Would open: ${selectedExport?.location}`,
    });
  };

  const handleRerunExport = () => {
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const newExport = {
      type: selectedExport.type,
      requestedBy: "System Re-run",
      timestamp,
      records: selectedExport.records + Math.floor(Math.random() * 5),
      location: selectedExport.location.replace(/\d{8}_\d{4}/, `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`)
    };
    
    setLogs(prevLogs => [newExport, ...prevLogs]);
    toast({
      title: "Export re-run initiated",
      description: "The export has been queued and will appear at the top of the list.",
    });
    setDetailModalOpen(false);
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Edge Control</h1>
          <p className="text-sm text-muted-foreground">Manage external data exports and API access</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exposed Edge DB Views</CardTitle>
          <p className="text-sm text-muted-foreground">Control which data views are available for external consumption</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {edgeExportsData.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted rounded-lg">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={item.enabled ? "default" : "secondary"}>
                      {item.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                    <Switch 
                      checked={item.enabled}
                      onCheckedChange={() => handleToggle(item.id, item.enabled)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Edge Exports</CardTitle>
          <p className="text-sm text-muted-foreground">Log of all data exports and external access requests</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Export Type</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead className="text-right">Records</TableHead>
                <TableHead>File Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log, idx) => (
                <TableRow 
                  key={idx}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleExportClick(log)}
                >
                  <TableCell>
                    <Badge variant="outline">{log.type}</Badge>
                  </TableCell>
                  <TableCell>{log.requestedBy}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.timestamp}</TableCell>
                  <TableCell className="text-right font-medium">{log.records}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{log.location}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-status-info/50 bg-status-info/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-status-info shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium mb-1">Security Notice</div>
              <p className="text-muted-foreground">
                All Edge exports are logged and monitored. Exported data is subject to your organization's data governance policies and GDPR compliance requirements. Only authorized users can access and export sensitive data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
