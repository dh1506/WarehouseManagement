import type { Request, Response } from "express";
import { catchAsync } from "../utils/catch-async";
import * as inventoryTransactionService from "../services/inventory-transaction.service";
import type { CreateAdjustmentInput } from "../schemas/inventory-transaction.schema";

/**
 * Lấy danh sách giao dịch kho (có phân trang & bộ lọc)
 * GET /api/inventory-transactions
 */
export const getAllTransactions = catchAsync(
  async (req: Request, res: Response) => {
    const query = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
      from_date: req.query.from_date
        ? new Date(String(req.query.from_date))
        : undefined,
      to_date: req.query.to_date
        ? new Date(String(req.query.to_date))
        : undefined,
      product_id: req.query.product_id ? Number(req.query.product_id) : undefined,
      transaction_type: req.query.transaction_type as any,
      warehouse_id: req.query.warehouse_id
        ? Number(req.query.warehouse_id)
        : undefined,
      warehouse_location_id: req.query.warehouse_location_id
        ? Number(req.query.warehouse_location_id)
        : undefined,
      created_by: req.query.created_by ? Number(req.query.created_by) : undefined,
      reference_type: req.query.reference_type as string | undefined,
      reference_id: req.query.reference_id as string | undefined,
    };

    const result = await inventoryTransactionService.getAllTransactions(query);

    res.status(200).json({
      success: true,
      data: result,
      message: "Lấy danh sách giao dịch kho thành công",
    });
  }
);

/**
 * Lấy chi tiết một giao dịch theo ID
 * GET /api/inventory-transactions/:id
 */
export const getTransactionById = catchAsync(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const transaction =
      await inventoryTransactionService.getTransactionById(id);

    res.status(200).json({
      success: true,
      data: transaction,
      message: "Lấy chi tiết giao dịch thành công",
    });
  }
);

/**
 * Lập phiếu điều chỉnh tồn kho
 * POST /api/inventory-transactions/adjust
 */
export const createAdjustment = catchAsync(
  async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const body = req.body as CreateAdjustmentInput;
    const transaction = await inventoryTransactionService.createAdjustment(
      userId,
      body
    );

    res.status(201).json({
      success: true,
      data: transaction,
      message: "Lập phiếu điều chỉnh tồn kho thành công",
    });
  }
);

/**
 * Xuất danh sách giao dịch ra file Excel
 * GET /api/inventory-transactions/export/excel
 */
export const exportExcel = catchAsync(async (req: Request, res: Response) => {
  const query = {
    from_date: req.query.from_date
      ? new Date(String(req.query.from_date))
      : undefined,
    to_date: req.query.to_date ? new Date(String(req.query.to_date)) : undefined,
    product_id: req.query.product_id ? Number(req.query.product_id) : undefined,
    transaction_type: req.query.transaction_type as any,
    warehouse_id: req.query.warehouse_id
      ? Number(req.query.warehouse_id)
      : undefined,
    warehouse_location_id: req.query.warehouse_location_id
      ? Number(req.query.warehouse_location_id)
      : undefined,
    created_by: req.query.created_by ? Number(req.query.created_by) : undefined,
    reference_type: req.query.reference_type as string | undefined,
    reference_id: req.query.reference_id as string | undefined,
  };

  const buffer = await inventoryTransactionService.exportExcel(query as any);

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=lich-su-giao-dich-${Date.now()}.xlsx`
  );
  res.send(buffer);
});

/**
 * Xuất danh sách giao dịch ra file PDF
 * GET /api/inventory-transactions/export/pdf
 */
export const exportPdf = catchAsync(async (req: Request, res: Response) => {
  const query = {
    from_date: req.query.from_date
      ? new Date(String(req.query.from_date))
      : undefined,
    to_date: req.query.to_date ? new Date(String(req.query.to_date)) : undefined,
    product_id: req.query.product_id ? Number(req.query.product_id) : undefined,
    transaction_type: req.query.transaction_type as any,
    warehouse_id: req.query.warehouse_id
      ? Number(req.query.warehouse_id)
      : undefined,
    warehouse_location_id: req.query.warehouse_location_id
      ? Number(req.query.warehouse_location_id)
      : undefined,
    created_by: req.query.created_by ? Number(req.query.created_by) : undefined,
    reference_type: req.query.reference_type as string | undefined,
    reference_id: req.query.reference_id as string | undefined,
  };

  const buffer = await inventoryTransactionService.exportPdf(query as any);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=lich-su-giao-dich-${Date.now()}.pdf`
  );
  res.send(buffer);
});

