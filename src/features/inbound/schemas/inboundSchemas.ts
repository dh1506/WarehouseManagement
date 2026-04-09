import { z } from 'zod';

export const inboundQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().default(''),
  status: z.enum(['all', 'completed', 'receiving', 'pending', 'draft', 'cancelled']).default('all'),
  documentType: z.enum(['all', 'inbound_receipt', 'priority_transfer', 'standard_purchase', 'return_receipt']).default('all'),
  dateFrom: z.string().date().or(z.literal('')).default(''),
  dateTo: z.string().date().or(z.literal('')).default(''),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type InboundQuerySchema = z.infer<typeof inboundQuerySchema>;
