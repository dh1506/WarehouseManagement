import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared field validators
// ---------------------------------------------------------------------------

// Full name: không trống, không toàn space, không số, không ký tự đặc biệt
const fullNameSchema = z
  .string()
  .trim()
  .min(1, { message: 'Họ và tên không được để trống' })
  .refine((val) => val.trim().length > 0, {
    message: 'Họ và tên không được chỉ chứa khoảng trắng',
  })
  .refine((val) => !/[0-9]/.test(val), {
    message: 'Họ và tên không được chứa chữ số',
  })
  .refine((val) => !/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~;']/.test(val), {
    message: 'Họ và tên không được chứa ký tự đặc biệt',
  });

// Username: min 5 ký tự (chỉ dùng khi create)
const usernameSchema = z
  .string()
  .trim()
  .min(5, { message: 'Tên đăng nhập phải có ít nhất 5 ký tự' });

// Email: tuỳ chọn — nếu có thì phải đúng format
const emailSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    { message: 'Email không đúng định dạng' },
  );

// Password: min 6, có số, có ký tự đặc biệt (chỉ dùng khi create)
const passwordSchema = z
  .string()
  .trim()
  .min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  .refine((val) => /[0-9]/.test(val), { message: 'Mật khẩu phải chứa ít nhất 1 chữ số' })
  .refine((val) => /[!@#$%^&*(),.?":{}|<>]/.test(val), {
    message: 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (ví dụ: !@#$)',
  });

// ---------------------------------------------------------------------------
// Schema tạo mới user — có username + password
// ---------------------------------------------------------------------------
export const createUserSchema = z.object({
  fullName: fullNameSchema,
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['Admin', 'Manager', 'Staff'], { message: 'Vui lòng chọn vai trò' }),
  gender: z.enum(['Male', 'Female', 'Other'], { message: 'Vui lòng chọn giới tính' }),
});

// ---------------------------------------------------------------------------
// Schema cập nhật user — KHÔNG có username, KHÔNG có password
// ---------------------------------------------------------------------------
export const updateUserSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  role: z.enum(['Admin', 'Manager', 'Staff'], { message: 'Vui lòng chọn vai trò' }),
  gender: z.enum(['Male', 'Female', 'Other'], { message: 'Vui lòng chọn giới tính' }),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
