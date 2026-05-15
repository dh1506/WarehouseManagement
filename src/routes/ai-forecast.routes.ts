import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import { requirePermission } from '../middlewares/permission.middleware';
import * as aiForecastController from '../controllers/ai-forecast.controller';
import * as schemas from '../schemas/ai-forecast.schema';

const router = Router();

// =============================================
// AI Forecast Events
// =============================================

// Tất cả các route dưới đây yêu cầu đăng nhập
router.use(authenticate);

router.post(
  '/events',
  requirePermission('ai_forecasts:create'),
  validateRequest(schemas.createForecastEventSchema),
  aiForecastController.createForecastEvent
);

router.get('/events', requirePermission('ai_forecasts:read'), aiForecastController.getForecastEvents);

// =============================================
// AI Forecast Core
// =============================================

// Trigger dự báo
router.post(
  '/trigger',
  requirePermission('ai_forecasts:create'),
  validateRequest(schemas.triggerForecastSchema),
  aiForecastController.triggerForecast
);

// Lấy lịch sử dự báo
router.get(
  '/',
  requirePermission('ai_forecasts:read'),
  validateRequest(schemas.listForecastHistorySchema),
  aiForecastController.getForecastHistory
);

// Lấy chi tiết 1 lần dự báo
router.get('/:id', requirePermission('ai_forecasts:read'), aiForecastController.getForecastDetail);

// =============================================
// AI Forecast Results & Feedback
// =============================================

// Phê duyệt hoặc Từ chối nhiều kết quả (Bulk Review)
router.post(
  '/bulk-review',
  requirePermission('ai_forecasts:approve'),
  validateRequest(schemas.bulkReviewForecastResultsSchema),
  aiForecastController.bulkReviewForecastResults
);

// Cập nhật số lượng thực tế (để tính MAPE) cho nhiều kết quả (Bulk Actual)
router.post(
  '/bulk-actual',
  requirePermission('ai_forecasts:update'),
  validateRequest(schemas.bulkUpdateActualQtySchema),
  aiForecastController.bulkUpdateActualQty
);

// =============================================
// AI Retrain
// =============================================

// Trigger gom feedback gửi AI retrain
router.post('/retrain', requirePermission('ai_forecasts:retrain'), aiForecastController.triggerRetrain);

export default router;
