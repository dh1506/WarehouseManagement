const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/services/product.service.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. imports
content = content.replace(
  'import { AppError } from "../utils/app-error";',
  'import { AppError } from "../utils/app-error";\nimport { generateProductSku } from "../utils/generate-code.util";'
);

// 2. getProducts where
content = content.replace(
  '  if (brand_id) {\n    where.brand_id = brand_id;\n  }',
  '  if (brand_id) {\n    where.brands = { some: { brand_id: brand_id } };\n  }'
);

content = content.replace(
  '  if (warehouse_id) {\n    where.warehouse_id = warehouse_id;\n  }',
  '  if (warehouse_id) {\n    where.warehouses = { some: { warehouse_id: warehouse_id } };\n  }'
);

content = content.replace(
  '        manufacturer: {\n          select: {\n            id: true,\n            code: true,\n            name: true,\n          },\n        },\n',
  ''
);

content = content.replace(
  '      manufacturer: {\n        select: {\n          id: true,\n          code: true,\n          name: true,\n        },\n      },\n',
  ''
);

const oldBrandSelect = `        brand: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },`;
const newBrandSelect = `        brands: {
          select: {
            brand: {
              select: { id: true, code: true, name: true }
            }
          }
        },`;
content = content.split(oldBrandSelect).join(newBrandSelect);

const oldWhSelect = `        warehouse: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },`;
const newWhSelect = `        warehouses: {
          select: {
            warehouse: {
              select: { id: true, code: true, name: true }
            }
          }
        },`;
content = content.split(oldWhSelect).join(newWhSelect);

const oldBrandSelectId = `      brand: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },`;
const newBrandSelectId = `      brands: {
        select: {
          brand: {
            select: { id: true, code: true, name: true }
          }
        }
      },`;
content = content.split(oldBrandSelectId).join(newBrandSelectId);

const oldWhSelectId = `      warehouse: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },`;
const newWhSelectId = `      warehouses: {
        select: {
          warehouse: {
            select: { id: true, code: true, name: true }
          }
        }
      },`;
content = content.split(oldWhSelectId).join(newWhSelectId);

content = content.split('product.categories.map((pc) => pc.category),').join('product.categories.map((pc) => pc.category),\n    brands: product.brands.map((pb) => pb.brand),\n    warehouses: product.warehouses.map((pw) => pw.warehouse),');
content = content.split('assigned_at: pc.assigned_at,\n    })),').join('assigned_at: pc.assigned_at,\n    })),\n    brands: product.brands.map((pb) => pb.brand),\n    warehouses: product.warehouses.map((pw) => pw.warehouse),');


// 5. Create Product modifications
let createProductStart = content.indexOf('export const createProduct = async');
let createProductEnd = content.indexOf('export const updateProduct = async');

let oldCreateFn = content.substring(createProductStart, createProductEnd);

let newCreateFn = `export const createProduct = async (data: CreateProductInput) => {
  // Kiểm tra đơn vị tính cơ sở tồn tại
  const baseUom = await prisma.unitOfMeasure.findUnique({
    where: { id: data.base_uom_id },
  });
  if (!baseUom) {
    throw new AppError("Đơn vị tính cơ sở không tồn tại", 400);
  }

  // Generate Product SKU Code
  const totalProducts = await prisma.product.count({
    where: { product_type: data.product_type ?? "GOODS" }
  });
  const firstBrandId = data.brand_ids && data.brand_ids.length > 0 ? data.brand_ids[0] : 0;
  const productCode = generateProductSku(data.product_type ?? "GOODS", firstBrandId, totalProducts + 1);

  // Tạo sản phẩm trong transaction
  const newProduct = await prisma.$transaction(async (tx) => {
    // Tạo sản phẩm
    const product = await tx.product.create({
      data: {
        code: productCode,
        name: data.name,
        description: data.description ?? null,
        product_type: data.product_type ?? "GOODS",
        base_uom_id: data.base_uom_id,
        has_batch: data.has_batch ?? false,
        production_date: data.production_date
          ? new Date(data.production_date)
          : null,
        expiry_date: data.expiry_date ? new Date(data.expiry_date) : null,
        min_stock: data.min_stock ?? null,
        max_stock: data.max_stock ?? null,
        storage_conditions: data.storage_conditions ?? null,
        image_url: data.image_url ?? null,
      },
    });

    if (data.brand_ids && data.brand_ids.length > 0) {
      await tx.brandProduct.createMany({
        data: data.brand_ids.map((id) => ({
          product_id: product.id,
          brand_id: id,
        })),
      });
    }

    if (data.warehouse_ids && data.warehouse_ids.length > 0) {
      await tx.productWarehouse.createMany({
        data: data.warehouse_ids.map((id) => ({
          product_id: product.id,
          warehouse_id: id,
        })),
      });
    }

    // Gán danh mục (nếu có)
    if (data.category_ids && data.category_ids.length > 0) {
      await tx.productCategoryMap.createMany({
        data: data.category_ids.map((categoryId) => ({
          product_id: product.id,
          category_id: categoryId,
        })),
      });
    }

    // Tạo đơn vị tính quy đổi (nếu có)
    if (data.uoms && data.uoms.length > 0) {
      await tx.productUom.createMany({
        data: data.uoms.map((uom) => ({
          product_id: product.id,
          uom_id: uom.uom_id,
          conversion_factor: uom.conversion_factor,
          is_default: uom.is_default ?? false,
        })),
      });
    }

    return product;
  });

  return getProductById(newProduct.id);
};

`;

