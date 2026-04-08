import { prisma } from "../config/db.config";
import { AppError } from "../utils/app-error";
import { generateProductSku } from "../utils/generate-code.util";
import type {
  GetProductsQuery,
  CreateProductInput,
  UpdateProductInput,
} from "../schemas/product.schema";

/**
 * Lấy danh sách sản phẩm với phân trang, tìm kiếm, lọc đa tiêu chí
 */
export const getProducts = async (query: GetProductsQuery) => {
  const {
    page,
    limit,
    search,
    category_id,
    product_type,
    product_status,
    brand_id,
    warehouse_id,
    production_date_from,
    production_date_to,
    expiry_date_from,
    expiry_date_to,
  } = query;
  const skip = (page - 1) * limit;

  // Xây dựng điều kiện where
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [{ name: { contains: search } }, { code: { contains: search } }];
  }

  if (product_type) {
    where.product_type = product_type;
  }

  if (product_status) {
    where.product_status = product_status;
  }

  if (brand_id) {
    where.brands = {
      some: { brand_id: brand_id }
    };
  }

  if (warehouse_id) {
    where.warehouses = {
      some: { warehouse_id: warehouse_id }
    };
  }

  if (production_date_from || production_date_to) {
    where.production_date = {} as any;
    if (production_date_from) {
      (where.production_date as any).gte = production_date_from;
    }
    if (production_date_to) {
      (where.production_date as any).lte = production_date_to;
    }
  }

  if (expiry_date_from || expiry_date_to) {
    where.expiry_date = {} as any;
    if (expiry_date_from) {
      (where.expiry_date as any).gte = expiry_date_from;
    }
    if (expiry_date_to) {
      (where.expiry_date as any).lte = expiry_date_to;
    }
  }

  // Lọc theo danh mục: tìm sản phẩm có liên kết với category_id
  if (category_id) {
    where.categories = {
      some: {
        category_id: category_id,
      },
    };
  }

  // Query song song: lấy data + đếm tổng
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        product_type: true,
        product_status: true,
        has_batch: true,
        production_date: true,
        expiry_date: true,
        min_stock: true,
        max_stock: true,
        storage_conditions: true,
        image_url: true,
        created_at: true,
        updated_at: true,
        brands: {
          select: {
            brand: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        warehouses: {
          select: {
            warehouse: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        base_uom: {
          select: {
            id: true,
            code: true,
            name: true,
            uom_type: true,
          },
        },
        categories: {
          select: {
            category: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        uoms: {
          select: {
            id: true,
            conversion_factor: true,
            is_default: true,
            created_at: true,
            uom: {
              select: {
                id: true,
                code: true,
                name: true,
                uom_type: true,
              },
            },
          },
        },
        productSuppliers: {
          select: {
            supplier_sku: true,
            purchase_price: true,
            is_primary: true,
            supplier: {
              select: {
                id: true,
                code: true,
                name: true,
                contact_person: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            uoms: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    prisma.product.count({ where }),
  ]);

  const formattedProducts = products.map((product) => ({
    ...product,
    categories: product.categories.map((pc) => pc.category),
    brands: product.brands.map((pb) => pb.brand),
    warehouses: product.warehouses.map((pw) => pw.warehouse),
    productSuppliers: product.productSuppliers.map((ps) => ({
      supplier: ps.supplier,
      supplier_sku: ps.supplier_sku,
      purchase_price: ps.purchase_price,
      is_primary: ps.is_primary,
    })),
  }));

  return {
    products: formattedProducts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Lấy chi tiết sản phẩm theo ID
 */
export const getProductById = async (id: number) => {
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      product_type: true,
      product_status: true,
      has_batch: true,
      production_date: true,
      expiry_date: true,
      min_stock: true,
      max_stock: true,
      storage_conditions: true,
      image_url: true,
      created_at: true,
      updated_at: true,
      brands: {
        select: {
          brand: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      },
      warehouses: {
        select: {
          warehouse: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      },
      base_uom: {
        select: {
          id: true,
          code: true,
          name: true,
          uom_type: true,
        },
      },
      categories: {
        select: {
          assigned_at: true,
          category: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      },
      uoms: {
        select: {
          id: true,
          conversion_factor: true,
          is_default: true,
          created_at: true,
          uom: {
            select: {
              id: true,
              code: true,
              name: true,
              uom_type: true,
            },
          },
        },
      },
      productSuppliers: {
        select: {
          supplier_sku: true,
          purchase_price: true,
          is_primary: true,
          supplier: {
            select: {
              id: true,
              code: true,
              name: true,
              contact_person: true,
              phone: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!product) {
    throw new AppError("Không tìm thấy sản phẩm", 404);
  }

  // Format lại categories + productSuppliers
  return {
    ...product,
    categories: product.categories.map((pc) => ({
      assigned_at: pc.assigned_at,
    })),
    brands: product.brands.map((pb) => pb.brand),
    warehouses: product.warehouses.map((pw) => pw.warehouse),
    productSuppliers: product.productSuppliers.map((ps) => ({
      supplier: ps.supplier,
      supplier_sku: ps.supplier_sku,
      purchase_price: ps.purchase_price,
      is_primary: ps.is_primary,
    })),
  };
};

/**
 * Tạo mới sản phẩm
 * Bao gồm: gán danh mục và đơn vị tính quy đổi trong transaction
 */
export const createProduct = async (data: CreateProductInput) => {
  // Kiểm tra đơn vị tính cơ sở tồn tại
  const baseUom = await prisma.unitOfMeasure.findUnique({
    where: { id: data.base_uom_id },
  });
  if (!baseUom) {
    throw new AppError("Đơn vị tính cơ sở không tồn tại", 400);
  }

  // Define logic sinh mả Code
  const totalProducts = await prisma.product.count({
    where: { product_type: data.product_type ?? "GOODS" }
  });
  const firstBrandId = data.brand_ids && data.brand_ids.length > 0 ? (data.brand_ids[0] ?? 0) : 0;
  const productType = data.product_type ?? "GOODS";
  const productCode = generateProductSku(productType, firstBrandId, totalProducts + 1);

  const newProduct = await prisma.$transaction(async (tx) => {
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

    if (data.category_ids && data.category_ids.length > 0) {
      await tx.productCategoryMap.createMany({
        data: data.category_ids.map((categoryId) => ({
          product_id: product.id,
          category_id: categoryId,
        })),
      });
    }

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

/**
 * Cập nhật sản phẩm
 * Bao gồm: sync lại danh mục và đơn vị tính quy đổi trong transaction
 */
export const updateProduct = async (id: number, data: UpdateProductInput) => {
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
