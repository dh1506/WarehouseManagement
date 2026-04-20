import { Router } from "express";
import * as stockDisposalController from "../controllers/stock-disposal.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import { validateRequest } from "../middlewares/validate.middleware";
import * as stockDisposalSchema from "../schemas/stock-disposal.schema";

const router = Router();

// Tất cả route đều yêu cầu xác thực
router.use(authenticate);

// Danh mục nguyên nhân hủy
router.get(
  "/reasons",
  requirePermission("stock_disposals:read"),
  validateRequest(stockDisposalSchema.getDisposalReasonsQuerySchema),
  stockDisposalController.getDisposalReasons
);

// Danh sách phiếu hủy
router.get(
  "/",
  requirePermission("stock_disposals:read"),
  validateRequest(stockDisposalSchema.getStockDisposalsQuerySchema),
  stockDisposalController.getStockDisposals
);

// Dữ liệu phân tích
router.get(
  "/analytics",
  requirePermission("stock_disposals:analytics"),
  validateRequest(stockDisposalSchema.getDisposalAnalyticsSchema),
  stockDisposalController.getDisposalAnalytics
);

// Chi tiết phiếu hủy
router.get(
  "/:id",
  requirePermission("stock_disposals:read"),
  stockDisposalController.getStockDisposalById
);

// Tạo mới phiếu hủy
router.post(
  "/",
  requirePermission("stock_disposals:create"),
  validateRequest(stockDisposalSchema.createStockDisposalSchema),
  stockDisposalController.createStockDisposal
);

// Cập nhật phiếu hủy (DRAFT)
router.put(
  "/:id",
  requirePermission("stock_disposals:update"),
  validateRequest(stockDisposalSchema.updateStockDisposalSchema),
  stockDisposalController.updateStockDisposal
);

// Gửi phê duyệt
router.patch(
  "/:id/submit",
  requirePermission("stock_disposals:update"),
  stockDisposalController.submitStockDisposal
);

// Phê duyệt
router.patch(
  "/:id/approve",
  requirePermission("stock_disposals:approve"),
  stockDisposalController.approveStockDisposal
);

// Hoàn tất (Trừ tồn kho)
router.patch(
  "/:id/complete",
  requirePermission("stock_disposals:approve"),
  stockDisposalController.completeStockDisposal
);

// Hủy bỏ phiếu
router.patch(
  "/:id/cancel",
  requirePermission("stock_disposals:cancel"),
  stockDisposalController.cancelStockDisposal
);

export default router;
