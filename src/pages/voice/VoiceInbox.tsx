import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { VoiceNote } from "@/types/intelligence";

export default function VoiceInbox() {
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotes();
  }, [statusFilter]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await (window as any).electron.invoke("intelligence:get-voice-notes", { status: statusFilter || undefined });
      setNotes(data);
    } catch (error) {
      console.error("Failed to load voice notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      queued: "outline",
      transcribed: "secondary",
      parsed: "default"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  if (loading) return <div className="space-y-6"><h1 className="text-2xl font-semibold">Loading...</h1></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Mic className="h-6 w-6" />Voice Notes</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage voice recordings and transcripts</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Input placeholder="Filter by status..." value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-48" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>ID</TableHead><TableHead>Recorded At</TableHead><TableHead>Source</TableHead><TableHead>Duration</TableHead><TableHead>Status</TableHead><TableHead>Linked</TableHead><TableHead>Action</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {notes.map((note) => (
                <TableRow key={note.id}>
                  <TableCell className="font-medium">{note.display_id}</TableCell>
                  <TableCell>{new Date(note.recorded_at).toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{note.source}</TableCell>
                  <TableCell>{formatDuration(note.duration_seconds)}</TableCell>
                  <TableCell>{getStatusBadge(note.status)}</TableCell>
                  <TableCell>{note.linked_entity_count}</TableCell>
                  <TableCell><Button size="sm" variant="outline" onClick={() => navigate(`/voice/${note.id}`)}>View</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
