import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.config';
import { AppError } from '../utils/app-error';
import { signToken } from '../utils/jwt.util';
import type { RegisterInput, LoginInput } from '../schemas/auth.schema';

export const register = async (data: RegisterInput) => {
  const { username, password, full_name, email, phone } = data;

  const existingUser = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUser) {
    throw new AppError('Username already exists', 400);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Đảm bảo role mặc định luôn tồn tại
  const defaultRole = await prisma.role.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'STAFF' },
  });

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

export const login = async (data: LoginInput) => {
  const { username, password } = data;

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    throw new AppError('Invalid username or password', 401);
  }

  if (user.user_status !== 'ACTIVE') {
    throw new AppError('User account is not active', 403);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError('Invalid username or password', 401);
  }

  const token = signToken({ id: user.id, username: user.username, role_id: user.role_id });

  const { password_hash, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token,
  };
};
