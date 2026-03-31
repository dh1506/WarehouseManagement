import type { Request, Response } from 'express';
import * as brandService from '../services/brand.service';
import { catchAsync } from '../utils/catch-async';

/**
 * Lấy danh sách thương hiệu
 * GET /api/brands
 */
export const getBrands = catchAsync(async (req: Request, res: Response) => {
  const query = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    search: req.query.search as string | undefined,
    is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
  };

  const result = await brandService.getBrands(query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách thương hiệu thành công',
  });
});

/**
 * Lấy chi tiết thương hiệu theo ID
 * GET /api/brands/:id
 */
export const getBrandById = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const brand = await brandService.getBrandById(id);

  res.status(200).json({
    success: true,
    data: brand,
    message: 'Lấy thông tin thương hiệu thành công',
  });
});

/**
 * Tạo mới thương hiệu
 * POST /api/brands
 */
export const createBrand = catchAsync(async (req: Request, res: Response) => {
  const brand = await brandService.createBrand(req.body);

  res.status(201).json({
    success: true,
    data: brand,
    message: 'Tạo thương hiệu thành công',
  });
});

/**
 * Cập nhật thương hiệu
 * PATCH /api/brands/:id
 */
export const updateBrand = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const brand = await brandService.updateBrand(id, req.body);

  res.status(200).json({
    success: true,
    data: brand,
    message: 'Cập nhật thương hiệu thành công',
  });
});