content = content.replace(oldCreateFn, newCreateFn);

// 6. Update Product modifications
let updateProductStart = content.indexOf('export const updateProduct = async');
let oldUpdateFn = content.substring(updateProductStart);

let newUpdateFn = `export const updateProduct = async (id: number, data: UpdateProductInput) => {
  const existingProduct = await prisma.product.findUnique({
    where: { id },
  });
  if (!existingProduct) {
    throw new AppError("Không tìm thấy sản phẩm", 404);
  }

  if (data.base_uom_id) {
    const baseUom = await prisma.unitOfMeasure.findUnique({
      where: { id: data.base_uom_id },
    });
    if (!baseUom) {
      throw new AppError("Đơn vị tính cơ sở không tồn tại", 400);
    }
  }

  // Cập nhật trong transaction
  await prisma.$transaction(async (tx) => {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.product_type !== undefined) updateData.product_type = data.product_type;
    if (data.product_status !== undefined) updateData.product_status = data.product_status;
    if (data.base_uom_id !== undefined) updateData.base_uom_id = data.base_uom_id;
    if (data.has_batch !== undefined) updateData.has_batch = data.has_batch;
    if (data.production_date !== undefined) updateData.production_date = data.production_date ? new Date(data.production_date) : null;
    if (data.expiry_date !== undefined) updateData.expiry_date = data.expiry_date ? new Date(data.expiry_date) : null;
    if (data.min_stock !== undefined) updateData.min_stock = data.min_stock;
    if (data.max_stock !== undefined) updateData.max_stock = data.max_stock;
    if (data.storage_conditions !== undefined) updateData.storage_conditions = data.storage_conditions;
    if (data.image_url !== undefined) updateData.image_url = data.image_url;

    if (Object.keys(updateData).length > 0) {
      await tx.product.update({
        where: { id },
        data: updateData,
      });
    }

    if (data.brand_ids !== undefined) {
      await tx.brandProduct.deleteMany({ where: { product_id: id } });
      if (data.brand_ids.length > 0) {
        await tx.brandProduct.createMany({
          data: data.brand_ids.map((bid) => ({ product_id: id, brand_id: bid })),
        });
      }
    }

    if (data.warehouse_ids !== undefined) {
      await tx.productWarehouse.deleteMany({ where: { product_id: id } });
      if (data.warehouse_ids.length > 0) {
        await tx.productWarehouse.createMany({
          data: data.warehouse_ids.map((wid) => ({ product_id: id, warehouse_id: wid })),
        });
      }
    }

    if (data.category_ids !== undefined) {
      await tx.productCategoryMap.deleteMany({
        where: { product_id: id },
      });

      if (data.category_ids.length > 0) {
        await tx.productCategoryMap.createMany({
          data: data.category_ids.map((categoryId) => ({
            product_id: id,
            category_id: categoryId,
          })),
        });
      }
    }

    if (data.uoms !== undefined) {
      await tx.productUom.deleteMany({
        where: { product_id: id },
      });

      if (data.uoms.length > 0) {
        await tx.productUom.createMany({
          data: data.uoms.map((uom) => ({
            product_id: id,
            uom_id: uom.uom_id,
            conversion_factor: uom.conversion_factor,
            is_default: uom.is_default ?? false,
          })),
        });
      }
    }
  });

  return getProductById(id);
};
`;

content = content.replace(oldUpdateFn, newUpdateFn);

fs.writeFileSync(filePath, content);
console.log('Update Complete.');
