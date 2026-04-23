import { z } from 'zod';

export const salesTransactionTypeEnum = z.enum(['SALE', 'RETURN']);

export const importSalesRowSchema = z.object({
  transaction_code: z.string().min(1, 'Mã giao dịch không được để trống'),
  transaction_type: salesTransactionTypeEnum,
  transaction_date: z.union([z.string(), z.date()]).transform((val) => new Date(val)),
  product_id: z.coerce.number().int().positive('ID sản phẩm không hợp lệ'),
  warehouse_location_id: z.coerce.number().int().positive('ID điểm bán không hợp lệ'),
  quantity: z.coerce.number().positive('Số lượng phải lớn hơn 0'),
  unit_price: z.coerce.number().min(0, 'Đơn giá không được âm'),
  promo_discount_amount: z.coerce.number().min(0, 'Khuyến mãi không được âm').default(0),
});

export const querySalesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  warehouse_location_id: z.coerce.number().int().positive().optional(),
  product_id: z.coerce.number().int().positive().optional(),
});

