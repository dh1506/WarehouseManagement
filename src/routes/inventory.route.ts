import { Router } from "express";
import * as inventoryController from "../controllers/inventory.controller";

import {
  getInventoriesQuerySchema,
  inventoryParamSchema,
  createInventorySchema,
  updateInventorySchema,
} from "../schemas/inventory.schema";
import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import { validateRequest } from "../middlewares/validate.middleware";

const router = Router();

// Toàn bộ route yêu cầu đăng nhập
router.use(authenticate);

router.get(
  "/",
  requirePermission("inventory:read"),
  validateRequest(getInventoriesQuerySchema),
  inventoryController.getInventories,
);
router.get(
  "/:id",
  requirePermission("inventory:read"),
  validateRequest(inventoryParamSchema),
  inventoryController.getInventoryById,
);
router.post(
  "/",
  requirePermission("inventory:create"),
  validateRequest(createInventorySchema),
  inventoryController.createInventory,
);
router.patch(
  "/:id",
  requirePermission("inventory:update"),
  validateRequest(updateInventorySchema),
  inventoryController.updateInventory,
);
router.delete(
  "/:id",
  requirePermission("inventory:delete"),
  validateRequest(inventoryParamSchema),
  inventoryController.deleteInventory,
);

export default router;
