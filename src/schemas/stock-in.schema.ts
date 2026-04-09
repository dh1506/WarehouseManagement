import { z } from "zod";

const paramsIdSchema = z.object({
  id: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive("ID phải là số nguyên dương")),
});

export const getStockInsQuerySchema = z.object({
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
    search: z.string().optional(),
    status: z.enum(["DRAFT", "PENDING", "IN_PROGRESS", "DISCREPANCY", "COMPLETED", "CANCELLED"]).optional(),
    warehouse_location_id: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .pipe(z.number().int().positive().optional()),
    supplier_id: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .pipe(z.number().int().positive().optional()),
  }),
});

export const getStockInByIdParamSchema = z.object({
  params: paramsIdSchema,
});

export const createStockInSchema = z.object({
  body: z.object({
    warehouse_location_id: z.number().int().positive("Warehouse Location ID không hợp lệ"),
    supplier_id: z.number().int().positive("Supplier ID không hợp lệ"),
    description: z.string().optional(),
    details: z.array(
      z.object({
        product_id: z.number().int().positive("Product ID không hợp lệ"),
        expected_quantity: z.number().positive("Số lượng phải lớn hơn 0"),
        unit_price: z.number().positive("Đơn giá phải lớn hơn 0").optional(),
      })
    ).min(1, "Phải có ít nhất 1 sản phẩm trong đề nghị nhập"),
  }),
});

export const approveStockInSchema = z.object({
  params: paramsIdSchema,
});

export const recordReceiptSchema = z.object({
  params: paramsIdSchema,
  body: z.object({
    details: z.array(
      z.object({
        stock_in_detail_id: z.number().int().positive("Stock In Detail ID không hợp lệ"),
        received_quantity: z.number().min(0, "Số lượng nhận không được âm"),
      })
    ).min(1, "Phải có ít nhất 1 chi tiết để cập nhật"),
  }),
});

export const createDiscrepancySchema = z.object({
  params: paramsIdSchema,
  body: z.object({
    reason: z.string().min(5, "Lý do phải có ít nhất 5 ký tự"),
  }),
});

export const resolveDiscrepancySchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive("Stock In ID phải là số nguyên dương")),
    discId: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive("Discrepancy ID phải là số nguyên dương")),
  }),
  body: z.object({
    action_taken: z.string().min(5, "Vui lòng nhập phương án giải quyết (ít nhất 5 ký tự)"),
  }),
});

export const allocateLotsSchema = z.object({
  params: paramsIdSchema,
  body: z.object({
    allocations: z.array(
      z.object({
        stock_in_detail_id: z.number().int().positive("Detail ID không hợp lệ"),
        location_id: z.number().int().positive("Location ID không hợp lệ"),
        lot_no: z.string().min(1, "Lot No là bắt buộc"),
        quantity: z.number().positive("Số lượng phân bổ phải lớn hơn 0"),
        production_date: z.string().datetime().optional(),
        expired_date: z.string().datetime().optional(),
      })
    ).min(1, "Phải có ít nhất 1 phân bổ"),
  }),
});

// Types export
export type GetStockInsQuery = z.infer<typeof getStockInsQuerySchema>["query"];
export type GetStockInByIdParam = z.infer<typeof getStockInByIdParamSchema>["params"];
export type CreateStockInInput = z.infer<typeof createStockInSchema>["body"];
export type RecordReceiptInput = z.infer<typeof recordReceiptSchema>["body"];
export type CreateDiscrepancyInput = z.infer<typeof createDiscrepancySchema>["body"];
export type ResolveDiscrepancyInput = z.infer<typeof resolveDiscrepancySchema>["body"];
export type AllocateLotsInput = z.infer<typeof allocateLotsSchema>["body"];
