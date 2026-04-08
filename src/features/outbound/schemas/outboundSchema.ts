import { z } from 'zod';

export const outboundLineItemSchema = z.object({
  productId: z.string().min(1, 'Vui lòng chọn sản phẩm'),
  locationId: z.string().min(1, 'Vui lòng chọn vị trí'),
  unitId: z.string().min(1, 'Vui lòng chọn đơn vị'),
  lotNumber: z.string().min(1, 'Vui lòng nhập số lô'),
  expiryDate: z.string().default(''),
  requestedQty: z
    .number()
    .int('Số lượng phải là số nguyên')
    .min(1, 'Số lượng tối thiểu là 1'),
  note: z.string().default(''),
});

export const outboundFormSchema = z.object({
  warehouseId: z.string().min(1, 'Vui lòng chọn kho'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  expectedDate: z.string().default(''),
  note: z.string().default(''),
  lineItems: z.array(outboundLineItemSchema).min(1, 'Phiếu xuất phải có ít nhất 1 dòng hàng'),
});

export type OutboundLineItemSchemaValues = z.infer<typeof outboundLineItemSchema>;
export type OutboundFormSchemaValues = z.infer<typeof outboundFormSchema>;
