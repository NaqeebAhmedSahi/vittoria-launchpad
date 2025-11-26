import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Edit, 
  Eye, 
  AlertCircle,
  FileText,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DeferCandidateDialog } from '@/components/DeferCandidateDialog';
import { EditCvDialog } from '@/components/EditCvDialog';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';

type IntakeRecord = {
  id: number;
  file_name: string;
  candidate: string | null;
  status: string;
  quality_score: number | null;
  candidate_id: number | null;
  parsed_json: any;
  uploaded_at: string;
  file_path: string;
};

export default function Approvals() {
  const { toast } = useToast();
  const [records, setRecords] = useState<IntakeRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<IntakeRecord | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'needs_review' | 'deferred'>('needs_review');
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog states
  const [deferDialogOpen, setDeferDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{ base64: string; mimeType: string } | null>(null);

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    if (records.length > 0 && !selectedRecord) {
      setSelectedRecord(records[0]);
    }
  }, [records]);

  const loadRecords = async () => {
    try {
      setIsLoading(true);
      const allRecords = await (window.api as any).intake.list();
      
      // Filter for records that need review or are deferred
      const filtered = allRecords.filter((r: IntakeRecord) => 
        r.candidate_id && 
        (r.status === 'Needs review' || r.status === 'Deferred')
      );
      
      setRecords(filtered);
    } catch (error) {
      console.error('Error loading records:', error);
      toast({
        title: 'Load Failed',
        description: String(error),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRecord || !selectedRecord.candidate_id) return;

    try {
      await (window.api as any).candidate.approve(selectedRecord.candidate_id);
      toast({
        title: 'Approved',
        description: 'Candidate has been approved and is now ACTIVE',
      });
      await loadRecords();
      setSelectedRecord(null);
    } catch (error) {
      console.error('Approval failed:', error);
      toast({
        title: 'Approval Failed',
        description: String(error),
        variant: 'destructive',
      });
    }
  };

  const handleReject = async () => {
    if (!selectedRecord || !selectedRecord.candidate_id) return;

    try {
      await (window.api as any).candidate.reject(selectedRecord.candidate_id);
      toast({
        title: 'Rejected',
        description: 'Candidate has been archived',
      });
      await loadRecords();
      setSelectedRecord(null);
    } catch (error) {
      console.error('Rejection failed:', error);
      toast({
        title: 'Rejection Failed',
        description: String(error),
        variant: 'destructive',
      });
    }
  };

  const confirmDefer = async (reason: string, reminderDate: string | null) => {
    if (!selectedRecord || !selectedRecord.candidate_id) return;

    try {
      await (window.api as any).candidate.defer({
        candidateId: selectedRecord.candidate_id,
        reason,
        reminderDate,
      });
      toast({
        title: 'Deferred',
        description: 'Candidate decision has been deferred',
      });
      await loadRecords();
    } catch (error) {
      console.error('Deferral failed:', error);
      toast({
        title: 'Deferral Failed',
        description: String(error),
        variant: 'destructive',
      });
    }
  };

  const handlePreview = async () => {
    if (!selectedRecord) return;

    try {
      const result = await (window.api as any).intake.preview(selectedRecord.id);
      if (result) {
        setPreviewData(result);
        setPreviewOpen(true);
      }
    } catch (error) {
      console.error('Preview failed:', error);
      toast({
        title: 'Preview Failed',
        description: String(error),
        variant: 'destructive',
      });
    }
  };

  const filteredRecords = records.filter(r => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'needs_review') return r.status === 'Needs review';
    if (filterStatus === 'deferred') return r.status === 'Deferred';
    return true;
  });

  const getQualityColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    const percentage = score * 100;
    if (percentage >= 70) return 'text-green-600';
    if (percentage >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityLabel = (score: number | null) => {
    if (!score) return 'Not Scored';
    const percentage = score * 100;
    if (percentage >= 70) return 'Excellent';
    if (percentage >= 40) return 'Review Needed';
    return 'Poor';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Approvals Queue
          </h1>
          <p className="text-sm text-muted-foreground">
            Review parsed CVs and approve, reject, defer, or edit candidate records
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {filteredRecords.length} Pending
        </Badge>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)} className="w-full">
        <TabsList>
          <TabsTrigger value="needs_review">Needs Review ({records.filter(r => r.status === 'Needs review').length})</TabsTrigger>
          <TabsTrigger value="deferred">Deferred ({records.filter(r => r.status === 'Deferred').length})</TabsTrigger>
          <TabsTrigger value="all">All ({records.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Sidebar - List of Records */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="text-lg">Candidates</CardTitle>
            <CardDescription>Click to review details</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-300px)]">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  Loading...
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No records pending review</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {filteredRecords.map((record) => (
                    <div
                      key={record.id}
                      onClick={() => setSelectedRecord(record)}
                      className={`
                        p-4 border-b cursor-pointer transition-colors hover:bg-muted/50
                        ${selectedRecord?.id === record.id ? 'bg-muted' : ''}
                      `}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {record.candidate || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {record.file_name}
                          </p>
                        </div>
                        {record.status === 'Deferred' && (
                          <Badge variant="outline" className="ml-2 text-orange-600 border-orange-500 shrink-0">
                            Deferred
                          </Badge>
                        )}
                      </div>
                      {record.quality_score !== null && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Quality:</span>
                          <span className={`font-medium ${getQualityColor(record.quality_score)}`}>
                            {(record.quality_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Panel - Details and Actions */}
        <div className="col-span-8 space-y-6">
          {selectedRecord ? (
            <>
              {/* Action Buttons */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleApprove}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={handleReject}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => setDeferDialogOpen(true)}
                      variant="outline"
                      className="flex-1 border-orange-500 text-orange-600 hover:bg-orange-50"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Defer
                    </Button>
                    <Button
                      onClick={() => setEditDialogOpen(true)}
                      variant="outline"
                      className="flex-1 border-blue-500 text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      onClick={handlePreview}
                      variant="outline"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Parsed Data Display */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Parsed CV Data</CardTitle>
                      <CardDescription>Review extracted information</CardDescription>
                    </div>
                    {selectedRecord.quality_score !== null && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Quality Score</p>
                        <p className={`text-2xl font-bold ${getQualityColor(selectedRecord.quality_score)}`}>
                          {(selectedRecord.quality_score * 100).toFixed(0)}%
                          <span className="text-sm font-normal ml-2">
                            {getQualityLabel(selectedRecord.quality_score)}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-480px)]">
                    {selectedRecord.parsed_json ? (
                      <Tabs defaultValue="overview" className="w-full">
                        <TabsList>
                          <TabsTrigger value="overview">Overview</TabsTrigger>
                          <TabsTrigger value="experience">Experience</TabsTrigger>
                          <TabsTrigger value="education">Education</TabsTrigger>
                          <TabsTrigger value="skills">Skills</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-4 mt-4">
                          {selectedRecord.parsed_json.candidate && (
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                                    {selectedRecord.parsed_json._metadata?.field_confidence?.name !== undefined && (
                                      <ConfidenceBadge
                                        confidence={selectedRecord.parsed_json._metadata.field_confidence.name}
                                        provenance={selectedRecord.parsed_json._metadata?.provenance?.name}
                                        fieldName="Name"
                                      />
                                    )}
                                  </div>
                                  <p className="text-lg font-semibold">
                                    {selectedRecord.parsed_json.candidate.full_name || 'N/A'}
                                  </p>
                                </div>
                              </div>

                              {selectedRecord.parsed_json.candidate.current_titles?.length > 0 && (
                                <div className="flex items-start gap-3">
                                  <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="text-sm font-medium text-muted-foreground">Current Title</p>
                                      {selectedRecord.parsed_json._metadata?.field_confidence?.current_title !== undefined && (
                                        <ConfidenceBadge
                                          confidence={selectedRecord.parsed_json._metadata.field_confidence.current_title}
                                          provenance={selectedRecord.parsed_json._metadata?.provenance?.current_title}
                                          fieldName="Current Title"
                                        />
                                      )}
                                    </div>
                                    <p className="text-base">
                                      {selectedRecord.parsed_json.candidate.current_titles[0]}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {selectedRecord.parsed_json.candidate.location && (
                                <div className="flex items-start gap-3">
                                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="text-sm font-medium text-muted-foreground">Location</p>
                                      {selectedRecord.parsed_json._metadata?.field_confidence?.location !== undefined && (
                                        <ConfidenceBadge
                                          confidence={selectedRecord.parsed_json._metadata.field_confidence.location}
                                          provenance={selectedRecord.parsed_json._metadata?.provenance?.location}
                                          fieldName="Location"
                                        />
                                      )}
                                    </div>
                                    <p className="text-base">
                                      {selectedRecord.parsed_json.candidate.location}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Seniority */}
                              {selectedRecord.parsed_json.seniority && (
                                <div className="border-t pt-3 mt-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-semibold text-muted-foreground">Seniority</p>
                                    {selectedRecord.parsed_json._metadata?.field_confidence?.seniority !== undefined && (
                                      <ConfidenceBadge
                                        confidence={selectedRecord.parsed_json._metadata.field_confidence.seniority}
                                        provenance={selectedRecord.parsed_json._metadata?.provenance?.seniority}
                                        fieldName="Seniority"
                                      />
                                    )}
                                  </div>
                                  <Badge variant="outline" className="text-sm">{selectedRecord.parsed_json.seniority}</Badge>
                                </div>
                              )}

                              {/* Sectors */}
                              {Array.isArray(selectedRecord.parsed_json.sectors) && selectedRecord.parsed_json.sectors.length > 0 && (
                                <div className="border-t pt-3 mt-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-semibold text-muted-foreground">Sectors</p>
                                    {selectedRecord.parsed_json._metadata?.field_confidence?.sectors !== undefined && (
                                      <ConfidenceBadge
                                        confidence={selectedRecord.parsed_json._metadata.field_confidence.sectors}
                                        provenance={selectedRecord.parsed_json._metadata?.provenance?.sectors}
                                        fieldName="Sectors"
                                      />
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedRecord.parsed_json.sectors.map((sector: string, idx: number) => (
                                      <Badge key={idx} variant="secondary" className="bg-blue-100 text-blue-800">
                                        {sector}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Functions */}
                              {Array.isArray(selectedRecord.parsed_json.functions) && selectedRecord.parsed_json.functions.length > 0 && (
                                <div className="border-t pt-3 mt-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-semibold text-muted-foreground">Functions</p>
                                    {selectedRecord.parsed_json._metadata?.field_confidence?.functions !== undefined && (
                                      <ConfidenceBadge
                                        confidence={selectedRecord.parsed_json._metadata.field_confidence.functions}
                                        provenance={selectedRecord.parsed_json._metadata?.provenance?.functions}
                                        fieldName="Functions"
                                      />
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedRecord.parsed_json.functions.map((func: string, idx: number) => (
                                      <Badge key={idx} variant="secondary" className="bg-green-100 text-green-800">
                                        {func}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Asset Classes */}
                              {Array.isArray(selectedRecord.parsed_json.asset_classes) && selectedRecord.parsed_json.asset_classes.length > 0 && (
                                <div className="border-t pt-3 mt-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-semibold text-muted-foreground">Asset Classes</p>
                                    {selectedRecord.parsed_json._metadata?.field_confidence?.asset_classes !== undefined && (
                                      <ConfidenceBadge
                                        confidence={selectedRecord.parsed_json._metadata.field_confidence.asset_classes}
                                        provenance={selectedRecord.parsed_json._metadata?.provenance?.asset_classes}
                                        fieldName="Asset Classes"
                                      />
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedRecord.parsed_json.asset_classes.map((asset: string, idx: number) => (
                                      <Badge key={idx} variant="secondary" className="bg-purple-100 text-purple-800">
                                        {asset}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Geographies */}
                              {Array.isArray(selectedRecord.parsed_json.geographies) && selectedRecord.parsed_json.geographies.length > 0 && (
                                <div className="border-t pt-3 mt-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-semibold text-muted-foreground">Geographies</p>
                                    {selectedRecord.parsed_json._metadata?.field_confidence?.geographies !== undefined && (
                                      <ConfidenceBadge
                                        confidence={selectedRecord.parsed_json._metadata.field_confidence.geographies}
                                        provenance={selectedRecord.parsed_json._metadata?.provenance?.geographies}
                                        fieldName="Geographies"
                                      />
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedRecord.parsed_json.geographies.map((geo: string, idx: number) => (
                                      <Badge key={idx} variant="secondary" className="bg-orange-100 text-orange-800">
                                        {geo}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {selectedRecord.parsed_json.contact?.email && (
                                <div className="flex items-start gap-3 border-t pt-3 mt-3">
                                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                                    <p className="text-base">
                                      {selectedRecord.parsed_json.contact.email}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {selectedRecord.parsed_json.contact?.phone && (
                                <div className="flex items-start gap-3">
                                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                                    <p className="text-base">
                                      {selectedRecord.parsed_json.contact.phone}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {selectedRecord.parsed_json.summary && (
                                <div className="pt-3 border-t">
                                  <p className="text-sm font-medium text-muted-foreground mb-2">Professional Summary</p>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    {selectedRecord.parsed_json.summary}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="experience" className="space-y-4 mt-4">
                          {Array.isArray(selectedRecord.parsed_json.experience) && selectedRecord.parsed_json.experience.map((exp: any, idx: number) => (
                            <div key={idx} className="p-4 border rounded-lg space-y-2">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-semibold">{exp.title}</p>
                                  <p className="text-sm text-muted-foreground">{exp.organization}</p>
                                </div>
                                <Badge variant="outline">
                                  {exp.start_date} - {exp.end_date || 'Present'}
                                </Badge>
                              </div>
                              {exp.location && (
                                <p className="text-sm text-muted-foreground">{exp.location}</p>
                              )}
                              {Array.isArray(exp.highlights) && exp.highlights.length > 0 && (
                                <ul className="list-disc list-inside text-sm space-y-1 pt-2">
                                  {exp.highlights.map((h: string, i: number) => (
                                    <li key={i}>{h}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </TabsContent>

                        <TabsContent value="education" className="space-y-4 mt-4">
                          {Array.isArray(selectedRecord.parsed_json.education) && selectedRecord.parsed_json.education.map((edu: any, idx: number) => (
                            <div key={idx} className="p-4 border rounded-lg space-y-2">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-semibold">{edu.institution}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {edu.degree} {edu.field_of_study && `in ${edu.field_of_study}`}
                                  </p>
                                </div>
                                {edu.graduation_date && (
                                  <Badge variant="outline">{edu.graduation_date}</Badge>
                                )}
                              </div>
                              {edu.location && (
                                <p className="text-sm text-muted-foreground">{edu.location}</p>
                              )}
                            </div>
                          ))}
                        </TabsContent>

                        <TabsContent value="skills" className="mt-4">
                          {typeof selectedRecord.parsed_json.skills === 'object' && !Array.isArray(selectedRecord.parsed_json.skills) ? (
                            // Nested skills structure
                            <div className="space-y-4">
                              {selectedRecord.parsed_json.skills.domains && selectedRecord.parsed_json.skills.domains.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Domain Skills</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedRecord.parsed_json.skills.domains.map((skill: string, idx: number) => (
                                      <Badge key={idx} variant="secondary" className="bg-blue-100 text-blue-800">
                                        {skill}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {selectedRecord.parsed_json.skills.technical && selectedRecord.parsed_json.skills.technical.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Technical Skills</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedRecord.parsed_json.skills.technical.map((skill: string, idx: number) => (
                                      <Badge key={idx} variant="secondary" className="bg-green-100 text-green-800">
                                        {skill}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {selectedRecord.parsed_json.skills.leadership && selectedRecord.parsed_json.skills.leadership.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Leadership Skills</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedRecord.parsed_json.skills.leadership.map((skill: string, idx: number) => (
                                      <Badge key={idx} variant="secondary" className="bg-purple-100 text-purple-800">
                                        {skill}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {(!selectedRecord.parsed_json.skills.domains?.length && 
                                !selectedRecord.parsed_json.skills.technical?.length && 
                                !selectedRecord.parsed_json.skills.leadership?.length) && (
                                <p className="text-center text-muted-foreground py-4">No skills listed</p>
                              )}
                            </div>
                          ) : (
                            // Flat array structure
                            <div className="flex flex-wrap gap-2">
                              {Array.isArray(selectedRecord.parsed_json.skills) && selectedRecord.parsed_json.skills.map((skill: string, idx: number) => (
                                <Badge key={idx} variant="secondary">
                                  {skill}
                                </Badge>
                              ))}
                              {(!Array.isArray(selectedRecord.parsed_json.skills) || selectedRecord.parsed_json.skills.length === 0) && (
                                <p className="text-center text-muted-foreground py-4 w-full">No skills listed</p>
                              )}
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No parsed data available</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-12 pb-12 text-center text-muted-foreground">
                <AlertCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a candidate to review</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Defer Dialog */}
      {selectedRecord && (
        <DeferCandidateDialog
          open={deferDialogOpen}
          onOpenChange={setDeferDialogOpen}
          candidateName={selectedRecord.candidate || 'Unknown'}
          onConfirm={confirmDefer}
        />
      )}

      {/* Edit Dialog */}
      {selectedRecord && selectedRecord.parsed_json && (
        <EditCvDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          intakeId={selectedRecord.id}
          parsedJson={selectedRecord.parsed_json}
          onSave={loadRecords}
        />
      )}

      {/* PDF Preview Dialog */}
      {previewOpen && previewData && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Document Preview</h3>
              <Button variant="ghost" onClick={() => setPreviewOpen(false)}>
                Close
              </Button>
            </div>
            <div className="p-4">
              {previewData.mimeType.startsWith('image/') ? (
                <img
                  src={`data:${previewData.mimeType};base64,${previewData.base64}`}
                  alt="Preview"
                  className="max-w-full h-auto"
                />
              ) : (
                <embed
                  src={`data:${previewData.mimeType};base64,${previewData.base64}`}
                  type={previewData.mimeType}
                  width="100%"
                  height="600px"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
