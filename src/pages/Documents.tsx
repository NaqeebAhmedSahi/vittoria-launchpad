import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Search, Download, Trash2, Lock, X } from 'lucide-react';
import DocumentUploadDialog from '@/components/DocumentUploadDialog';

interface Document {
  id: number;
  name: string;
  description?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  category?: string | null;
  uploader_name?: string;
  firm_name?: string;
  mandate_name?: string;
  candidate_name?: string;
  is_confidential: boolean;
  created_at: string;
}

export default function Documents() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  useEffect(() => {
    loadDocuments();
    loadCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDocuments();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (searchQuery) filters.search = searchQuery;
      if (selectedCategory !== 'all') filters.category = selectedCategory;

      const result = await window.api.document.list(filters);
      if (result.success && result.documents) {
        setDocuments(result.documents);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await window.api.document.getCategories();
      if (result.success && result.categories) {
        setCategories(result.categories);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const result = await window.api.document.delete(id);
      if (result.success) {
        loadDocuments();
      } else {
        alert('Failed to delete document: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document');
    }
  };

  const handleDownload = async (id: number) => {
    try {
      const result = await window.api.document.download(id);
      if (result.success && result.data) {
        // Convert base64 to blob and trigger download
        const byteCharacters = atob(result.data.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: result.data.type });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.data.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download document: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to download document:', error);
      alert('Failed to download document');
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '—';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${kb.toFixed(2)} KB`;
  };

  const getEntityInfo = (doc: Document) => {
    if (doc.firm_name) return doc.firm_name;
    if (doc.mandate_name) return doc.mandate_name;
    if (doc.candidate_name) return doc.candidate_name;
    return '—';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={selectedDocument ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Documents</h1>
              <p className="text-muted-foreground">Manage files and documents</p>
            </div>
            <Button onClick={() => setShowUploadDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confidential</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents.filter(d => d.is_confidential).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <CardTitle>All Documents</CardTitle>
              <CardDescription>View and manage your documents</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No documents found. Upload your first document to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Related To</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map(doc => (
                  <TableRow 
                    key={doc.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedDocument(doc)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {doc.is_confidential && (
                          <Lock className="w-3 h-3 text-red-500" />
                        )}
                        {doc.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {doc.category ? (
                        <Badge variant="outline">{doc.category}</Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>{getEntityInfo(doc)}</TableCell>
                    <TableCell>{doc.uploader_name || '—'}</TableCell>
                    <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                    <TableCell>
                      {new Date(doc.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(doc.id);
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(doc.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </div>

        {/* Detail Panel */}
        {selectedDocument && (
          <div>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Document Details</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDocument(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Document Name</label>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedDocument.is_confidential && (
                      <Lock className="w-4 h-4 text-red-500" />
                    )}
                    <p className="font-semibold">{selectedDocument.name}</p>
                  </div>
                </div>

                {selectedDocument.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="mt-1 text-sm">{selectedDocument.description}</p>
                  </div>
                )}

                {selectedDocument.category && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Category</label>
                    <div className="mt-1">
                      <Badge variant="outline">{selectedDocument.category}</Badge>
                    </div>
                  </div>
                )}

                {selectedDocument.file_type && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">File Type</label>
                    <p className="mt-1">{selectedDocument.file_type}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">File Size</label>
                  <p className="mt-1">{formatFileSize(selectedDocument.file_size)}</p>
                </div>

                {/* Related Entities */}
                {(selectedDocument.firm_name || selectedDocument.mandate_name || selectedDocument.candidate_name) && (
                  <div className="pt-2 border-t">
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Related To</label>
                    
                    {selectedDocument.firm_name && (
                      <div className="mb-2 pl-2">
                        <label className="text-xs text-muted-foreground">Firm</label>
                        <p className="font-medium">{selectedDocument.firm_name}</p>
                      </div>
                    )}

                    {selectedDocument.mandate_name && (
                      <div className="mb-2 pl-2">
                        <label className="text-xs text-muted-foreground">Mandate</label>
                        <p className="font-medium">{selectedDocument.mandate_name}</p>
                      </div>
                    )}

                    {selectedDocument.candidate_name && (
                      <div className="pl-2">
                        <label className="text-xs text-muted-foreground">Candidate</label>
                        <p className="font-medium">{selectedDocument.candidate_name}</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedDocument.uploader_name && (
                  <div className="pt-2 border-t">
                    <label className="text-sm font-medium text-muted-foreground">Uploaded By</label>
                    <p className="mt-1">{selectedDocument.uploader_name}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Upload Date</label>
                  <p className="mt-1 text-sm">
                    {new Date(selectedDocument.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                {selectedDocument.is_confidential && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-red-600">
                      <Lock className="w-4 h-4" />
                      <p className="text-sm font-medium">Confidential Document</p>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(selectedDocument.id);
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <DocumentUploadDialog
        open={showUploadDialog}
        onClose={(refresh) => {
          setShowUploadDialog(false);
          if (refresh) {
            loadDocuments();
            loadCategories();
          }
        }}
      />
    </div>
  );
}
