import type { Request, Response } from 'express';
import * as supplierService from '../services/supplier.service';
import { catchAsync } from '../utils/catch-async';

/**
 * Lấy danh sách nhà cung cấp
 * GET /api/suppliers
 */
export const getSuppliers = catchAsync(async (req: Request, res: Response) => {
  const query = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    search: req.query.search as string | undefined,
    is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
  };

  const result = await supplierService.getSuppliers(query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách nhà cung cấp thành công',
  });
});

/**
 * Lấy chi tiết nhà cung cấp theo ID
 * GET /api/suppliers/:id
 */
export const getSupplierById = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const supplier = await supplierService.getSupplierById(id);

  res.status(200).json({
    success: true,
    data: supplier,
    message: 'Lấy thông tin nhà cung cấp thành công',
  });
});

/**
 * Tạo mới nhà cung cấp
 * POST /api/suppliers
 */
export const createSupplier = catchAsync(async (req: Request, res: Response) => {
  const supplier = await supplierService.createSupplier(req.body);

  res.status(201).json({
    success: true,
    data: supplier,
    message: 'Tạo nhà cung cấp thành công',
  });
});

/**
 * Cập nhật nhà cung cấp
 * PATCH /api/suppliers/:id
 */
export const updateSupplier = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const supplier = await supplierService.updateSupplier(id, req.body);

  res.status(200).json({
    success: true,
    data: supplier,
    message: 'Cập nhật nhà cung cấp thành công',
  });
});
