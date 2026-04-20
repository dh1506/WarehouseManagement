import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async';
import * as stockCountService from '../services/stock-count.service';
import type {
  CreateStockCountInput,
  RecordCountedQuantityInput,
  ConfirmVarianceInput,
} from '../schemas/stock-count.schema';

/**
 * Lấy danh sách đợt kiểm kê với phân trang và bộ lọc
 * GET /api/stock-counts?page=1&limit=10&search=keyword&status=DRAFT&type=PERIODIC&scope_type=FULL
 */
export const getStockCounts = catchAsync(async (req: Request, res: Response) => {
  const query = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    search: req.query.search as string | undefined,
    status: req.query.status as 'DRAFT' | 'COUNTING' | 'COMPLETED' | 'APPROVED' | 'CANCELLED' | undefined,
    type: req.query.type as 'PERIODIC' | 'AD_HOC' | undefined,
    scope_type: req.query.scope_type as 'FULL' | 'ZONE' | 'PRODUCT' | 'LOT' | undefined,
  };

  const result = await stockCountService.getStockCounts(query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách đợt kiểm kê thành công',
  });
});

/**
 * Lấy chi tiết đợt kiểm kê theo ID
 * GET /api/stock-counts/:id
 */
export const getStockCountById = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const stockCount = await stockCountService.getStockCountById(id);

  res.status(200).json({
    success: true,
    data: stockCount,
    message: 'Lấy chi tiết đợt kiểm kê thành công',
  });
});

/**
 * Tạo đợt kiểm kê mới
 * POST /api/stock-counts
 */
export const createStockCount = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const body = req.body as CreateStockCountInput;
  const stockCount = await stockCountService.createStockCount(userId, body);

  res.status(201).json({
    success: true,
    data: stockCount,
    message: 'Tạo đợt kiểm kê thành công',
  });
});

/**
 * Bắt đầu kiểm kê (DRAFT → COUNTING)
 * PATCH /api/stock-counts/:id/start
 */
export const startCounting = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const stockCount = await stockCountService.startCounting(id);

  res.status(200).json({
    success: true,
    data: stockCount,
    message: 'Bắt đầu kiểm kê thành công. Giao dịch trên phạm vi kiểm kê đã bị khóa.',
  });
});

/**
 * Nhập số lượng thực tế kiểm kê
 * PATCH /api/stock-counts/:id/record
 */
export const recordCountedQuantity = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const userId = (req as any).user.id;
  const body = req.body as RecordCountedQuantityInput;
  const stockCount = await stockCountService.recordCountedQuantity(id, userId, body);

  res.status(200).json({
    success: true,
    data: stockCount,
    message: 'Lưu số liệu kiểm kê thành công',
  });
});

/**
 * Xác nhận chênh lệch kiểm kê
 * PATCH /api/stock-counts/:id/confirm-variance
 */
export const confirmVariance = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const body = req.body as ConfirmVarianceInput;
  const stockCount = await stockCountService.confirmVariance(id, body);

  res.status(200).json({
    success: true,
    data: stockCount,
    message: 'Xác nhận chênh lệch thành công',
  });
});

/**
 * Hoàn tất kiểm kê (COUNTING → COMPLETED)
 * PATCH /api/stock-counts/:id/complete
 */
export const completeCounting = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const stockCount = await stockCountService.completeCounting(id);

  res.status(200).json({
    success: true,
    data: stockCount,
    message: 'Hoàn tất kiểm kê thành công. Đợt kiểm kê chờ phê duyệt.',
  });
});

/**
 * Phê duyệt kết quả kiểm kê (COMPLETED → APPROVED)
 * PATCH /api/stock-counts/:id/approve
 */
export const approveStockCount = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const approverId = (req as any).user.id;
  const stockCount = await stockCountService.approveStockCount(id, approverId);

  res.status(200).json({
    success: true,
    data: stockCount,
    message: 'Phê duyệt kiểm kê thành công. Phiếu điều chỉnh tồn kho đã được tạo tự động.',
  });
});

/**
 * Hủy đợt kiểm kê
 * PATCH /api/stock-counts/:id/cancel
 */
export const cancelStockCount = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const stockCount = await stockCountService.cancelStockCount(id);

  res.status(200).json({
    success: true,
    data: stockCount,
    message: 'Hủy đợt kiểm kê thành công',
  });
});

/**
 * Xuất biên bản kiểm kê PDF
 * GET /api/stock-counts/:id/export/pdf
 */
export const exportPdf = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const buffer = await stockCountService.exportStockCountPdf(id);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="bien-ban-kiem-ke-${id}.pdf"`
  );
  res.send(buffer);
});

/**
 * Xuất biên bản kiểm kê Excel
 * GET /api/stock-counts/:id/export/excel
 */
export const exportExcel = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const buffer = await stockCountService.exportStockCountExcel(id);

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="bien-ban-kiem-ke-${id}.xlsx"`
  );
  res.send(buffer);
});
