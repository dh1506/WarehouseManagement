import { Router } from "express";
import {
  getStockCounts,
  getStockCountById,
  createStockCount,
  startCounting,
  recordCountedQuantity,
  confirmVariance,
  completeCounting,
  approveStockCount,
  cancelStockCount,
  exportPdf,
  exportExcel,
} from "../controllers/stock-count.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import { validateRequest } from "../middlewares/validate.middleware";
import {
  getStockCountsQuerySchema,
  getStockCountByIdParamSchema,
  createStockCountSchema,
  startCountingSchema,
  recordCountedQuantitySchema,
  confirmVarianceSchema,
  completeCountingSchema,
  approveStockCountSchema,
  cancelStockCountSchema,
  exportStockCountSchema,
} from "../schemas/stock-count.schema";

const router = Router();

// Yêu cầu xác thực cho tất cả route
router.use(authenticate);

// Lấy danh sách đợt kiểm kê
router.get(
  "/",
  requirePermission("stock_counts:read"),
  validateRequest(getStockCountsQuerySchema),
  getStockCounts
);

// Lấy chi tiết đợt kiểm kê
router.get(
  "/:id",
  requirePermission("stock_counts:read"),
  validateRequest(getStockCountByIdParamSchema),
  getStockCountById
);

// Tạo đợt kiểm kê mới
router.post(
  "/",
  requirePermission("stock_counts:create"),
  validateRequest(createStockCountSchema),
  createStockCount
);

// Bắt đầu kiểm kê (DRAFT → COUNTING)
router.patch(
  "/:id/start",
  requirePermission("stock_counts:update"),
  validateRequest(startCountingSchema),
  startCounting
);

// Nhập số lượng thực tế kiểm kê
router.patch(
  "/:id/record",
  requirePermission("stock_counts:update"),
  validateRequest(recordCountedQuantitySchema),
  recordCountedQuantity
);

// Xác nhận chênh lệch kiểm kê
router.patch(
  "/:id/confirm-variance",
  requirePermission("stock_counts:update"),
  validateRequest(confirmVarianceSchema),
  confirmVariance
);

// Hoàn tất kiểm kê (COUNTING → COMPLETED)
router.patch(
  "/:id/complete",
  requirePermission("stock_counts:update"),
  validateRequest(completeCountingSchema),
  completeCounting
);

// Phê duyệt kết quả kiểm kê (COMPLETED → APPROVED)
router.patch(
  "/:id/approve",
  requirePermission("stock_counts:approve"),
  validateRequest(approveStockCountSchema),
  approveStockCount
);

// Hủy đợt kiểm kê
router.patch(
  "/:id/cancel",
  requirePermission("stock_counts:cancel"),
  validateRequest(cancelStockCountSchema),
  cancelStockCount
);

// Xuất biên bản kiểm kê PDF
router.get(
  "/:id/export/pdf",
  requirePermission("stock_counts:export"),
  validateRequest(exportStockCountSchema),
  exportPdf
);

// Xuất biên bản kiểm kê Excel
router.get(
  "/:id/export/excel",
  requirePermission("stock_counts:export"),
  validateRequest(exportStockCountSchema),
  exportExcel
);

export default router;
