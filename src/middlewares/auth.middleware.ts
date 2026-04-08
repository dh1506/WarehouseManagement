import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';
import { prisma } from '../config/db.config';
import { AppError } from '../utils/app-error';
import { getAlsStore } from '../utils/als.util';

/**
 * Interface mô tả thông tin user được gắn vào request sau khi xác thực
 */
export interface AuthenticatedUser {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  roleId: number;
  roleName: string;
  permissions: string[];
}

/**
 * Mở rộng Request của Express để thêm trường user
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Middleware xác thực JWT token.
 * - Lấy token từ header Authorization: Bearer <token>
 * - Verify token và query thông tin user từ DB
 * - Gắn thông tin user (bao gồm role + permissions) vào req.user
 * - Kiểm tra trạng thái tài khoản ACTIVE
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Lấy token từ header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Vui lòng đăng nhập để truy cập', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError('Token không hợp lệ', 401);
    }

    // Verify token
    const decoded = verifyToken(token) as { id: number; username: string; role_id: number };

    // Query user từ DB kèm role và permissions
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        full_name: true,
        email: true,
        role_id: true,
        user_status: true,
        role: {
          select: {
            name: true,
            is_active: true,
            permissions: {
              select: {
                permission: {
                  select: {
                    name: true,
                    is_active: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Người dùng không tồn tại', 401);
    }

    // Kiểm tra trạng thái tài khoản
    if (user.user_status !== 'ACTIVE') {
      throw new AppError('Tài khoản đã bị vô hiệu hóa', 403);
    }

    // Kiểm tra role còn hoạt động không
    if (!user.role.is_active) {
      throw new AppError('Vai trò của bạn đã bị vô hiệu hóa', 403);
    }

    // Lấy danh sách permission names (chỉ lấy permission đang active)
    const permissions = user.role.permissions
      .filter((rp) => rp.permission.is_active)
      .map((rp) => rp.permission.name);

    // Gắn thông tin user vào request
    req.user = {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      roleId: user.role_id,
      roleName: user.role.name,
      permissions,
    };

    // Gắn userId vào AsyncLocalStorage để Prisma Audit Extension sử dụng
    const store = getAlsStore();
    if (store) {
      store.userId = user.id;
    }

    next();
  } catch (error) {
    // Xử lý lỗi JWT hết hạn hoặc không hợp lệ
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError('Token không hợp lệ hoặc đã hết hạn', 401));
  }
};
