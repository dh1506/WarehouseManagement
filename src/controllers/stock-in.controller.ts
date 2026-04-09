import type { Request, Response } from "express";
import { catchAsync } from "../utils/catch-async";
import * as stockInService from "../services/stock-in.service";
import type { 
  CreateStockInInput,
  RecordReceiptInput,
  CreateDiscrepancyInput,
  ResolveDiscrepancyInput,
  AllocateLotsInput 
} from "../schemas/stock-in.schema";

/**
 * Lấy danh sách phiếu nhập kho
 * GET /api/stock-ins
 */
export const getStockIns = catchAsync(async (req: Request, res: Response) => {
  const query = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    search: req.query.search as string | undefined,
    status: req.query.status as any,
    warehouse_location_id: req.query.warehouse_location_id
      ? Number(req.query.warehouse_location_id)
      : undefined,
    supplier_id: req.query.supplier_id ? Number(req.query.supplier_id) : undefined,
  };

  const result = await stockInService.getStockIns(query);

  res.status(200).json({
    success: true,
    data: result,
    message: "Lấy danh sách phiếu nhập thành công",
  });
});

/**
 * Lấy chi tiết phiếu nhập kho theo ID
 * GET /api/stock-ins/:id
 */
export const getStockInById = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const stockIn = await stockInService.getStockInById(id);

  res.status(200).json({
    success: true,
    data: stockIn,
    message: "Lấy chi tiết phiếu nhập thành công",
  });
});

/**
 * Tạo mới phiếu đề nghị nhập kho
 * POST /api/stock-ins
 */
export const createStockIn = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const body = req.body as CreateStockInInput;
  const stockIn = await stockInService.createStockIn(userId, body);

  res.status(201).json({
    success: true,
    data: stockIn,
    message: "Tạo phiếu đề nghị nhập thành công",
  });
});

/**
 * Duyệt phiếu đề nghị nhập kho
 * PATCH /api/stock-ins/:id/approve
 */
export const approveStockIn = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const approverId = (req as any).user.id;
  const stockIn = await stockInService.approveStockIn(id, approverId);

  res.status(200).json({
    success: true,
    data: stockIn,
    message: "Duyệt đề nghị nhập hàng thành công",
  });
});

/**
 * Cập nhật kiểm đếm thực tế khi nhận hàng
 * PATCH /api/stock-ins/:id/record-receipt
 */
export const recordReceipt = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const body = req.body as RecordReceiptInput;
  const stockIn = await stockInService.recordReceipt(id, body);

  res.status(200).json({
    success: true,
    data: stockIn,
    message: "Cập nhật kiểm đếm thành công",
  });
});

/**
 * Lập biên bản chênh lệch khi thừa/thiếu hàng
 * POST /api/stock-ins/:id/discrepancies
 */
export const createDiscrepancy = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const reporterId = (req as any).user.id;
  const body = req.body as CreateDiscrepancyInput;
  const discrepancy = await stockInService.createDiscrepancy(id, reporterId, body);

  res.status(201).json({
    success: true,
    data: discrepancy,
    message: "Lập biên bản chênh lệch thành công",
  });
});

/**
 * Xử lý biên bản chênh lệch
 * PATCH /api/stock-ins/:id/discrepancies/:discId/resolve
 */
export const resolveDiscrepancy = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const discId = Number(req.params.discId);
  const resolverId = (req as any).user.id;
  const body = req.body as ResolveDiscrepancyInput;
  const discrepancy = await stockInService.resolveDiscrepancy(
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

/**
 * Phân bổ vị trí và số lô cho hàng đã nhập
 * POST /api/stock-ins/:id/allocate
 */
export const allocateLots = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const body = req.body as AllocateLotsInput;
  const stockIn = await stockInService.allocateLots(id, body);

  res.status(200).json({
    success: true,
    data: stockIn,
    message: "Phân bổ lô hàng thành công",
  });
});

/**
 * Hoàn tất quá trình nhập kho
 * POST /api/stock-ins/:id/complete
 */
export const completeStockIn = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const userId = (req as any).user.id;
  const stockIn = await stockInService.completeStockIn(id, userId);

  res.status(200).json({
    success: true,
    data: stockIn,
    message: "Hoàn tất phiếu nhập kho thành công",
  });
});

