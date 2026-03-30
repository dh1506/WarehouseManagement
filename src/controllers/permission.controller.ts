import type { Request, Response } from 'express';
import * as permissionService from '../services/permission.service';
import { catchAsync } from '../utils/catch-async';

/**
 * Lấy danh sách permissions
 * GET /api/permissions?module=users&is_active=true
 */
export const getPermissions = catchAsync(async (req: Request, res: Response) => {
  const query = {
    module: req.query.module as string | undefined,
    is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
  };

  const result = await permissionService.getPermissions(query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách quyền thành công',
  });
});
