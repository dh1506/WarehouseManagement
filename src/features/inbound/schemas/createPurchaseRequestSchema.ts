import { z } from 'zod';

export const orderItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  productName: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  uom: z.string().min(1, 'Unit of measure is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be greater than 0'),
  unitPrice: z.coerce.number().min(0, 'Unit price must be 0 or greater'),
});

export type OrderItemSchema = z.infer<typeof orderItemSchema>;

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  supplierName: z.string().min(1, 'Supplier name is required'),
  documentType: z.enum(['inbound_receipt', 'priority_transfer', 'standard_purchase', 'return_receipt'], {
    required_error: 'Document type is required',
  }),
  expectedArrival: z.string().date('Expected arrival date is required'),
  referenceCode: z.string().max(50, 'Reference code must be 50 characters or less').optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
});

export type CreatePurchaseOrderSchema = z.infer<typeof createPurchaseOrderSchema>;

export const updatePurchaseOrderSchema = createPurchaseOrderSchema.extend({
  id: z.string().min(1, 'Inbound ID is required'),
});

export type UpdatePurchaseOrderSchema = z.infer<typeof updatePurchaseOrderSchema>;
