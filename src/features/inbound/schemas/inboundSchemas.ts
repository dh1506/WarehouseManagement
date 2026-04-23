import { z } from 'zod';

export const STOCK_IN_STATUSES = [
  'all',
  'DRAFT',
  'PENDING',
  'IN_PROGRESS',
  'DISCREPANCY',
  'COMPLETED',
  'CANCELLED',
] as const;

export type StockInStatusFilter = (typeof STOCK_IN_STATUSES)[number];

export const stockInQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().default(''),
  status: z.enum(STOCK_IN_STATUSES).default('all'),
});

export type StockInQuerySchema = z.infer<typeof stockInQuerySchema>;

export const recordReceiptDetailSchema = z.object({
  stock_in_detail_id: z.coerce.number().int().positive('Detail ID is required'),
  received_quantity: z.coerce.number().min(0, 'Quantity must be 0 or greater'),
});

export const recordReceiptSchema = z.object({
  details: z
    .array(recordReceiptDetailSchema)
    .min(1, 'At least one item is required'),
});

export type RecordReceiptSchema = z.infer<typeof recordReceiptSchema>;

export const createDiscrepancySchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
});

export type CreateDiscrepancySchema = z.infer<typeof createDiscrepancySchema>;

export const resolveDiscrepancySchema = z.object({
  action_taken: z
    .string()
    .min(5, 'Resolution must be at least 5 characters'),
});

export type ResolveDiscrepancySchema = z.infer<typeof resolveDiscrepancySchema>;
