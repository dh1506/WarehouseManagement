import { z } from 'zod';

// Schema lấy danh sách danh mục sản phẩm (query params)
export const getProductCategoriesQuerySchema = z.object({
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
    parent_id: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .pipe(z.number().int().positive('ID danh mục cha phải là số nguyên dương').optional()),
  }),
});

// Schema lấy chi tiết danh mục (params)
export const getProductCategoryByIdParamSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive('ID phải là số nguyên dương')),
  }),
});

// Schema tạo mới danh mục sản phẩm
export const createProductCategorySchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, 'Tên danh mục không được để trống')
      .max(100, 'Tên danh mục tối đa 100 ký tự'),
    description: z.string().max(255, 'Mô tả tối đa 255 ký tự').optional(),
    parent_id: z.number().int().positive('ID danh mục cha phải là số nguyên dương').optional(),
  }),
});

// Schema cập nhật danh mục sản phẩm
export const updateProductCategorySchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive('ID phải là số nguyên dương')),
  }),
  body: z.object({
    name: z
      .string()
      .min(1, 'Tên danh mục không được để trống')
      .max(100, 'Tên danh mục tối đa 100 ký tự')
      .optional(),
    description: z.string().max(255, 'Mô tả tối đa 255 ký tự').optional().nullable(),
    parent_id: z.number().int().positive('ID danh mục cha phải là số nguyên dương').optional().nullable(),
  }),
});

// Schema xóa danh mục sản phẩm (params)
export const deleteProductCategorySchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive('ID phải là số nguyên dương')),
  }),
});

export type GetProductCategoriesQuery = z.infer<typeof getProductCategoriesQuerySchema>['query'];
export type CreateProductCategoryInput = z.infer<typeof createProductCategorySchema>['body'];
export type UpdateProductCategoryInput = z.infer<typeof updateProductCategorySchema>['body'];
