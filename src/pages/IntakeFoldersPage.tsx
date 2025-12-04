import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Upload, FolderUp, Eye, Save, FileIcon, Image, FileText, Music, Video, FileSpreadsheet, Presentation, File, Download, ChevronRight, ChevronDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

type LocalFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  category: string;
  lastModified: number;
  file?: File;
};

const getCategory = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic', 'svg'].includes(ext)) return 'image';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['txt', 'md', 'csv', 'tsv', 'log'].includes(ext)) return 'text';
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) return 'audio';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video';
  if (['ppt', 'pptx', 'key', 'odp'].includes(ext)) return 'slide';
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) return 'document';
  if (['xls', 'xlsx', 'ods'].includes(ext)) return 'spreadsheet';
  return 'other';
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'image': return <Image className="h-4 w-4 text-green-500" />;
    case 'pdf': return <FileText className="h-4 w-4 text-red-500" />;
    case 'text': return <FileText className="h-4 w-4 text-blue-500" />;
    case 'audio': return <Music className="h-4 w-4 text-purple-500" />;
    case 'video': return <Video className="h-4 w-4 text-pink-500" />;
    case 'slide': return <Presentation className="h-4 w-4 text-orange-500" />;
    case 'document': return <FileText className="h-4 w-4 text-blue-600" />;
    case 'spreadsheet': return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
    default: return <File className="h-4 w-4 text-gray-500" />;
  }
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString() + ' ' + new Date(timestamp).toLocaleTimeString();
};

