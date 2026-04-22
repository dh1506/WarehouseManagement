import { motion, AnimatePresence } from 'motion/react';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface CancelStockCountDialogProps {
  open: boolean;
  stockCountCode: string;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function CancelStockCountDialog({
  open,
  stockCountCode,
  isPending,
  onConfirm,
  onClose,
}: CancelStockCountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-slate-900">
                Cancel Audit Ticket
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-500">
                Are you sure you want to cancel{' '}
                <span className="font-semibold text-slate-700">{stockCountCode}</span>?
                This action cannot be undone and will be recorded in the audit log.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 rounded-lg bg-rose-50 border border-rose-100 px-4 py-3"
          >
            <p className="text-xs text-rose-700 leading-relaxed">
              Cancelling will unlock any inventory locations currently held by this
              audit. The cancellation event will be visible in the Audit Log.
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="text-slate-600"
          >
            Keep Ticket
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
            className="gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Cancel Ticket
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
