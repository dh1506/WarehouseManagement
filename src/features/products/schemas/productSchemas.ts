import { z } from 'zod';

export const productFormSchema = z
  .object({
    sku: z
      .string()
      .trim()
      .min(3, 'SKU must contain at least 3 characters')
      .max(32, 'SKU must be 32 characters or fewer')
      .regex(/^[A-Z0-9_-]+$/i, 'SKU can only contain letters, numbers, underscores, or hyphens'),
    name: z.string().trim().min(3, 'Product name is too short').max(120, 'Product name must be 120 characters or fewer'),
    productType: z.enum(['goods', 'material', 'consumable']),
    categoryId: z.string().trim().min(1, 'Please select a category'),
    unitId: z.string().trim().min(1, 'Please select a base unit'),
    brandId: z.string().trim().min(1, 'Please select a brand'),
    minStock: z.number().min(0, 'Minimum stock cannot be negative'),
    maxStock: z.number().min(0, 'Maximum stock cannot be negative'),
    trackedByLot: z.boolean(),
    trackedByExpiry: z.boolean(),
    expiryDate: z.string(),
    productionDate: z.string(),
    status: z.enum(['active', 'inactive', 'discontinued']),
    description: z.string().trim().max(500, 'Description must be 500 characters or fewer'),
    storageConditions: z.string().trim().max(255, 'Storage conditions must be 255 characters or fewer'),
  })
  .refine((data) => data.maxStock >= data.minStock, {
    path: ['maxStock'],
    message: 'Maximum stock must be greater than or equal to minimum stock',
  })
  .refine((data) => !data.trackedByExpiry || Boolean(data.expiryDate), {
    path: ['expiryDate'],
    message: 'Expiry date is required when expiry tracking is enabled',
  });

export type ProductFormData = z.infer<typeof productFormSchema>;
