import { z } from 'zod';

// Schema lấy danh sách roles (query params)
export const getRolesQuerySchema = z.object({
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

// Schema lấy chi tiết role (params)
export const getRoleByIdParamSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive('ID phải là số nguyên dương')),
  }),
});

// Schema tạo mới role
export const createRoleSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, 'Tên vai trò không được để trống')
      .max(50, 'Tên vai trò tối đa 50 ký tự')
      .transform((val) => val.toUpperCase()),
    description: z.string().max(255, 'Mô tả tối đa 255 ký tự').optional(),
    is_active: z.boolean().optional(),
  }),
});

// Schema cập nhật role
export const updateRoleSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive('ID phải là số nguyên dương')),
  }),
  body: z.object({
    name: z
      .string()
      .min(1, 'Tên vai trò không được để trống')
      .max(50, 'Tên vai trò tối đa 50 ký tự')
      .transform((val) => val.toUpperCase())
      .optional(),
    description: z.string().max(255, 'Mô tả tối đa 255 ký tự').optional().nullable(),
    is_active: z.boolean().optional(),
  }),
});

// Schema gán permissions cho role
export const assignPermissionsSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive('ID phải là số nguyên dương')),
  }),
  body: z.object({
    permission_ids: z
      .array(z.number().int().positive('ID permission phải là số nguyên dương'))
      .min(1, 'Danh sách permission không được rỗng'),
  }),
});

export type GetRolesQuery = z.infer<typeof getRolesQuerySchema>['query'];
export type CreateRoleInput = z.infer<typeof createRoleSchema>['body'];
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>['body'];
export type AssignPermissionsInput = z.infer<typeof assignPermissionsSchema>['body'];
