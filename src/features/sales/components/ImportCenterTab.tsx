import React, { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  UploadCloud,
  FileSpreadsheet,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useImportSalesBatch } from '../hooks/useSales';
import { validateImportFile, ALLOWED_EXTENSIONS } from '../schemas/salesSchemas';
import type { SalesImportError, SalesImportApiError } from '../types/salesType';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ErrorTableRow({
  error,
  index,
  reduced,
}: {
  error: SalesImportError;
  index: number;
  reduced: boolean | null;
}) {
  return (
    <motion.tr
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: reduced ? 0 : index * 0.04, ease: 'easeOut' }}
      className="border-b border-zinc-100 hover:bg-zinc-50/60 transition-colors cursor-default"
    >
      <td className="px-4 py-2.5 text-[13px] text-zinc-500 w-14 tabular-nums">{error.row}</td>
      <td className="px-4 py-2.5 text-[13px] font-medium text-zinc-700 w-44">{error.column}</td>
      <td className="px-4 py-2.5 w-40">
        <span className="inline-block bg-red-50 text-red-800 border border-red-200/60 rounded px-2 py-0.5 text-[12px] font-mono whitespace-nowrap max-w-[140px] truncate">
          {error.value || '—'}
        </span>
      </td>
      <td className="px-4 py-2.5 text-[13px] text-red-600">{error.reason}</td>
    </motion.tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ImportCenterTab() {
  const { toast } = useToast();
  const reduced = useReducedMotion();

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importErrors, setImportErrors] = useState<SalesImportError[]>([]);
  const [errorBannerMsg, setErrorBannerMsg] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const importMutation = useImportSalesBatch();

  // ── File selection ──────────────────────────────────────────────────────────
  const applyFile = useCallback(
    (candidate: File) => {
      const err = validateImportFile(candidate);
      if (err) {
        toast({ title: 'File không hợp lệ', description: err, variant: 'destructive' });
        return;
      }
      setFile(candidate);
      setImportErrors([]);
      setErrorBannerMsg(null);
      setSuccessCount(null);
    },
    [toast],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) applyFile(selected);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) applyFile(dropped);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setImportErrors([]);
    setErrorBannerMsg(null);
    setSuccessCount(null);
  };

  // ── Import submit ───────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!file) return;
    setImportErrors([]);
    setErrorBannerMsg(null);
    setSuccessCount(null);

    try {
      const result = await importMutation.mutateAsync(file);
      setFile(null);
      setSuccessCount(result.successCount);
      toast({
        title: 'Import thành công',
        description: `Đã đồng bộ ${result.successCount} giao dịch thành công`,
      });
    } catch (raw: unknown) {
      const apiErr = raw as SalesImportApiError;
      const errors: SalesImportError[] = apiErr?.data?.errors ?? [];
      const msg =
        apiErr?.message ?? 'Import thất bại. Vui lòng kiểm tra lại file và thử lại.';

      setErrorBannerMsg(msg);
      setImportErrors(errors);

      if (errors.length === 0) {
        toast({ title: 'Import thất bại', description: msg, variant: 'destructive' });
      }
    }
  };

  const isLocked = importMutation.isPending;
  const hasErrors = importErrors.length > 0;

  return (
    <div className="relative">
      {/* Full-page lock overlay while uploading */}
      <AnimatePresence>
        {isLocked && (
          <motion.div
            key="lock"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-20 bg-white/70 backdrop-blur-[2px] rounded-lg flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-zinc-700" />
              <p className="text-[13px] font-medium text-zinc-600">Đang xử lý...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-6 max-w-3xl">
        {/* Page description */}
        <div>
          <h2 className="text-[20px] font-semibold tracking-tight text-zinc-900 leading-7">
            Import Center
          </h2>
          <p className="text-[13px] text-zinc-500 mt-1">
            Tải lên file Excel chứa dữ liệu giao dịch bán hàng để đồng bộ vào hệ thống.
          </p>
        </div>

        {/* Success banner */}
        <AnimatePresence>
          {successCount !== null && (
            <motion.div
              key="success"
              initial={reduced ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-4"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[14px] font-semibold text-emerald-800">Import thành công</p>
                <p className="text-[13px] text-emerald-700 mt-0.5">
                  Đã đồng bộ{' '}
                  <span className="font-bold">{successCount.toLocaleString()}</span> giao dịch
                  thành công.
                </p>
              </div>
              <button
                onClick={() => setSuccessCount(null)}
                className="ml-auto text-emerald-500 hover:text-emerald-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error banner */}
        <AnimatePresence>
          {errorBannerMsg && (
            <motion.div
              key="error-banner"
              initial={reduced ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="flex items-start gap-3 bg-red-50 border border-red-200/80 rounded-lg p-4"
            >
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[14px] font-semibold text-red-800">Import thất bại do có dữ liệu không hợp lệ</p>
                <p className="text-[13px] text-red-600/80 mt-0.5">
                  Toàn bộ tiến trình đã được hoàn tác (Rollback). Vui lòng kiểm tra lỗi bên
                  dưới, sửa file và thử lại.
                </p>
              </div>
              <button
                onClick={() => {
                  setErrorBannerMsg(null);
                  setImportErrors([]);
                }}
                className="ml-auto text-red-400 hover:text-red-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dropzone */}
        <motion.div
          animate={
            isDragging && !reduced
              ? { scale: 1.015, borderColor: '#18181b' }
              : { scale: 1, borderColor: '#d4d4d8' }
          }
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !file && inputRef.current?.click()}
          className={[
            'bg-white border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-5 transition-colors',
            isDragging ? 'bg-zinc-50/80' : '',
            !file ? 'cursor-pointer hover:border-zinc-400 hover:bg-zinc-50/40' : '',
          ].join(' ')}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_EXTENSIONS.join(',')}
            onChange={handleInputChange}
            className="hidden"
          />

          <div className="p-4 rounded-full bg-zinc-100 border border-zinc-200">
            <UploadCloud className="h-8 w-8 text-zinc-500" />
          </div>

          {file ? (
            /* Selected file card */
            <div className="flex items-center justify-between w-full max-w-sm bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <FileSpreadsheet className="h-5 w-5 text-zinc-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-zinc-900 truncate">{file.name}</p>
                  <p className="text-[11px] uppercase tracking-wide text-zinc-400 mt-0.5">
                    {formatBytes(file.size)} •{' '}
                    {file.name.split('.').pop()?.toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile();
                }}
                className="ml-3 text-zinc-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-[14px] font-medium text-zinc-700">
                Kéo thả file vào đây hoặc{' '}
                <span className="text-zinc-900 underline underline-offset-2">chọn file</span>
              </p>
              <p className="text-[12px] text-zinc-400 mt-1">
                Hỗ trợ .xlsx, .xls, .csv — Tối đa 10 MB
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div
            className="flex flex-wrap items-center justify-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              type="button"
              disabled={!file || isLocked}
              onClick={handleImport}
              className="h-9 px-5 text-[13px] font-medium gap-2"
            >
              {isLocked ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                'Import dữ liệu'
              )}
            </Button>
          </div>
        </motion.div>

        {/* Validation error table */}
        <AnimatePresence>
          {hasErrors && (
            <motion.div
              key="error-table"
              initial={reduced ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[18px] font-semibold tracking-tight text-zinc-900">
                  Lỗi xác thực ({importErrors.length})
                </h3>
              </div>
              <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[580px]">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200">
                        <th className="px-4 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-zinc-500 w-14">
                          Dòng
                        </th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-zinc-500 w-44">
                          Cột
                        </th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-zinc-500 w-40">
                          Giá trị hiện tại
                        </th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-zinc-500">
                          Chi tiết lỗi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {importErrors.map((err, i) => (
                        <ErrorTableRow
                          key={`${err.row}-${err.column}-${i}`}
                          error={err}
                          index={i}
                          reduced={reduced}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
