import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useCreateReportConfig, useUpdateReportConfig } from '../hooks/useReports';
import { reportConfigSchema, type ReportConfigFormValues } from '../schemas/reportSchemas';
import { REPORT_TYPE_LABELS, type ReportConfig, type ReportType } from '../types/reportType';

interface ReportConfigSheetProps {
  open: boolean;
  onClose: () => void;
  editing?: ReportConfig | null;
}

const CRON_PRESETS = [
  { label: 'Hàng ngày lúc 8:00', value: '0 8 * * *' },
  { label: 'Hàng tuần Thứ 2 lúc 8:00', value: '0 8 * * 1' },
  { label: 'Ngày đầu tháng lúc 8:00', value: '0 8 1 * *' },
  { label: 'Hàng ngày lúc 18:00', value: '0 18 * * *' },
];

function FieldError({ message }: { message?: string }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.15 }}
          className="text-xs text-rose-500 mt-1"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

export function ReportConfigSheet({ open, onClose, editing }: ReportConfigSheetProps) {
  const { toast } = useToast();
  const createMutation = useCreateReportConfig();
  const updateMutation = useUpdateReportConfig();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReportConfigFormValues>({
    resolver: zodResolver(reportConfigSchema),
    defaultValues: {
      name: '',
      report_type: 'DASHBOARD',
      recipient_emails_raw: '',
      schedule_cron: '0 8 * * *',
      is_active: true,
    },
  });

  const isActiveValue = watch('is_active');
  const cronValue = watch('schedule_cron');

  useEffect(() => {
    if (open) {
      if (editing) {
        reset({
          name: editing.name,
          report_type: editing.report_type,
          recipient_emails_raw: editing.recipient_emails.join(', '),
          schedule_cron: editing.schedule_cron,
          is_active: editing.is_active,
        });
      } else {
        reset({
          name: '',
          report_type: 'DASHBOARD',
          recipient_emails_raw: '',
          schedule_cron: '0 8 * * *',
          is_active: true,
        });
      }
    }
  }, [open, editing, reset]);

  const onSubmit = async (values: ReportConfigFormValues) => {
    const emails = values.recipient_emails_raw
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          data: {
            name: values.name,
            report_type: values.report_type,
            recipient_emails: emails,
            schedule_cron: values.schedule_cron,
            is_active: values.is_active,
          },
        });
        toast({ title: 'Cập nhật thành công', description: `Cấu hình "${values.name}" đã được lưu.` });
      } else {
        await createMutation.mutateAsync({
          name: values.name,
          report_type: values.report_type,
          recipient_emails: emails,
          schedule_cron: values.schedule_cron,
          is_active: values.is_active,
        });
        toast({ title: 'Tạo thành công', description: `Cấu hình "${values.name}" đã được tạo.` });
      }
      onClose();
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Vui lòng thử lại.';
      toast({ title: 'Lỗi', description: msg, variant: 'destructive' });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <SheetTitle className="text-base font-bold">
            {editing ? 'Chỉnh sửa cấu hình' : 'Thêm cấu hình mới'}
          </SheetTitle>
          <SheetDescription className="text-xs text-slate-400">
            Cấu hình lịch gửi email báo cáo tự động theo cron expression.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="cfg-name" className="text-xs font-semibold text-slate-700">
              Tên cấu hình <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="cfg-name"
              {...register('name')}
              placeholder="VD: Báo cáo hàng ngày"
              className="h-9 text-sm"
            />
            <FieldError message={errors.name?.message} />
          </div>

          {/* Report type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Loại báo cáo <span className="text-rose-500">*</span>
            </Label>
            <Select
              defaultValue={editing?.report_type ?? 'DASHBOARD'}
              onValueChange={(v) => setValue('report_type', v as ReportType)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Chọn loại báo cáo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REPORT_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.report_type?.message} />
          </div>

          {/* Recipient emails */}
          <div className="space-y-1.5">
            <Label htmlFor="cfg-emails" className="text-xs font-semibold text-slate-700">
              Danh sách email nhận <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="cfg-emails"
              {...register('recipient_emails_raw')}
              placeholder="email1@company.com, email2@company.com"
              rows={3}
              className="text-sm resize-none"
            />
            <p className="text-[11px] text-slate-400">Phân cách các email bằng dấu phẩy (,)</p>
            <FieldError message={errors.recipient_emails_raw?.message} />
          </div>

          {/* Cron expression */}
          <div className="space-y-1.5">
            <Label htmlFor="cfg-cron" className="text-xs font-semibold text-slate-700">
              Biểu thức Cron <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="cfg-cron"
              {...register('schedule_cron')}
              placeholder="0 8 * * *"
              className="h-9 text-sm font-mono"
            />
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {CRON_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setValue('schedule_cron', preset.value)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors border ${
                    cronValue === preset.value
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <FieldError message={errors.schedule_cron?.message} />
          </div>

          {/* is_active toggle */}
          <div className="flex items-center justify-between rounded-lg border border-slate-100 p-3 bg-slate-50/50">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-slate-700">Kích hoạt lịch gửi</p>
              <p className="text-[11px] text-slate-400">Bật để hệ thống tự động gửi email theo lịch</p>
            </div>
            <Switch
              checked={isActiveValue ?? true}
              onCheckedChange={(v) => setValue('is_active', v)}
            />
          </div>
        </form>

        {/* Footer actions */}
        <div className="shrink-0 border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-3 bg-white">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            Huỷ
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleSubmit(onSubmit)}
            className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-60 transition-colors flex items-center gap-2"
          >
            {isPending && (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
              </svg>
            )}
            {isPending ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo mới'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
