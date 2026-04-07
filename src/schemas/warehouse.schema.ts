import { z } from "zod";

const locationStatusEnum = z.enum([
  "AVAILABLE",
  "PARTIAL",
  "FULL",
  "MAINTENANCE",
]);
const storageTypeEnum = z.enum(["AMBIENT", "CHILLED", "FROZEN", "DRY"]);

// --- Warehouse Schemas ---

export const getWarehousesQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10)),
    search: z.string().optional(),
    is_active: z
      .string()
      .optional()
      .transform((val) => (val !== undefined ? val === "true" : undefined)),
  }),
});

export const warehouseParamSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive("ID phải là số nguyên dương")),
  }),
});

export const createWarehouseSchema = z.object({
  body: z.object({
    code: z.string().min(1, "Mã kho không được để trống").max(50),
    name: z.string().min(1, "Tên kho không được để trống").max(255),
    user_id: z
      .number()
      .int()
      .positive("ID người quản lý phải là số nguyên dương")
      .optional(),
    is_active: z.boolean().optional(),
  }),
});

export const updateWarehouseSchema = z.object({
  params: warehouseParamSchema.shape.params,
  body: z.object({
    code: z.string().min(1).max(50).optional(),
    name: z.string().min(1).max(255).optional(),
    user_id: z
      .number()
      .int()
      .positive("ID người quản lý phải là số nguyên dương")
      .optional()
      .nullable(),
    is_active: z.boolean().optional(),
  }),
});

// --- Warehouse Location Schemas ---

export const getLocationsQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10)),
    warehouse_id: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    zone_code: z.string().optional(),
    rack_code: z.string().optional(),
    location_status: locationStatusEnum.optional(),
    storage_condition: storageTypeEnum.optional(),
    search: z.string().optional(),
  }),
});

export const locationParamSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive("ID phải là số nguyên dương")),
  }),
});

export const createLocationSchema = z.object({
  body: z.object({
    warehouse_id: z.number().int().positive("ID kho bắt buộc"),
    zone_code: z.string().max(50).optional().nullable(),
    rack_code: z.string().max(50).optional().nullable(),
    level_code: z.string().max(50).optional().nullable(),
    bin_code: z.string().max(50).optional().nullable(),
    location_status: locationStatusEnum.optional(),
    is_active: z.boolean().optional(),
    max_weight: z.number().nonnegative().optional().nullable(),
    max_volume: z.number().nonnegative().optional().nullable(),
    storage_condition: storageTypeEnum.optional(),
  }),
});

export const updateLocationSchema = z.object({
  params: locationParamSchema.shape.params,
  body: z.object({
    location_status: locationStatusEnum.optional(),
    is_active: z.boolean().optional(),
    max_weight: z.number().nonnegative().optional().nullable(),
    max_volume: z.number().nonnegative().optional().nullable(),
    current_weight: z.number().nonnegative().optional().nullable(),
    current_volume: z.number().nonnegative().optional().nullable(),
    storage_condition: storageTypeEnum.optional(),
  }),
});

export type GetWarehousesQuery = z.infer<typeof getWarehousesQuerySchema>["query"];
export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>["body"];
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>["body"];

export type GetLocationsQuery = z.infer<typeof getLocationsQuerySchema>["query"];
export type CreateLocationInput = z.infer<typeof createLocationSchema>["body"];
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>["body"];
