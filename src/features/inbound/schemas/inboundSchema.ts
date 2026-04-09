import { z } from 'zod';

export const inboundLineItemSchema = z.object({
  productId: z.string().min(1, 'Please select a product'),
  locationId: z.string().min(1, 'Please select a location'),
  unitId: z.string().min(1, 'Please select a unit'),
  lotNumber: z.string().min(1, 'Please enter lot number'),
  expiryDate: z.string().default(''),
  requestedQty: z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Minimum quantity is 1'),
  price: z
    .number()
    .min(0, 'Price must be non-negative')
    .default(0),
  note: z.string().default(''),
});

export const inboundFormSchema = z.object({
  warehouseId: z.string().min(1, 'Please select a warehouse'),
  supplierId: z.string().optional(),
  supplierRef: z.string().optional(),
  expectedDate: z.string().default(''),
  note: z.string().default(''),
  lineItems: z.array(inboundLineItemSchema).min(1, 'At least one line item is required'),
});

export type InboundLineItemSchemaValues = z.infer<typeof inboundLineItemSchema>;
export type InboundFormSchemaValues = z.infer<typeof inboundFormSchema>;
