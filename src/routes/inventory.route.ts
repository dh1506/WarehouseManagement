import { Router } from "express";
import * as inventoryController from "../controllers/inventory.controller";

import {
  getInventoriesQuerySchema,
  inventoryParamSchema,
  createInventorySchema,
  updateInventorySchema,
} from "../schemas/inventory.schema";
import { validateRequest } from "../middlewares/validate.middleware";

const router = Router();

router.get(
  "/",
  validateRequest(getInventoriesQuerySchema),
  inventoryController.getInventories,
);
router.get(
  "/:id",
  validateRequest(inventoryParamSchema),
  inventoryController.getInventoryById,
);
router.post(
  "/",
  validateRequest(createInventorySchema),
  inventoryController.createInventory,
);
router.put(
  "/:id",
  validateRequest(updateInventorySchema),
  inventoryController.updateInventory,
);
router.delete(
  "/:id",
  validateRequest(inventoryParamSchema),
  inventoryController.deleteInventory,
);

export default router;
