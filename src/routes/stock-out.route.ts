import { Router } from "express";
import * as stockOutController from "../controllers/stock-out.controller";
import { validateRequest } from "../middlewares/validate.middleware";
import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import {
  createStockOutSchema,
  updatePickedLotsSchema,
  cancelStockOutSchema,
  stockOutIdParamSchema,
  createDiscrepancySchema,
  resolveDiscrepancySchema,
} from "../schemas/stock-out.schema";

const router = Router();

// Tất cả endpoints đều yêu cầu đăng nhập
router.use(authenticate);

// Lấy danh sách phiếu xuất
router.get(
  "/",
  requirePermission("stock_outs:read"),
  stockOutController.getStockOuts,
);

// Lấy chi tiết phiếu xuất
router.get(
  "/:id",
  requirePermission("stock_outs:read"),
  validateRequest(stockOutIdParamSchema),
  stockOutController.getStockOutById,
);

// Tạo mới phiếu xuất bán
router.post(
  "/sales",
  requirePermission("stock_outs:create"),
  validateRequest(createStockOutSchema),
  stockOutController.createSalesStockOut,
);

// Tạo mới phiếu trả NCC
router.post(
  "/returns",
  requirePermission("stock_outs:create"),
  validateRequest(createStockOutSchema),
  stockOutController.createReturnStockOut,
);

// Gửi duyệt phiếu xuất (DRAFT -> PENDING)
router.patch(
  "/:id/submit",
  requirePermission("stock_outs:update"),
  validateRequest(stockOutIdParamSchema),
  stockOutController.submitStockOut,
);

// Phê duyệt phiếu xuất (PENDING -> APPROVED)
router.patch(
  "/:id/approve",
  requirePermission("stock_outs:approve"), // Chỉ cấp quản lý trở lên
  validateRequest(stockOutIdParamSchema),
  stockOutController.approveStockOut,
);

// Cập nhật lô hàng xuất (APPROVED/PICKING)
router.put(
  "/:id/picked-lots",
  requirePermission("stock_outs:update"),
  validateRequest(updatePickedLotsSchema),
  stockOutController.updatePickedLots,
);

// Hoàn tất phiếu xuất (PICKING -> COMPLETED)
router.patch(
  "/:id/complete",
  requirePermission("stock_outs:update"),
  validateRequest(stockOutIdParamSchema),
  stockOutController.completeStockOut,
);

// Hủy phiếu xuất (Mọi trạng thái trừ COMPLETED, CANCELLED)
router.patch(
  "/:id/cancel",
  requirePermission("stock_outs:cancel"),
  validateRequest(cancelStockOutSchema),
  stockOutController.cancelStockOut,
);

// Lập biên bản chênh lệch
router.post(
  "/:id/discrepancies",
  requirePermission("stock_outs:update"), 
  validateRequest(createDiscrepancySchema),
  stockOutController.createDiscrepancy,
);

// Xử lý chênh lệch
router.patch(
  "/:id/discrepancies/:discId/resolve",
  requirePermission("stock_outs:approve"), // Đòi hỏi quyền cao hơn để duyệt phương án
  validateRequest(resolveDiscrepancySchema),
  stockOutController.resolveDiscrepancy,
);

export default router;
