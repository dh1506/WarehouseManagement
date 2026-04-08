import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string()
    .trim()
    .min(5, { message: 'Tên đăng nhập không được để trống' }),
  password: z.string()
    .trim()
    .min(1, { message: 'Mật khẩu không được để trống' })
    .min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
    .refine((val) => /[0-9]/.test(val), { message: 'Mật khẩu phải chứa ít nhất 1 chữ số' })
    .refine((val) => /[!@#$%^&*(),.?":{}|<>]/.test(val), { message: 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (ví dụ: !@#$)' })
});

export type LoginFormData = z.infer<typeof loginSchema>;
