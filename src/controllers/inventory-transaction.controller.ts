import type { Request, Response } from "express";
import { catchAsync } from "../utils/catch-async";
import * as inventoryTransactionService from "../services/inventory-transaction.service";
import type {
  GetTransactionsQuery,
  CreateAdjustmentInput,
} from "../schemas/inventory-transaction.schema";

/**
 * Lấy danh sách giao dịch kho (có phân trang & bộ lọc)
 */
export const getAllTransactions = catchAsync(
  async (req: Request, res: Response) => {
    const query = req.query as unknown as GetTransactionsQuery;
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
 */
export const createAdjustment = catchAsync(
  async (req: Request, res: Response) => {
    // @ts-ignore
    const userId = req.user.id;
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
 */
export const exportExcel = catchAsync(
  async (req: Request, res: Response) => {
    const query = req.query as unknown as GetTransactionsQuery;
    const buffer = await inventoryTransactionService.exportExcel(query);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=lich-su-giao-dich-${Date.now()}.xlsx`
    );
    res.send(buffer);
  }
);

/**
 * Xuất danh sách giao dịch ra file PDF
 */
export const exportPdf = catchAsync(
  async (req: Request, res: Response) => {
    const query = req.query as unknown as GetTransactionsQuery;
    const buffer = await inventoryTransactionService.exportPdf(query);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=lich-su-giao-dich-${Date.now()}.pdf`
    );
    res.send(buffer);
  }
);
