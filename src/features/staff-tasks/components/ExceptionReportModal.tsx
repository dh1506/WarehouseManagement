import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '@/hooks/use-toast';
import { createDiscrepancy } from '@/features/inbound/services/inboundDetailService';
import { createStockOutDiscrepancy } from '@/features/outbound/services/outboundService';

// ── Types ──────────────────────────────────────────────────────────────────────

type TaskDomain = 'PUTAWAY' | 'PICKING' | 'COUNTING';

interface ExceptionReason {
  id: string;
  label: string;
  icon: string;
  photoRequired: boolean;
}

const REASONS: ExceptionReason[] = [
  { id: 'damaged', label: 'Hàng hỏng / Bao bì rách', icon: 'dangerous', photoRequired: true },
  { id: 'missing', label: 'Thiếu hàng / Kệ trống', icon: 'inventory_2', photoRequired: false },
  { id: 'barcode', label: 'Mã vạch không đọc được', icon: 'qr_code', photoRequired: false },
];

// ── Props ──────────────────────────────────────────────────────────────────────

interface ExceptionReportModalProps {
  taskDomain: TaskDomain;
  taskId: number;
  onSkipItem: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ExceptionReportModal({ taskDomain, taskId, onSkipItem }: ExceptionReportModalProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ExceptionReason | null>(null);
  const [note, setNote] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleClose() {
    setOpen(false);
    setSelectedReason(null);
    setNote('');
    setPhotoPreview(null);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  }

  const currentReason = selectedReason;
  const needsPhoto = currentReason?.photoRequired ?? false;
  const canSubmit =
    selectedReason !== null &&
    (!needsPhoto || photoPreview !== null);

  async function handleSubmit() {
    if (!canSubmit || isPending) return;
    const reason = `[${currentReason!.label}] ${note.trim()}`.trimEnd();

    setIsPending(true);
    try {
      if (taskDomain === 'PUTAWAY') {
        await createDiscrepancy(taskId, { reason });
      } else if (taskDomain === 'PICKING') {
        await createStockOutDiscrepancy(taskId, { reason });
      }
      // COUNTING: no discrepancy endpoint — skip-only

      toast({ title: 'Đã gửi báo cáo sự cố', description: 'Quản lý kho sẽ được thông báo.' });
      handleClose();
      onSkipItem();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi báo cáo.';
      toast({ title: 'Lỗi gửi báo cáo', description: msg, variant: 'destructive' });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      {/* ── Floating action button ─────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-amber-400 shadow-lg shadow-amber-400/40 hover:bg-amber-500 active:scale-95 transition-all"
        aria-label="Báo cáo sự cố"
        style={{ minHeight: 56, minWidth: 56 }}
      >
        <span className="material-symbols-outlined text-white text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          warning
        </span>
      </button>

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            {/* Backdrop */}
            <button
              type="button"
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={handleClose}
              aria-label="Đóng"
            />

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                    <span className="material-symbols-outlined text-amber-600 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      warning
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Báo cáo sự cố</h2>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* Reason selector */}
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Chọn lý do sự cố <span className="text-red-500">*</span>
                  </p>
                  <div className="space-y-2">
                    {REASONS.map((reason) => (
                      <button
                        key={reason.id}
                        type="button"
                        onClick={() => setSelectedReason(reason)}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all ${
                          selectedReason?.id === reason.id
                            ? 'border-amber-400 bg-amber-50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                        style={{ minHeight: 52 }}
                      >
                        <span
                          className={`material-symbols-outlined text-[22px] ${
                            selectedReason?.id === reason.id ? 'text-amber-600' : 'text-slate-400'
                          }`}
                        >
                          {reason.icon}
                        </span>
                        <span className={`text-sm font-semibold ${selectedReason?.id === reason.id ? 'text-amber-800' : 'text-slate-700'}`}>
                          {reason.label}
                        </span>
                        {reason.photoRequired && (
                          <span className="ml-auto text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full shrink-0">
                            Cần ảnh
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note (optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Ghi chú thêm <span className="font-normal normal-case">(tùy chọn)</span>
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Mô tả thêm về sự cố..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 resize-none"
                  />
                </div>

                {/* Photo upload */}
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${needsPhoto ? 'text-rose-600' : 'text-slate-500'}`}>
                    Ảnh thực tế {needsPhoto && <span className="text-rose-500">*</span>}
                  </p>

                  {photoPreview ? (
                    <div className="relative">
                      <img
                        src={photoPreview}
                        alt="Ảnh sự cố"
                        className="w-full max-h-40 object-cover rounded-xl border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoPreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed transition-colors ${
                        needsPhoto ? 'border-rose-300 bg-rose-50 hover:bg-rose-100' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                      style={{ minHeight: 80 }}
                    >
                      <span className={`material-symbols-outlined text-[28px] ${needsPhoto ? 'text-rose-400' : 'text-slate-400'}`}>
                        camera_alt
                      </span>
                      <span className={`text-xs font-semibold ${needsPhoto ? 'text-rose-600' : 'text-slate-500'}`}>
                        {needsPhoto ? 'Chụp ảnh (bắt buộc)' : 'Chụp ảnh (tùy chọn)'}
                      </span>
                    </button>
                  )}

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={handlePhotoChange}
                  />
                </div>
              </div>

              {/* Footer actions */}
              <div className="shrink-0 px-5 py-4 border-t border-slate-100 bg-white space-y-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit || isPending}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
                  style={{ minHeight: 52 }}
                >
                  {isPending ? (
                    <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[20px]">send</span>
                  )}
                  {isPending ? 'Đang gửi...' : 'Gửi báo cáo & Bỏ qua mục này'}
                </button>
                <button
                  type="button"
                  onClick={() => { handleClose(); onSkipItem(); }}
                  className="w-full py-3 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                  style={{ minHeight: 48 }}
                >
                  Bỏ qua mà không báo cáo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
