import type { Request, Response } from 'express';
import * as manufacturerService from '../services/manufacturer.service';
import { catchAsync } from '../utils/catch-async';

/**
 * Lấy danh sách nhà sản xuất
 * GET /api/manufacturers
 */
export const getManufacturers = catchAsync(async (req: Request, res: Response) => {
  const query = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    search: req.query.search as string | undefined,
    is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
  };

  const result = await manufacturerService.getManufacturers(query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách nhà sản xuất thành công',
  });
});

/**
 * Lấy chi tiết nhà sản xuất theo ID
 * GET /api/manufacturers/:id
 */
export const getManufacturerById = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const manufacturer = await manufacturerService.getManufacturerById(id);

  res.status(200).json({
    success: true,
    data: manufacturer,
    message: 'Lấy thông tin nhà sản xuất thành công',
  });
});

/**
 * Tạo mới nhà sản xuất
 * POST /api/manufacturers
 */
export const createManufacturer = catchAsync(async (req: Request, res: Response) => {
  const manufacturer = await manufacturerService.createManufacturer(req.body);

  res.status(201).json({
    success: true,
    data: manufacturer,
    message: 'Tạo nhà sản xuất thành công',
  });
});

/**
 * Cập nhật nhà sản xuất
 * PATCH /api/manufacturers/:id
 */
export const updateManufacturer = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const manufacturer = await manufacturerService.updateManufacturer(id, req.body);

  res.status(200).json({
    success: true,
    data: manufacturer,
    message: 'Cập nhật nhà sản xuất thành công',
  });
});
