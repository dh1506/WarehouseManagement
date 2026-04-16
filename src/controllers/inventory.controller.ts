import type { Request, Response } from "express";
import * as inventoryService from "../services/inventory.service";
import { catchAsync } from "../utils/catch-async";

/**
 * Tra cứu tồn kho
 * GET /api/inventories
 */
export const getInventories = catchAsync(async (req: Request, res: Response) => {
  const query = {
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 10,
    product_id: req.query.product_id ? Number(req.query.product_id) : undefined,
    warehouse_id: req.query.warehouse_id ? Number(req.query.warehouse_id) : undefined,
    warehouse_location_id: req.query.warehouse_location_id
      ? Number(req.query.warehouse_location_id)
      : undefined,
    lot_id: req.query.lot_id ? Number(req.query.lot_id) : undefined,
    expires_before: req.query.expires_before
      ? new Date(String(req.query.expires_before))
      : undefined,
    is_available: req.query.is_available !== undefined 
      ? req.query.is_available === "true" 
      : undefined,
    search: req.query.search ? String(req.query.search) : undefined,
  };

  // Gọi service với object query đã được chuẩn hóa
  const result = await inventoryService.getInventories(query);

  res.status(200).json({
    success: true,
    data: result,
    message: "Tra cứu tồn kho thành công",
  });
});


export const getInventoryById = catchAsync(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const inventory = await inventoryService.getInventoryById(id);

    res.status(200).json({
      success: true,
      data: inventory,
      message: "Lấy thông tin inventory thành công",
    });
  },
);

export const createInventory = catchAsync(
  async (req: Request, res: Response) => {
    const inventory = await inventoryService.createInventory(req.body);

    res.status(201).json({
      success: true,
      data: inventory,
      message: "Tạo inventory thành công",
    });
  },
);

export const updateInventory = catchAsync(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const inventory = await inventoryService.updateInventory(id, req.body);

    res.status(200).json({
      success: true,
      data: inventory,
      message: "Cập nhật inventory thành công",
    });
  },
);

export const deleteInventory = catchAsync(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await inventoryService.deleteInventory(id);

    res.status(200).json({
      success: true,
      data: null,
      message: "Xóa inventory thành công",
    });
  },
);

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
