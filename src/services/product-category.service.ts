import { prisma } from '../config/db.config';
import { AppError } from '../utils/app-error';
import { normalizeNameToCode } from '../utils/generate-code.util';
import type {
  GetProductCategoriesQuery,
  CreateProductCategoryInput,
  UpdateProductCategoryInput,
} from '../schemas/product-category.schema';

/**
 * Lấy danh sách danh mục sản phẩm với phân trang, tìm kiếm
 */
export const getProductCategories = async (query: GetProductCategoriesQuery) => {
  const { page, limit, search, parent_id } = query;
  const skip = (page - 1) * limit;

  // Xây dựng điều kiện where
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
      { description: { contains: search } },
    ];
  }

  if (parent_id !== undefined) {
    where.parent_id = parent_id;
  }

  // Query song song: lấy data + đếm tổng
  const [categories, total] = await Promise.all([
    prisma.productCategory.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        parent_id: true,
        created_at: true,
        updated_at: true,
        parent: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            children: true,
            products: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
    }),
    prisma.productCategory.count({ where }),
  ]);

  return {
    categories,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Lấy chi tiết danh mục sản phẩm theo ID
 */
export const getProductCategoryById = async (id: number) => {
  const category = await prisma.productCategory.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      parent_id: true,
      created_at: true,
      updated_at: true,
      parent: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      children: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  if (!category) {
    throw new AppError('Không tìm thấy danh mục sản phẩm', 404);
  }

  return category;
};

/**
 * Tạo mới danh mục sản phẩm
 */
export const createProductCategory = async (data: CreateProductCategoryInput) => {
  let generatedCode = normalizeNameToCode(data.name);
  let codeToCheck = generatedCode;
  let counter = 1;
  let existingCategory = await prisma.productCategory.findUnique({
    where: { code: codeToCheck },
  });

  while (existingCategory) {
    codeToCheck = `${generatedCode}_${counter}`;
    existingCategory = await prisma.productCategory.findUnique({
      where: { code: codeToCheck },
    });
    counter++;
  }

  // Kiểm tra danh mục cha tồn tại (nếu có)
  if (data.parent_id) {
    const parentCategory = await prisma.productCategory.findUnique({
      where: { id: data.parent_id },
    });
    if (!parentCategory) {
      throw new AppError('Danh mục cha không tồn tại', 400);
    }
  }

  const newCategory = await prisma.productCategory.create({
    data: {
      code: codeToCheck,
      name: data.name,
      description: data.description ?? null,
      parent_id: data.parent_id ?? null,
    },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      parent_id: true,
      created_at: true,
      updated_at: true,
    },
  });

  return newCategory;
};

/**
 * Cập nhật danh mục sản phẩm
 */
export const updateProductCategory = async (id: number, data: UpdateProductCategoryInput) => {
  // Kiểm tra danh mục tồn tại
  const existingCategory = await prisma.productCategory.findUnique({
    where: { id },
  });
  if (!existingCategory) {
    throw new AppError('Không tìm thấy danh mục sản phẩm', 404);
  }

  // Chuẩn bị dữ liệu cập nhật
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.parent_id !== undefined) updateData.parent_id = data.parent_id;

  const updatedCategory = await prisma.productCategory.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      parent_id: true,
      created_at: true,
      updated_at: true,
    },
  });

  return updatedCategory;
};

/**
 * Xóa danh mục sản phẩm
 * Kiểm tra không có danh mục con hoặc sản phẩm liên kết
 */
export const deleteProductCategory = async (id: number) => {
  // Kiểm tra danh mục tồn tại
  const category = await prisma.productCategory.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          children: true,
          products: true,
        },
      },
    },
  });

  if (!category) {
    throw new AppError('Không tìm thấy danh mục sản phẩm', 404);
  }

  // Không cho xóa nếu có danh mục con
  if (category._count.children > 0) {
    throw new AppError('Không thể xóa danh mục có danh mục con', 400);
  }

  // Không cho xóa nếu có sản phẩm liên kết
  if (category._count.products > 0) {
    throw new AppError('Không thể xóa danh mục đang có sản phẩm liên kết', 400);
  }

  await prisma.productCategory.delete({
    where: { id },
  });

  return { message: 'Xóa danh mục thành công' };
};
