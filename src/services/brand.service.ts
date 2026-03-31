import { prisma } from '../config/db.config';
import { AppError } from '../utils/app-error';
import type {
  GetBrandsQuery,
  CreateBrandInput,
  UpdateBrandInput,
} from '../schemas/brand.schema';

/**
 * Lấy danh sách thương hiệu với phân trang, tìm kiếm
 */
export const getBrands = async (query: GetBrandsQuery) => {
  const { page, limit, search, is_active } = query;
  const skip = (page - 1) * limit;

  // Xây dựng điều kiện where
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
    ];
  }

  if (is_active !== undefined) {
    where.is_active = is_active;
  }

  // Query song song: lấy data + đếm tổng
  const [brands, total] = await Promise.all([
    prisma.brand.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
    }),
    prisma.brand.count({ where }),
  ]);

  return {
    brands,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Lấy chi tiết thương hiệu theo ID
 */
export const getBrandById = async (id: number) => {
  const brand = await prisma.brand.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  if (!brand) {
    throw new AppError('Không tìm thấy thương hiệu', 404);
  }

  return brand;
};

/**
 * Tạo mới thương hiệu
 */
export const createBrand = async (data: CreateBrandInput) => {
  // Kiểm tra mã thương hiệu đã tồn tại
  const existingBrand = await prisma.brand.findUnique({
    where: { code: data.code },
  });
  if (existingBrand) {
    throw new AppError('Mã thương hiệu đã tồn tại', 400);
  }

  const newBrand = await prisma.brand.create({
    data: {
      code: data.code,
      name: data.name,
      is_active: data.is_active ?? true,
    },
    select: {
      id: true,
      code: true,
      name: true,
      is_active: true,
      created_at: true,
      updated_at: true,
    },
  });

  return newBrand;
};

/**
 * Cập nhật thương hiệu
 */
export const updateBrand = async (id: number, data: UpdateBrandInput) => {
  // Kiểm tra thương hiệu tồn tại
  const existingBrand = await prisma.brand.findUnique({
    where: { id },
  });
  if (!existingBrand) {
    throw new AppError('Không tìm thấy thương hiệu', 404);
  }

  // Kiểm tra mã trùng (nếu thay đổi)
  if (data.code && data.code !== existingBrand.code) {
    const duplicateCode = await prisma.brand.findUnique({
      where: { code: data.code },
    });
    if (duplicateCode) {
      throw new AppError('Mã thương hiệu đã tồn tại', 400);
    }
  }

  // Chuẩn bị dữ liệu cập nhật
  const updateData: Record<string, unknown> = {};
  if (data.code !== undefined) updateData.code = data.code;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;

  const updatedBrand = await prisma.brand.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      code: true,
      name: true,
      is_active: true,
      created_at: true,
      updated_at: true,
    },
  });

  return updatedBrand;
};
