import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.config';
import { AppError } from '../utils/app-error';
import { signToken } from '../utils/jwt.util';
import type { RegisterInput, LoginInput } from '../schemas/auth.schema';

/**
 * Đăng ký tài khoản mới
 */
export const register = async (data: RegisterInput) => {
  const { username, password, full_name, email, phone } = data;

  // Kiểm tra username hoặc email đã tồn tại
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username: username },
        ...(email ? [{ email }] : []),
      ],
    },
  });

  if (existingUser) {
    if (existingUser.username === username) {
      throw new AppError('Tên đăng nhập đã được sử dụng', 400);
    }
    if (existingUser.email === email) {
      throw new AppError('Email đã được sử dụng', 400);
    }
  }

  // Hash mật khẩu
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Đảm bảo role mặc định luôn tồn tại
  const defaultRole = await prisma.role.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'STAFF' },
  });

  // Tạo user mới
  const newUser = await prisma.user.create({
    data: {
      username,
      password_hash: passwordHash,
      full_name,
      email: email || null,
      phone: phone || null,
      role_id: defaultRole.id,
    },
    select: {
      id: true,
      username: true,
      full_name: true,
      email: true,
      phone: true,
      role_id: true,
      user_status: true,
      created_at: true,
    },
  });

  return newUser;
};

/**
 * Đăng nhập - trả về token kèm thông tin user, role và permissions
 */
export const login = async (data: LoginInput) => {
  const { username, password } = data;

  // Tìm user kèm role và permissions
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: {
                select: {
                  id: true,
                  name: true,
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
    throw new AppError('Tên đăng nhập hoặc mật khẩu không đúng', 401);
  }

  // Kiểm tra trạng thái tài khoản
  if (user.user_status !== 'ACTIVE') {
    throw new AppError('Tài khoản đã bị vô hiệu hóa', 403);
  }

  // Kiểm tra mật khẩu
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError('Tên đăng nhập hoặc mật khẩu không đúng', 401);
  }

  // Tạo JWT token
  const token = signToken({ id: user.id, username: user.username, role_id: user.role_id });

  // Loại bỏ password_hash và format response
  const { password_hash, role, ...userWithoutPassword } = user;

  // Format permissions cho gọn
  const permissions = role.permissions.map((rp) => rp.permission);

  return {
    user: {
      ...userWithoutPassword,
      role: {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions,
      },
    },
    token,
  };
};
