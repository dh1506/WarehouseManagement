import type { Request, Response } from 'express';
import * as locationAllowedCategoryService from '../services/location-allowed-category.service';
import { catchAsync } from '../utils/catch-async';

export const getLocationAllowedCategories = catchAsync(async (req: Request, res: Response) => {
  const query = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    location_id: req.query.location_id ? Number(req.query.location_id) : undefined,
    category_id: req.query.category_id ? Number(req.query.category_id) : undefined,
    is_allowed: req.query.is_allowed === 'true' ? true : req.query.is_allowed === 'false' ? false : undefined,
    rule_source: req.query.rule_source as any, // "DIRECT" | "INHERITED" | "OVERRIDE"
  };

  const result = await locationAllowedCategoryService.getLocationAllowedCategories(query);
  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách quy tắc thành công',
  });
});

export const getLocationAllowedCategoryById = catchAsync(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const result = await locationAllowedCategoryService.getLocationAllowedCategoryById(id);
  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy chi tiết quy tắc thành công',
  });
});

export const createLocationAllowedCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await locationAllowedCategoryService.createLocationAllowedCategory(req.body);
  res.status(201).json({
    success: true,
    data: result,
    message: 'Tạo quy tắc mới thành công',
  });
});

export const updateLocationAllowedCategory = catchAsync(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const result = await locationAllowedCategoryService.updateLocationAllowedCategory(id, req.body);
  res.status(200).json({
    success: true,
    data: result,
    message: 'Cập nhật quy tắc thành công',
  });
});

export const deleteLocationAllowedCategory = catchAsync(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  await locationAllowedCategoryService.deleteLocationAllowedCategory(id);
  res.status(200).json({
    success: true,
    data: null,
    message: 'Xóa quy tắc thành công',
  });
});
