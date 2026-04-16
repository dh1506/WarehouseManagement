import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async';
import * as stockOutService from '../services/stock-out.service';
import { StockOutType, StockOutStatus } from '../generated';

/**
 * Lấy danh sách phiếu xuất kho với phân trang và bộ lọc
 * GET /api/stock-outs
 */
export const getStockOuts = catchAsync(async (req: Request, res: Response) => {
  const query = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    search: req.query.search as string | undefined,
    status: req.query.status as StockOutStatus | undefined,
    type: req.query.type as StockOutType | undefined,
  };

  const result = await stockOutService.getStockOuts(query);
  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy danh sách phiếu xuất thành công',
  });
});

/**
 * Lấy chi tiết phiếu xuất kho theo ID
 * GET /api/stock-outs/:id
 */
export const getStockOutById = catchAsync(async (req: Request, res: Response) => {
  const stockOut = await stockOutService.getStockOutById(Number(req.params.id));
  res.status(200).json({
    success: true,
    data: stockOut,
    message: 'Lấy chi tiết phiếu xuất thành công',
  });
});

/**
 * Tạo mới phiếu xuất bán
 * POST /api/stock-outs/sales
 */
export const createSalesStockOut = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const payload = { ...req.body, type: StockOutType.SALES };
  const stockOut = await stockOutService.createStockOut(payload, userId);
  
  res.status(201).json({
    success: true,
    data: stockOut,
    message: 'Tạo phiếu xuất bán thành công',
  });
});

/**
 * Tạo mới phiếu trả nhà cung cấp
 * POST /api/stock-outs/returns
 */
export const createReturnStockOut = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const payload = { ...req.body, type: StockOutType.RETURN_TO_SUPPLIER };
  const stockOut = await stockOutService.createStockOut(payload, userId);
  
  res.status(201).json({
    success: true,
    data: stockOut,
    message: 'Tạo phiếu trả nhà cung cấp thành công',
  });
});

/**
 * Gửi duyệt phiếu xuất kho
 * PATCH /api/stock-outs/:id/submit
 */
export const submitStockOut = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const stockOut = await stockOutService.submitStockOut(Number(req.params.id), userId);
  
  res.status(200).json({
    success: true,
    data: stockOut,
    message: 'Gửi duyệt phiếu xuất thành công',
  });
});

/**
 * Phê duyệt phiếu xuất và giữ tồn kho
 * PATCH /api/stock-outs/:id/approve
 */
export const approveStockOut = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const stockOut = await stockOutService.approveStockOut(Number(req.params.id), userId);
  
  res.status(200).json({
    success: true,
    data: stockOut,
    message: 'Phê duyệt phiếu xuất và giữ tồn kho thành công',
  });
});

/**
 * Cập nhật lô hàng xuất kho an toàn
 * PUT /api/stock-outs/:id/picked-lots
 */
export const updatePickedLots = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const stockOut = await stockOutService.updatePickedLots(Number(req.params.id), req.body, userId);
  
  res.status(200).json({
    success: true,
    data: stockOut,
    message: 'Cập nhật lô hàng xuất kho thành công',
  });
});

/**
 * Hoàn tất giao hàng và trừ tồn kho thực tế
 * PATCH /api/stock-outs/:id/complete
 */
export const completeStockOut = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const stockOut = await stockOutService.completeStockOut(Number(req.params.id), userId);
  
  res.status(200).json({
    success: true,
    data: stockOut,
    message: 'Hoàn tất giao hàng và trừ tồn kho thành công',
  });
});

/**
 * Hủy phiếu xuất kho
 * PATCH /api/stock-outs/:id/cancel
 */
export const cancelStockOut = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any).id;
  const stockOut = await stockOutService.cancelStockOut(Number(req.params.id), userId, req.body.reason);
  
  res.status(200).json({
    success: true,
    data: stockOut,
    message: 'Hủy phiếu xuất kho thành công',
  });
});

/**
 * Lập biên bản chênh lệch khi thừa/thiếu hàng
 * POST /api/stock-outs/:id/discrepancies
 */
export const createDiscrepancy = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const reporterId = (req.user as any).id;
  const body = req.body;
  const discrepancy = await stockOutService.createDiscrepancy(id, reporterId, body);

  res.status(201).json({
    success: true,
    data: discrepancy,
    message: "Lập biên bản chênh lệch thành công",
  });
});

/**
 * Xử lý biên bản chênh lệch
 * PATCH /api/stock-outs/:id/discrepancies/:discId/resolve
 */
export const resolveDiscrepancy = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const discId = Number(req.params.discId);
  const resolverId = (req.user as any).id;
  const body = req.body;
  const discrepancy = await stockOutService.resolveDiscrepancy(
    id,
    discId,
    resolverId,
    body
  );

  res.status(200).json({
    success: true,
    data: discrepancy,
    message: "Xử lý biên bản chênh lệch thành công",
  });
});
