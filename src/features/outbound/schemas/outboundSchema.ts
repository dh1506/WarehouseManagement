import { z } from 'zod';

// ─── Tạo phiếu xuất ───────────────────────────────────────────────────────────

export const createStockOutDetailSchema = z.object({
  product_id: z
    .number({ required_error: 'Vui lòng nhập mã sản phẩm' })
    .int('Mã sản phẩm phải là số nguyên')
    .positive('Mã sản phẩm không hợp lệ'),
  quantity: z
    .number({ required_error: 'Vui lòng nhập số lượng' })
    .positive('Số lượng phải lớn hơn 0'),
  unit_price: z
    .number()
    .nonnegative('Đơn giá không được âm')
    .nullable()
    .optional(),
});

export const createStockOutSchema = z.object({
  warehouse_location_id: z
    .number({ required_error: 'Vui lòng chọn vị trí kho' })
    .int()
    .positive('Vị trí kho không hợp lệ'),
  type: z.enum(['SALES', 'RETURN_TO_SUPPLIER']).default('SALES'),
  reference_number: z.string().optional().default(''),
  supplier_id: z.number().int().positive().nullable().optional(),
  description: z.string().optional().default(''),
  details: z
    .array(createStockOutDetailSchema)
    .min(1, 'Phiếu xuất phải có ít nhất 1 sản phẩm'),
});

// ─── Gán lô hàng (picked-lots) ────────────────────────────────────────────────

export const pickedLotEntrySchema = z.object({
  stock_out_detail_id: z
    .number()
    .int()
    .positive('ID dòng phiếu không hợp lệ'),
  product_lot_id: z
    .number({ required_error: 'Vui lòng nhập mã lô' })
    .int()
    .positive('Mã lô không hợp lệ'),
  quantity: z
    .number({ required_error: 'Vui lòng nhập số lượng' })
    .positive('Số lượng phải lớn hơn 0'),
});

export const updatePickedLotsSchema = z.object({
  lots: z.array(pickedLotEntrySchema).min(1, 'Phải có ít nhất 1 lô được gán'),
});

// ─── Hủy phiếu ────────────────────────────────────────────────────────────────

export const cancelStockOutSchema = z.object({
  reason: z.string().optional(),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateStockOutSchemaValues = z.infer<typeof createStockOutSchema>;
export type CreateStockOutDetailSchemaValues = z.infer<typeof createStockOutDetailSchema>;
export type UpdatePickedLotsSchemaValues = z.infer<typeof updatePickedLotsSchema>;
export type CancelStockOutSchemaValues = z.infer<typeof cancelStockOutSchema>;
