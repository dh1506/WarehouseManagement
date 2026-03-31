import { Router } from 'express';
import * as brandController from '../controllers/brand.controller';
import { validateRequest } from '../middlewares/validate.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/permission.middleware';
import {
  getBrandsQuerySchema,
  getBrandByIdParamSchema,
  createBrandSchema,
  updateBrandSchema,
} from '../schemas/brand.schema';

const router = Router();

router.use(authenticate);

// GET /api/brands
router.get(
  '/',
  requirePermission('brands:read'),
  validateRequest(getBrandsQuerySchema),
  brandController.getBrands
);

// GET /api/brands/:id
router.get(
  '/:id',
  requirePermission('brands:read'),
  validateRequest(getBrandByIdParamSchema),
  brandController.getBrandById
);

// POST /api/brands
router.post(
  '/',
  requirePermission('brands:create'),
  validateRequest(createBrandSchema),
  brandController.createBrand
);

// PATCH /api/brands/:id
router.patch(
  '/:id',
  requirePermission('brands:update'),
  validateRequest(updateBrandSchema),
  brandController.updateBrand
);

export default router;
