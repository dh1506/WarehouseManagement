import { z } from 'zod';
import { StockOutType, StockOutStatus } from '../generated';

export const createStockOutSchema = z.object({
  body: z.object({
    warehouse_location_id: z.number().int().positive('Mã vị trí kho không hợp lệ'),
    type: z.nativeEnum(StockOutType).optional().default(StockOutType.SALES),
    reference_number: z.string().optional(),
    supplier_id: z.number().int().positive('Supplier ID phải lớn hơn 0').optional(),
    description: z.string().optional(),
    details: z.array(
      z.object({
        product_id: z.number().int().positive('Mã sản phẩm không hợp lệ'),
        quantity: z.number().positive('Số lượng phải lớn hơn 0'),
        unit_price: z.number().nonnegative('Giá không được âm').optional(),
      })
    ).min(1, 'Phải có ít nhất 1 sản phẩm để xuất kho'),
  }),
});

export const updatePickedLotsSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    lots: z.array(
      z.object({
        stock_out_detail_id: z.number().int().positive(),
        product_lot_id: z.number().int().positive(),
        quantity: z.number().positive(),
      })
    ).min(1, 'Phải chỉ định ít nhất 1 lô'),
  }),
});

export const cancelStockOutSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    reason: z.string().min(1, 'Cần có lý do hủy phiếu xuất').optional(),
  }),
});

export const stockOutIdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

export const createDiscrepancySchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    reason: z.string().min(5, "Lý do phải có ít nhất 5 ký tự"),
  }),
});

export const resolveDiscrepancySchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive("Stock Out ID phải là số nguyên dương"),
    discId: z.coerce.number().int().positive("Discrepancy ID phải là số nguyên dương"),
  }),
  body: z.object({
    action_taken: z.string().min(5, "Vui lòng nhập phương án giải quyết (ít nhất 5 ký tự)"),
  }),
});

// Types export
export type CreateStockOutInput = z.infer<typeof createStockOutSchema>["body"];
export type UpdatePickedLotsInput = z.infer<typeof updatePickedLotsSchema>["body"];
export type CancelStockOutInput = z.infer<typeof cancelStockOutSchema>["body"];
export type CreateDiscrepancyInput = z.infer<typeof createDiscrepancySchema>["body"];
export type ResolveDiscrepancyInput = z.infer<typeof resolveDiscrepancySchema>["body"];
