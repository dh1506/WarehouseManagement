import { Router } from 'express';
import * as permissionController from '../controllers/permission.controller';
import { validateRequest } from '../middlewares/validate.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/permission.middleware';
import { getPermissionsQuerySchema } from '../schemas/permission.schema';

const router = Router();

// Tất cả routes trong module permissions đều yêu cầu xác thực
router.use(authenticate);

// GET /api/permissions — Danh sách permissions (cần quyền permissions:read)
router.get(
  '/',
  requirePermission('permissions:read'),
  validateRequest(getPermissionsQuerySchema),
  permissionController.getPermissions
);

export default router;
