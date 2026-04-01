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

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập họ tên'),
  email: z.string().email('Email không đúng định dạng'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;
