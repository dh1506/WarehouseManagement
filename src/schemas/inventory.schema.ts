import { z } from "zod";

export const getInventoriesQuerySchema = z.object({
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
    warehouse_location_id: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
  }),
});

export const inventoryParamSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive("ID phải là số nguyên dương")),
  }),
});

export const createInventorySchema = z.object({
  body: z.object({
    product_id: z.number().int().positive("product_id bắt buộc"),
    warehouse_location_id: z
      .number()
      .int()
      .positive("warehouse_location_id bắt buộc"),
    quantity: z.number().nonnegative().optional().default(0),
    reserved_quantity: z.number().nonnegative().optional().default(0),
    available_quantity: z.number().nonnegative().optional().default(0),
  }),
});

export const updateInventorySchema = z.object({
  params: inventoryParamSchema.shape.params,
  body: z.object({
    quantity: z.number().nonnegative().optional(),
    reserved_quantity: z.number().nonnegative().optional(),
    available_quantity: z.number().nonnegative().optional(),
  }),
});

export type GetInventoriesQuery = z.infer<
  typeof getInventoriesQuerySchema
>["query"];
export type CreateInventoryInput = z.infer<
  typeof createInventorySchema
>["body"];
export type UpdateInventoryInput = z.infer<
  typeof updateInventorySchema
>["body"];
