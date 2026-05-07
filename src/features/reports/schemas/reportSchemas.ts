import { z } from 'zod';

// ── Cron expression: basic non-empty validation ──────────────────────────────
const cronRegex = /^(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)$/;

export const reportConfigSchema = z.object({
  name: z.string().min(1, 'Tên cấu hình không được để trống').max(100, 'Tên tối đa 100 ký tự'),
  report_type: z.enum(
    ['STOCK_IN', 'STOCK_OUT', 'STOCK_COUNT', 'STOCK_DISPOSAL', 'INVENTORY', 'DASHBOARD'],
    { error: 'Vui lòng chọn loại báo cáo' },
  ),
  // Comma-separated emails in the form; converted to array before submit
  recipient_emails_raw: z
    .string()
    .min(1, 'Vui lòng nhập ít nhất một địa chỉ email')
    .refine((val) => {
      const emails = val.split(',').map((e) => e.trim()).filter(Boolean);
      return emails.every((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    }, 'Một hoặc nhiều địa chỉ email không hợp lệ'),
  schedule_cron: z
    .string()
    .min(1, 'Biểu thức cron không được để trống')
    .refine((val) => cronRegex.test(val.trim()), 'Biểu thức cron không hợp lệ (ví dụ: 0 8 * * 1)'),
  is_active: z.boolean().optional().default(true),
});

export type ReportConfigFormValues = z.infer<typeof reportConfigSchema>;
