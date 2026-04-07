import { z } from "zod";

// Enum cho validation
const productTypeEnum = z.enum(["GOODS", "MATERIAL", "CONSUMABLE"]);
const productStatusEnum = z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED"]);

// Schema lấy danh sách sản phẩm (query params)
export const getProductsQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .pipe(z.number().int().positive("Số trang phải lớn hơn 0")),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10))
      .pipe(z.number().int().min(1).max(100, "Giới hạn tối đa 100 bản ghi")),
    search: z.string().optional(),
    category_id: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .pipe(z.number().int().positive().optional()),
    product_type: productTypeEnum.optional(),
    product_status: productStatusEnum.optional(),
    brand_id: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .pipe(z.number().int().positive().optional()),
    warehouse_id: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .pipe(z.number().int().positive().optional()),
    production_date_from: z
      .string()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined))
      .pipe(z.date().optional()),
    production_date_to: z
      .string()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined))
      .pipe(z.date().optional()),
    expiry_date_from: z
      .string()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined))
      .pipe(z.date().optional()),
    expiry_date_to: z
      .string()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined))
      .pipe(z.date().optional()),
  }),
});

// Schema lấy chi tiết sản phẩm (params)
export const getProductByIdParamSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive("ID phải là số nguyên dương")),
  }),
});

// Schema cho đơn vị tính quy đổi khi tạo/cập nhật sản phẩm
const productUomSchema = z.object({
  uom_id: z.number().int().positive("ID đơn vị tính phải là số nguyên dương"),
  conversion_factor: z.number().positive("Hệ số quy đổi phải lớn hơn 0"),
  is_default: z.boolean().optional(),
});

// Schema tạo mới sản phẩm
export const createProductSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, "Tên sản phẩm không được để trống")
      .max(200, "Tên sản phẩm tối đa 200 ký tự"),
    description: z.string().optional(),
    product_type: productTypeEnum.optional(),
    brand_ids: z
      .array(z.number().int().positive("ID thương hiệu phải là số nguyên dương"))
      .optional(),
    base_uom_id: z.number().int().positive("ID đơn vị tính cơ sở là bắt buộc"),
    warehouse_ids: z
      .array(z.number().int().positive("ID kho phải là số nguyên dương"))
      .optional(),
    has_batch: z.boolean().optional(),
    production_date: z.string().datetime().optional(),
    expiry_date: z.string().datetime().optional(),
    min_stock: z
      .number()
      .nonnegative("Tồn kho tối thiểu không được âm")
      .optional(),
    max_stock: z
      .number()
      .nonnegative("Tồn kho tối đa không được âm")
      .optional(),
    storage_conditions: z
      .string()
      .max(255, "Điều kiện bảo quản tối đa 255 ký tự")
      .optional(),
    image_url: z.string().url("URL hình ảnh không hợp lệ").optional(),
    // Mảng danh mục gán cho sản phẩm
    category_ids: z
      .array(z.number().int().positive("ID danh mục phải là số nguyên dương"))
      .optional(),
    // Mảng đơn vị tính quy đổi
    uoms: z.array(productUomSchema).optional(),
  }),
});

// Schema cập nhật sản phẩm
export const updateProductSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive("ID phải là số nguyên dương")),
  }),
  body: z.object({
    name: z
      .string()
      .min(1, "Tên sản phẩm không được để trống")
      .max(200, "Tên sản phẩm tối đa 200 ký tự")
      .optional(),
    description: z.string().optional().nullable(),
    product_type: productTypeEnum.optional(),
    product_status: productStatusEnum.optional(),
    brand_ids: z
      .array(z.number().int().positive("ID thương hiệu phải là số nguyên dương"))
      .optional(),
    base_uom_id: z
      .number()
      .int()
      .positive("ID đơn vị tính cơ sở phải là số nguyên dương")
      .optional(),
    warehouse_ids: z
      .array(z.number().int().positive("ID kho phải là số nguyên dương"))
      .optional(),
    has_batch: z.boolean().optional(),
    production_date: z.string().datetime().optional().nullable(),
    expiry_date: z.string().datetime().optional().nullable(),
    min_stock: z
      .number()
      .nonnegative("Tồn kho tối thiểu không được âm")
      .optional()
      .nullable(),
    max_stock: z
      .number()
      .nonnegative("Tồn kho tối đa không được âm")
      .optional()
      .nullable(),
    storage_conditions: z
      .string()
      .max(255, "Điều kiện bảo quản tối đa 255 ký tự")
      .optional()
      .nullable(),
    image_url: z
      .string()
      .url("URL hình ảnh không hợp lệ")
      .optional()
      .nullable(),
    // Cập nhật lại danh mục (thay thế toàn bộ)
    category_ids: z
      .array(z.number().int().positive("ID danh mục phải là số nguyên dương"))
      .optional(),
    // Cập nhật lại đơn vị tính quy đổi (thay thế toàn bộ)
    uoms: z.array(productUomSchema).optional(),
  }),
});

export type GetProductsQuery = z.infer<typeof getProductsQuerySchema>["query"];
export type CreateProductInput = z.infer<typeof createProductSchema>["body"];
export type UpdateProductInput = z.infer<typeof updateProductSchema>["body"];
export type ProductUomInput = z.infer<typeof productUomSchema>;
