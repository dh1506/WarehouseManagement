import { Router } from "express";
import * as locationAllowedCategoryController from "../controllers/location-allowed-category.controller";
import { validateRequest } from "../middlewares/validate.middleware";
import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import {
  createLocationAllowedCategorySchema,
  getLocationAllowedCategoriesQuerySchema,
  locationAllowedCategoryParamSchema,
  updateLocationAllowedCategorySchema,
} from "../schemas/location-allowed-category.schema";

const router = Router();

// Endpoints yêu cầu xác thực
router.use(authenticate);

router.get(
  "/",
  requirePermission("location_allowed_categories:read"),
  validateRequest(getLocationAllowedCategoriesQuerySchema),
  locationAllowedCategoryController.getLocationAllowedCategories
);

router.get(
  "/:id",
  requirePermission("location_allowed_categories:read"),
  validateRequest(locationAllowedCategoryParamSchema),
  locationAllowedCategoryController.getLocationAllowedCategoryById
);

router.post(
  "/",
  requirePermission("location_allowed_categories:create"),
  validateRequest(createLocationAllowedCategorySchema),
  locationAllowedCategoryController.createLocationAllowedCategory
);

router.patch(
  "/:id",
  requirePermission("location_allowed_categories:update"),
  validateRequest(updateLocationAllowedCategorySchema),
  locationAllowedCategoryController.updateLocationAllowedCategory
);

router.delete(
  "/:id",
  requirePermission("location_allowed_categories:delete"),
  validateRequest(locationAllowedCategoryParamSchema),
  locationAllowedCategoryController.deleteLocationAllowedCategory
);

export default router;
