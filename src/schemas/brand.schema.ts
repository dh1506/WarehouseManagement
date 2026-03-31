import { z } from 'zod';

// Schema lấy danh sách thương hiệu (query params)
export const getBrandsQuerySchema = z.object({
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

// Schema lấy chi tiết thương hiệu (params)
export const getBrandByIdParamSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive('ID phải là số nguyên dương')),
  }),
});

// Schema tạo mới thương hiệu
export const createBrandSchema = z.object({
  body: z.object({
    code: z
      .string()
      .min(1, 'Mã thương hiệu không được để trống')
      .max(50, 'Mã thương hiệu tối đa 50 ký tự')
      .transform((val) => val.toUpperCase()),
    name: z
      .string()
      .min(1, 'Tên thương hiệu không được để trống')
      .max(100, 'Tên thương hiệu tối đa 100 ký tự'),
    is_active: z.boolean().optional(),
  }),
});

// Schema cập nhật thương hiệu
export const updateBrandSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive('ID phải là số nguyên dương')),
  }),
  body: z.object({
    code: z
      .string()
      .min(1, 'Mã thương hiệu không được để trống')
      .max(50, 'Mã thương hiệu tối đa 50 ký tự')
      .transform((val) => val.toUpperCase())
      .optional(),
    name: z
      .string()
      .min(1, 'Tên thương hiệu không được để trống')
      .max(100, 'Tên thương hiệu tối đa 100 ký tự')
      .optional(),
    is_active: z.boolean().optional(),
  }),
});

export type GetBrandsQuery = z.infer<typeof getBrandsQuerySchema>['query'];
export type CreateBrandInput = z.infer<typeof createBrandSchema>['body'];
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>['body'];
