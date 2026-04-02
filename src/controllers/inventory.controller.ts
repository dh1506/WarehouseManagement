import type { Request, Response } from "express";
import * as inventoryService from "../services/inventory.service";
import { catchAsync } from "../utils/catch-async";

export const getInventories = catchAsync(
  async (req: Request, res: Response) => {
    const query = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
      product_id: req.query.product_id
        ? Number(req.query.product_id)
        : undefined,
      warehouse_location_id: req.query.warehouse_location_id
        ? Number(req.query.warehouse_location_id)
        : undefined,
    };

    const result = await inventoryService.getInventories(query);

    res.status(200).json({
      success: true,
      data: result,
      message: "Lấy danh sách inventory thành công",
    });
  },
);

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
