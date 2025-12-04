import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, Plus, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [loading, setLoading] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: "",
    event_date: "",
    attendees: [],
    description: "",
    location: "",
  });

  // Load events on mount
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
  const result: any = await window.api.calendar.getAll();
      // Normalize possible return shapes: { success: true, events: [...] }
      const list = Array.isArray(result)
        ? result
        : result && Array.isArray(result.events)
        ? result.events
        : [];
      setEvents(list);
    } catch (error) {
      console.error("Failed to load events:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (newEvent.title && newEvent.event_date) {
      try {
        await window.api.calendar.create({
          title: newEvent.title,
          event_date: newEvent.event_date,
          attendees: newEvent.attendees || [],
          description: newEvent.description,
          location: newEvent.location,
          status: "scheduled",
        });
        setCreateOpen(false);
        setNewEvent({
          title: "",
          event_date: "",
          attendees: [],
          description: "",
          location: "",
        });
        // Reload events
        await loadEvents();
      } catch (error) {
        console.error("Failed to create event:", error);
      }
    }
  };

  const handleDeleteEvent = async (id: number) => {
    try {
      await window.api.calendar.delete(id);
      await loadEvents();
      if (selectedEvent?.id === id) {
        setSelectedEvent(null);
      }
    } catch (error) {
      console.error("Failed to delete event:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground mt-1">
            Manage your schedule and events
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="day">Day</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </div>
      </div>

      {/* Calendar View Placeholder */}
      <div className="border rounded-lg p-8 bg-muted/20 flex items-center justify-center min-h-[300px]">
        <div className="text-center text-muted-foreground">
          <CalendarIcon className="h-16 w-16 mx-auto mb-4" />
          <p className="text-lg font-medium">Calendar View ({viewMode})</p>
          <p className="text-sm">Calendar component will be integrated here</p>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="border rounded-lg">
        <div className="p-4 border-b bg-muted/50">
          <h2 className="font-semibold">Upcoming Events</h2>
        </div>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Attendees</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Loading events...
                  </TableCell>
                </TableRow>
              ) : sortedEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No upcoming events
                  </TableCell>
                </TableRow>
              ) : (
                sortedEvents.map((event) => (
                  <TableRow
                    key={event.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {formatDate(event.event_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {event.attendees.map((attendee, idx) => (
                          <Badge key={idx} variant="outline">
                            {attendee}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{event.location || "—"}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Title:</Label>
                <p className="font-semibold text-lg">{selectedEvent.title}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Date & Time:</Label>
                <p>{formatDate(selectedEvent.event_date)}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Location:</Label>
                <p>{selectedEvent.location || "—"}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Attendees:</Label>
                <div className="flex gap-2 flex-wrap mt-2">
                  {selectedEvent.attendees.map((attendee, idx) => (
                    <Badge key={idx} variant="outline">
                      {attendee}
                    </Badge>
                  ))}
                </div>
              </div>
              {selectedEvent.description && (
                <div>
                  <Label className="text-sm text-muted-foreground">Description:</Label>
                  <p className="mt-2 whitespace-pre-wrap">{selectedEvent.description}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Event Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="e.g., Team Meeting"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date & Time *</Label>
              <Input
                id="date"
                type="datetime-local"
                value={newEvent.event_date?.slice(0, 16)}
                onChange={(e) => setNewEvent({ ...newEvent, event_date: new Date(e.target.value).toISOString() })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                placeholder="e.g., Office - Meeting Room 1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attendees">Attendees (comma-separated)</Label>
              <Input
                id="attendees"
                value={newEvent.attendees?.join(", ")}
                onChange={(e) =>
                  setNewEvent({
                    ...newEvent,
                    attendees: e.target.value.split(",").map((a) => a.trim()),
                  })
                }
                placeholder="e.g., John Doe, Jane Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                rows={4}
                placeholder="Event agenda or notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEvent}>Create Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
