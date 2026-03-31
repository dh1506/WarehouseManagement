import type { Request, Response } from 'express';
import * as unitOfMeasureService from '../services/unit-of-measure.service';
import { catchAsync } from '../utils/catch-async';

/**
 * Lấy danh sách đơn vị tính
 * GET /api/units-of-measure
 */
export const getUnitsOfMeasure = catchAsync(async (req: Request, res: Response) => {
  const query = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    search: req.query.search as string | undefined,
    uom_type: req.query.uom_type as any,
    is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
  };

  const result = await unitOfMeasureService.getUnitsOfMeasure(query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách đơn vị tính thành công',
  });
});

/**
 * Lấy chi tiết đơn vị tính theo ID
 * GET /api/units-of-measure/:id
 */
export const getUnitOfMeasureById = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const uom = await unitOfMeasureService.getUnitOfMeasureById(id);

  res.status(200).json({
    success: true,
    data: uom,
    message: 'Lấy thông tin đơn vị tính thành công',
  });
});

/**
 * Tạo mới đơn vị tính
 * POST /api/units-of-measure
 */
export const createUnitOfMeasure = catchAsync(async (req: Request, res: Response) => {
  const uom = await unitOfMeasureService.createUnitOfMeasure(req.body);

  res.status(201).json({
    success: true,
    data: uom,
    message: 'Tạo đơn vị tính thành công',
  });
});

/**
 * Cập nhật đơn vị tính
 * PATCH /api/units-of-measure/:id
 */
export const updateUnitOfMeasure = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const uom = await unitOfMeasureService.updateUnitOfMeasure(id, req.body);

  res.status(200).json({
    success: true,
    data: uom,
    message: 'Cập nhật đơn vị tính thành công',
  });
});
