import { z } from 'zod';

// Enum UomType cho validation
const uomTypeEnum = z.enum(['WEIGHT', 'VOLUME', 'LENGTH', 'QUANTITY', 'PACK']);

// Schema lấy danh sách đơn vị tính (query params)
export const getUnitsOfMeasureQuerySchema = z.object({
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
    uom_type: uomTypeEnum.optional(),
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

// Schema lấy chi tiết đơn vị tính (params)
export const getUnitOfMeasureByIdParamSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive('ID phải là số nguyên dương')),
  }),
});

// Schema tạo mới đơn vị tính
export const createUnitOfMeasureSchema = z.object({
  body: z.object({
    code: z
      .string()
      .min(1, 'Mã đơn vị tính không được để trống')
      .max(20, 'Mã đơn vị tính tối đa 20 ký tự')
      .transform((val) => val.toUpperCase()),
    name: z
      .string()
      .min(1, 'Tên đơn vị tính không được để trống')
      .max(50, 'Tên đơn vị tính tối đa 50 ký tự'),
    uom_type: uomTypeEnum,
    is_active: z.boolean().optional(),
  }),
});

// Schema cập nhật đơn vị tính
export const updateUnitOfMeasureSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive('ID phải là số nguyên dương')),
  }),
  body: z.object({
    code: z
      .string()
      .min(1, 'Mã đơn vị tính không được để trống')
      .max(20, 'Mã đơn vị tính tối đa 20 ký tự')
      .transform((val) => val.toUpperCase())
      .optional(),
    name: z
      .string()
      .min(1, 'Tên đơn vị tính không được để trống')
      .max(50, 'Tên đơn vị tính tối đa 50 ký tự')
      .optional(),
    uom_type: uomTypeEnum.optional(),
    is_active: z.boolean().optional(),
  }),
});

export type GetUnitsOfMeasureQuery = z.infer<typeof getUnitsOfMeasureQuerySchema>['query'];
export type CreateUnitOfMeasureInput = z.infer<typeof createUnitOfMeasureSchema>['body'];
export type UpdateUnitOfMeasureInput = z.infer<typeof updateUnitOfMeasureSchema>['body'];
