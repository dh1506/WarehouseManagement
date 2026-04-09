import { z } from 'zod';

// ── Schema: Tạo phiếu nhập kho (Create StockIn Voucher) ────────────────────
// Validate: warehouse, supplier, ít nhất 1 sản phẩm với quantity > 0

const createStockInDetailItemSchema = z.object({
  product_id: z.coerce
    .number()
    .int()
    .positive('Sản phẩm là bắt buộc'),
  expected_quantity: z.coerce
    .number()
    .positive('Số lượng phải lớn hơn 0'),
  unit_price: z.coerce
    .number()
    .min(0, 'Đơn giá phải ≥ 0')
    .optional(),
});

export const createStockInVoucherSchema = z.object({
  warehouse_location_id: z.coerce
    .number()
    .int()
    .positive('Kho hàng là bắt buộc'),
  supplier_id: z.coerce
    .number()
    .int()
    .positive('Nhà cung cấp là bắt buộc'),
  description: z
    .string()
    .trim()
    .max(500, 'Mô tả tối đa 500 ký tự')
    .optional()
    .or(z.literal('')),
  details: z
    .array(createStockInDetailItemSchema)
    .min(1, 'Cần ít nhất 1 sản phẩm'),
});

export type CreateStockInVoucherSchema = z.infer<typeof createStockInVoucherSchema>;

// ── Schema: Giải quyết sai lệch (Resolve Discrepancy) ──────────────────────
export const resolveDiscrepancyFormSchema = z.object({
  action_taken: z
    .string()
    .min(5, 'Giải pháp cần ít nhất 5 ký tự')
    .max(1000, 'Giải pháp tối đa 1000 ký tự'),
});

export type ResolveDiscrepancyFormSchema = z.infer<typeof resolveDiscrepancyFormSchema>;
