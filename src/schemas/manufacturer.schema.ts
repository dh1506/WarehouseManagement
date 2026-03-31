import { z } from 'zod';

// Schema lấy danh sách nhà sản xuất (query params)
export const getManufacturersQuerySchema = z.object({
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

// Schema lấy chi tiết nhà sản xuất (params)
export const getManufacturerByIdParamSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive('ID phải là số nguyên dương')),
  }),
});

// Schema tạo mới nhà sản xuất
export const createManufacturerSchema = z.object({
  body: z.object({
    code: z
      .string()
      .min(1, 'Mã nhà sản xuất không được để trống')
      .max(50, 'Mã nhà sản xuất tối đa 50 ký tự')
      .transform((val) => val.toUpperCase()),
    name: z
      .string()
      .min(1, 'Tên nhà sản xuất không được để trống')
      .max(100, 'Tên nhà sản xuất tối đa 100 ký tự'),
    is_active: z.boolean().optional(),
  }),
});

// Schema cập nhật nhà sản xuất
export const updateManufacturerSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive('ID phải là số nguyên dương')),
  }),
  body: z.object({
    code: z
      .string()
      .min(1, 'Mã nhà sản xuất không được để trống')
      .max(50, 'Mã nhà sản xuất tối đa 50 ký tự')
      .transform((val) => val.toUpperCase())
      .optional(),
    name: z
      .string()
      .min(1, 'Tên nhà sản xuất không được để trống')
      .max(100, 'Tên nhà sản xuất tối đa 100 ký tự')
      .optional(),
    is_active: z.boolean().optional(),
  }),
});

export type GetManufacturersQuery = z.infer<typeof getManufacturersQuerySchema>['query'];
export type CreateManufacturerInput = z.infer<typeof createManufacturerSchema>['body'];
export type UpdateManufacturerInput = z.infer<typeof updateManufacturerSchema>['body'];
