import { Router } from "express";
import * as locationAllowedCategoryController from "../controllers/location-allowed-category.controller";
import { validateRequest } from "../middlewares/validate.middleware";
import { authenticate } from "../middlewares/auth.middleware";
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
  validateRequest(getLocationAllowedCategoriesQuerySchema),
  locationAllowedCategoryController.getLocationAllowedCategories
);

router.get(
  "/:id",
  validateRequest(locationAllowedCategoryParamSchema),
  locationAllowedCategoryController.getLocationAllowedCategoryById
);

router.post(
  "/",
  validateRequest(createLocationAllowedCategorySchema),
  locationAllowedCategoryController.createLocationAllowedCategory
);

router.patch(
  "/:id",
  validateRequest(updateLocationAllowedCategorySchema),
  locationAllowedCategoryController.updateLocationAllowedCategory
);

router.delete(
  "/:id",
  validateRequest(locationAllowedCategoryParamSchema),
  locationAllowedCategoryController.deleteLocationAllowedCategory
);

export default router;
