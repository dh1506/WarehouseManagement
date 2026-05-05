import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async';
import * as aiForecastService from '../services/ai-forecast.service';

/**
 * Tạo sự kiện AI Forecast (Event)
 */
export const createForecastEvent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new Error('User ID not found in request');

  const event = await aiForecastService.createForecastEvent(req.body, userId);
  res.status(201).json({
    success: true,
    data: event,
    message: 'Tạo sự kiện dự báo thành công',
  });
});

/**
 * Lấy danh sách sự kiện
 */
export const getForecastEvents = catchAsync(async (req: Request, res: Response) => {
  const events = await aiForecastService.listForecastEvents();
  res.status(200).json({
    success: true,
    data: events,
    message: 'Lấy danh sách sự kiện thành công',
  });
});

/**
 * Trigger AI Forecast thủ công
 */
export const triggerForecast = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new Error('User ID not found in request');

  const result = await aiForecastService.triggerForecast({
    ...req.body,
    triggeredBy: userId,
  });

  res.status(200).json({
    success: true,
    data: result,
    message: 'Chạy dự báo AI thành công',
  });
});

/**
 * Lấy lịch sử dự báo
 */
export const getForecastHistory = catchAsync(async (req: Request, res: Response) => {
  const query: { page: string; limit: string; forecast_month?: string; status?: string } = {
    page: (req.query.page as string) ?? '1',
    limit: (req.query.limit as string) ?? '10',
  };

  if (req.query.forecast_month) query.forecast_month = req.query.forecast_month as string;
  if (req.query.status) query.status = req.query.status as string;

  const result = await aiForecastService.listForecastHistory(query);
  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy lịch sử dự báo thành công',
  });
});

/**
 * Lấy chi tiết một lần dự báo
 */
export const getForecastDetail = catchAsync(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const result = await aiForecastService.getForecastDetail(id);
  res.status(200).json({
    success: true,
    data: result,
    message: 'Lấy chi tiết dự báo thành công',
  });
});

/**
 * Phê duyệt / Từ chối một kết quả dự báo
 */
export const reviewForecastResult = catchAsync(async (req: Request, res: Response) => {
  const resultId = parseInt(req.params.id as string);
  const userId = req.user?.id;
  if (!userId) throw new Error('User ID not found in request');

  const { action, reject_reason } = req.body;

  const updatedResult = await aiForecastService.reviewForecastResult(
    resultId,
    action,
    userId,
    reject_reason
  );

  res.status(200).json({
    success: true,
    data: updatedResult,
    message: `Đã ${action === 'APPROVE' ? 'phê duyệt' : 'từ chối'} kết quả dự báo`,
  });
});

/**
 * Cập nhật số lượng bán thực tế và tính MAPE
 */
export const updateActualQty = catchAsync(async (req: Request, res: Response) => {
  const resultId = parseInt(req.params.id as string);
  const { actual_qty } = req.body;

  const updatedResult = await aiForecastService.updateActualAndCalcMape(resultId, actual_qty);

  res.status(200).json({
    success: true,
    data: updatedResult,
    message: 'Cập nhật số lượng thực tế và tính MAPE thành công',
  });
});

/**
 * Trigger quá trình AI Retrain
 */
export const triggerRetrain = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new Error('User ID not found in request');

  const batch = await aiForecastService.triggerRetrain(userId);

  res.status(200).json({
    success: true,
    data: batch,
    message: 'Gửi yêu cầu retrain AI thành công',
  });
});
