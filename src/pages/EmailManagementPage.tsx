import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Mail, Trash2, Reply, Forward, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function EmailManagementPage() {
  const [selectedMailbox, setSelectedMailbox] = useState("chris@vittoria.com");
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState({
    to: "",
    subject: "",
    body: "",
  });
  const [loading, setLoading] = useState(false);

  // Load emails when mailbox changes
  useEffect(() => {
    loadEmails();
  }, [selectedMailbox]);

  const loadEmails = async () => {
    try {
      setLoading(true);
  const result: any = await window.api.emails.getByMailbox(selectedMailbox);
      // Normalize different possible response shapes from IPC handlers
      // Handlers return: { success: true, emails: [...] } usually
      const list = Array.isArray(result)
        ? result
        : result && Array.isArray(result.emails)
        ? result.emails
        : [];
      setEmails(list);
      setSelectedEmail(null);
    } catch (error) {
      console.error("Failed to load emails:", error);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMailboxChange = (mailbox: string) => {
    setSelectedMailbox(mailbox);
  };

  const handleEmailClick = async (email: Email) => {
    // Update status to read if unread
    if (email.status === "unread") {
      try {
        await window.api.emails.updateStatus(email.id, "read");
        const updatedEmails = emails.map((e) =>
          e.id === email.id ? { ...e, status: "read" as const } : e
        );
        setEmails(updatedEmails);
        setSelectedEmail({ ...email, status: "read" });
      } catch (error) {
        console.error("Failed to update email status:", error);
        setSelectedEmail(email);
      }
    } else {
      setSelectedEmail(email);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await window.api.emails.delete(id);
      const updatedEmails = emails.filter((e) => e.id !== id);
      setEmails(updatedEmails);
      if (selectedEmail?.id === id) {
        setSelectedEmail(null);
      }
    } catch (error) {
      console.error("Failed to delete email:", error);
    }
  };

  const handleReply = (email: Email) => {
    setComposeData({
      to: email.sender,
      subject: `Re: ${email.subject}`,
      body: `\n\n--- Original Message ---\n${email.body}`,
    });
    setComposeOpen(true);
  };

  const handleForward = (email: Email) => {
    setComposeData({
      to: "",
      subject: `Fwd: ${email.subject}`,
      body: `\n\n--- Forwarded Message ---\nFrom: ${email.sender}\nSubject: ${email.subject}\n\n${email.body}`,
    });
    setComposeOpen(true);
  };

  const handleCompose = () => {
    setComposeData({ to: "", subject: "", body: "" });
    setComposeOpen(true);
  };

  const handleSendEmail = async () => {
    try {
      await window.api.emails.create({
        mailbox: selectedMailbox,
        sender: selectedMailbox,
        recipient: composeData.to,
        subject: composeData.subject,
        body: composeData.body || "",
        status: "read",
        date: new Date().toISOString(),
        attachments: [],
      });
      setComposeOpen(false);
      setComposeData({ to: "", subject: "", body: "" });
      // Reload emails to show sent email
      await loadEmails();
    } catch (error) {
      console.error("Failed to send email:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Email Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage emails across multiple mailboxes
          </p>
        </div>
        <Button onClick={handleCompose}>
          <Plus className="h-4 w-4 mr-2" />
          Compose
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Label htmlFor="mailbox">Select Mailbox:</Label>
        <Select value={selectedMailbox} onValueChange={handleMailboxChange}>
          <SelectTrigger id="mailbox" className="w-64">
            <SelectValue placeholder="Select mailbox" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="chris@vittoria.com">chris@vittoria.com</SelectItem>
            <SelectItem value="vittoria@vittoria.com">vittoria@vittoria.com</SelectItem>
            <SelectItem value="info@vittoria.com">info@vittoria.com</SelectItem>
            <SelectItem value="finance@vittoria.com">finance@vittoria.com</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email List */}
        <div className="border rounded-lg">
          <div className="p-4 border-b bg-muted/50">
            <h2 className="font-semibold">Inbox</h2>
          </div>
          <div className="overflow-auto max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Loading emails...
                    </TableCell>
                  </TableRow>
                ) : emails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No emails in this mailbox
                    </TableCell>
                  </TableRow>
                ) : (
                  emails.map((email) => (
                    <TableRow
                      key={email.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEmailClick(email)}
                    >
                      <TableCell className="font-medium">{email.subject}</TableCell>
                      <TableCell>{email.sender}</TableCell>
                      <TableCell>{formatDate(email.date)}</TableCell>
                      <TableCell>
                        <Badge variant={email.status === "unread" ? "default" : "secondary"}>
                          {email.status.charAt(0).toUpperCase() + email.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReply(email);
                            }}
                          >
                            <Reply className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleForward(email);
                            }}
                          >
                            <Forward className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(email.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Email Details */}
        <div className="border rounded-lg">
          <div className="p-4 border-b bg-muted/50">
            <h2 className="font-semibold">Email Details</h2>
          </div>
          <div className="p-4">
            {selectedEmail ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Subject:</Label>
                  <p className="font-semibold text-lg">{selectedEmail.subject}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">From:</Label>
                  <p>{selectedEmail.sender}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Date:</Label>
                  <p>{formatDate(selectedEmail.date)}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Status:</Label>
                  <Badge variant={selectedEmail.status === "unread" ? "default" : "secondary"}>
                    {selectedEmail.status.charAt(0).toUpperCase() + selectedEmail.status.slice(1)}
                  </Badge>
                </div>
                <div className="pt-4 border-t">
                  <Label className="text-sm text-muted-foreground">Message:</Label>
                  <p className="mt-2 whitespace-pre-wrap">{selectedEmail.body || "No content"}</p>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={() => handleReply(selectedEmail)}>
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </Button>
                  <Button variant="outline" onClick={() => handleForward(selectedEmail)}>
                    <Forward className="h-4 w-4 mr-2" />
                    Forward
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Mail className="h-12 w-12 mb-4" />
                <p>Select an email to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compose Email Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Compose Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="to">To:</Label>
              <Input
                id="to"
                value={composeData.to}
                onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                placeholder="recipient@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject:</Label>
              <Input
                id="subject"
                value={composeData.subject}
                onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                placeholder="Email subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Message:</Label>
              <Textarea
                id="body"
                value={composeData.body}
                onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                rows={10}
                placeholder="Type your message here..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
