import { z } from 'zod';

// ==========================================
// Schema lấy danh sách permissions (query params)
// ==========================================
export const getPermissionsQuerySchema = z.object({
  query: z.object({
    module: z.string().optional(),
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

// ==========================================
// Export types
// ==========================================
export type GetPermissionsQuery = z.infer<typeof getPermissionsQuerySchema>['query'];
