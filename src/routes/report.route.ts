import { Router } from "express";
import * as ReportController from "../controllers/report.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import { validateRequest } from "../middlewares/validate.middleware";
import { reportFilterSchema, createReportConfigSchema, updateReportConfigSchema, reportConfigIdParamSchema } from "../schemas/report.schema";

const router = Router();

router.use(authenticate);

// Dashboard
router.get(
  "/dashboard/summary",
  requirePermission("dashboard:read"),
  validateRequest(reportFilterSchema),
  ReportController.getDashboardSummary
);

// Reports
router.get(
  "/stock-in",
  requirePermission("reports:read"),
  validateRequest(reportFilterSchema),
  ReportController.getStockInReport
);

router.get(
  "/stock-out",
  requirePermission("reports:read"),
  validateRequest(reportFilterSchema),
  ReportController.getStockOutReport
);

router.get(
  "/stock-count",
  requirePermission("reports:read"),
  validateRequest(reportFilterSchema),
  ReportController.getStockCountReport
);

router.get(
  "/stock-disposal",
  requirePermission("reports:read"),
  validateRequest(reportFilterSchema),
  ReportController.getStockDisposalReport
);

router.get(
  "/inventory",
  requirePermission("reports:read"),
  validateRequest(reportFilterSchema),
  ReportController.getInventoryReport
);

// Report Configs
router.get(
  "/configs",
  requirePermission("report_configs:read"),
  ReportController.getReportConfigs
);

router.post(
  "/configs",
  requirePermission("report_configs:create"),
  validateRequest(createReportConfigSchema),
  ReportController.createReportConfig
);

router.get(
  "/configs/:id",
  requirePermission("report_configs:read"),
  validateRequest(reportConfigIdParamSchema),
  ReportController.getReportConfigById
);

router.patch(
  "/configs/:id",
  requirePermission("report_configs:update"),
  validateRequest(updateReportConfigSchema),
  ReportController.updateReportConfig
);

router.delete(
  "/configs/:id",
  requirePermission("report_configs:delete"),
  validateRequest(reportConfigIdParamSchema),
  ReportController.deleteReportConfig
);

export default router;
