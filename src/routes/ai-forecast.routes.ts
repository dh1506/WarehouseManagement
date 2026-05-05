import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
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
  validateRequest(schemas.createForecastEventSchema),
  aiForecastController.createForecastEvent
);

router.get('/events', aiForecastController.getForecastEvents);

// =============================================
// AI Forecast Core
// =============================================

// Trigger dự báo
router.post(
  '/trigger',
  validateRequest(schemas.triggerForecastSchema),
  aiForecastController.triggerForecast
);

// Lấy lịch sử dự báo
router.get(
  '/',
  validateRequest(schemas.listForecastHistorySchema),
  aiForecastController.getForecastHistory
);

// Lấy chi tiết 1 lần dự báo
router.get('/:id', aiForecastController.getForecastDetail);

// =============================================
// AI Forecast Results & Feedback
// =============================================

// Phê duyệt hoặc Từ chối 1 kết quả
router.post(
  '/results/:id/review',
  validateRequest(schemas.reviewForecastResultSchema),
  aiForecastController.reviewForecastResult
);

// Cập nhật số lượng thực tế (để tính MAPE)
router.post(
  '/results/:id/actual',
  validateRequest(schemas.updateActualQtySchema),
  aiForecastController.updateActualQty
);

// =============================================
// AI Retrain
// =============================================

// Trigger gom feedback gửi AI retrain
router.post('/retrain', aiForecastController.triggerRetrain);

export default router;
