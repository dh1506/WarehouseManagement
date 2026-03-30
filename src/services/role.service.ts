import { prisma } from '../config/db.config';
import { AppError } from '../utils/app-error';
import type {
  GetRolesQuery,
  CreateRoleInput,
  UpdateRoleInput,
} from '../schemas/role.schema';

/**
 * Lấy danh sách roles với phân trang, tìm kiếm
 */
export const getRoles = async (query: GetRolesQuery) => {
  const { page, limit, search, is_active } = query;
  const skip = (page - 1) * limit;

  // Xây dựng điều kiện where
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ];
  }

  if (is_active !== undefined) {
    where.is_active = is_active;
  }

  // Query song song: lấy data + đếm tổng
  const [roles, total] = await Promise.all([
    prisma.role.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            users: true,
            permissions: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
    }),
    prisma.role.count({ where }),
  ]);

  return {
    roles,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Lấy chi tiết role theo ID, kèm danh sách permissions
 */
export const getRoleById = async (id: number) => {
  const role = await prisma.role.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      permissions: {
        select: {
          assigned_at: true,
          permission: {
            select: {
              id: true,
              name: true,
              description: true,
              module: true,
              action: true,
              is_active: true,
            },
          },
        },
      },
      _count: {
        select: {
          users: true,
        },
      },
    },
  });

  if (!role) {
    throw new AppError('Không tìm thấy vai trò', 404);
  }

  // Format lại permissions cho gọn
  return {
    ...role,
    permissions: role.permissions.map((rp) => ({
      ...rp.permission,
      assigned_at: rp.assigned_at,
    })),
  };
};

/**
 * Tạo mới role
 */
export const createRole = async (data: CreateRoleInput) => {
  // Kiểm tra tên role đã tồn tại
  const existingRole = await prisma.role.findUnique({
    where: { name: data.name },
  });
  if (existingRole) {
    throw new AppError('Tên vai trò đã tồn tại', 400);
  }

  const newRole = await prisma.role.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      is_active: data.is_active ?? true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      is_active: true,
      created_at: true,
      updated_at: true,
    },
  });

  return newRole;
};

/**
 * Cập nhật role
 */
export const updateRole = async (id: number, data: UpdateRoleInput) => {
  // Kiểm tra role tồn tại
  const existingRole = await prisma.role.findUnique({
    where: { id },
  });
  if (!existingRole) {
    throw new AppError('Không tìm thấy vai trò', 404);
  }

  // Kiểm tra tên trùng (nếu thay đổi)
  if (data.name && data.name !== existingRole.name) {
    const duplicateName = await prisma.role.findUnique({
      where: { name: data.name },
    });
    if (duplicateName) {
      throw new AppError('Tên vai trò đã tồn tại', 400);
    }
  }

  // Chuẩn bị dữ liệu cập nhật
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;

  const updatedRole = await prisma.role.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      description: true,
      is_active: true,
      created_at: true,
      updated_at: true,
    },
  });

  return updatedRole;
};

/**
 * Gán danh sách permissions cho role (thay thế toàn bộ)
 * Xóa tất cả permissions cũ và gán lại danh sách mới
 */
export const assignPermissions = async (roleId: number, permissionIds: number[]) => {
  // Kiểm tra role tồn tại
  const role = await prisma.role.findUnique({
    where: { id: roleId },
  });
  if (!role) {
    throw new AppError('Không tìm thấy vai trò', 404);
  }

  // Kiểm tra tất cả permission IDs tồn tại
  const permissions = await prisma.permission.findMany({
    where: { id: { in: permissionIds } },
  });

  if (permissions.length !== permissionIds.length) {
    // Tìm những ID không tồn tại
    const foundIds = permissions.map((p) => p.id);
    const notFoundIds = permissionIds.filter((id) => !foundIds.includes(id));
    throw new AppError(
      `Không tìm thấy permissions với ID: ${notFoundIds.join(', ')}`,
      400
    );
  }

  // Xóa tất cả permissions cũ và gán mới trong một transaction
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({
      where: { role_id: roleId },
    }),
    prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        role_id: roleId,
        permission_id: permissionId,
      })),
    }),
  ]);

  // Trả về role với permissions mới
  const updatedRole = await getRoleById(roleId);
  return updatedRole;
};
