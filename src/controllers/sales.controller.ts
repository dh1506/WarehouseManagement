import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async';
import { SalesService } from '../services/sales.service';
import { AppError } from '../utils/app-error';
import { getCurrentUserId } from '../utils/als.util';

/**
 * Import batch from Excel
 * POST /api/sales/import
 */
export const importSalesBatch = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError('Vui lòng đính kèm file Excel', 400);
  }
  
  const fileBuffer = req.file.buffer;
  const originalFilename = req.file.originalname;
  
  const userId = getCurrentUserId() || (req as any).user?.id;
  if (!userId) {
    throw new AppError('Unauthorized', 401);
  }

  const result = await SalesService.importSalesBatch(fileBuffer, userId, originalFilename);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Import dữ liệu bán hàng thành công'
  });
});

/**
 * Lấy danh sách giao dịch bán hàng (Pagination + Filters)
 * GET /api/sales/transactions
 */
export const getTransactions = catchAsync(async (req: Request, res: Response) => {
  const query = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
    warehouse_location_id: req.query.warehouse_location_id ? Number(req.query.warehouse_location_id) : undefined,
    product_id: req.query.product_id ? Number(req.query.product_id) : undefined,
  };

  const result = await SalesService.queryTransactions(query);
  
  res.status(200).json({
    success: true,
    data: result.data,
    meta: result.meta,
    message: 'Lấy dữ liệu giao dịch thành công'
  });
});

/**
 * Lấy dữ liệu tổng hợp hàng ngày
 * GET /api/sales/summaries
 */
export const getDailySummaries = catchAsync(async (req: Request, res: Response) => {
  const query = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
    warehouse_location_id: req.query.warehouse_location_id ? Number(req.query.warehouse_location_id) : undefined,
    product_id: req.query.product_id ? Number(req.query.product_id) : undefined,
  };

  const result = await SalesService.queryDailySummaries(query);
  
  res.status(200).json({
    success: true,
    data: result.data,
    meta: result.meta,
    message: 'Lấy dữ liệu tổng hợp thành công'
  });
});
