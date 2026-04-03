import { z } from 'zod';

export const productReferenceFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Mã tham chiếu phải có ít nhất 2 ký tự')
    .max(20, 'Mã tham chiếu tối đa 20 ký tự')
    .regex(/^[A-Z0-9_-]+$/i, 'Mã chỉ được chứa chữ, số, gạch dưới hoặc gạch ngang'),
  name: z.string().trim().min(2, 'Tên không được quá ngắn').max(80, 'Tên tối đa 80 ký tự'),
  description: z.string().trim().max(240, 'Mô tả tối đa 240 ký tự'),
  status: z.enum(['active', 'inactive']),
  contactPerson: z.string().trim().max(100, 'Contact person must be 100 characters or fewer').optional(),
  phone: z.string().trim().max(20, 'Phone number must be 20 characters or fewer').optional(),
  email: z.union([z.literal(''), z.string().trim().email('Invalid email address')]).optional(),
  address: z.string().trim().max(500, 'Address must be 500 characters or fewer').optional(),
});

export type ProductReferenceFormData = z.infer<typeof productReferenceFormSchema>;
