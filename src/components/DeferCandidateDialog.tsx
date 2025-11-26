import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';

interface DeferCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName: string;
  onConfirm: (reason: string, reminderDate: string | null) => void;
}

export function DeferCandidateDialog({
  open,
  onOpenChange,
  candidateName,
  onConfirm,
}: DeferCandidateDialogProps) {
  const [reason, setReason] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(
        reason || 'Deferred for review',
        reminderDate || null
      );
      // Reset form
      setReason('');
      setReminderDate('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error deferring candidate:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Defer Candidate</DialogTitle>
          <DialogDescription>
            Postpone decision on <strong>{candidateName}</strong> until more information is available.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Deferral</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Waiting for reference check, need to verify work history..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminderDate">
              Reminder Date <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <div className="relative">
              <Input
                id="reminderDate"
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            <p className="text-xs text-muted-foreground">
              Set a date to revisit this candidate
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isSubmitting ? 'Deferring...' : 'Defer Candidate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
