import { z } from "zod";

const ruleSourceEnum = z.enum(["DIRECT", "INHERITED", "OVERRIDE"]);

export const getLocationAllowedCategoriesQuerySchema = z.object({
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
    location_id: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    category_id: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    is_allowed: z
      .string()
      .optional()
      .transform((val) => (val !== undefined ? val === "true" : undefined)),
    rule_source: ruleSourceEnum.optional(),
  }),
});

export const locationAllowedCategoryParamSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive("ID phải là số nguyên dương")),
  }),
});

export const createLocationAllowedCategorySchema = z.object({
  body: z.object({
    location_id: z.number().int().positive("ID vị trí kho phải là số nguyên dương"),
    category_id: z.number().int().positive("ID danh mục không hợp lệ"),
    is_allowed: z.boolean().optional(),
    rule_source: ruleSourceEnum.optional(),
    inherit_from_parent: z.boolean().optional(),
    priority: z.number().int().optional(),
    effective_from: z.string().datetime({ message: "Định dạng thời gian không hợp lệ" }).optional(),
    effective_to: z.string().datetime({ message: "Định dạng thời gian không hợp lệ" }).optional().nullable(),
    note: z.string().max(1000).optional().nullable(),
  }),
});

export const updateLocationAllowedCategorySchema = z.object({
  params: locationAllowedCategoryParamSchema.shape.params,
  body: z.object({
    is_allowed: z.boolean().optional(),
    rule_source: ruleSourceEnum.optional(),
    inherit_from_parent: z.boolean().optional(),
    priority: z.number().int().optional(),
    effective_from: z.string().datetime({ message: "Định dạng thời gian không hợp lệ" }).optional(),
    effective_to: z.string().datetime({ message: "Định dạng thời gian không hợp lệ" }).optional().nullable(),
    note: z.string().max(1000).optional().nullable(),
  }),
});

export type GetLocationAllowedCategoriesQuery = z.infer<typeof getLocationAllowedCategoriesQuerySchema>["query"];
export type CreateLocationAllowedCategoryInput = z.infer<typeof createLocationAllowedCategorySchema>["body"];
export type UpdateLocationAllowedCategoryInput = z.infer<typeof updateLocationAllowedCategorySchema>["body"];
