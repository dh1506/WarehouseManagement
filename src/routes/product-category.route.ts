import { Router } from 'express';
import * as productCategoryController from '../controllers/product-category.controller';
import { validateRequest } from '../middlewares/validate.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/permission.middleware';
import {
  getProductCategoriesQuerySchema,
  getProductCategoryByIdParamSchema,
  createProductCategorySchema,
  updateProductCategorySchema,
  deleteProductCategorySchema,
} from '../schemas/product-category.schema';

const router = Router();

// Yêu cầu xác thực
router.use(authenticate);

// GET /api/product-categories — Danh sách
router.get(
  '/',
  requirePermission('categories:read'),
  validateRequest(getProductCategoriesQuerySchema),
  productCategoryController.getProductCategories
);

// GET /api/product-categories/:id — Chi tiết
router.get(
  '/:id',
  requirePermission('categories:read'),
  validateRequest(getProductCategoryByIdParamSchema),
  productCategoryController.getProductCategoryById
);

// POST /api/product-categories — Tạo mới
router.post(
  '/',
  requirePermission('categories:create'),
  validateRequest(createProductCategorySchema),
  productCategoryController.createProductCategory
);

// PATCH /api/product-categories/:id — Cập nhật
router.patch(
  '/:id',
  requirePermission('categories:update'),
  validateRequest(updateProductCategorySchema),
  productCategoryController.updateProductCategory
);

// DELETE /api/product-categories/:id — Xóa (Nếu không có child và products)
router.delete(
  '/:id',
  requirePermission('categories:delete'),
  validateRequest(deleteProductCategorySchema),
  productCategoryController.deleteProductCategory
);

export default router;
