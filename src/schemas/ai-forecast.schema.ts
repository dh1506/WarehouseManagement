import { z } from 'zod';

// =============================================
// Zod Schema: AI Forecast Event (CRUD)
// =============================================

const promotionTypeEnum = z.enum(['DISCOUNT', 'BOGO', 'COMBO', 'GIFT']);
const channelEnum = z.enum(['STORE', 'SHOPEE', 'GRABFOOD', 'FACEBOOK', 'ZALO', 'OTHER']);

export const createForecastEventSchema = z.object({
  body: z.object({
    /// Tháng diễn ra sự kiện (YYYY-MM format)
    event_month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'event_month phải có định dạng YYYY-MM'),
    program_name: z.string().min(1, 'Tên chương trình không được để trống').max(255),
    promotion_types: z
      .array(promotionTypeEnum)
      .min(1, 'Phải chọn ít nhất 1 loại khuyến mãi'),
    applicable_products: z.string().optional(),
    start_date: z.string().date('start_date phải là ngày hợp lệ (YYYY-MM-DD)'),
    end_date: z.string().date('end_date phải là ngày hợp lệ (YYYY-MM-DD)'),
    channels: z.array(channelEnum).min(1, 'Phải chọn ít nhất 1 kênh triển khai'),
    expected_target: z.string().optional(),
    estimated_budget: z.number().positive('Ngân sách phải là số dương').optional(),
    notes: z.string().optional(),
  }),
});

export const updateForecastEventSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/, 'ID phải là số nguyên dương') }),
  body: createForecastEventSchema.shape.body.partial(),
});

// =============================================
// Zod Schema: Trigger Manual Forecast
// =============================================

export const triggerForecastSchema = z.object({
  body: z.object({
    /// Tháng cần dự báo (YYYY-MM)
    forecast_month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'forecast_month phải có định dạng YYYY-MM'),
    /// ID sự kiện khuyến mãi tháng này (nếu có)
    event_id: z.number().int().positive().optional(),
    /// Tọa độ thành phố để fetch thời tiết (nếu không cung cấp, dùng city từ env)
    city: z.string().optional(),
  }),
});

// =============================================
// Zod Schema: Review Forecast Result (Approve/Reject)
// =============================================

export const reviewForecastResultSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID phải là số nguyên dương'),
  }),
  body: z.object({
    action: z.enum(['APPROVE', 'REJECT'], {
      message: 'action là bắt buộc (APPROVE hoặc REJECT)'
    }),
    reject_reason: z.string().min(10, 'Lý do từ chối phải có ít nhất 10 ký tự').optional(),
  }).superRefine((data, ctx) => {
    if (data.action === 'REJECT' && !data.reject_reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'reject_reason là bắt buộc khi từ chối',
        path: ['reject_reason'],
      });
    }
  }),
});

// =============================================
// Zod Schema: Query list history
// =============================================

export const listForecastHistorySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).optional().default('1'),
    limit: z.string().regex(/^\d+$/).optional().default('10'),
    /// Lọc theo tháng dự báo (YYYY-MM)
    forecast_month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .optional(),
    status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']).optional(),
  }),
});

export const listForecastResultsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID phải là số nguyên dương'),
  }),
  query: z.object({
    product_id: z.string().regex(/^\d+$/).optional(),
    review_status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    mape_alert: z.enum(['WARNING', 'CRITICAL']).optional(),
  }),
});

// =============================================
// Zod Schema: Update Actual Qty (để tính MAPE)
// =============================================

export const updateActualQtySchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID phải là số nguyên dương'),
  }),
  body: z.object({
    actual_qty: z
      .number()
      .min(0, 'actual_qty phải >= 0'),
  }),
});
