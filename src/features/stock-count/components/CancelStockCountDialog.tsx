import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface CancelStockCountDialogProps {
  open: boolean;
  stockCountCode: string;
  isPending: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export function CancelStockCountDialog({
  open,
  stockCountCode,
  isPending,
  onConfirm,
  onClose,
}: CancelStockCountDialogProps) {
  const [reason, setReason] = useState('');

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const handleConfirm = () => {
    if (reason.trim().length < 5) return;
    onConfirm(reason.trim());
  };

  const charCount = reason.trim().length;
  const isValid = charCount >= 5;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-slate-900">
                Hủy phiếu kiểm kê
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-500">
                Bạn có chắc muốn hủy phiếu{' '}
                <span className="font-semibold text-slate-700">{stockCountCode}</span>?
                Hành động này không thể hoàn tác và sẽ được ghi vào nhật ký kiểm kê.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          <div className="rounded-lg bg-rose-50 border border-rose-100 px-4 py-3">
            <p className="text-xs text-rose-700 leading-relaxed">
              Hủy phiếu sẽ mở khóa các vị trí tồn kho đang bị giữ bởi phiếu kiểm kê này.
              Lý do hủy sẽ được lưu thành một mục trong nhật ký kiểm kê.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason" className="text-sm font-medium text-slate-700">
              Lý do hủy <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="cancel-reason"
              placeholder="Mô tả lý do hủy phiếu kiểm kê này…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              className="resize-none text-sm"
            />
            <div className="flex items-center justify-between">
              <AnimatePresence>
                {reason.length > 0 && !isValid && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-rose-500"
                  >
                    Tối thiểu 5 ký tự
                  </motion.p>
                )}
              </AnimatePresence>
              <p className="ml-auto text-xs text-slate-400 tabular-nums">
                {charCount}/500
              </p>
            </div>
          </div>
        </motion.div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isPending}
            className="text-slate-600"
          >
            Giữ phiếu
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending || !isValid}
            className="gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Hủy phiếu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
