import { z } from "zod";

// Tra cứu tồn kho
export const queryInventorySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10)),
    product_id: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    warehouse_id: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    warehouse_location_id: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    lot_id: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    expires_before: z
      .string()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined)),
    is_available: z
      .string()
      .optional()
      .transform((val) => (val === "true" ? true : val === "false" ? false : undefined)),
    search: z.string().optional(),
  }),
});

// Cập nhật hạn mức tồn kho 
export const setProductStockThresholdSchema = z.object({
  params: z.object({
    productId: z.string().transform((val) => parseInt(val, 10)),
  }),
  body: z.object({
    min_stock: z.number().nonnegative().optional(),
    max_stock: z.number().nonnegative().optional(),
    safe_stock: z.number().nonnegative().optional(),
  }),
});

// Khóa sổ
export const inventoryClosingSchema = z.object({
  body: z.object({
    closing_date: z.string().transform((val) => new Date(val)),
  }),
});

// Cảnh báo tồn kho 
export const inventoryAlertsQuerySchema = z.object({
  query: z.object({
    days_old: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 30)),
  }),
});

export type QueryInventoryInput = z.infer<typeof queryInventorySchema>["query"];
export type SetStockThresholdInput = z.infer<typeof setProductStockThresholdSchema>["body"];
export type InventoryClosingInput = z.infer<typeof inventoryClosingSchema>["body"];
export type InventoryAlertsQuery = z.infer<typeof inventoryAlertsQuerySchema>["query"];
