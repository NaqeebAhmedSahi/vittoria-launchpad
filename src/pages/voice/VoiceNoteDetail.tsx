import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { VoiceNote } from "@/types/intelligence";

export default function VoiceNoteDetail() {
  const [note, setNote] = useState<VoiceNote | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { noteId } = useParams();

  useEffect(() => {
    if (noteId) loadNote();
  }, [noteId]);

  const loadNote = async () => {
    try {
      setLoading(true);
      const data = await (window as any).electron.invoke("intelligence:get-voice-note", parseInt(noteId!));
      setNote(data);
    } catch (error) {
      console.error("Failed to load voice note:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !note) return <div className="space-y-6"><h1 className="text-2xl font-semibold">Loading...</h1></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/voice")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1"><h1 className="text-2xl font-semibold">{note.display_id}</h1><p className="text-sm text-muted-foreground">Recorded {new Date(note.recorded_at).toLocaleString()}</p></div>
        <Badge>{note.status}</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm">Source</CardTitle></CardHeader><CardContent><p className="text-sm">{note.source}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Duration</CardTitle></CardHeader><CardContent><p className="text-sm">{Math.floor(note.duration_seconds / 60)}:{(note.duration_seconds % 60).toString().padStart(2, '0')}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Linked Entities</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{note.linked_entity_count}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Transcript</CardTitle></CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            {note.transcript_text ? <p className="whitespace-pre-wrap">{note.transcript_text}</p> : <p className="text-muted-foreground italic">Transcript not available yet</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
