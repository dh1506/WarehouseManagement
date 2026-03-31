import type { Request, Response } from 'express';
import * as productCategoryService from '../services/product-category.service';
import { catchAsync } from '../utils/catch-async';

/**
 * Lấy danh sách danh mục sản phẩm
 * GET /api/product-categories
 */
export const getProductCategories = catchAsync(async (req: Request, res: Response) => {
  const query = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    search: req.query.search as string | undefined,
    parent_id: req.query.parent_id ? Number(req.query.parent_id) : undefined,
  };

  const result = await productCategoryService.getProductCategories(query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách danh mục sản phẩm thành công',
  });
});

/**
 * Lấy chi tiết danh mục sản phẩm theo ID
 * GET /api/product-categories/:id
 */
export const getProductCategoryById = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const category = await productCategoryService.getProductCategoryById(id);

  res.status(200).json({
    success: true,
    data: category,
    message: 'Lấy thông tin danh mục sản phẩm thành công',
  });
});

/**
 * Tạo mới danh mục sản phẩm
 * POST /api/product-categories
 */
export const createProductCategory = catchAsync(async (req: Request, res: Response) => {
  const category = await productCategoryService.createProductCategory(req.body);

  res.status(201).json({
    success: true,
    data: category,
    message: 'Tạo danh mục sản phẩm thành công',
  });
});

/**
 * Cập nhật danh mục sản phẩm
 * PATCH /api/product-categories/:id
 */
export const updateProductCategory = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const category = await productCategoryService.updateProductCategory(id, req.body);

  res.status(200).json({
    success: true,
    data: category,
    message: 'Cập nhật danh mục sản phẩm thành công',
  });
});

/**
 * Xóa danh mục sản phẩm
 * DELETE /api/product-categories/:id
 */
export const deleteProductCategory = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await productCategoryService.deleteProductCategory(id);

  res.status(200).json({
    success: true,
    data: null,
    message: result.message,
  });
});