export default function IntakeFoldersPage() {
  const { toast } = useToast();
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [savedFiles, setSavedFiles] = useState<LocalFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<LocalFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Load saved files from database on mount
  useEffect(() => {
    loadSavedFiles();
  }, []);

  const loadSavedFiles = async () => {
    setLoading(true);
    try {
      if ((window as any).api?.intakeFolders?.getAllDocuments) {
        // Get all documents from database
        const result: any = await (window as any).api.intakeFolders.getAllDocuments();
        const docs = Array.isArray(result) ? result : result?.documents || [];
        
        // Convert DB documents to LocalFile format
        const localFiles: LocalFile[] = docs.map((doc: any) => ({
          id: String(doc.id),
          name: doc.file_name,
          size: doc.file_size || 0,
          type: doc.file_type || '',
          category: doc.category || getCategory(doc.file_name),
          lastModified: doc.uploaded_at ? new Date(doc.uploaded_at).getTime() : Date.now(),
        }));
        
        setSavedFiles(localFiles);
        console.log('Loaded', localFiles.length, 'saved files from database');
      }
    } catch (err) {
      console.error('Failed to load saved files:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    const newFiles: LocalFile[] = Array.from(fileList).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      type: f.type,
      category: getCategory(f.name),
      lastModified: f.lastModified,
      file: f,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    const newFiles: LocalFile[] = Array.from(fileList).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      type: f.type,
      category: getCategory(f.name),
      lastModified: f.lastModified,
      file: f,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    setFolderModalOpen(true);
    e.target.value = '';
  };

  const deleteFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const deleteSavedFile = async (id: string) => {
    try {
      // Delete from database if API is available
      if ((window as any).api?.intakeFolders?.deleteDocument) {
        await (window as any).api.intakeFolders.deleteDocument(parseInt(id));
      }
      // Remove from local state
      setSavedFiles((prev) => prev.filter((f) => f.id !== id));
      toast({ title: 'Deleted', description: 'File deleted successfully' });
    } catch (err) {
      console.error('Failed to delete file:', err);
      toast({ title: 'Error', description: 'Failed to delete file', variant: 'destructive' });
    }
  };

  const clearAll = () => setFiles([]);

  const openPreview = (file: LocalFile) => {
    setSelectedFile(file);
    setPreviewOpen(true);
  };

  const downloadFile = (file: LocalFile) => {
    if (!file.file) {
      toast({ title: 'Cannot download', description: 'File data not available', variant: 'destructive' });
      return;
    }
    const url = URL.createObjectURL(file.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const isCategoryExpanded = (cat: string) => {
    return expandedCategories[cat] !== false; // Default to expanded
  };

  const saveToDatabase = async () => {
    if (files.length === 0) {
      toast({ title: 'No files', description: 'Upload files first before saving.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    let successCount = 0;
    let errorCount = 0;
    try {
      for (const f of files) {
        try {
          if ((window as any).api?.intakeFolders?.createDocument) {
            // Validate required fields
            if (!f.name || f.name.trim() === '') {
              console.error('Skipping file with empty name:', f);
              errorCount++;
              continue;
            }
            
            console.log('Saving file:', {
              file_name: f.name,
              file_path: '',
              file_size: f.size,
              file_type: f.type || 'application/octet-stream',
              category: f.category,
            });
            
            await (window as any).api.intakeFolders.createDocument({
              file_name: f.name,
              file_path: '',
              file_size: f.size,
              file_type: f.type || 'application/octet-stream',
              category: f.category,
            });
            successCount++;
          } else {
            successCount++; // Count as success if no API (demo mode)
          }
        } catch (err) {
          console.error('Failed to save file:', f.name, err);
          errorCount++;
        }
      }
      // Move files to saved and reload from DB
      setFiles([]);
      await loadSavedFiles(); // Reload from database
      
      if (errorCount > 0) {
        toast({ 
          title: 'Partially saved', 
          description: `${successCount} files saved, ${errorCount} failed.`,
          variant: 'default'
        });
      } else {
        toast({ title: 'Saved!', description: `${successCount} files saved.` });
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to save files.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Group saved files by category
  const grouped = savedFiles.reduce<Record<string, LocalFile[]>>((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    image: '🖼️ Images',
    pdf: '📄 PDF',
    text: '📝 Text Files',
    audio: '🎵 Audio',
    video: '🎬 Video',
    slide: '📊 Slides',
    document: '📃 Documents',
    spreadsheet: '📈 Spreadsheets',
    other: '📁 Other',
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Intake Folders</h1>
          <p className="text-muted-foreground">Upload, categorize, and manage your files</p>
        </div>
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <input type="file" multiple className="hidden" onChange={handleFileUpload} />
            <Button asChild>
              <span><Upload className="h-4 w-4 mr-2" /> Upload Files</span>
            </Button>
          </label>
          <label className="cursor-pointer">
            <input type="file" multiple className="hidden" onChange={handleFolderUpload} {...{ webkitdirectory: '', directory: '' } as any} />
            <Button asChild variant="outline">
              <span><FolderUp className="h-4 w-4 mr-2" /> Upload Folder</span>
            </Button>
          </label>
        </div>
      </div>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">Upload Queue ({files.length})</TabsTrigger>
          <TabsTrigger value="saved">Saved Files ({savedFiles.length})</TabsTrigger>
        </TabsList>

        {/* Upload Queue Tab */}
        <TabsContent value="upload" className="space-y-4">
          {files.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg p-12 text-center">
              <FileIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No files in upload queue.</p>
              <p className="text-sm text-muted-foreground mt-1">Use the buttons above to upload files or a folder.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">{files.length} files ready to save</p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={clearAll}>Clear All</Button>
                  <Button onClick={saveToDatabase} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save to Database'}
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Modified</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.map((f) => (
                      <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(f.category)}
                            <span className="truncate max-w-[300px]">{f.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{f.category}</Badge>
                        </TableCell>
                        <TableCell>{formatSize(f.size)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{formatDate(f.lastModified)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openPreview(f)} title="Preview">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => downloadFile(f)} title="Download">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteFile(f.id)} title="Delete">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>

        {/* Saved Files Tab - Category View */}
        <TabsContent value="saved" className="space-y-6">
          {savedFiles.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg p-12 text-center">
              <Save className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No files saved yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Upload files and click "Save to Database" to see them here.</p>
            </div>
          ) : (
            Object.entries(grouped).map(([cat, catFiles]) => (
              <div key={cat} className="border rounded-lg">
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full p-4 border-b bg-muted/30 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <h2 className="font-semibold flex items-center gap-2">
                    {isCategoryExpanded(cat) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    {getCategoryIcon(cat)}
                    {categoryLabels[cat] || cat}
                    <Badge variant="outline" className="ml-2">{catFiles.length}</Badge>
                  </h2>
                </button>
                {isCategoryExpanded(cat) && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Modified</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {catFiles.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(f.category)}
                              <span className="truncate max-w-[300px]">{f.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{formatSize(f.size)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{formatDate(f.lastModified)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openPreview(f)} title="Preview">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => downloadFile(f)} title="Download">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteSavedFile(f.id)} title="Delete">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* File Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFile && getCategoryIcon(selectedFile.category)}
              File Details
            </DialogTitle>
            <DialogDescription>Preview and details of the selected file</DialogDescription>
          </DialogHeader>
          {selectedFile && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">File Name</p>
                  <p className="font-medium break-all">{selectedFile.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <Badge variant="secondary">{selectedFile.category}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Size</p>
                  <p className="font-medium">{formatSize(selectedFile.size)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{selectedFile.type || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Modified</p>
                  <p className="font-medium">{formatDate(selectedFile.lastModified)}</p>
                </div>
              </div>

              {/* Preview area */}
              <div className="border rounded-lg p-6 bg-muted/20 min-h-[200px] flex items-center justify-center">
                {selectedFile.category === 'image' && selectedFile.file ? (
                  <img 
                    src={URL.createObjectURL(selectedFile.file)} 
                    alt={selectedFile.name} 
                    className="max-h-[300px] max-w-full object-contain rounded"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    {getCategoryIcon(selectedFile.category)}
                    <p className="mt-2">Preview not available for this file type</p>
                    <p className="text-sm">{selectedFile.name}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
            {selectedFile && (
              <Button onClick={() => { downloadFile(selectedFile); }}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Folder Upload Modal - Shows all files from folder */}
      <Dialog open={folderModalOpen} onOpenChange={setFolderModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Folder Contents</DialogTitle>
            <DialogDescription>Review and remove files before saving. {files.length} files found.</DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[400px] border rounded">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Remove</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(f.category)}
                        <span className="truncate max-w-[250px]">{f.name}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{f.category}</Badge></TableCell>
                    <TableCell>{formatSize(f.size)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => deleteFile(f.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { clearAll(); setFolderModalOpen(false); }}>Cancel</Button>
            <Button onClick={() => setFolderModalOpen(false)}>
              Confirm ({files.length} files)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
