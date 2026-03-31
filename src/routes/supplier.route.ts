import { Router } from 'express';
import * as supplierController from '../controllers/supplier.controller';
import { validateRequest } from '../middlewares/validate.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/permission.middleware';
import {
  getSuppliersQuerySchema,
  getSupplierByIdParamSchema,
  createSupplierSchema,
  updateSupplierSchema,
} from '../schemas/supplier.schema';

const router = Router();

router.use(authenticate);

// GET /api/suppliers
router.get(
  '/',
  requirePermission('suppliers:read'),
  validateRequest(getSuppliersQuerySchema),
  supplierController.getSuppliers
);

// GET /api/suppliers/:id
router.get(
  '/:id',
  requirePermission('suppliers:read'),
  validateRequest(getSupplierByIdParamSchema),
  supplierController.getSupplierById
);

// POST /api/suppliers
router.post(
  '/',
  requirePermission('suppliers:create'),
  validateRequest(createSupplierSchema),
  supplierController.createSupplier
);

// PATCH /api/suppliers/:id
router.patch(
  '/:id',
  requirePermission('suppliers:update'),
  validateRequest(updateSupplierSchema),
  supplierController.updateSupplier
);

export default router;
