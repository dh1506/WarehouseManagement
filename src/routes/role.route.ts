import { Router } from 'express';
import * as roleController from '../controllers/role.controller';
import { validateRequest } from '../middlewares/validate.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/permission.middleware';
import {
  getRolesQuerySchema,
  getRoleByIdParamSchema,
  createRoleSchema,
  updateRoleSchema,
  assignPermissionsSchema,
} from '../schemas/role.schema';

const router = Router();

// Tất cả routes trong module roles đều yêu cầu xác thực
router.use(authenticate);

// GET /api/roles — Danh sách roles (cần quyền roles:read)
router.get(
  '/',
  requirePermission('roles:read'),
  validateRequest(getRolesQuerySchema),
  roleController.getRoles
);

// GET /api/roles/:id — Chi tiết role (cần quyền roles:read)
router.get(
  '/:id',
  requirePermission('roles:read'),
  validateRequest(getRoleByIdParamSchema),
  roleController.getRoleById
);

// POST /api/roles — Tạo role mới (cần quyền roles:create)
router.post(
  '/',
  requirePermission('roles:create'),
  validateRequest(createRoleSchema),
  roleController.createRole
);

// PATCH /api/roles/:id — Cập nhật role (cần quyền roles:update)
router.patch(
  '/:id',
  requirePermission('roles:update'),
  validateRequest(updateRoleSchema),
  roleController.updateRole
);

// PUT /api/roles/:id/permissions — Gán permissions cho role (cần quyền roles:update)
router.put(
  '/:id/permissions',
  requirePermission('roles:update'),
  validateRequest(assignPermissionsSchema),
  roleController.assignPermissions
);

export default router;
