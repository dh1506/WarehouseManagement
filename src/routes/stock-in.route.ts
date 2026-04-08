import { Router } from "express";
import {
  getStockIns,
  getStockInById,
  createStockIn,
  approveStockIn,
  recordReceipt,
  createDiscrepancy,
  resolveDiscrepancy,
  allocateLots,
  completeStockIn,
} from "../controllers/stock-in.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import { validateRequest } from "../middlewares/validate.middleware";
import {
  getStockInsQuerySchema,
  getStockInByIdParamSchema,
  createStockInSchema,
  approveStockInSchema,
  recordReceiptSchema,
  createDiscrepancySchema,
  resolveDiscrepancySchema,
  allocateLotsSchema,
} from "../schemas/stock-in.schema";

const router = Router();

// Authentication middleware
router.use(authenticate);

// Lấy danh sách phiếu nhập
router.get(
  "/",
  requirePermission("stock_ins:read"),
  validateRequest(getStockInsQuerySchema),
  getStockIns
);

// Lấy chi tiết phiếu nhập
router.get(
  "/:id",
  requirePermission("stock_ins:read"),
  validateRequest(getStockInByIdParamSchema),
  getStockInById
);

// Tạo đề nghị nhập
router.post(
  "/",
  requirePermission("stock_ins:create"),
  validateRequest(createStockInSchema),
  createStockIn
);

// Duyệt phiếu thành PENDING
router.patch(
  "/:id/approve",
  requirePermission("stock_ins:approve"),
  validateRequest(approveStockInSchema),
  approveStockIn
);

// Ghi nhận kiểm đếm thực tế
router.patch(
  "/:id/record",
  requirePermission("stock_ins:update"),
  validateRequest(recordReceiptSchema),
  recordReceipt
);

// Lập biên bản chênh lệch
router.post(
  "/:id/discrepancies",
  requirePermission("stock_ins_discrepancies:create"),
  validateRequest(createDiscrepancySchema),
  createDiscrepancy
);

// Duyệt và giải quyết biên bản chênh lệch
router.patch(
  "/:id/discrepancies/:discId/resolve",
  requirePermission("stock_ins_discrepancies:resolve"),
  validateRequest(resolveDiscrepancySchema),
  resolveDiscrepancy
);

// Phân bổ lô hàng
router.post(
  "/:id/allocate",
  requirePermission("stock_ins:update"),
  validateRequest(allocateLotsSchema),
  allocateLots
);

// Hoàn tất quy trình nhập, cộng tồn kho
router.patch(
  "/:id/complete",
  requirePermission("stock_ins:approve"),
  validateRequest(getStockInByIdParamSchema),
  completeStockIn
);

export default router;
