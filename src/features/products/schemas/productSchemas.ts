import { z } from 'zod';

export const productFormSchema = z
  .object({
    sku: z
      .string()
      .trim()
      .min(3, 'SKU phải có ít nhất 3 ký tự')
      .max(32, 'SKU tối đa 32 ký tự')
      .regex(/^[A-Z0-9_-]+$/i, 'SKU chỉ được chứa chữ, số, gạch dưới hoặc gạch ngang'),
    name: z.string().trim().min(3, 'Tên sản phẩm quá ngắn').max(120, 'Tên sản phẩm tối đa 120 ký tự'),
    categoryId: z.string().trim().min(1, 'Vui lòng chọn danh mục'),
    unitId: z.string().trim().min(1, 'Vui lòng chọn đơn vị tính'),
    brandId: z.string().trim().min(1, 'Vui lòng chọn thương hiệu'),
    manufacturerId: z.string().trim().min(1, 'Vui lòng chọn nhà sản xuất'),
    minStock: z.number().min(0, 'Tồn tối thiểu không hợp lệ'),
    maxStock: z.number().min(1, 'Tồn tối đa phải lớn hơn 0'),
    trackedByLot: z.boolean(),
    trackedByExpiry: z.boolean(),
    status: z.enum(['active', 'inactive', 'draft']),
    description: z.string().trim().max(500, 'Mô tả tối đa 500 ký tự'),
  })
  .refine((data) => data.maxStock >= data.minStock, {
    path: ['maxStock'],
    message: 'Tồn tối đa phải lớn hơn hoặc bằng tồn tối thiểu',
  });

export type ProductFormData = z.infer<typeof productFormSchema>;
