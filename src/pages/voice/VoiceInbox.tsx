import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, Search, Settings, CheckCircle, ListTodo } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { VoiceSettingsModal } from "@/components/voice/VoiceSettingsModal";
import { useToast } from "@/hooks/use-toast";

// Mock data
const mockVoiceNotes = [
  {
    id: 'vn-001',
    recordedAt: '2025-11-20 14:32',
    source: 'Folder: /VoiceNotes',
    status: 'Transcribed',
    linkedEntities: 2,
    duration: '3:45',
    transcript: 'Following up on the Infrastructure PE Partner mandate for Brookfield...',
    linkedEntitiesDetails: [
      { type: 'Mandate', name: 'Infrastructure PE Partner - Brookfield', id: 'm-001' },
      { type: 'Candidate', name: 'James Patterson', id: 'c-042' }
    ]
  },
  {
    id: 'vn-002',
    recordedAt: '2025-11-20 11:18',
    source: 'Email: voice@vittoria.ai',
    status: 'Parsed',
    linkedEntities: 4,
    duration: '5:22',
    transcript: 'Meeting notes from today\'s client catch-up with KKR...',
    linkedEntitiesDetails: [
      { type: 'Firm', name: 'KKR', id: 'f-015' },
      { type: 'Mandate', name: 'Real Estate Partner', id: 'm-008' },
      { type: 'Candidate', name: 'Sarah Chen', id: 'c-023' },
      { type: 'Candidate', name: 'Michael Roberts', id: 'c-034' }
    ]
  },
  {
    id: 'vn-003',
    recordedAt: '2025-11-19 16:45',
    source: 'Folder: /VoiceNotes',
    status: 'Queued',
    linkedEntities: 0,
    duration: '2:15',
    transcript: '',
    linkedEntitiesDetails: []
  },
  {
    id: 'vn-004',
    recordedAt: '2025-11-19 09:30',
    source: 'Email: voice@vittoria.ai',
    status: 'Transcribed',
    linkedEntities: 1,
    duration: '4:10',
    transcript: 'Quick update on the Digital Infrastructure search...',
    linkedEntitiesDetails: [
      { type: 'Mandate', name: 'Digital Infrastructure VP', id: 'm-012' }
    ]
  },
];

export default function VoiceInbox() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [notes, setNotes] = useState(mockVoiceNotes);

  const filteredNotes = notes.filter((note) => {
    const matchesSearch = note.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.source.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || note.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleNoteClick = (note: any) => {
    setSelectedNote(note);
    setDrawerOpen(true);
  };

  const handleMarkAsParsed = (noteId: string) => {
    setNotes(prevNotes =>
      prevNotes.map(note =>
        note.id === noteId ? { ...note, status: 'Parsed' } : note
      )
    );
    toast({
      title: "Note marked as parsed",
      description: "The voice note has been marked as fully processed.",
    });
    setDrawerOpen(false);
  };

  const handleCreateTask = (noteId: string) => {
    toast({
      title: "Task created",
      description: "A follow-up task has been created from this voice note.",
    });
  };

  const handleEntityClick = (entityType: string, entityId: string) => {
    setDrawerOpen(false);
    if (entityType === 'Candidate') navigate(`/candidates/${entityId}`);
    else if (entityType === 'Mandate') navigate(`/mandates/${entityId}`);
    else if (entityType === 'Firm') navigate(`/firms/${entityId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Parsed': return 'default';
      case 'Transcribed': return 'secondary';
      case 'Queued': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Mic className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Voice Notes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Transcribed and parsed voice recordings
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setSettingsOpen(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Voice Settings
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search voice notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="transcribed">Transcribed</SelectItem>
            <SelectItem value="parsed">Parsed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Voice Notes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Incoming Voice Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Recorded At</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Linked Entities</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNotes.map((note) => (
                <TableRow
                  key={note.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleNoteClick(note)}
                >
                  <TableCell className="font-mono text-sm">{note.id}</TableCell>
                  <TableCell className="text-sm">{note.recordedAt}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{note.source}</TableCell>
                  <TableCell className="text-sm">{note.duration}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(note.status) as any}>
                      {note.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {note.linkedEntities > 0 ? (
                      <Badge variant="outline">{note.linkedEntities}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Voice Note Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedNote && (
            <>
              <SheetHeader>
                <SheetTitle>Voice Note: {selectedNote.id}</SheetTitle>
                <SheetDescription>
                  Recorded {selectedNote.recordedAt} · {selectedNote.duration}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status */}
                <div>
                  <Badge variant={getStatusColor(selectedNote.status) as any}>
                    {selectedNote.status}
                  </Badge>
                </div>

                {/* Transcript */}
                {selectedNote.transcript && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Transcript</h3>
                    <div className="p-4 bg-muted rounded-lg text-sm text-foreground">
                      {selectedNote.transcript}
                    </div>
                  </div>
                )}

                {/* Linked Entities */}
                {selectedNote.linkedEntitiesDetails.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Linked Entities</h3>
                    <div className="space-y-2">
                      {selectedNote.linkedEntitiesDetails.map((entity: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => handleEntityClick(entity.type, entity.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-foreground">{entity.name}</div>
                            <Badge variant="outline" className="text-xs">{entity.type}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleCreateTask(selectedNote.id)}
                  >
                    <ListTodo className="h-4 w-4 mr-2" />
                    Create Task
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => handleMarkAsParsed(selectedNote.id)}
                    disabled={selectedNote.status === 'Parsed'}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Parsed
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Voice Settings Modal */}
      <VoiceSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
}
