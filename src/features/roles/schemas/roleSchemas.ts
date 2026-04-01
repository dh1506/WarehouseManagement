import { z } from 'zod';

export const ROLE_NAME_OPTIONS = ['CEO', 'MANAGER', 'STAFF'] as const;

export const createRoleFormSchema = z.object({
  name: z.enum(ROLE_NAME_OPTIONS, {
    message: 'Vai tro chi duoc phep la CEO, MANAGER hoac STAFF',
  }),
  description: z
    .string()
    .trim()
    .max(255, 'Mo ta toi da 255 ky tu')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean(),
});

export const updateRoleFormSchema = z.object({
  name: z.enum(ROLE_NAME_OPTIONS, {
    message: 'Vai tro chi duoc phep la CEO, MANAGER hoac STAFF',
  }),
  description: z
    .string()
    .trim()
    .max(255, 'Mo ta toi da 255 ky tu')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean(),
});

export type CreateRoleFormData = z.infer<typeof createRoleFormSchema>;
export type UpdateRoleFormData = z.infer<typeof updateRoleFormSchema>;
