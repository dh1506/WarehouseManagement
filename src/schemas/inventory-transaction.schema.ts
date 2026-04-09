import { z } from "zod";

// ==================== PARAMS ====================

const paramsIdSchema = z.object({
  id: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive("ID phải là số nguyên dương")),
});

// ==================== QUERY: Danh sách giao dịch ====================

export const getTransactionsQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .pipe(z.number().int().positive("Số trang phải lớn hơn 0")),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10))
      .pipe(z.number().int().min(1).max(100, "Giới hạn tối đa 100 bản ghi")),
    from_date: z
      .string()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined))
      .pipe(z.date().optional()),
    to_date: z
      .string()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined))
      .pipe(z.date().optional()),
    product_id: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .pipe(z.number().int().positive().optional()),
    transaction_type: z.enum(["IN", "OUT", "TRANSFER", "ADJUSTMENT"]).optional(),
    warehouse_id: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .pipe(z.number().int().positive().optional()),
    warehouse_location_id: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .pipe(z.number().int().positive().optional()),
    created_by: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .pipe(z.number().int().positive().optional()),
    reference_type: z.string().optional(),
    reference_id: z.string().optional(),
  }),
});

// ==================== PARAMS: Chi tiết giao dịch ====================

export const getTransactionByIdSchema = z.object({
  params: paramsIdSchema,
});

// ==================== BODY: Lập phiếu điều chỉnh ====================

export const createAdjustmentSchema = z.object({
  body: z.object({
    warehouse_location_id: z.number().int().positive("Warehouse Location ID không hợp lệ"),
    product_id: z.number().int().positive("Product ID không hợp lệ"),
    lot_id: z.number().int().positive("Lot ID không hợp lệ").optional(),
    product_uom_id: z.number().int().positive("Product UOM ID không hợp lệ"),
    quantity: z.number().refine((val) => val !== 0, {
      message: "Số lượng điều chỉnh không được bằng 0",
    }),
    note: z.string().min(5, "Ghi chú phải có ít nhất 5 ký tự"),
  }),
});

// ==================== TYPES EXPORT ====================

export type GetTransactionsQuery = z.infer<typeof getTransactionsQuerySchema>["query"];
export type GetTransactionByIdParam = z.infer<typeof getTransactionByIdSchema>["params"];
export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>["body"];
