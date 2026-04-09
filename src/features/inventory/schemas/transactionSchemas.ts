import { z } from 'zod';

// ── Filter schema (URL-synced query params) ─────────────────────────────────

export const transactionFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  from_date: z.string().optional().default(''),
  to_date: z.string().optional().default(''),
  transaction_type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', '']).default(''),
  reference_type: z.string().optional().default(''),
});

export type TransactionFilterInput = z.input<typeof transactionFilterSchema>;
export type TransactionFilterOutput = z.output<typeof transactionFilterSchema>;

// ── Create adjustment form schema ───────────────────────────────────────────

export const createAdjustmentFormSchema = z.object({
  warehouse_location_id: z.coerce
    .number()
    .int()
    .positive('Vị trí kho là bắt buộc'),
  product_id: z.coerce
    .number()
    .int()
    .positive('Sản phẩm là bắt buộc'),
  product_uom_id: z.coerce
    .number()
    .int()
    .positive('Đơn vị tính là bắt buộc'),
  lot_id: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
  quantity: z.coerce
    .number()
    .refine((val) => val !== 0, { message: 'Số lượng điều chỉnh không được bằng 0' }),
  note: z
    .string()
    .min(5, 'Ghi chú phải có ít nhất 5 ký tự')
    .max(500, 'Ghi chú tối đa 500 ký tự'),
});

export type CreateAdjustmentFormInput = z.input<typeof createAdjustmentFormSchema>;
export type CreateAdjustmentFormOutput = z.output<typeof createAdjustmentFormSchema>;
