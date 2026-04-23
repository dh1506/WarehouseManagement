import { z } from 'zod';

export const createStockCountDetailSchema = z.object({
  warehouse_location_id: z
    .number({ required_error: 'Location is required' })
    .int()
    .positive('Location ID must be positive'),
  product_id: z
    .number({ required_error: 'Product is required' })
    .int()
    .positive('Product ID must be positive'),
  lot_id: z.number().int().positive().optional(),
  unit_price: z.number().min(0, 'Unit price cannot be negative').optional(),
  // UI display fields (stripped before sending to API)
  locationLabel: z.string().optional(),
  productLabel: z.string().optional(),
  productCode: z.string().optional(),
  uomLabel: z.string().optional(),
});

export const createStockCountSchema = z.object({
  type: z.enum(['PERIODIC', 'AD_HOC'], { required_error: 'Audit type is required' }),
  scope_type: z.enum(['FULL', 'ZONE', 'PRODUCT', 'LOT'], { required_error: 'Scope is required' }),
  description: z.string().max(500).optional(),
  details: z
    .array(createStockCountDetailSchema)
    .min(1, 'At least one item line is required'),
});

export const confirmVarianceItemSchema = z.object({
  detail_id: z.number().int().positive(),
  variance_reason: z
    .string()
    .min(5, 'Reason must be at least 5 characters'),
});

export const confirmVarianceBatchSchema = z.object({
  details: z.array(confirmVarianceItemSchema).min(1),
});

export type CreateStockCountFormValues = z.infer<typeof createStockCountSchema>;
export type CreateStockCountDetailFormValues = z.infer<typeof createStockCountDetailSchema>;
export type ConfirmVarianceItemValues = z.infer<typeof confirmVarianceItemSchema>;
