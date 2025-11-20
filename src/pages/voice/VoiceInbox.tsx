import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, Search, Settings } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

// Mock data
const mockVoiceNotes = [
  {
    id: 'vn-001',
    recordedAt: '2025-11-20 14:32',
    source: 'Folder: /VoiceNotes',
    status: 'Transcribed',
    linkedEntities: 2,
    duration: '3:45',
  },
  {
    id: 'vn-002',
    recordedAt: '2025-11-20 11:18',
    source: 'Email: voice@vittoria.ai',
    status: 'Parsed',
    linkedEntities: 4,
    duration: '5:22',
  },
  {
    id: 'vn-003',
    recordedAt: '2025-11-19 16:45',
    source: 'Folder: /VoiceNotes',
    status: 'Queued',
    linkedEntities: 0,
    duration: '2:15',
  },
  {
    id: 'vn-004',
    recordedAt: '2025-11-19 09:30',
    source: 'Email: voice@vittoria.ai',
    status: 'Transcribed',
    linkedEntities: 1,
    duration: '4:10',
  },
];

export default function VoiceInbox() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredNotes = mockVoiceNotes.filter((note) => {
    const matchesSearch = note.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || note.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        <Button variant="outline" onClick={() => navigate('/settings?tab=voice')}>
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
                  onClick={() => navigate(`/voice/${note.id}`)}
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
    </div>
  );
}
