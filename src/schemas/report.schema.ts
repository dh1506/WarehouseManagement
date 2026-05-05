import { z } from "zod";
import { ReportType } from "../generated";

// Schema lọc báo cáo (query params)
export const reportFilterSchema = z.object({
  query: z.object({
    start_date: z
      .string()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: "Ngày bắt đầu không hợp lệ",
      }),
    end_date: z
      .string()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: "Ngày kết thúc không hợp lệ",
      }),
    warehouse_id: z.coerce.number().int().positive().optional(),
    warehouse_location_id: z.coerce.number().int().positive().optional(),
    product_id: z.coerce.number().int().positive().optional(),
    lot_id: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().default(10),
  }),
});

// Schema tạo cấu hình báo cáo (body)
export const createReportConfigSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Tên cấu hình không được để trống"),
    report_type: z.nativeEnum(ReportType, {
      message: "Loại báo cáo không hợp lệ",
    }),
    recipient_emails: z.string().min(1, "Email nhận không được để trống"),
    schedule_cron: z.string().min(1, "Lịch biểu không được để trống"),
    is_active: z.boolean().optional(),
  }),
});

// Schema lấy chi tiết hoặc xóa cấu hình báo cáo (params)
export const reportConfigIdParamSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive("ID phải là số nguyên dương")),
  }),
});

// Schema cập nhật cấu hình báo cáo (params + body)
export const updateReportConfigSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive("ID phải là số nguyên dương")),
  }),
  body: z.object({
    name: z.string().min(1, "Tên cấu hình không được để trống").optional(),
    report_type: z.nativeEnum(ReportType, {
      message: "Loại báo cáo không hợp lệ",
    }).optional(),
    recipient_emails: z.string().min(1, "Email nhận không được để trống").optional(),
    schedule_cron: z.string().min(1, "Lịch biểu không được để trống").optional(),
    is_active: z.boolean().optional(),
  }),
});

export type ReportFilterQuery = z.infer<typeof reportFilterSchema>["query"];
export type CreateReportConfigInput = z.infer<typeof createReportConfigSchema>["body"];
export type UpdateReportConfigInput = z.infer<typeof updateReportConfigSchema>["body"];

