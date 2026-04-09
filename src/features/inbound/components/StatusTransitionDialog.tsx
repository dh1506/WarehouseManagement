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
import type { InboundStatus } from '../types/inboundType';
import { INBOUND_STATUS_LABELS } from '../types/inboundType';

interface StatusTransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetStatus: InboundStatus | null;
  onConfirm: (note: string) => void;
  isPending: boolean;
}

export function StatusTransitionDialog({
  open,
  onOpenChange,
  targetStatus,
  onConfirm,
  isPending,
}: StatusTransitionDialogProps) {
  const [note, setNote] = useState('');

  const handleConfirm = () => {
    onConfirm(note);
  };

  const statusLabel = targetStatus ? INBOUND_STATUS_LABELS[targetStatus] : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Status Change</DialogTitle>
          <DialogDescription>
            Are you sure you want to change the status to <strong className="text-slate-900">{statusLabel}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Label htmlFor="note" className="text-slate-500 mb-2 block">
            Note (Optional)
          </Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason for change, or additional notes..."
            className="resize-none"
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
