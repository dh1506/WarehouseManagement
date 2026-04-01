import type { Request, Response } from 'express';
import * as warehouseService from '../services/warehouse.service';
import { catchAsync } from '../utils/catch-async';

// WAREHOUSE
export const getWarehouses = catchAsync(async (req: Request, res: Response) => {
  const query = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    search: req.query.search as string | undefined,
    is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
  };

  const result = await warehouseService.getWarehouses(query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách kho thành công',
  });
});

export const getWarehouseById = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const warehouse = await warehouseService.getWarehouseById(id);

  res.status(200).json({
    success: true,
    data: warehouse,
    message: 'Lấy thông tin kho thành công',
  });
});

export const createWarehouse = catchAsync(async (req: Request, res: Response) => {
  const warehouse = await warehouseService.createWarehouse(req.body);

  res.status(201).json({
    success: true,
    data: warehouse,
    message: 'Tạo kho thành công',
  });
});

export const updateWarehouse = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const warehouse = await warehouseService.updateWarehouse(id, req.body);

  res.status(200).json({
    success: true,
    data: warehouse,
    message: 'Cập nhật kho thành công',
  });
});

// WAREHOUSE LOCATIONS
export const getLocations = catchAsync(async (req: Request, res: Response) => {
  const query = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    warehouse_id: req.query.warehouse_id ? Number(req.query.warehouse_id) : undefined,
    zone_code: req.query.zone_code as string | undefined,
    aisle_code: req.query.aisle_code as string | undefined,
    rack_code: req.query.rack_code as string | undefined,
    location_status: req.query.location_status as any,
    storage_condition: req.query.storage_condition as any,
    search: req.query.search as string | undefined,
  };

  const result = await warehouseService.getLocations(query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách vị trí kho thành công',
  });
});

export const getLocationById = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const location = await warehouseService.getLocationById(id);

  res.status(200).json({
    success: true,
    data: location,
    message: 'Lấy thông tin vị trí kho thành công',
  });
});

export const createLocation = catchAsync(async (req: Request, res: Response) => {
  const location = await warehouseService.createLocation(req.body);

  res.status(201).json({
    success: true,
    data: location,
    message: 'Tạo vị trí kho thành công',
  });
});

export const updateLocation = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const location = await warehouseService.updateLocation(id, req.body);

  res.status(200).json({
    success: true,
    data: location,
    message: 'Cập nhật thông tin vị trí kho thành công',
  });
});
