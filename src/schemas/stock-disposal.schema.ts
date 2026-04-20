import { z } from "zod";

// ==================== SHARED SCHEMAS ====================

const paramsIdSchema = z.object({
  id: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive("ID phải là số nguyên dương")),
});

// ==================== QUERY: Danh mục nguyên nhân hủy ====================

export const getDisposalReasonsQuerySchema = z.object({
  query: z.object({
    is_active: z
      .string()
      .optional()
      .transform((val) => (val === "true" ? true : val === "false" ? false : undefined))
      .pipe(z.boolean().optional()),
  }),
});

// ==================== QUERY: Danh sách phiếu hủy ====================

export const getStockDisposalsQuerySchema = z.object({
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
    status: z
      .enum(["DRAFT", "PENDING", "APPROVED", "COMPLETED", "CANCELLED"])
      .optional(),
  }),
});

// ==================== BODY: Tạo phiếu hủy hàng ====================

export const createStockDisposalSchema = z.object({
  body: z.object({
    description: z.string().optional(),
    details: z
      .array(
        z.object({
          warehouse_location_id: z
            .number()
            .int()
            .positive("Warehouse Location ID không hợp lệ"),
          product_id: z.number().int().positive("Product ID không hợp lệ"),
          lot_id: z.number().int().positive("Lot ID không hợp lệ").optional(),
          reason_id: z.number().int().positive("Reason ID không hợp lệ"),
          quantity: z.number().positive("Số lượng phải lớn hơn 0"),
          unit_price: z.number().min(0, "Đơn giá không được âm").optional(),
          reason_note: z.string().optional(),
        })
      )
      .min(1, "Phải có ít nhất 1 dòng chi tiết sản phẩm"),
  }),
});

// ==================== PARAMS/BODY: Cập nhật phiếu hủy (DRAFT) ====================

export const updateStockDisposalSchema = z.object({
  params: paramsIdSchema,
  body: createStockDisposalSchema.shape.body,
});

// ==================== PARAMS: Chuyển trạng thái ====================

export const submitStockDisposalSchema = z.object({
  params: paramsIdSchema,
});

export const approveStockDisposalSchema = z.object({
  params: paramsIdSchema,
});

export const completeStockDisposalSchema = z.object({
  params: paramsIdSchema,
});

export const cancelStockDisposalSchema = z.object({
  params: paramsIdSchema,
});

// ==================== QUERY: Phân tích dữ liệu hủy hàng ====================

export const getDisposalAnalyticsSchema = z.object({
  query: z.object({
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
    reason_id: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .pipe(z.number().int().positive().optional()),
    warehouse_id: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .pipe(z.number().int().positive().optional()),
  }),
});

// ==================== TYPES EXPORT ====================

export type CreateStockDisposalInput = z.infer<typeof createStockDisposalSchema>["body"];
export type GetStockDisposalsQuery = z.infer<typeof getStockDisposalsQuerySchema>["query"];
export type GetDisposalAnalyticsQuery = z.infer<typeof getDisposalAnalyticsSchema>["query"];
