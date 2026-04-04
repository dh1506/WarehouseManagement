import { z } from 'zod';

export const importExportFilterSchema = z.object({
  search: z.string().trim().max(120).default(''),
  status: z.enum(['all', 'active', 'inactive', 'discontinued']).default('all'),
  warehouseId: z.string().default(''),
});

export type ImportExportFilterInput = z.input<typeof importExportFilterSchema>;
export type ImportExportFilterOutput = z.output<typeof importExportFilterSchema>;
