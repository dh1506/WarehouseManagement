import { z } from 'zod';

export const inventoryFilterSchema = z.object({
  search: z.string().trim().max(120).default(''),
  warehouseId: z.string().default(''),
});

export type InventoryFilterInput = z.input<typeof inventoryFilterSchema>;
export type InventoryFilterOutput = z.output<typeof inventoryFilterSchema>;
