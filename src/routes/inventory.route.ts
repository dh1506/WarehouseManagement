import { Router } from "express";
import * as inventoryController from "../controllers/inventory.controller";
import {
  queryInventorySchema,
  inventoryAlertsQuerySchema,
  setProductStockThresholdSchema,
  inventoryClosingSchema,
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

/**
 * @route GET /api/inventories
 * @desc Tra cứu tồn kho đa tiêu chí
 * @access Private
 */
router.get(
  "/",
  requirePermission("inventory:read"),
  validateRequest(queryInventorySchema),
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

/**
 * @route GET /api/inventories/alerts
 * @desc Lấy danh sách cảnh báo tồn kho (âm, thiếu, hết hạn, lâu ngày)
 * @access Private
 */
router.get(
  "/alerts",
  requirePermission("inventory:read"),
  validateRequest(inventoryAlertsQuerySchema),
  inventoryController.getInventoryAlerts,
);

/**
 * @route PUT /api/inventories/products/:productId/thresholds
 * @desc Cấu hình tồn tối thiểu/tối đa/an toàn
 * @access Private
 */
router.put(
  "/products/:productId/thresholds",
  requirePermission("inventory:update"),
  validateRequest(setProductStockThresholdSchema),
  inventoryController.updateThresholds,
);

/**
 * @route POST /api/inventories/closing
 * @desc Khóa sổ hệ thống đến một ngày cụ thể
 * @access Private
 */
router.post(
  "/closing",
  requirePermission("inventory:update"),
  validateRequest(inventoryClosingSchema),
  inventoryController.closePeriod,
);

export default router;
