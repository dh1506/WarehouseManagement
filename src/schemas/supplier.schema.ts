import { z } from 'zod';

// Schema lấy danh sách nhà cung cấp (query params)
export const getSuppliersQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .pipe(z.number().int().positive('Số trang phải lớn hơn 0')),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10))
      .pipe(z.number().int().min(1).max(100, 'Giới hạn tối đa 100 bản ghi')),
    search: z.string().optional(),
    is_active: z
      .string()
      .optional()
      .transform((val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return undefined;
      }),
  }),
});

// Schema lấy chi tiết nhà cung cấp (params)
export const getSupplierByIdParamSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive('ID phải là số nguyên dương')),
  }),
});

// Schema tạo mới nhà cung cấp
export const createSupplierSchema = z.object({
  body: z.object({
    code: z
      .string()
      .min(1, 'Mã nhà cung cấp không được để trống')
      .max(50, 'Mã nhà cung cấp tối đa 50 ký tự')
      .transform((val) => val.toUpperCase()),
    name: z
      .string()
      .min(1, 'Tên nhà cung cấp không được để trống')
      .max(100, 'Tên nhà cung cấp tối đa 100 ký tự'),
    contact_person: z.string().max(100, 'Tên người liên hệ tối đa 100 ký tự').optional(),
    phone: z.string().max(20, 'Số điện thoại tối đa 20 ký tự').optional(),
    email: z.string().email('Email không hợp lệ').optional(),
    address: z.string().max(500, 'Địa chỉ tối đa 500 ký tự').optional(),
    is_active: z.boolean().optional(),
  }),
});

// Schema cập nhật nhà cung cấp
export const updateSupplierSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive('ID phải là số nguyên dương')),
  }),
  body: z.object({
    code: z
      .string()
      .min(1, 'Mã nhà cung cấp không được để trống')
      .max(50, 'Mã nhà cung cấp tối đa 50 ký tự')
      .transform((val) => val.toUpperCase())
      .optional(),
    name: z
      .string()
      .min(1, 'Tên nhà cung cấp không được để trống')
      .max(100, 'Tên nhà cung cấp tối đa 100 ký tự')
      .optional(),
    contact_person: z.string().max(100, 'Tên người liên hệ tối đa 100 ký tự').optional().nullable(),
    phone: z.string().max(20, 'Số điện thoại tối đa 20 ký tự').optional().nullable(),
    email: z.string().email('Email không hợp lệ').optional().nullable(),
    address: z.string().max(500, 'Địa chỉ tối đa 500 ký tự').optional().nullable(),
    is_active: z.boolean().optional(),
  }),
});

export type GetSuppliersQuery = z.infer<typeof getSuppliersQuerySchema>['query'];
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>['body'];
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>['body'];
