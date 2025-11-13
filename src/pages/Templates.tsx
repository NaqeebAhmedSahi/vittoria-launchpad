import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";

const templatesData = [
  { id: 1, name: "BWS_CV_Master_v2025.10-1.docx", type: "CV Template", version: "2025.10-1", lastChecked: "2024-11-10", status: "OK", category: "cv" },
  { id: 2, name: "Presentation_Template_v2.pptx", type: "Slide Template", version: "v2", lastChecked: "2024-11-08", status: "Warnings", warnings: 2, category: "slide" },
  { id: 3, name: "BWS_Bio_Template.docx", type: "CV Template", version: "v1.2", lastChecked: "2024-11-12", status: "OK", category: "cv" },
  { id: 4, name: "Profile_Pack_Template.pptx", type: "Slide Template", version: "v3.1", lastChecked: "2024-11-09", status: "OK", category: "slide" },
  { id: 5, name: "Invoice_Template.docx", type: "Other Template", version: "v2.0", lastChecked: "2024-11-11", status: "OK", category: "other" },
];

const placeholdersData = [
  { name: "{{CandidateName}}", description: "Candidate's full name", status: "OK", mapped: "candidates.name" },
  { name: "{{CurrentFirm}}", description: "Current employer", status: "OK", mapped: "candidates.current_firm" },
  { name: "{{CurrentTitle}}", description: "Current job title", status: "OK", mapped: "candidates.current_title" },
  { name: "{{EmployerLogo}}", description: "Logo of current employer", status: "OK", mapped: "Auto from firm logo library" },
  { name: "{{BWSLogo}}", description: "BWS company logo", status: "OK", mapped: "Static BWS logo asset" },
  { name: "{{ContactEmail}}", description: "Contact email address", status: "Missing", mapped: "candidates.email" },
  { name: "{{Sector}}", description: "Primary sector tags", status: "OK", mapped: "candidates.sectors" },
];

export default function Templates() {
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const selectedTemplateData = templatesData.find(t => t.id === selectedTemplate);

  const cvTemplates = templatesData.filter(t => t.category === "cv");
  const slideTemplates = templatesData.filter(t => t.category === "slide");
  const otherTemplates = templatesData.filter(t => t.category === "other");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Templates</h1>
        <Button>
          <Upload className="h-4 w-4" />
          Upload Template
        </Button>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">CV Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Last Checked</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cvTemplates.map((template) => (
                    <TableRow 
                      key={template.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {template.name}
                        </div>
                      </TableCell>
                      <TableCell>{template.type}</TableCell>
                      <TableCell className="text-muted-foreground">{template.version}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{template.lastChecked}</TableCell>
                      <TableCell>
                        <Badge variant={template.status === "OK" ? "default" : "secondary"}>
                          {template.status === "OK" ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> OK</>
                          ) : (
                            <><AlertCircle className="h-3 w-3 mr-1" /> {template.warnings} warnings</>
                          )}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Slide Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Last Checked</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slideTemplates.map((template) => (
                    <TableRow 
                      key={template.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {template.name}
                        </div>
                      </TableCell>
                      <TableCell>{template.type}</TableCell>
                      <TableCell className="text-muted-foreground">{template.version}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{template.lastChecked}</TableCell>
                      <TableCell>
                        <Badge variant={template.status === "OK" ? "default" : "secondary"}>
                          {template.status === "OK" ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> OK</>
                          ) : (
                            <><AlertCircle className="h-3 w-3 mr-1" /> {template.warnings} warnings</>
                          )}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Other Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Last Checked</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otherTemplates.map((template) => (
                    <TableRow 
                      key={template.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {template.name}
                        </div>
                      </TableCell>
                      <TableCell>{template.type}</TableCell>
                      <TableCell className="text-muted-foreground">{template.version}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{template.lastChecked}</TableCell>
                      <TableCell>
                        <Badge variant="default">
                          <CheckCircle className="h-3 w-3 mr-1" /> OK
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {selectedTemplate && selectedTemplateData && (
          <Card className="w-96">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base">{selectedTemplateData.name}</CardTitle>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{selectedTemplateData.type}</Badge>
                    <Badge variant="outline">{selectedTemplateData.version}</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedTemplate(null)}>×</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg p-4 bg-muted/20 text-center text-sm text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                Template Preview
              </div>

              <div>
                <div className="text-sm font-medium mb-3">Detected Placeholders</div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {placeholdersData.map((placeholder, idx) => (
                    <div key={idx} className="border rounded-lg p-3 text-xs">
                      <div className="flex items-start justify-between mb-1">
                        <code className="font-mono font-medium">{placeholder.name}</code>
                        <Badge variant={placeholder.status === "OK" ? "default" : "secondary"} className="text-xs">
                          {placeholder.status}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground mb-1">{placeholder.description}</div>
                      <div className="text-muted-foreground">→ {placeholder.mapped}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <Button className="w-full" variant="outline">
                  <Upload className="h-4 w-4" />
                  Upload New Version
                </Button>
                <Button className="w-full" variant="outline">Validate Template</Button>
                <Button className="w-full">Test with Sample Candidate</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
