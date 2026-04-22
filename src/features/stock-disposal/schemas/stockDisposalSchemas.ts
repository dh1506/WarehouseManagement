import { z } from 'zod';

// ── Detail line schema ────────────────────────────────────────────────────────
export const createStockDisposalDetailSchema = z.object({
  warehouse_location_id: z
    .number({ error: 'Location is required' })
    .int()
    .positive('Please select warehouse location'),
  product_id: z
    .number({ error: 'Product is required' })
    .int()
    .positive('Product ID must be positive'),
  lot_id: z.number().int().positive().optional(),
  reason_id: z
    .number({ error: 'Disposal reason is required' })
    .int()
    .positive('Reason ID must be positive'),
  quantity: z
    .number({ error: 'Quantity is required' })
    .positive('Quantity must be greater than 0'),
  unit_price: z.number().min(0, 'Unit price cannot be negative').optional(),
  reason_note: z.string().trim().max(500, 'Note is too long').optional(),
});

// ── Master form schema ────────────────────────────────────────────────────────
export const createStockDisposalSchema = z.object({
  description: z.string().max(1000, 'Description is too long').optional(),
  details: z
    .array(createStockDisposalDetailSchema)
    .min(1, 'At least one disposal item is required'),
});

// ── Exported types ────────────────────────────────────────────────────────────
export type CreateStockDisposalFormValues = z.infer<typeof createStockDisposalSchema>;
export type CreateStockDisposalDetailFormValues = z.infer<typeof createStockDisposalDetailSchema>;
