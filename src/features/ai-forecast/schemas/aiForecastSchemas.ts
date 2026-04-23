import { z } from 'zod';

export const aiForecastFilterSchema = z.object({
  search: z.string().trim().max(120).default(''),
  status: z.enum(['all', 'active', 'inactive', 'discontinued']).default('all'),
});

export type AiForecastFilterInput = z.input<typeof aiForecastFilterSchema>;
export type AiForecastFilterOutput = z.output<typeof aiForecastFilterSchema>;
