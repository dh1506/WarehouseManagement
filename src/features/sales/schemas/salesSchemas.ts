import { z } from 'zod';

// ── Filter bar validation ─────────────────────────────────────────────────────
export const salesFilterSchema = z
  .object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    locationId: z.number().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc',
      path: ['endDate'],
    },
  );

export type SalesFilterValues = z.infer<typeof salesFilterSchema>;

// ── Import error row (for validating BE error payload) ────────────────────────
export const salesImportErrorSchema = z.object({
  row: z.number(),
  column: z.string(),
  value: z.string(),
  reason: z.string(),
});

export const salesImportResultSchema = z.object({
  batchId: z.number(),
  successCount: z.number(),
  errorCount: z.number(),
  errors: z.array(salesImportErrorSchema),
});

export type SalesImportErrorSchema = z.infer<typeof salesImportErrorSchema>;

// ── File upload constraints ───────────────────────────────────────────────────
export const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'] as const;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function validateImportFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
  if (!hasValidExt) {
    return 'Chỉ chấp nhận file định dạng .xlsx, .xls hoặc .csv';
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `Dung lượng file không được vượt quá 10 MB (hiện tại: ${(file.size / 1024 / 1024).toFixed(1)} MB)`;
  }
  return null;
}
