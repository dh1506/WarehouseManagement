import { z } from 'zod';

export const warehouseFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Mã kho phải có ít nhất 2 ký tự')
    .max(20, 'Mã kho tối đa 20 ký tự')
    .regex(/^[A-Z0-9_-]+$/i, 'Mã kho chỉ được chứa chữ, số, gạch dưới hoặc gạch ngang'),
  name: z.string().trim().min(3, 'Tên kho quá ngắn').max(120, 'Tên kho tối đa 120 ký tự'),
  manager: z.string().trim().min(3, 'Vui lòng nhập người phụ trách').max(80, 'Tối đa 80 ký tự'),
  address: z.string().trim().min(8, 'Vui lòng nhập địa chỉ chi tiết').max(240, 'Tối đa 240 ký tự'),
  description: z.string().trim().max(500, 'Mô tả tối đa 500 ký tự'),
  capacityUsage: z.number().min(0, 'Công suất không hợp lệ').max(100, 'Công suất tối đa là 100%'),
  status: z.enum(['operational', 'maintenance', 'inactive']),
});

export const warehouseLocationFormSchema = z
  .object({
    warehouseId: z.string().trim().min(1, 'Vui lòng chọn kho'),
    code: z.string().trim().min(2, 'Mã vị trí phải có ít nhất 2 ký tự').max(30, 'Mã vị trí tối đa 30 ký tự'),
    zone: z.string().trim().min(1, 'Vui lòng nhập zone').max(20, 'Zone tối đa 20 ký tự'),
    aisle: z.string().trim().min(1, 'Vui lòng nhập aisle').max(20, 'Aisle tối đa 20 ký tự'),
    bin: z.string().trim().min(1, 'Vui lòng nhập bin').max(20, 'Bin tối đa 20 ký tự'),
    capacity: z.number().min(1, 'Sức chứa phải lớn hơn 0'),
    currentLoad: z.number().min(0, 'Tải hiện tại không hợp lệ'),
    productCount: z.number().min(0, 'Số SKU không hợp lệ'),
    status: z.enum(['active', 'blocked', 'inactive']),
  })
  .refine((data) => data.currentLoad <= data.capacity, {
    path: ['currentLoad'],
    message: 'Tải hiện tại không được vượt quá sức chứa',
  });

export type WarehouseFormData = z.infer<typeof warehouseFormSchema>;
export type WarehouseLocationFormData = z.infer<typeof warehouseLocationFormSchema>;
