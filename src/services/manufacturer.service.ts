import { prisma } from '../config/db.config';
import { AppError } from '../utils/app-error';
import type {
  GetManufacturersQuery,
  CreateManufacturerInput,
  UpdateManufacturerInput,
} from '../schemas/manufacturer.schema';

/**
 * Lấy danh sách nhà sản xuất với phân trang, tìm kiếm
 */
export const getManufacturers = async (query: GetManufacturersQuery) => {
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
  const [manufacturers, total] = await Promise.all([
    prisma.manufacturer.findMany({
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
    prisma.manufacturer.count({ where }),
  ]);

  return {
    manufacturers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Lấy chi tiết nhà sản xuất theo ID
 */
export const getManufacturerById = async (id: number) => {
  const manufacturer = await prisma.manufacturer.findUnique({
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

  if (!manufacturer) {
    throw new AppError('Không tìm thấy nhà sản xuất', 404);
  }

  return manufacturer;
};

/**
 * Tạo mới nhà sản xuất
 */
export const createManufacturer = async (data: CreateManufacturerInput) => {
  // Kiểm tra mã nhà sản xuất đã tồn tại
  const existingManufacturer = await prisma.manufacturer.findUnique({
    where: { code: data.code },
  });
  if (existingManufacturer) {
    throw new AppError('Mã nhà sản xuất đã tồn tại', 400);
  }

  const newManufacturer = await prisma.manufacturer.create({
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

  return newManufacturer;
};

/**
 * Cập nhật nhà sản xuất
 */
export const updateManufacturer = async (id: number, data: UpdateManufacturerInput) => {
  // Kiểm tra nhà sản xuất tồn tại
  const existingManufacturer = await prisma.manufacturer.findUnique({
    where: { id },
  });
  if (!existingManufacturer) {
    throw new AppError('Không tìm thấy nhà sản xuất', 404);
  }

  // Kiểm tra mã trùng (nếu thay đổi)
  if (data.code && data.code !== existingManufacturer.code) {
    const duplicateCode = await prisma.manufacturer.findUnique({
      where: { code: data.code },
    });
    if (duplicateCode) {
      throw new AppError('Mã nhà sản xuất đã tồn tại', 400);
    }
  }

  // Chuẩn bị dữ liệu cập nhật
  const updateData: Record<string, unknown> = {};
  if (data.code !== undefined) updateData.code = data.code;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;

  const updatedManufacturer = await prisma.manufacturer.update({
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

  return updatedManufacturer;
};
