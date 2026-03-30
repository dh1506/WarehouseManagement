import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error';

/**
 * Middleware kiểm tra user có vai trò (role) phù hợp không.
 * Sử dụng sau middleware `authenticate`.
 *
 * @param roles - Danh sách tên role được phép truy cập (VD: 'ADMIN', 'MANAGER')
 * @returns Express middleware
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Vui lòng đăng nhập để truy cập', 401));
      return;
    }

    // Kiểm tra role name có nằm trong danh sách cho phép không
    if (!roles.includes(req.user.roleName)) {
      next(
        new AppError(
          `Bạn không có quyền truy cập. Yêu cầu vai trò: ${roles.join(', ')}`,
          403
        )
      );
      return;
    }

    next();
  };
};

/**
 * Middleware kiểm tra user có đủ quyền (permission) không.
 * Sử dụng sau middleware `authenticate`.
 * User cần có TẤT CẢ permissions được yêu cầu.
 *
 * @param permissions - Danh sách permission name (VD: 'users:read', 'users:create')
 * @returns Express middleware
 */
export const requirePermission = (...permissions: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Vui lòng đăng nhập để truy cập', 401));
      return;
    }

    // Kiểm tra user có tất cả permissions được yêu cầu
    const userPermissions = req.user.permissions;
    const missingPermissions = permissions.filter(
      (perm) => !userPermissions.includes(perm)
    );

    if (missingPermissions.length > 0) {
      next(
        new AppError(
          `Bạn không có quyền thực hiện thao tác này. Thiếu quyền: ${missingPermissions.join(', ')}`,
          403
        )
      );
      return;
    }

    next();
  };
};
