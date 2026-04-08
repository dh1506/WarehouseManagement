import { Router } from "express";
import {
  getAllTransactions,
  getTransactionById,
  createAdjustment,
  exportExcel,
  exportPdf,
} from "../controllers/inventory-transaction.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import { validateRequest } from "../middlewares/validate.middleware";
import {
  getTransactionsQuerySchema,
  getTransactionByIdSchema,
  createAdjustmentSchema,
} from "../schemas/inventory-transaction.schema";

const router = Router();

// Tất cả route cần xác thực
router.use(authenticate);

// Lấy danh sách giao dịch kho (phân trang + lọc)
router.get(
  "/",
  requirePermission("inventory_transactions:read"),
  validateRequest(getTransactionsQuerySchema),
  getAllTransactions
);

// Xuất Excel - ĐẶT TRƯỚC /:id để tránh xung đột route
router.get(
  "/export/excel",
  requirePermission("inventory_transactions:read"),
  validateRequest(getTransactionsQuerySchema),
  exportExcel
);

// Xuất PDF
router.get(
  "/export/pdf",
  requirePermission("inventory_transactions:read"),
  validateRequest(getTransactionsQuerySchema),
  exportPdf
);

// Lấy chi tiết giao dịch theo ID
router.get(
  "/:id",
  requirePermission("inventory_transactions:read"),
  validateRequest(getTransactionByIdSchema),
  getTransactionById
);

// Lập phiếu điều chỉnh tồn kho
// KHÔNG có route PUT/PATCH/DELETE → khóa chặn hoàn toàn việc sửa/xóa giao dịch
router.post(
  "/adjustments",
  requirePermission("inventory_transactions:create"),
  validateRequest(createAdjustmentSchema),
  createAdjustment
);

export default router;
