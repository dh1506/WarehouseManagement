import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useReportConfigs, useDeleteReportConfig } from '../hooks/useReports';
import { ReportConfigSheet } from './ReportConfigSheet';
import { REPORT_TYPE_LABELS, type ReportConfig } from '../types/reportType';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
        active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {active ? 'Đang hoạt động' : 'Tạm dừng'}
    </span>
  );
}

function ConfigCard({
  config,
  onEdit,
  onDelete,
}: {
  config: ReportConfig;
  onEdit: (c: ReportConfig) => void;
  onDelete: (c: ReportConfig) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{config.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {REPORT_TYPE_LABELS[config.report_type] ?? config.report_type}
          </p>
        </div>
        <ActiveBadge active={config.is_active} />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="material-symbols-outlined text-[13px] shrink-0">schedule</span>
          <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded text-slate-700">
            {config.schedule_cron}
          </span>
        </div>
        <div className="flex items-start gap-2 text-xs text-slate-500">
          <span className="material-symbols-outlined text-[13px] mt-0.5 shrink-0">mail</span>
          <span className="text-slate-600 leading-relaxed">
            {config.recipient_emails.join(', ')}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="material-symbols-outlined text-[13px]">calendar_today</span>
          <span>Tạo ngày {formatDate(config.created_at)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-slate-50">
        <button
          type="button"
          onClick={() => onEdit(config)}
          className="flex-1 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 transition-colors flex items-center justify-center gap-1"
        >
          <span className="material-symbols-outlined text-[13px]">edit</span>
          Chỉnh sửa
        </button>
        <button
          type="button"
          onClick={() => onDelete(config)}
          className="flex-1 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 border border-rose-100 transition-colors flex items-center justify-center gap-1"
        >
          <span className="material-symbols-outlined text-[13px]">delete</span>
          Xoá
        </button>
      </div>
    </motion.div>
  );
}

export function ReportConfigManagement() {
  const { toast } = useToast();
  const { data: configs, isLoading, isError } = useReportConfigs();
  const deleteMutation = useDeleteReportConfig();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ReportConfig | null>(null);
  const [deletingConfig, setDeletingConfig] = useState<ReportConfig | null>(null);

  const handleCreate = () => {
    setEditingConfig(null);
    setSheetOpen(true);
  };

  const handleEdit = (config: ReportConfig) => {
    setEditingConfig(config);
    setSheetOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingConfig) return;
    try {
      await deleteMutation.mutateAsync(deletingConfig.id);
      toast({ title: 'Đã xoá', description: `Cấu hình "${deletingConfig.name}" đã bị xoá.` });
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Không thể xoá. Vui lòng thử lại.';
      toast({ title: 'Lỗi', description: msg, variant: 'destructive' });
    } finally {
      setDeletingConfig(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">Cấu hình báo cáo email</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Quản lý lịch tự động gửi báo cáo qua email theo cron expression
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 transition-colors"
        >
          <span className="material-symbols-outlined text-[15px]">add</span>
          Thêm cấu hình
        </button>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center gap-3 py-12">
          <span className="material-symbols-outlined text-[32px] text-rose-400">error_outline</span>
          <p className="text-sm text-slate-500">Không thể tải danh sách cấu hình.</p>
        </div>
      )}

      {!isLoading && !isError && configs?.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3 py-16 text-center"
        >
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px] text-slate-400">mail</span>
          </div>
          <p className="text-sm font-medium text-slate-600">Chưa có cấu hình nào</p>
          <p className="text-xs text-slate-400">Nhấn "Thêm cấu hình" để thiết lập lịch gửi email.</p>
          <button
            type="button"
            onClick={handleCreate}
            className="mt-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 transition-colors"
          >
            Thêm cấu hình
          </button>
        </motion.div>
      )}

      {!isLoading && !isError && configs && configs.length > 0 && (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {configs.map((config) => (
              <ConfigCard
                key={config.id}
                config={config}
                onEdit={handleEdit}
                onDelete={setDeletingConfig}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Create / Edit Sheet */}
      <ReportConfigSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        editing={editingConfig}
      />

      {/* Delete Confirm */}
      <AlertDialog open={Boolean(deletingConfig)} onOpenChange={(v) => { if (!v) setDeletingConfig(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá cấu hình này?</AlertDialogTitle>
            <AlertDialogDescription>
              Cấu hình{' '}
              <strong className="text-slate-700">&ldquo;{deletingConfig?.name}&rdquo;</strong> sẽ bị
              xoá vĩnh viễn. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Xác nhận xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
