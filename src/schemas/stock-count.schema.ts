import { z } from "zod";

// ==================== SHARED SCHEMAS ====================

const paramsIdSchema = z.object({
  id: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive("ID phải là số nguyên dương")),
});

// ==================== QUERY: Danh sách đợt kiểm kê ====================

export const getStockCountsQuerySchema = z.object({
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
      .enum(["DRAFT", "COUNTING", "COMPLETED", "APPROVED", "CANCELLED"])
      .optional(),
    type: z.enum(["PERIODIC", "AD_HOC"]).optional(),
    scope_type: z.enum(["FULL", "ZONE", "PRODUCT", "LOT"]).optional(),
  }),
});

// ==================== PARAMS: Chi tiết đợt kiểm kê ====================

export const getStockCountByIdParamSchema = z.object({
  params: paramsIdSchema,
});

// ==================== BODY: Tạo đợt kiểm kê ====================

export const createStockCountSchema = z.object({
  body: z.object({
    type: z.enum(['PERIODIC', 'AD_HOC'], {
      message: 'Loại kiểm kê không hợp lệ',
    }),
    scope_type: z.enum(['FULL', 'ZONE', 'PRODUCT', 'LOT'], {
      message: 'Phạm vi kiểm kê không hợp lệ',
    }),
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
          unit_price: z
            .number()
            .min(0, "Đơn giá không được âm")
            .optional(),
        })
      )
      .min(1, "Phải có ít nhất 1 sản phẩm trong phiếu kiểm kê"),
  }),
});

// ==================== PARAMS: Bắt đầu kiểm kê (DRAFT → COUNTING) ====================

export const startCountingSchema = z.object({
  params: paramsIdSchema,
});

// ==================== BODY: Nhập số lượng thực tế ====================

export const recordCountedQuantitySchema = z.object({
  params: paramsIdSchema,
  body: z.object({
    details: z
      .array(
        z.object({
          detail_id: z
            .number()
            .int()
            .positive("Detail ID không hợp lệ"),
          counted_quantity: z
            .number()
            .min(0, "Số lượng đếm không được âm"),
        })
      )
      .min(1, "Phải có ít nhất 1 dòng chi tiết"),
  }),
});

// ==================== BODY: Xác nhận chênh lệch ====================

export const confirmVarianceSchema = z.object({
  params: paramsIdSchema,
  body: z.object({
    details: z
      .array(
        z.object({
          detail_id: z
            .number()
            .int()
            .positive("Detail ID không hợp lệ"),
          variance_reason: z
            .string()
            .min(5, "Lý do chênh lệch phải có ít nhất 5 ký tự"),
        })
      )
      .min(1, "Phải có ít nhất 1 dòng xác nhận"),
  }),
});

// ==================== PARAMS: Hoàn tất kiểm kê (COUNTING → COMPLETED) ====================

export const completeCountingSchema = z.object({
  params: paramsIdSchema,
});

// ==================== PARAMS: Phê duyệt kiểm kê (COMPLETED → APPROVED) ====================

export const approveStockCountSchema = z.object({
  params: paramsIdSchema,
});

// ==================== PARAMS: Hủy đợt kiểm kê ====================

export const cancelStockCountSchema = z.object({
  params: paramsIdSchema,
});

// ==================== PARAMS: Xuất biên bản ====================

export const exportStockCountSchema = z.object({
  params: paramsIdSchema,
});

// ==================== TYPES EXPORT ====================

export type GetStockCountsQuery = z.infer<typeof getStockCountsQuerySchema>["query"];
export type GetStockCountByIdParam = z.infer<typeof getStockCountByIdParamSchema>["params"];
export type CreateStockCountInput = z.infer<typeof createStockCountSchema>["body"];
export type RecordCountedQuantityInput = z.infer<typeof recordCountedQuantitySchema>["body"];
export type ConfirmVarianceInput = z.infer<typeof confirmVarianceSchema>["body"];
