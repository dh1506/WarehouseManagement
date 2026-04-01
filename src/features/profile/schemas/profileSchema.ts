import { z } from 'zod';

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z
      .string()
      .min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự')
      .regex(/[a-zA-Z]/, 'Phải chứa ít nhất một chữ cái')
      .regex(/[0-9]/, 'Phải chứa ít nhất một số')
      .refine((val) => /[!@#$%^&*(),.?":{}|<>]/.test(val), { message: 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (ví dụ: !@#$)' }),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

const vietnamPhoneRegex = /^(\+84|0)(3|5|7|8|9)\d{8}$/;

const optionalPhoneSchema = z.preprocess(
  (value) => {
    if (typeof value !== 'string') {
      return value;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  },
  z
    .string()
    .regex(vietnamPhoneRegex, 'Số điện thoại phải đúng chuẩn Việt Nam (VD: 09xxxxxxxx hoặc +849xxxxxxxx)')
    .optional()
);

const optionalTextSchema = z.preprocess(
  (value) => {
    if (typeof value !== 'string') {
      return value;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  },
  z.string().optional()
);

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập họ tên'),
  email: z.string().trim().email('Email không đúng định dạng'),
  phone: optionalPhoneSchema,
  address: optionalTextSchema,
});

export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;
