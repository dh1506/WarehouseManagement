import type { Request, Response } from 'express';
import * as roleService from '../services/role.service';
import { catchAsync } from '../utils/catch-async';

/**
 * Lấy danh sách roles
 * GET /api/roles?page=1&limit=10&search=keyword&is_active=true
 */
export const getRoles = catchAsync(async (req: Request, res: Response) => {
  const query = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    search: req.query.search as string | undefined,
    is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
  };

  const result = await roleService.getRoles(query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách vai trò thành công',
  });
});

/**
 * Lấy chi tiết role theo ID
 * GET /api/roles/:id
 */
export const getRoleById = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const role = await roleService.getRoleById(id);

  res.status(200).json({
    success: true,
    data: role,
    message: 'Lấy thông tin vai trò thành công',
  });
});

/**
 * Tạo mới role
 * POST /api/roles
 */
export const createRole = catchAsync(async (req: Request, res: Response) => {
  const role = await roleService.createRole(req.body);

  res.status(201).json({
    success: true,
    data: role,
    message: 'Tạo vai trò thành công',
  });
});

/**
 * Cập nhật role
 * PATCH /api/roles/:id
 */
export const updateRole = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const role = await roleService.updateRole(id, req.body);

  res.status(200).json({
    success: true,
    data: role,
    message: 'Cập nhật vai trò thành công',
  });
});

/**
 * Gán permissions cho role (thay thế toàn bộ)
 * PUT /api/roles/:id/permissions
 */
export const assignPermissions = catchAsync(async (req: Request, res: Response) => {
  const roleId = Number(req.params.id);
  const { permission_ids } = req.body;
  const role = await roleService.assignPermissions(roleId, permission_ids);

  res.status(200).json({
    success: true,
    data: role,
    message: 'Gán quyền cho vai trò thành công',
  });
});
