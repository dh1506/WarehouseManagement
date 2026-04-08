import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared field validators
// ---------------------------------------------------------------------------

const vietnamPhoneRegex = /^(\+84|0)(3|5|7|8|9)\d{8}$/;

// Full name: chỉ cần không rỗng, không chỉ toàn khoảng trắng, và tự trim
const fullNameSchema = z
  .string()
  .trim()
  .min(1, { message: 'Họ và tên không được để trống' })
  .refine((val) => val.length > 0, {
    message: 'Họ và tên không được chỉ chứa khoảng trắng',
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

const phoneSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (val) => !val || vietnamPhoneRegex.test(val),
    { message: 'Số điện thoại phải đúng chuẩn Việt Nam (VD: 09xxxxxxxx hoặc +849xxxxxxxx)' },
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
  phone: phoneSchema,
  password: passwordSchema,
  role: z.string().trim().min(1, { message: 'Vui lòng chọn vai trò' }),
});

// ---------------------------------------------------------------------------
// Schema cập nhật user — KHÔNG có username, KHÔNG có password
// ---------------------------------------------------------------------------
export const updateUserSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  role: z.string().trim().min(1, { message: 'Vui lòng chọn vai trò' }),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
