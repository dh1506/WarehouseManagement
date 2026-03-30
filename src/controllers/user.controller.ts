import type { Request, Response } from 'express';
import * as userService from '../services/user.service';
import { catchAsync } from '../utils/catch-async';

/**
 * Lấy danh sách users với phân trang và bộ lọc
 * GET /api/users?page=1&limit=10&search=keyword&status=ACTIVE&role_id=1
 */
export const getUsers = catchAsync(async (req: Request, res: Response) => {
  const query = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    search: req.query.search as string | undefined,
    status: req.query.status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | undefined,
    role_id: req.query.role_id ? Number(req.query.role_id) : undefined,
  };

  const result = await userService.getUsers(query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách người dùng thành công',
  });
});

/**
 * Lấy chi tiết user theo ID
 * GET /api/users/:id
 */
export const getUserById = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const user = await userService.getUserById(id);

  res.status(200).json({
    success: true,
    data: user,
    message: 'Lấy thông tin người dùng thành công',
  });
});

/**
 * Tạo mới user
 * POST /api/users
 */
export const createUser = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.createUser(req.body);

  res.status(201).json({
    success: true,
    data: user,
    message: 'Tạo người dùng thành công',
  });
});

/**
 * Cập nhật user
 * PATCH /api/users/:id
 */
export const updateUser = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const user = await userService.updateUser(id, req.body);

  res.status(200).json({
    success: true,
    data: user,
    message: 'Cập nhật người dùng thành công',
  });
});
