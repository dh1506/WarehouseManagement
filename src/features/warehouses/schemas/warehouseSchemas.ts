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

export const warehouseHubFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Mã kho phải có ít nhất 2 ký tự')
    .max(20, 'Mã kho tối đa 20 ký tự')
    .regex(/^[A-Z0-9_-]+$/i, 'Mã kho chỉ được chứa chữ, số, gạch dưới hoặc gạch ngang'),
  name: z.string().trim().min(3, 'Tên kho quá ngắn').max(120, 'Tên kho tối đa 120 ký tự'),
  location: z.string().trim().min(3, 'Vui lòng nhập khu vực kho').max(120, 'Tối đa 120 ký tự'),
  tier: z.string().trim().min(2, 'Tier tối thiểu 2 ký tự').max(40, 'Tier tối đa 40 ký tự'),
  totalSpace: z.number().min(1000, 'Tổng dung tích phải lớn hơn 1000 m3'),
  usedCapacity: z.number().min(0, 'Dung tích sử dụng không hợp lệ').max(100, 'Dung tích tối đa là 100%'),
});

export const warehouseZoneFormSchema = z.object({
  code: z.string().trim().min(2, 'Mã khu vực quá ngắn').max(20, 'Mã khu vực tối đa 20 ký tự'),
  name: z.string().trim().min(3, 'Tên khu vực quá ngắn').max(120, 'Tên khu vực tối đa 120 ký tự'),
  type: z.string().trim().min(2, 'Vui lòng nhập loại khu vực').max(60, 'Loại khu vực tối đa 60 ký tự'),
  rows: z.number().int().min(1, 'Rows tối thiểu là 1').max(60, 'Rows tối đa là 60'),
  shelves: z.number().int().min(1, 'Shelves tối thiểu là 1').max(60, 'Shelves tối đa là 60'),
  levels: z.number().int().min(1, 'Levels tối thiểu là 1').max(20, 'Levels tối đa là 20'),
  occupancy: z.number().min(0, 'Occupancy không hợp lệ').max(100, 'Occupancy tối đa là 100%'),
});

export const binCapacityFormSchema = z
  .object({
    capacity: z.number().int().min(1, 'Sức chứa phải lớn hơn 0'),
    currentLoad: z.number().int().min(0, 'Tải hiện tại không hợp lệ'),
    items: z.number().int().min(0, 'Số lượng kiện không hợp lệ'),
    productCount: z.number().int().min(0, 'Số SKU không hợp lệ'),
  })
  .refine((data) => data.currentLoad <= data.capacity, {
    path: ['currentLoad'],
    message: 'Tải hiện tại không được vượt quá sức chứa',
  });

export type WarehouseFormData = z.infer<typeof warehouseFormSchema>;
export type WarehouseLocationFormData = z.infer<typeof warehouseLocationFormSchema>;
export type WarehouseHubFormData = z.infer<typeof warehouseHubFormSchema>;
export type WarehouseZoneFormData = z.infer<typeof warehouseZoneFormSchema>;
export type BinCapacityFormData = z.infer<typeof binCapacityFormSchema>;
