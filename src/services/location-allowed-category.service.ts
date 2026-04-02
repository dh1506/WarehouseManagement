import { prisma } from '../config/db.config';
import { AppError } from '../utils/app-error';
import type {
  GetLocationAllowedCategoriesQuery,
  CreateLocationAllowedCategoryInput,
  UpdateLocationAllowedCategoryInput,
} from '../schemas/location-allowed-category.schema';

export const getLocationAllowedCategories = async (query: GetLocationAllowedCategoriesQuery) => {
  const { page, limit, location_id, category_id, is_allowed, rule_source } = query;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (location_id) where.location_id = location_id;
  if (category_id) where.category_id = category_id;
  if (is_allowed !== undefined) where.is_allowed = is_allowed;
  if (rule_source) where.rule_source = rule_source;

  const [data, total] = await Promise.all([
    prisma.locationAllowedCategory.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        location: {
          select: { location_code: true, full_path: true }
        },
        category: {
          select: { name: true, code: true }
        }
      }
    }),
    prisma.locationAllowedCategory.count({ where }),
  ]);

  return {
    locationAllowedCategories: data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getLocationAllowedCategoryById = async (id: number) => {
  const data = await prisma.locationAllowedCategory.findUnique({
    where: { id },
    include: {
      location: {
        select: { location_code: true, full_path: true }
      },
      category: {
        select: { name: true, code: true }
      }
    }
  });

  if (!data) {
    throw new AppError('Không tìm thấy quy tắc vị trí này', 404);
  }

  return data;
};

export const createLocationAllowedCategory = async (data: CreateLocationAllowedCategoryInput) => {
  // Check location exists
  const location = await prisma.warehouseLocation.findUnique({ where: { id: data.location_id } });
  if (!location) {
    throw new AppError('Không tìm thấy vị trí kho tương ứng', 404);
  }

  // Check category exists
  const category = await prisma.productCategory.findUnique({ where: { id: data.category_id } });
  if (!category) {
    throw new AppError('Không tìm thấy danh mục tương ứng', 404);
  }

  // Cấu hình composite key check if rule already exists for this pair
  const duplicate = await prisma.locationAllowedCategory.findUnique({
    where: {
      location_id_category_id: {
        location_id: data.location_id,
        category_id: data.category_id,
      }
    }
  });

  if (duplicate) {
    throw new AppError('Quy tắc cho Vị trí và Danh mục này đã tồn tại', 400);
  }

  const insertData: any = { ...data };
  if (insertData.effective_to === undefined) insertData.effective_to = null;
  if (insertData.note === undefined) insertData.note = null;

  return prisma.locationAllowedCategory.create({
    data: insertData,
  });
};

export const updateLocationAllowedCategory = async (id: number, data: UpdateLocationAllowedCategoryInput) => {
  const existing = await prisma.locationAllowedCategory.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Không tìm thấy quy tắc vị trí', 404);
  }

  const updateData: any = {};
  if (data.is_allowed !== undefined) updateData.is_allowed = data.is_allowed;
  if (data.rule_source !== undefined) updateData.rule_source = data.rule_source;
  if (data.inherit_from_parent !== undefined) updateData.inherit_from_parent = data.inherit_from_parent;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.effective_from !== undefined) updateData.effective_from = data.effective_from;
  if (data.effective_to !== undefined) updateData.effective_to = data.effective_to;
  if (data.note !== undefined) updateData.note = data.note;

  return prisma.locationAllowedCategory.update({
    where: { id },
    data: updateData,
  });
};

export const deleteLocationAllowedCategory = async (id: number) => {
  const existing = await prisma.locationAllowedCategory.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Không tìm thấy quy tắc vị trí', 404);
  }

  await prisma.locationAllowedCategory.delete({
    where: { id }
  });

  return { message: 'Xóa quy tắc thành công' };
};
