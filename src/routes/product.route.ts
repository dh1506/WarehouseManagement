import { Router } from 'express';
import * as productController from '../controllers/product.controller';
import { validateRequest } from '../middlewares/validate.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/permission.middleware';
import {
  getProductsQuerySchema,
  getProductByIdParamSchema,
  createProductSchema,
  updateProductSchema,
} from '../schemas/product.schema';

const router = Router();

router.use(authenticate);

// GET /api/products
router.get(
  '/',
  requirePermission('products:read'),
  validateRequest(getProductsQuerySchema),
  productController.getProducts
);

// GET /api/products/:id
router.get(
  '/:id',
  requirePermission('products:read'),
  validateRequest(getProductByIdParamSchema),
  productController.getProductById
);

// POST /api/products
router.post(
  '/',
  requirePermission('products:create'),
  validateRequest(createProductSchema),
  productController.createProduct
);

// PATCH /api/products/:id
router.patch(
  '/:id',
  requirePermission('products:update'),
  validateRequest(updateProductSchema),
  productController.updateProduct
);

export default router;
