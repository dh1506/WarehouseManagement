import { Router } from 'express';
import * as unitOfMeasureController from '../controllers/unit-of-measure.controller';
import { validateRequest } from '../middlewares/validate.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/permission.middleware';
import {
  getUnitsOfMeasureQuerySchema,
  getUnitOfMeasureByIdParamSchema,
  createUnitOfMeasureSchema,
  updateUnitOfMeasureSchema,
} from '../schemas/unit-of-measure.schema';

const router = Router();

router.use(authenticate);

// GET /api/units-of-measure
router.get(
  '/',
  requirePermission('uoms:read'),
  validateRequest(getUnitsOfMeasureQuerySchema),
  unitOfMeasureController.getUnitsOfMeasure
);

// GET /api/units-of-measure/:id
router.get(
  '/:id',
  requirePermission('uoms:read'),
  validateRequest(getUnitOfMeasureByIdParamSchema),
  unitOfMeasureController.getUnitOfMeasureById
);

// POST /api/units-of-measure
router.post(
  '/',
  requirePermission('uoms:create'),
  validateRequest(createUnitOfMeasureSchema),
  unitOfMeasureController.createUnitOfMeasure
);

// PATCH /api/units-of-measure/:id
router.patch(
  '/:id',
  requirePermission('uoms:update'),
  validateRequest(updateUnitOfMeasureSchema),
  unitOfMeasureController.updateUnitOfMeasure
);

export default router;
