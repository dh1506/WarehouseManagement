import bcrypt from "bcryptjs";
import { prisma } from "../config/db.config";
import { AppError } from "../utils/app-error";
import type {
  GetUsersQuery,
  CreateUserInput,
  UpdateUserInput,
} from "../schemas/user.schema";

/**
 * Select fields chuẩn khi trả về user - loại bỏ password_hash
 */
const userSelectFields = {
  id: true,
  username: true,
  full_name: true,
  email: true,
  phone: true,
  avatar_url: true,
  role_id: true,
  warehouse_id: true,
  user_status: true,
  created_at: true,
  updated_at: true,
  role: {
    select: {
      id: true,
      name: true,
      description: true,
    },
  },
  warehouse: {
    select: {
      id: true,
      code: true,
      name: true,
      is_active: true,
    },
  },
} as const;

/**
 * Lấy danh sách users với phân trang, tìm kiếm và lọc
 */
export const getUsers = async (query: GetUsersQuery) => {
  const { page, limit, search, status, role_id, warehouse_id } = query;
  const skip = (page - 1) * limit;

  // Xây dựng điều kiện where
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { username: { contains: search } },
      { full_name: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
    ];
  }

  if (status) {
    where.user_status = status;
  }

  if (role_id) {
    where.role_id = role_id;
  }

  if (warehouse_id) {
    where.warehouse_id = warehouse_id;
  }

  // Query song song: lấy data + đếm tổng
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSelectFields,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Lấy chi tiết user theo ID, kèm role và permissions
 */
export const getUserById = async (id: number) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      ...userSelectFields,
      role: {
        select: {
          id: true,
          name: true,
          description: true,
          permissions: {
            select: {
              permission: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  module: true,
                  action: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new AppError("Không tìm thấy người dùng", 404);
  }

  // Format lại permissions cho gọn
  const formattedUser = {
    ...user,
    role: {
      id: user.role.id,
      name: user.role.name,
      description: user.role.description,
      permissions: user.role.permissions.map((rp) => rp.permission),
    },
  };

  return formattedUser;
};

/**
 * Tạo mới user
 */
export const createUser = async (data: CreateUserInput) => {
  const {
    username,
    password,
    full_name,
    email,
    phone,
    avatar_url,
    role_id,
    warehouse_id,
    user_status,
  } = data;

  // Kiểm tra username đã tồn tại
  const existingUsername = await prisma.user.findUnique({
    where: { username },
  });
  if (existingUsername) {
    throw new AppError("Tên đăng nhập đã được sử dụng", 400);
  }

  // Kiểm tra email đã tồn tại (nếu có)
  if (email) {
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      throw new AppError("Email đã được sử dụng", 400);
    }
  }

  // Kiểm tra phone đã tồn tại (nếu có)
  if (phone) {
    const existingPhone = await prisma.user.findUnique({
      where: { phone },
    });
    if (existingPhone) {
      throw new AppError("Số điện thoại đã được sử dụng", 400);
    }
  }

  // Kiểm tra role tồn tại
  const role = await prisma.role.findUnique({
    where: { id: role_id },
  });
  if (!role) {
    throw new AppError("Vai trò không tồn tại", 400);
  }

  // Kiểm tra warehouse tồn tại (nếu có)
  if (warehouse_id) {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouse_id },
    });
    if (!warehouse) {
      throw new AppError("Kho không tồn tại", 400);
    }
  }

  // Hash mật khẩu
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Tạo user
  const newUser = await prisma.user.create({
    data: {
      username,
      password_hash: passwordHash,
      full_name,
      email: email ?? null,
      phone: phone ?? null,
      avatar_url: avatar_url ?? null,
      role_id,
      warehouse_id: warehouse_id ?? null,
      user_status: user_status ?? "ACTIVE",
    },
    select: userSelectFields,
  });

  return newUser;
};

/**
 * Cập nhật thông tin user
 */
export const updateUser = async (id: number, data: UpdateUserInput) => {
  // Kiểm tra user tồn tại
  const existingUser = await prisma.user.findUnique({
    where: { id },
  });
  if (!existingUser) {
    throw new AppError("Không tìm thấy người dùng", 404);
  }

  // Kiểm tra email trùng lặp (nếu thay đổi)
  if (data.email && data.email !== existingUser.email) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw new AppError("Email đã được sử dụng", 400);
    }
  }

  // Kiểm tra phone trùng lặp (nếu thay đổi)
  if (data.phone && data.phone !== existingUser.phone) {
    const existingPhone = await prisma.user.findUnique({
      where: { phone: data.phone },
    });
    if (existingPhone) {
      throw new AppError("Số điện thoại đã được sử dụng", 400);
    }
  }

  // Kiểm tra role tồn tại (nếu thay đổi)
  if (data.role_id) {
    const role = await prisma.role.findUnique({
      where: { id: data.role_id },
    });
    if (!role) {
      throw new AppError("Vai trò không tồn tại", 400);
    }
  }

  // Kiểm tra warehouse tồn tại (nếu thay đổi)
  if (data.warehouse_id !== undefined) {
    if (data.warehouse_id) {
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: data.warehouse_id },
      });
      if (!warehouse) {
        throw new AppError("Kho không tồn tại", 400);
      }
    }
  }

  // Chuẩn bị dữ liệu cập nhật
  const updateData: Record<string, unknown> = {};

  if (data.full_name !== undefined) updateData.full_name = data.full_name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;
  if (data.role_id !== undefined) updateData.role_id = data.role_id;
  if (data.warehouse_id !== undefined)
    updateData.warehouse_id = data.warehouse_id;
  if (data.user_status !== undefined) updateData.user_status = data.user_status;

  // Hash mật khẩu mới (nếu thay đổi)
  if (data.password) {
    const salt = await bcrypt.genSalt(10);
    updateData.password_hash = await bcrypt.hash(data.password, salt);
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    select: userSelectFields,
  });

  return updatedUser;
};
