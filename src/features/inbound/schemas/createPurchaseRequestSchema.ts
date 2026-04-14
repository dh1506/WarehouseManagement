import { z } from 'zod';

// ── One product line in the StockIn create form ──────────────────────────────
export const orderItemSchema = z.object({
  product_id: z.coerce.number().int().positive('Product is required'),
  productName: z.string().min(1, 'Product name is required'), // display only
  sku: z.string().min(1, 'SKU is required'), // display only
  uom: z.string().min(1, 'Unit of measure is required'), // display only
  expected_quantity: z.coerce
    .number()
    .positive('Quantity must be greater than 0'),
  unit_price: z.coerce.number().positive('Unit price must be greater than 0').optional(),
});

export type OrderItemSchema = z.infer<typeof orderItemSchema>;

// ── Full form schema for creating a StockIn (mirrors BE CreateStockInInput) ──
export const createStockInFormSchema = z.object({
  warehouse_location_id: z.coerce
    .number()
    .int()
    .positive('Warehouse location is required'),
  supplier_id: z.coerce
    .number()
    .int()
    .positive('Supplier is required'),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .or(z.literal('')),
  details: z
    .array(orderItemSchema)
    .min(1, 'At least one product is required'),
});

export type CreateStockInFormSchema = z.infer<typeof createStockInFormSchema>;
