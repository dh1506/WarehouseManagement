import { prisma } from '../config/db.config';
import { AppError } from '../utils/app-error';
import type {
  GetUnitsOfMeasureQuery,
  CreateUnitOfMeasureInput,
  UpdateUnitOfMeasureInput,
} from '../schemas/unit-of-measure.schema';

/**
 * Lấy danh sách đơn vị tính với phân trang, tìm kiếm, lọc theo loại
 */
export const getUnitsOfMeasure = async (query: GetUnitsOfMeasureQuery) => {
  const { page, limit, search, uom_type, is_active } = query;
  const skip = (page - 1) * limit;

  // Xây dựng điều kiện where
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
    ];
  }

  if (uom_type) {
    where.uom_type = uom_type;
  }

  if (is_active !== undefined) {
    where.is_active = is_active;
  }

  // Query song song: lấy data + đếm tổng
  const [unitsOfMeasure, total] = await Promise.all([
    prisma.unitOfMeasure.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        uom_type: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
    }),
    prisma.unitOfMeasure.count({ where }),
  ]);

  return {
    units_of_measure: unitsOfMeasure,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Lấy chi tiết đơn vị tính theo ID
 */
export const getUnitOfMeasureById = async (id: number) => {
  const uom = await prisma.unitOfMeasure.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      uom_type: true,
      is_active: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!uom) {
    throw new AppError('Không tìm thấy đơn vị tính', 404);
  }

  return uom;
};

/**
 * Tạo mới đơn vị tính
 */
export const createUnitOfMeasure = async (data: CreateUnitOfMeasureInput) => {
  // Kiểm tra mã đơn vị tính đã tồn tại
  const existingUom = await prisma.unitOfMeasure.findUnique({
    where: { code: data.code },
  });
  if (existingUom) {
    throw new AppError('Mã đơn vị tính đã tồn tại', 400);
  }

  const newUom = await prisma.unitOfMeasure.create({
    data: {
      code: data.code,
      name: data.name,
      uom_type: data.uom_type,
      is_active: data.is_active ?? true,
    },
    select: {
      id: true,
      code: true,
      name: true,
      uom_type: true,
      is_active: true,
      created_at: true,
      updated_at: true,
    },
  });

  return newUom;
};

/**
 * Cập nhật đơn vị tính
 */
export const updateUnitOfMeasure = async (id: number, data: UpdateUnitOfMeasureInput) => {
  // Kiểm tra đơn vị tính tồn tại
  const existingUom = await prisma.unitOfMeasure.findUnique({
    where: { id },
  });
  if (!existingUom) {
    throw new AppError('Không tìm thấy đơn vị tính', 404);
  }

  // Kiểm tra mã trùng (nếu thay đổi)
  if (data.code && data.code !== existingUom.code) {
    const duplicateCode = await prisma.unitOfMeasure.findUnique({
      where: { code: data.code },
    });
    if (duplicateCode) {
      throw new AppError('Mã đơn vị tính đã tồn tại', 400);
    }
  }

  // Chuẩn bị dữ liệu cập nhật
  const updateData: Record<string, unknown> = {};
  if (data.code !== undefined) updateData.code = data.code;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.uom_type !== undefined) updateData.uom_type = data.uom_type;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;

  const updatedUom = await prisma.unitOfMeasure.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      code: true,
      name: true,
      uom_type: true,
      is_active: true,
      created_at: true,
      updated_at: true,
    },
  });

  return updatedUom;
};
