import { z } from 'zod';
import type { ProductCategory } from '../types/categoryType';

export function buildCategoryFormSchema(
  categories: ProductCategory[],
  currentCategoryId?: string | null,
) {
  return z
    .object({
      code: z
        .string()
        .trim()
        .min(1, 'Category code is required')
        .max(50, 'Category code must be 50 characters or fewer'),
      name: z
        .string()
        .trim()
        .min(1, 'Category name is required')
        .max(100, 'Category name must be 100 characters or fewer'),
      description: z
        .string()
        .trim()
        .max(255, 'Description must be 255 characters or fewer'),
      parentId: z.string().nullable(),
    })
    .superRefine((value, ctx) => {
      const normalizedCode = value.code.trim().toUpperCase();
      const normalizedName = value.name.trim().toLowerCase();

      const duplicateCode = categories.find(
        (category) =>
          category.id !== currentCategoryId &&
          category.code.trim().toUpperCase() === normalizedCode,
      );

      if (duplicateCode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['code'],
          message: 'Category code already exists',
        });
      }

      const duplicateName = categories.find(
        (category) =>
          category.id !== currentCategoryId &&
          category.name.trim().toLowerCase() === normalizedName,
      );

      if (duplicateName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['name'],
          message: 'Category name already exists',
        });
      }

      if (!value.parentId || !currentCategoryId) {
        return;
      }

      if (value.parentId === currentCategoryId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['parentId'],
          message: 'A category cannot be its own parent',
        });
        return;
      }

      const childrenMap = new Map<string | null, ProductCategory[]>();

      for (const category of categories) {
        const key = category.parentId;
        const currentChildren = childrenMap.get(key) ?? [];
        currentChildren.push(category);
        childrenMap.set(key, currentChildren);
      }

      const descendantIds = new Set<string>();
      const stack = [...(childrenMap.get(currentCategoryId) ?? [])];

      while (stack.length > 0) {
        const child = stack.pop();

        if (!child) {
          continue;
        }

        if (descendantIds.has(child.id)) {
          continue;
        }

        descendantIds.add(child.id);
        const nextChildren = childrenMap.get(child.id) ?? [];
        stack.push(...nextChildren);
      }

      if (descendantIds.has(value.parentId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['parentId'],
          message: 'A child category cannot be selected as the parent',
        });
      }
    });
}

export const categoryFilterSchema = z.object({
  search: z.string().optional(),
});

export type CategoryFilterData = z.infer<typeof categoryFilterSchema>;
