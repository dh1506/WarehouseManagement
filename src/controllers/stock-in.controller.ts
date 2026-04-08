import type { Request, Response } from "express";
import { catchAsync } from "../utils/catch-async";
import * as stockInService from "../services/stock-in.service";
import type { 
  GetStockInsQuery,
  CreateStockInInput,
  RecordReceiptInput,
  CreateDiscrepancyInput,
  ResolveDiscrepancyInput,
  AllocateLotsInput 
} from "../schemas/stock-in.schema";

export const getStockIns = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as unknown as GetStockInsQuery;
  const result = await stockInService.getStockIns(query);

  res.status(200).json({
    success: true,
    data: result,
    message: "Lấy danh sách phiếu nhập thành công",
  });
});

export const getStockInById = catchAsync(async (req: Request, res: Response) => {
  const stockIn = await stockInService.getStockInById(Number(req.params.id));

  res.status(200).json({
    success: true,
    data: stockIn,
    message: "Lấy chi tiết phiếu nhập thành công",
  });
});

export const createStockIn = catchAsync(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user.id;
  const body = req.body as CreateStockInInput;
  const stockIn = await stockInService.createStockIn(userId, body);

  res.status(201).json({
    success: true,
    data: stockIn,
    message: "Tạo phiếu đề nghị nhập thành công",
  });
});

export const approveStockIn = catchAsync(async (req: Request, res: Response) => {
  // @ts-ignore
  const approverId = req.user.id;
  const stockIn = await stockInService.approveStockIn(Number(req.params.id), approverId);

  res.status(200).json({
    success: true,
    data: stockIn,
    message: "Duyệt đề nghị nhập hàng thành công",
  });
});

export const recordReceipt = catchAsync(async (req: Request, res: Response) => {
  const body = req.body as RecordReceiptInput;
  const stockIn = await stockInService.recordReceipt(Number(req.params.id), body);

  res.status(200).json({
    success: true,
    data: stockIn,
    message: "Cập nhật kiểm đếm thành công",
  });
});

export const createDiscrepancy = catchAsync(async (req: Request, res: Response) => {
  // @ts-ignore
  const reporterId = req.user.id;
  const body = req.body as CreateDiscrepancyInput;
  const discrepancy = await stockInService.createDiscrepancy(Number(req.params.id), reporterId, body);

  res.status(201).json({
    success: true,
    data: discrepancy,
    message: "Lập biên bản chênh lệch thành công",
  });
});

export const resolveDiscrepancy = catchAsync(async (req: Request, res: Response) => {
  // @ts-ignore
  const resolverId = req.user.id;
  const body = req.body as ResolveDiscrepancyInput;
  const discrepancy = await stockInService.resolveDiscrepancy(
    Number(req.params.id),
    Number(req.params.discId),
    resolverId,
    body
  );

  res.status(200).json({
    success: true,
    data: discrepancy,
    message: "Xử lý biên bản chênh lệch thành công",
  });
});

export const allocateLots = catchAsync(async (req: Request, res: Response) => {
  const body = req.body as AllocateLotsInput;
  const stockIn = await stockInService.allocateLots(Number(req.params.id), body);

  res.status(200).json({
    success: true,
    data: stockIn,
    message: "Phân bổ lô hàng thành công",
  });
});

export const completeStockIn = catchAsync(async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user.id;
  const stockIn = await stockInService.completeStockIn(Number(req.params.id), userId);

  res.status(200).json({
    success: true,
    data: stockIn,
    message: "Hoàn tất phiếu nhập kho thành công",
  });
});
