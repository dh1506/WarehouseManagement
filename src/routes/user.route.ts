import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { validateRequest } from '../middlewares/validate.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/permission.middleware';
import {
  getUsersQuerySchema,
  getUserByIdParamSchema,
  createUserSchema,
  updateUserSchema,
} from '../schemas/user.schema';

const router = Router();

// Tất cả routes trong module users đều yêu cầu xác thực
router.use(authenticate);

// GET /api/users — Danh sách users (cần quyền users:read)
router.get(
  '/',
  requirePermission('users:read'),
  validateRequest(getUsersQuerySchema),
  userController.getUsers
);

// GET /api/users/:id — Chi tiết user (cần quyền users:read)
router.get(
  '/:id',
  requirePermission('users:read'),
  validateRequest(getUserByIdParamSchema),
  userController.getUserById
);

// POST /api/users — Tạo user mới (cần quyền users:create)
router.post(
  '/',
  requirePermission('users:create'),
  validateRequest(createUserSchema),
  userController.createUser
);

// PATCH /api/users/:id — Cập nhật user (cần quyền users:update)
router.patch(
  '/:id',
  requirePermission('users:update'),
  validateRequest(updateUserSchema),
  userController.updateUser
);

export default router;
