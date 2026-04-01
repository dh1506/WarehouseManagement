import { z } from 'zod';

export const supplierStatusSchema = z.enum(['active', 'inactive']);

export const supplierFilterSchema = z.object({
  search: z.string().trim().max(100).optional().default(''),
  status: z.union([supplierStatusSchema, z.literal('all')]).default('all'),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
});

export const supplierFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Mã nhà cung cấp là bắt buộc.')
    .max(50, 'Mã nhà cung cấp tối đa 50 ký tự.'),
  name: z
    .string()
    .trim()
    .min(1, 'Tên nhà cung cấp là bắt buộc.')
    .max(100, 'Tên nhà cung cấp tối đa 100 ký tự.'),
  contactPerson: z.string().trim().max(100, 'Người liên hệ tối đa 100 ký tự.'),
  phone: z.string().trim().max(20, 'Số điện thoại tối đa 20 ký tự.'),
  email: z
    .string()
    .trim()
    .max(255, 'Email tối đa 255 ký tự.')
    .refine((value) => value.length === 0 || z.email().safeParse(value).success, {
      message: 'Email không hợp lệ.',
    }),
  address: z.string().trim().max(500, 'Địa chỉ tối đa 500 ký tự.'),
  status: supplierStatusSchema,
});

export type SupplierFilterValues = z.infer<typeof supplierFilterSchema>;
export type SupplierFormData = z.infer<typeof supplierFormSchema>;
