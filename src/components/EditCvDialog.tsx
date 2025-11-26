import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Save, Plus, Trash2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';

interface EditCvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intakeId: number;
  parsedJson: any;
  onSave: () => void;
}

export function EditCvDialog({
  open,
  onOpenChange,
  intakeId,
  parsedJson,
  onSave,
}: EditCvDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editedData, setEditedData] = useState<any>(null);

  useEffect(() => {
    if (parsedJson) {
      const cloned = JSON.parse(JSON.stringify(parsedJson));
      
      // Handle skills - check if it's a nested object with domains/technical/leadership
      if (cloned.skills && !Array.isArray(cloned.skills)) {
        if (typeof cloned.skills === 'object' && (cloned.skills.domains || cloned.skills.technical || cloned.skills.leadership)) {
          // Keep nested structure but ensure each is an array
          cloned.skills = {
            domains: Array.isArray(cloned.skills.domains) ? cloned.skills.domains : [],
            technical: Array.isArray(cloned.skills.technical) ? cloned.skills.technical : [],
            leadership: Array.isArray(cloned.skills.leadership) ? cloned.skills.leadership : []
          };
        } else if (typeof cloned.skills === 'string') {
          // If string, convert to flat array
          cloned.skills = cloned.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
        } else {
          // Otherwise flatten object values to array
          cloned.skills = Object.values(cloned.skills).flat().filter(Boolean);
        }
      } else if (!cloned.skills) {
        cloned.skills = [];
      }
      
      // Ensure experience and education are arrays
      if (!Array.isArray(cloned.experience)) {
        cloned.experience = [];
      }
      if (!Array.isArray(cloned.education)) {
        cloned.education = [];
      }
      
      // Ensure professional fields are arrays (they come from root level of parsed_json)
      if (!Array.isArray(cloned.sectors)) {
        cloned.sectors = [];
      }
      if (!Array.isArray(cloned.functions)) {
        cloned.functions = [];
      }
      if (!Array.isArray(cloned.asset_classes)) {
        cloned.asset_classes = [];
      }
      if (!Array.isArray(cloned.geographies)) {
        cloned.geographies = [];
      }
      
      console.log('[EditCvDialog] Loaded data:', {
        sectors: cloned.sectors,
        functions: cloned.functions,
        asset_classes: cloned.asset_classes,
        geographies: cloned.geographies,
        seniority: cloned.seniority,
        hasMetadata: !!cloned._metadata
      });
      
      setEditedData(cloned);
    }
  }, [parsedJson]);

  if (!editedData || !editedData.candidate) {
    return null;
  }

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await (window.api as any).intake.updateParsedJson({
        intakeId,
        updatedJson: editedData,
        reScore: true,
      });
      
      toast({
        title: "CV Updated",
        description: "Changes saved and quality re-scored",
      });
      
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating CV:', error);
      toast({
        title: "Update Failed",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateCandidateField = (field: string, value: any) => {
    setEditedData({
      ...editedData,
      candidate: {
        ...editedData.candidate,
        [field]: value,
      },
    });
  };

  const updateContactField = (field: string, value: any) => {
    setEditedData({
      ...editedData,
      contact: {
        ...editedData.contact,
        [field]: value,
      },
    });
  };

  const addExperience = () => {
    setEditedData({
      ...editedData,
      experience: [
        ...(editedData.experience || []),
        {
          organization: '',
          title: '',
          location: '',
          start_date: '',
          end_date: null,
          is_current: false,
          highlights: [],
        },
      ],
    });
  };

  const updateExperience = (index: number, field: string, value: any) => {
    const newExperience = [...(editedData.experience || [])];
    newExperience[index] = {
      ...newExperience[index],
      [field]: value,
    };
    setEditedData({
      ...editedData,
      experience: newExperience,
    });
  };

  const removeExperience = (index: number) => {
    setEditedData({
      ...editedData,
      experience: editedData.experience.filter((_: any, i: number) => i !== index),
    });
  };

  const addEducation = () => {
    setEditedData({
      ...editedData,
      education: [
        ...(editedData.education || []),
        {
          institution: '',
          degree: '',
          field_of_study: '',
          location: '',
          graduation_date: '',
        },
      ],
    });
  };

  const updateEducation = (index: number, field: string, value: any) => {
    const newEducation = [...(editedData.education || [])];
    newEducation[index] = {
      ...newEducation[index],
      [field]: value,
    };
    setEditedData({
      ...editedData,
      education: newEducation,
    });
  };

  const removeEducation = (index: number) => {
    setEditedData({
      ...editedData,
      education: editedData.education.filter((_: any, i: number) => i !== index),
    });
  };

  const addSkill = (newSkill: string, category?: string) => {
    if (!newSkill.trim()) return;
    
    if (typeof editedData.skills === 'object' && !Array.isArray(editedData.skills)) {
      // Nested skills structure
      const cat = category || 'technical';
      const currentCategorySkills = Array.isArray(editedData.skills[cat]) ? editedData.skills[cat] : [];
      if (!currentCategorySkills.includes(newSkill.trim())) {
        setEditedData({
          ...editedData,
          skills: {
            ...editedData.skills,
            [cat]: [...currentCategorySkills, newSkill.trim()],
          },
        });
      }
    } else {
      // Flat array structure
      const currentSkills = Array.isArray(editedData.skills) ? editedData.skills : [];
      if (!currentSkills.includes(newSkill.trim())) {
        setEditedData({
          ...editedData,
          skills: [...currentSkills, newSkill.trim()],
        });
      }
    }
  };

  const removeSkill = (index: number, category?: string) => {
    if (typeof editedData.skills === 'object' && !Array.isArray(editedData.skills)) {
      // Nested skills structure
      const cat = category || 'technical';
      const currentCategorySkills = Array.isArray(editedData.skills[cat]) ? editedData.skills[cat] : [];
      setEditedData({
        ...editedData,
        skills: {
          ...editedData.skills,
          [cat]: currentCategorySkills.filter((_: any, i: number) => i !== index),
        },
      });
    } else {
      // Flat array structure
      const currentSkills = Array.isArray(editedData.skills) ? editedData.skills : [];
      setEditedData({
        ...editedData,
        skills: currentSkills.filter((_: any, i: number) => i !== index),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            Edit Parsed CV Data
          </DialogTitle>
          <DialogDescription>
            Make corrections to AI-extracted data. Changes will be tracked and the CV will be re-scored.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col px-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="experience">Experience</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4 h-[calc(90vh-280px)]">
            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 pr-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="fullName">Full Name *</Label>
                    {editedData._metadata?.field_confidence?.name !== undefined && (
                      <ConfidenceBadge 
                        confidence={editedData._metadata.field_confidence.name}
                        provenance={editedData._metadata?.provenance?.name}
                        fieldName="Name"
                      />
                    )}
                  </div>
                  <Input
                    id="fullName"
                    value={editedData.candidate?.full_name || ''}
                    onChange={(e) => updateCandidateField('full_name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="currentTitle">Current Title</Label>
                    {editedData._metadata?.field_confidence?.current_title !== undefined && (
                      <ConfidenceBadge 
                        confidence={editedData._metadata.field_confidence.current_title}
                        provenance={editedData._metadata?.provenance?.current_title}
                        fieldName="Current Title"
                      />
                    )}
                  </div>
                  <Input
                    id="currentTitle"
                    value={editedData.candidate?.current_titles?.[0] || ''}
                    onChange={(e) => updateCandidateField('current_titles', [e.target.value])}
                    placeholder="e.g., Private Equity Associate"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="location">Location</Label>
                    {editedData._metadata?.field_confidence?.location !== undefined && (
                      <ConfidenceBadge 
                        confidence={editedData._metadata.field_confidence.location}
                        provenance={editedData._metadata?.provenance?.location}
                        fieldName="Location"
                      />
                    )}
                  </div>
                  <Input
                    id="location"
                    value={editedData.candidate?.location || ''}
                    onChange={(e) => updateCandidateField('location', e.target.value)}
                    placeholder="e.g., London, UK"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="seniority">Seniority</Label>
                    {editedData._metadata?.field_confidence?.seniority !== undefined && (
                      <ConfidenceBadge 
                        confidence={editedData._metadata.field_confidence.seniority}
                        provenance={editedData._metadata?.provenance?.seniority}
                        fieldName="Seniority"
                      />
                    )}
                  </div>
                  <Input
                    id="seniority"
                    value={editedData.seniority || ''}
                    onChange={(e) => setEditedData({ ...editedData, seniority: e.target.value })}
                    placeholder="e.g., Associate, Vice President, Managing Director"
                  />
                </div>

                {/* Sectors */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <Label>Sectors</Label>
                    {editedData._metadata?.field_confidence?.sectors !== undefined && (
                      <ConfidenceBadge 
                        confidence={editedData._metadata.field_confidence.sectors}
                        provenance={editedData._metadata?.provenance?.sectors}
                        fieldName="Sectors"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="Add sector (press Enter)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const value = (e.target as HTMLInputElement).value.trim();
                          if (value) {
                            const sectors = Array.isArray(editedData.sectors) ? editedData.sectors : [];
                            if (!sectors.includes(value)) {
                              setEditedData({ ...editedData, sectors: [...sectors, value] });
                            }
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(editedData.sectors) && editedData.sectors.map((sector: string, idx: number) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => {
                            setEditedData({
                              ...editedData,
                              sectors: editedData.sectors.filter((_: any, i: number) => i !== idx)
                            });
                          }}
                        >
                          {sector}
                          <Trash2 className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Functions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <Label>Functions</Label>
                    {editedData._metadata?.field_confidence?.functions !== undefined && (
                      <ConfidenceBadge 
                        confidence={editedData._metadata.field_confidence.functions}
                        provenance={editedData._metadata?.provenance?.functions}
                        fieldName="Functions"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="Add function (press Enter)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const value = (e.target as HTMLInputElement).value.trim();
                          if (value) {
                            const functions = Array.isArray(editedData.functions) ? editedData.functions : [];
                            if (!functions.includes(value)) {
                              setEditedData({ ...editedData, functions: [...functions, value] });
                            }
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(editedData.functions) && editedData.functions.map((func: string, idx: number) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => {
                            setEditedData({
                              ...editedData,
                              functions: editedData.functions.filter((_: any, i: number) => i !== idx)
                            });
                          }}
                        >
                          {func}
                          <Trash2 className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Asset Classes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <Label>Asset Classes</Label>
                    {editedData._metadata?.field_confidence?.asset_classes !== undefined && (
                      <ConfidenceBadge 
                        confidence={editedData._metadata.field_confidence.asset_classes}
                        provenance={editedData._metadata?.provenance?.asset_classes}
                        fieldName="Asset Classes"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="Add asset class (press Enter)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const value = (e.target as HTMLInputElement).value.trim();
                          if (value) {
                            const assetClasses = Array.isArray(editedData.asset_classes) ? editedData.asset_classes : [];
                            if (!assetClasses.includes(value)) {
                              setEditedData({ ...editedData, asset_classes: [...assetClasses, value] });
                            }
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(editedData.asset_classes) && editedData.asset_classes.map((asset: string, idx: number) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => {
                            setEditedData({
                              ...editedData,
                              asset_classes: editedData.asset_classes.filter((_: any, i: number) => i !== idx)
                            });
                          }}
                        >
                          {asset}
                          <Trash2 className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Geographies */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <Label>Geographies</Label>
                    {editedData._metadata?.field_confidence?.geographies !== undefined && (
                      <ConfidenceBadge 
                        confidence={editedData._metadata.field_confidence.geographies}
                        provenance={editedData._metadata?.provenance?.geographies}
                        fieldName="Geographies"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="Add geography (press Enter)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const value = (e.target as HTMLInputElement).value.trim();
                          if (value) {
                            const geographies = Array.isArray(editedData.geographies) ? editedData.geographies : [];
                            if (!geographies.includes(value)) {
                              setEditedData({ ...editedData, geographies: [...geographies, value] });
                            }
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(editedData.geographies) && editedData.geographies.map((geo: string, idx: number) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => {
                            setEditedData({
                              ...editedData,
                              geographies: editedData.geographies.filter((_: any, i: number) => i !== idx)
                            });
                          }}
                        >
                          {geo}
                          <Trash2 className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editedData.contact?.email || ''}
                      onChange={(e) => updateContactField('email', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={editedData.contact?.phone || ''}
                      onChange={(e) => updateContactField('phone', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    value={editedData.public_profiles?.linkedin || ''}
                    onChange={(e) => setEditedData({
                      ...editedData,
                      public_profiles: {
                        ...editedData.public_profiles,
                        linkedin: e.target.value,
                      },
                    })}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="summary">Professional Summary</Label>
                  <Textarea
                    id="summary"
                    value={editedData.summary || ''}
                    onChange={(e) => setEditedData({ ...editedData, summary: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Experience Tab */}
            <TabsContent value="experience" className="space-y-4 pr-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Work Experience</h3>
                <Button size="sm" variant="outline" onClick={addExperience}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Experience
                </Button>
              </div>

              {Array.isArray(editedData.experience) && editedData.experience.map((exp: any, index: number) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline">Experience {index + 1}</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeExperience(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Organization *</Label>
                      <Input
                        value={exp.company || ''}
                        onChange={(e) => updateExperience(index, 'company', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input
                        value={exp.title || ''}
                        onChange={(e) => updateExperience(index, 'title', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="month"
                        value={exp.start_date || ''}
                        onChange={(e) => updateExperience(index, 'start_date', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="month"
                        value={exp.end_date || ''}
                        onChange={(e) => updateExperience(index, 'end_date', e.target.value || null)}
                        disabled={exp.is_current}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={exp.location || ''}
                      onChange={(e) => updateExperience(index, 'location', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Key Highlights (one per line)</Label>
                    <Textarea
                      value={Array.isArray(exp.highlights) ? exp.highlights.join('\n') : ''}
                      onChange={(e) => updateExperience(
                        index,
                        'highlights',
                        e.target.value.split('\n').filter(h => h.trim())
                      )}
                      rows={3}
                      placeholder="• Led team of 5 analysts&#10;• Managed $500M portfolio"
                    />
                  </div>
                </div>
              ))}

              {(!Array.isArray(editedData.experience) || editedData.experience.length === 0) && (
                <p className="text-center text-muted-foreground py-8">
                  No experience entries. Click "Add Experience" to start.
                </p>
              )}
            </TabsContent>

            {/* Education Tab */}
            <TabsContent value="education" className="space-y-4 pr-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Education</h3>
                <Button size="sm" variant="outline" onClick={addEducation}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Education
                </Button>
              </div>

              {Array.isArray(editedData.education) && editedData.education.map((edu: any, index: number) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline">Education {index + 1}</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeEducation(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Institution *</Label>
                      <Input
                        value={edu.institution || ''}
                        onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Degree</Label>
                      <Input
                        value={edu.degree || ''}
                        onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                        placeholder="e.g., MBA, Bachelor's"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Field of Study</Label>
                      <Input
                        value={edu.field_of_study || ''}
                        onChange={(e) => updateEducation(index, 'field_of_study', e.target.value)}
                        placeholder="e.g., Finance, Economics"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Graduation Date</Label>
                      <Input
                        type="month"
                        value={edu.graduation_date || ''}
                        onChange={(e) => updateEducation(index, 'graduation_date', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={edu.location || ''}
                      onChange={(e) => updateEducation(index, 'location', e.target.value)}
                    />
                  </div>
                </div>
              ))}

              {(!Array.isArray(editedData.education) || editedData.education.length === 0) && (
                <p className="text-center text-muted-foreground py-8">
                  No education entries. Click "Add Education" to start.
                </p>
              )}
            </TabsContent>

            {/* Skills Tab */}
            <TabsContent value="skills" className="space-y-4 pr-4">
              {typeof editedData.skills === 'object' && !Array.isArray(editedData.skills) ? (
                // Nested skills structure (domains, technical, leadership)
                <div className="space-y-6">
                  {/* Domain Skills */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Domain Skills</Label>
                      <Badge variant="outline">{editedData.skills.domains?.length || 0} skills</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Add domain skill (e.g., Financial Services, Healthcare)"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addSkill((e.target as HTMLInputElement).value, 'domains');
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(editedData.skills.domains) && editedData.skills.domains.map((skill: string, index: number) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => removeSkill(index, 'domains')}
                        >
                          {skill}
                          <Trash2 className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                      {(!editedData.skills.domains || editedData.skills.domains.length === 0) && (
                        <p className="text-sm text-muted-foreground">No domain skills added</p>
                      )}
                    </div>
                  </div>

                  {/* Technical Skills */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Technical Skills</Label>
                      <Badge variant="outline">{editedData.skills.technical?.length || 0} skills</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Add technical skill (e.g., Excel, Bloomberg, Python)"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addSkill((e.target as HTMLInputElement).value, 'technical');
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(editedData.skills.technical) && editedData.skills.technical.map((skill: string, index: number) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => removeSkill(index, 'technical')}
                        >
                          {skill}
                          <Trash2 className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                      {(!editedData.skills.technical || editedData.skills.technical.length === 0) && (
                        <p className="text-sm text-muted-foreground">No technical skills added</p>
                      )}
                    </div>
                  </div>

                  {/* Leadership Skills */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Leadership Skills</Label>
                      <Badge variant="outline">{editedData.skills.leadership?.length || 0} skills</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Add leadership skill (e.g., Team Management, Mentoring)"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addSkill((e.target as HTMLInputElement).value, 'leadership');
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(editedData.skills.leadership) && editedData.skills.leadership.map((skill: string, index: number) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => removeSkill(index, 'leadership')}
                        >
                          {skill}
                          <Trash2 className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                      {(!editedData.skills.leadership || editedData.skills.leadership.length === 0) && (
                        <p className="text-sm text-muted-foreground">No leadership skills added</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // Flat skills array structure
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Add a skill (press Enter)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addSkill((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(editedData.skills) && editedData.skills.map((skill: string, index: number) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeSkill(index)}
                      >
                        {skill}
                        <Trash2 className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>

                  {(!Array.isArray(editedData.skills) || editedData.skills.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">
                      No skills listed. Type and press Enter to add skills.
                    </p>
                  )}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSubmitting}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {isSubmitting ? 'Saving...' : 'Save & Re-score'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
