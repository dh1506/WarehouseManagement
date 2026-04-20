import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async';
import * as stockDisposalService from '../services/stock-disposal.service';
import type {
  CreateStockDisposalInput,
} from '../schemas/stock-disposal.schema';

/**
 * Lấy danh mục nguyên nhân hủy
 * GET /api/stock-disposals/reasons?is_active=true
 */
export const getDisposalReasons = catchAsync(async (req: Request, res: Response) => {
  const isActive = req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined;
  const reasons = await stockDisposalService.getDisposalReasons(isActive);

  res.status(200).json({
    success: true,
    data: reasons,
    message: 'Lấy danh mục nguyên nhân hủy thành công',
  });
});

/**
 * Lấy danh sách phiếu hủy hàng với phân trang và bộ lọc
 * GET /api/stock-disposals?page=1&limit=10&search=keyword&status=PENDING
 */
export const getStockDisposals = catchAsync(async (req: Request, res: Response) => {
  const query = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    search: req.query.search as string | undefined,
    status: req.query.status as 'DRAFT' | 'PENDING' | 'APPROVED' | 'COMPLETED' | 'CANCELLED' | undefined,
  };

  const result = await stockDisposalService.getStockDisposals(query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách phiếu hủy hàng thành công',
  });
});

/**
 * Lấy chi tiết phiếu hủy theo ID
 * GET /api/stock-disposals/:id
 */
export const getStockDisposalById = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await stockDisposalService.getStockDisposalById(id);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy chi tiết phiếu hủy thành công',
  });
});

/**
 * Tạo phiếu hủy hàng mới (DRAFT)
 * POST /api/stock-disposals
 */
export const createStockDisposal = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const data = req.body as CreateStockDisposalInput;
  const result = await stockDisposalService.createStockDisposal(userId, data);

  res.status(201).json({
    success: true,
    data: result,
    message: 'Tạo phiếu hủy hàng thành công',
  });
});

/**
 * Cập nhật phiếu hủy (Chỉ khi ở trạng thái DRAFT)
 * PUT /api/stock-disposals/:id
 */
export const updateStockDisposal = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const userId = (req as any).user.id;
  const data = req.body as CreateStockDisposalInput;
  const result = await stockDisposalService.updateStockDisposal(id, userId, data);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Cập nhật phiếu hủy thành công',
  });
});

/**
 * Gửi phê duyệt (DRAFT -> PENDING)
 * PATCH /api/stock-disposals/:id/submit
 */
export const submitStockDisposal = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const userId = (req as any).user.id;
  const result = await stockDisposalService.submitStockDisposal(id, userId);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Gửi phê duyệt thành công',
  });
});

/**
 * Phê duyệt phiếu hủy (PENDING -> APPROVED)
 * PATCH /api/stock-disposals/:id/approve
 */
export const approveStockDisposal = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const userId = (req as any).user.id;
  const result = await stockDisposalService.approveStockDisposal(id, userId);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Phê duyệt phiếu hủy thành công',
  });
});

/**
 * Hoàn tất hủy hàng (APPROVED -> COMPLETED)
 * PATCH /api/stock-disposals/:id/complete
 */
export const completeStockDisposal = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const userId = (req as any).user.id;
  const result = await stockDisposalService.completeStockDisposal(id, userId);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Thực hiện hủy hàng thành công, tồn kho đã được cập nhật',
  });
});

/**
 * Hủy bỏ phiếu hủy hàng
 * PATCH /api/stock-disposals/:id/cancel
 */
export const cancelStockDisposal = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const userId = (req as any).user.id;
  const result = await stockDisposalService.cancelStockDisposal(id, userId);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Hủy bỏ phiếu hủy hàng thành công',
  });
});

/**
 * Thống kê phân tích dữ liệu hủy hàng
 * GET /api/stock-disposals/analytics?from_date=2024-01-01&to_date=2024-12-31
 */
export const getDisposalAnalytics = catchAsync(async (req: Request, res: Response) => {
  const query = {
    from_date: req.query.from_date ? new Date(req.query.from_date as string) : undefined,
    to_date: req.query.to_date ? new Date(req.query.to_date as string) : undefined,
    reason_id: req.query.reason_id ? Number(req.query.reason_id) : undefined,
    warehouse_id: req.query.warehouse_id ? Number(req.query.warehouse_id) : undefined,
  };

  const result = await stockDisposalService.getDisposalAnalytics(query);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy dữ liệu phân tích hủy hàng thành công',
  });
});
