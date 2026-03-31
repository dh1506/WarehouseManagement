import { Router } from 'express';
import * as manufacturerController from '../controllers/manufacturer.controller';
import { validateRequest } from '../middlewares/validate.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/permission.middleware';
import {
  getManufacturersQuerySchema,
  getManufacturerByIdParamSchema,
  createManufacturerSchema,
  updateManufacturerSchema,
} from '../schemas/manufacturer.schema';

const router = Router();

router.use(authenticate);

// GET /api/manufacturers
router.get(
  '/',
  requirePermission('manufacturers:read'),
  validateRequest(getManufacturersQuerySchema),
  manufacturerController.getManufacturers
);

// GET /api/manufacturers/:id
router.get(
  '/:id',
  requirePermission('manufacturers:read'),
  validateRequest(getManufacturerByIdParamSchema),
  manufacturerController.getManufacturerById
);

// POST /api/manufacturers
router.post(
  '/',
  requirePermission('manufacturers:create'),
  validateRequest(createManufacturerSchema),
  manufacturerController.createManufacturer
);

// PATCH /api/manufacturers/:id
router.patch(
  '/:id',
  requirePermission('manufacturers:update'),
  validateRequest(updateManufacturerSchema),
  manufacturerController.updateManufacturer
);

export default router;
