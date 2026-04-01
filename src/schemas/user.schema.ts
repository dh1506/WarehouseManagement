import { z } from "zod";

// Schema lấy danh sách users (query params)
export const getUsersQuerySchema = z.object({
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
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
    role_id: z
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

// Schema lấy chi tiết user (params)
export const getUserByIdParamSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive("ID phải là số nguyên dương")),
  }),
});

// Schema tạo mới user
export const createUserSchema = z.object({
  body: z.object({
    username: z
      .string()
      .min(3, "Tên đăng nhập phải có ít nhất 3 ký tự")
      .max(50, "Tên đăng nhập tối đa 50 ký tự")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Tên đăng nhập chỉ chứa chữ cái, số và dấu gạch dưới",
      ),
    password: z
      .string()
      .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
      .regex(/(?=.*[0-9])/, "Mật khẩu phải chứa ít nhất 1 số")
      .regex(
        /(?=.*[!@#$%^&*(),.?":{}|<>])/,
        "Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt",
      ),
    full_name: z
      .string()
      .min(1, "Họ tên không được để trống")
      .max(100, "Họ tên tối đa 100 ký tự"),
    email: z
      .string()
      .email("Email không hợp lệ")
      .trim()
      .toLowerCase()
      .optional(),
    phone: z
      .string()
      .regex(/^[0-9+]+$/, "Số điện thoại không hợp lệ")
      .optional(),
    avatar_url: z.string().url("URL avatar không hợp lệ").optional(),
    role_id: z.number().int().positive("ID vai trò phải là số nguyên dương"),
    warehouse_id: z
      .number()
      .int()
      .positive("ID kho phải là số nguyên dương")
      .optional(),
    user_status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  }),
});

// Schema cập nhật user
export const updateUserSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive("ID phải là số nguyên dương")),
  }),
  body: z.object({
    full_name: z
      .string()
      .min(1, "Họ tên không được để trống")
      .max(100, "Họ tên tối đa 100 ký tự")
      .optional(),
    email: z
      .string()
      .email("Email không hợp lệ")
      .trim()
      .toLowerCase()
      .optional()
      .nullable(),
    phone: z
      .string()
      .regex(/^[0-9+]+$/, "Số điện thoại không hợp lệ")
      .optional()
      .nullable(),
    avatar_url: z.string().url("URL avatar không hợp lệ").optional().nullable(),
    role_id: z
      .number()
      .int()
      .positive("ID vai trò phải là số nguyên dương")
      .optional(),
    warehouse_id: z
      .number()
      .int()
      .positive("ID kho phải là số nguyên dương")
      .optional()
      .nullable(),
    user_status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
    password: z
      .string()
      .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
      .regex(/(?=.*[0-9])/, "Mật khẩu phải chứa ít nhất 1 số")
      .regex(
        /(?=.*[!@#$%^&*(),.?":{}|<>])/,
        "Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt",
      )
      .optional(),
  }),
});

export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>["query"];
export type GetUserByIdParam = z.infer<typeof getUserByIdParamSchema>["params"];
export type CreateUserInput = z.infer<typeof createUserSchema>["body"];
export type UpdateUserInput = z.infer<typeof updateUserSchema>["body"];
