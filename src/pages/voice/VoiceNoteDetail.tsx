import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Link as LinkIcon, Plus, CheckCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

// Mock data - in production, fetch based on noteId
const mockNoteData = {
  id: 'vn-001',
  recordedAt: '2025-11-20 14:32',
  duration: '3:45',
  source: 'Folder: /VoiceNotes',
  status: 'Parsed',
  audioUrl: '', // Would be actual audio file path
  transcript: {
    text: "Following up on the Infrastructure PE Partner mandate for Brookfield. Spoke with Sarah Chen earlier today. She mentioned that James Patterson from Goldman is potentially interested but wants to understand the team structure better. Need to schedule a call next week to discuss. Also, the candidate from KKR we spoke about last month has now accepted a role elsewhere, so we can close that file. Make a note to update the CRM.",
    confidence: 94,
    sections: [
      { timestamp: '0:00', text: 'Following up on the Infrastructure PE Partner mandate for Brookfield.' },
      { timestamp: '0:15', text: 'Spoke with Sarah Chen earlier today.' },
      { timestamp: '0:25', text: 'She mentioned that James Patterson from Goldman is potentially interested but wants to understand the team structure better.' },
      { timestamp: '1:05', text: 'Need to schedule a call next week to discuss.' },
      { timestamp: '1:20', text: 'Also, the candidate from KKR we spoke about last month has now accepted a role elsewhere, so we can close that file.' },
      { timestamp: '2:45', text: 'Make a note to update the CRM.' },
    ],
  },
  parsed: {
    meetingNotes: [
      'Discussed Infrastructure PE Partner mandate for Brookfield',
      'James Patterson (Goldman) potentially interested - wants more info on team structure',
    ],
    candidateUpdates: [
      { name: 'KKR candidate', status: 'Accepted elsewhere', action: 'Close file' },
    ],
    tasks: [
      'Schedule call with James Patterson next week',
      'Update CRM with latest status',
    ],
    linkedEntities: [
      { type: 'Mandate', name: 'Infrastructure PE Partner - Brookfield', id: 'm-001' },
      { type: 'Candidate', name: 'James Patterson', id: 'c-042' },
    ],
  },
};

export default function VoiceNoteDetail() {
  const navigate = useNavigate();
  const { noteId } = useParams();
  const note = mockNoteData; // TODO: Fetch by noteId

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/voice')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Voice Note: {note.id}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Recorded {note.recordedAt} · {note.duration}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <LinkIcon className="h-4 w-4 mr-2" />
            Link to Entity
          </Button>
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Create New Record
          </Button>
          <Button>
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark as Processed
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Audio + Transcript */}
        <div className="lg:col-span-2 space-y-6">
          {/* Audio Player */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-6 text-center">
                <div className="text-sm text-muted-foreground mb-4">
                  Audio player placeholder
                </div>
                <div className="flex items-center justify-center gap-4">
                  <Button variant="outline" size="sm">Play</Button>
                  <div className="text-sm text-foreground">0:00 / {note.duration}</div>
                  <Button variant="ghost" size="sm">Speed: 1x</Button>
                </div>
              </div>
              {/* TODO: Integrate actual audio player component */}
            </CardContent>
          </Card>

          {/* Transcript */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Transcript</CardTitle>
                <Badge variant="outline">{note.transcript.confidence}% confidence</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {note.transcript.sections.map((section, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="text-xs text-muted-foreground font-mono w-12 flex-shrink-0">
                      {section.timestamp}
                    </div>
                    <div className="text-sm text-foreground flex-1">
                      {section.text}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Structured Parse */}
        <div className="space-y-6">
          {/* Linked Entities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Linked Entities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {note.parsed.linkedEntities.map((entity, idx) => (
                <div
                  key={idx}
                  className="p-2 border rounded hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-foreground">{entity.name}</div>
                    <Badge variant="outline" className="text-xs">{entity.type}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Meeting Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Meeting Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {note.parsed.meetingNotes.map((note, idx) => (
                  <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-muted-foreground mt-1">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Candidate Updates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Candidate Updates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {note.parsed.candidateUpdates.map((update, idx) => (
                <div key={idx} className="p-2 bg-muted rounded text-sm">
                  <div className="font-medium text-foreground">{update.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {update.status} • {update.action}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Tasks / Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {note.parsed.tasks.map((task, idx) => (
                  <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
