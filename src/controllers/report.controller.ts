import type { Request, Response } from "express";
import { ReportService } from "../services/report.service";
import { ReportConfigService } from "../services/report-config.service";
import { catchAsync } from "../utils/catch-async";

export const getDashboardSummary = catchAsync(async (req: Request, res: Response) => {
  const data = await ReportService.getDashboardSummary(req.query);
  res.status(200).json({
    success: true,
    data,
    message: "Lấy dữ liệu tổng quan thành công",
  });
});

export const getStockInReport = catchAsync(async (req: Request, res: Response) => {
  const data = await ReportService.getStockInReport(req.query);
  res.status(200).json({
    success: true,
    data,
    message: "Lấy báo cáo nhập hàng thành công",
  });
});

export const getStockOutReport = catchAsync(async (req: Request, res: Response) => {
  const data = await ReportService.getStockOutReport(req.query);
  res.status(200).json({
    success: true,
    data,
    message: "Lấy báo cáo xuất hàng thành công",
  });
});

export const getStockCountReport = catchAsync(async (req: Request, res: Response) => {
  const data = await ReportService.getStockCountReport(req.query);
  res.status(200).json({
    success: true,
    data,
    message: "Lấy báo cáo kiểm kê thành công",
  });
});

export const getStockDisposalReport = catchAsync(async (req: Request, res: Response) => {
  const data = await ReportService.getStockDisposalReport(req.query);
  res.status(200).json({
    success: true,
    data,
    message: "Lấy báo cáo hủy hàng thành công",
  });
});

export const getInventoryReport = catchAsync(async (req: Request, res: Response) => {
  const data = await ReportService.getInventoryReport(req.query);
  res.status(200).json({
    success: true,
    data,
    message: "Lấy báo cáo tồn kho thành công",
  });
});

// Config Controller
export const getReportConfigs = catchAsync(async (req: Request, res: Response) => {
  const data = await ReportConfigService.getAllConfigs();
  res.status(200).json({
    success: true,
    data,
    message: "Lấy danh sách cấu hình thành công",
  });
});

export const getReportConfigById = catchAsync(async (req: Request, res: Response) => {
  const data = await ReportConfigService.getConfigById(Number(req.params.id));
  res.status(200).json({
    success: true,
    data,
    message: "Lấy chi tiết cấu hình thành công",
  });
});

export const createReportConfig = catchAsync(async (req: Request, res: Response) => {
  const data = await ReportConfigService.createConfig(req.body);
  res.status(201).json({
    success: true,
    data,
    message: "Tạo cấu hình báo cáo thành công",
  });
});

export const updateReportConfig = catchAsync(async (req: Request, res: Response) => {
  const data = await ReportConfigService.updateConfig(Number(req.params.id), req.body);
  res.status(200).json({
    success: true,
    data,
    message: "Cập nhật cấu hình báo cáo thành công",
  });
});

export const deleteReportConfig = catchAsync(async (req: Request, res: Response) => {
  await ReportConfigService.deleteConfig(Number(req.params.id));
  res.status(200).json({
    success: true,
    data: null,
    message: "Xóa cấu hình báo cáo thành công",
  });
});
