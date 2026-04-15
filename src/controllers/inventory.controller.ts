import type { Request, Response } from "express";
import * as inventoryService from "../services/inventory.service";
import { catchAsync } from "../utils/catch-async";

/**
 * Tra cứu tồn kho
 * GET /api/inventories
 */
export const getInventories = catchAsync(async (req: Request, res: Response) => {
  const result = await inventoryService.getInventories(req.query as any);

  res.status(200).json({
    success: true,
    data: result,
    message: "Tra cứu tồn kho thành công",
  });
});

/**
 * Cảnh báo tồn kho
 * GET /api/inventories/alerts
 */
export const getInventoryAlerts = catchAsync(async (req: Request, res: Response) => {
  const alerts = await inventoryService.getInventoryAlerts(req.query as any);

  res.status(200).json({
    success: true,
    data: alerts,
    message: "Lấy danh sách cảnh báo tồn kho thành công",
  });
});

/**
 * Cập nhật hạn mức tồn kho
 * PUT /api/inventories/products/:productId/thresholds
 */
export const updateThresholds = catchAsync(async (req: Request, res: Response) => {
  const productId = Number(req.params.productId);
  const result = await inventoryService.updateProductStockConfig(productId, req.body);

  res.status(200).json({
    success: true,
    data: result,
    message: "Cập nhật hạn mức tồn kho thành công",
  });
});

/**
 * Khóa sổ hệ thống
 * POST /api/inventories/closing
 */
export const closePeriod = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const result = await inventoryService.closeInventoryPeriod(req.body, userId);

  res.status(201).json({
    success: true,
    data: result,
    message: "Khóa sổ hệ thống thành công",
  });
});
