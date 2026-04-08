import { prisma } from "../config/db.config";
import { AppError } from "../utils/app-error";
import { generateAdjustmentCode } from "../utils/generate-code.util";
import { Prisma } from "../generated";
import ExcelJS from "exceljs";
import PdfPrinter from "pdfmake";
import path from "path";
import { fileURLToPath } from "url";
import type {
  GetTransactionsQuery,
  CreateAdjustmentInput,
} from "../schemas/inventory-transaction.schema";
import type { TDocumentDefinitions } from "pdfmake/interfaces";

// ==================== SELECT FIELDS ====================

const transactionSelectFields = {
  id: true,
  warehouse_location_id: true,
  product_id: true,
  lot_id: true,
  product_uom_id: true,
  transaction_type: true,
  quantity: true,
  base_quantity: true,
  balance_after: true,
  reference_type: true,
  reference_id: true,
  reference_line_id: true,
  note: true,
  created_at: true,
  created_by: true,
  transaction_date: true,
  product: {
    select: {
      id: true,
      code: true,
      name: true,
      base_uom: { select: { id: true, code: true, name: true } },
    },
  },
  location: {
    select: {
      id: true,
      location_code: true,
      full_path: true,
      warehouse: { select: { id: true, code: true, name: true } },
    },
  },
  creator: {
    select: { id: true, username: true, full_name: true },
  },
  lot: {
    select: {
      id: true,
      lot_no: true,
      expired_date: true,
      production_date: true,
    },
  },
  uom: {
    select: {
      id: true,
      uom: { select: { code: true, name: true } },
    },
  },
} as const;

// ==================== HELPERS ====================

/**
 * Tính tồn kho trước giao dịch dựa trên loại giao dịch và số lượng
 * Quy ước: base_quantity luôn dương, transaction_type xác định hướng
 */
const computeBalanceBefore = (
  balanceAfter: number,
  baseQuantity: number,
  transactionType: string
): number => {
  switch (transactionType) {
    case "IN":
      return balanceAfter - baseQuantity;
    case "OUT":
      return balanceAfter + baseQuantity;
    case "ADJUSTMENT":
      // Với ADJUSTMENT, base_quantity có thể âm (giảm) hoặc dương (tăng)
      return balanceAfter - baseQuantity;
    case "TRANSFER":
      return balanceAfter - baseQuantity;
    default:
      return balanceAfter;
  }
};

/**
 * Xây dựng WHERE clause từ query params
 */
const buildWhereClause = (query: GetTransactionsQuery) => {
  const where: Record<string, unknown> = {};

  // Lọc theo khoảng thời gian
  if (query.from_date || query.to_date) {
    const dateFilter: Record<string, Date> = {};
    if (query.from_date) dateFilter['gte'] = new Date(query.from_date);
    if (query.to_date) dateFilter['lte'] = new Date(query.to_date);
    where['transaction_date'] = dateFilter;
  }

  // Lọc theo sản phẩm
  if (query.product_id) {
    where['product_id'] = query.product_id;
  }

  // Lọc theo loại giao dịch
  if (query.transaction_type) {
    where['transaction_type'] = query.transaction_type;
  }

  // Lọc theo kho (thông qua location -> warehouse)
  if (query.warehouse_id) {
    where['location'] = { warehouse_id: query.warehouse_id };
  }

  // Lọc theo khu vực (location cụ thể)
  if (query.warehouse_location_id) {
    where['warehouse_location_id'] = query.warehouse_location_id;
  }

  // Lọc theo người thực hiện
  if (query.created_by) {
    where['created_by'] = query.created_by;
  }

  // Lọc theo loại chứng từ (reference_type)
  if (query.reference_type) {
    where['reference_type'] = query.reference_type;
  }

  // Lọc theo mã chứng từ (reference_id)
  if (query.reference_id) {
    where['reference_id'] = query.reference_id;
  }

  return where;
};

// ==================== SERVICE FUNCTIONS ====================

/**
 * Lấy danh sách giao dịch kho có phân trang và bộ lọc
 */
export const getAllTransactions = async (query: GetTransactionsQuery) => {
  const { page, limit } = query;
  const skip = (page - 1) * limit;
  const where = buildWhereClause(query);

  const [transactions, total] = await Promise.all([
    prisma.inventoryTransaction.findMany({
      where,
      select: transactionSelectFields,
      skip,
      take: limit,
      orderBy: { transaction_date: "desc" },
    }),
    prisma.inventoryTransaction.count({ where }),
  ]);

  // Bổ sung balance_before cho từng giao dịch
  const enrichedTransactions = transactions.map((tx) => {
    const balanceBefore = computeBalanceBefore(
      Number(tx.balance_after),
      Number(tx.base_quantity),
      tx.transaction_type
    );

    return {
      ...tx,
      balance_before: balanceBefore,
    };
  });

  return {
    transactions: enrichedTransactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Lấy chi tiết một giao dịch theo ID
 */
export const getTransactionById = async (id: number) => {
  const transaction = await prisma.inventoryTransaction.findUnique({
    where: { id },
    select: transactionSelectFields,
  });

  if (!transaction) {
    throw new AppError("Không tìm thấy giao dịch", 404);
  }

  const balanceBefore = computeBalanceBefore(
    Number(transaction.balance_after),
    Number(transaction.base_quantity),
    transaction.transaction_type
  );

  return {
    ...transaction,
    balance_before: balanceBefore,
  };
};

/**
 * Lập phiếu điều chỉnh tồn kho (ADJUSTMENT)
 * - Tìm inventory hiện tại
 * - Tính balance_before và balance_after
 * - Cập nhật inventory
 * - Tạo bản ghi InventoryTransaction
 */
export const createAdjustment = async (
  userId: number,
  data: CreateAdjustmentInput
) => {
  const { warehouse_location_id, product_id, lot_id, product_uom_id, quantity, note } = data;

  // Kiểm tra location tồn tại
  const location = await prisma.warehouseLocation.findUnique({
    where: { id: warehouse_location_id },
  });
  if (!location) {
    throw new AppError("Vị trí kho không tồn tại", 400);
  }

  // Kiểm tra sản phẩm tồn tại
  const product = await prisma.product.findUnique({
    where: { id: product_id },
  });
  if (!product) {
    throw new AppError("Sản phẩm không tồn tại", 400);
  }

  // Kiểm tra UOM tồn tại
  const productUom = await prisma.productUom.findUnique({
    where: { id: product_uom_id },
  });
  if (!productUom) {
    throw new AppError("Đơn vị tính không tồn tại", 400);
  }

  // Kiểm tra lot nếu có
  if (lot_id) {
    const lot = await prisma.productLot.findUnique({ where: { id: lot_id } });
    if (!lot) {
      throw new AppError("Lô hàng không tồn tại", 400);
    }
    if (lot.product_id !== product_id) {
      throw new AppError("Lô hàng không thuộc sản phẩm này", 400);
    }
  }

  return prisma.$transaction(async (tx) => {
    // Tìm inventory hiện tại
    let inventory = await tx.inventory.findUnique({
      where: {
        product_id_warehouse_location_id: {
          product_id,
          warehouse_location_id,
        },
      },
    });

    // Nếu chưa có inventory, tạo mới (trường hợp điều chỉnh tăng lần đầu)
    if (!inventory) {
      if (quantity < 0) {
        throw new AppError(
          "Không thể điều chỉnh giảm khi chưa có tồn kho tại vị trí này",
          400
        );
      }
      inventory = await tx.inventory.create({
        data: {
          product_id,
          warehouse_location_id,
          quantity: 0,
          available_quantity: 0,
          reserved_quantity: 0,
        },
      });
    }

    const balanceBefore = Number(inventory.quantity);
    const balanceAfter = balanceBefore + quantity;

    // Kiểm tra tồn kho không được âm sau điều chỉnh
    if (balanceAfter < 0) {
      throw new AppError(
        `Tồn kho sau điều chỉnh không được âm. Tồn kho hiện tại: ${balanceBefore}, điều chỉnh: ${quantity}`,
        400
      );
    }

    // Cập nhật inventory
    await tx.inventory.update({
      where: { id: inventory.id },
      data: {
        quantity: { increment: quantity },
        available_quantity: { increment: quantity },
      },
    });

    // Sinh mã phiếu điều chỉnh
    const adjCount = await tx.inventoryTransaction.count({
      where: { transaction_type: "ADJUSTMENT" },
    });
    const adjustmentCode = generateAdjustmentCode(adjCount + 1);

    // Tạo bản ghi giao dịch
    const transaction = await tx.inventoryTransaction.create({
      data: {
        warehouse_location_id,
        product_id,
        lot_id: lot_id ?? null,
        product_uom_id,
        transaction_type: "ADJUSTMENT",
        quantity: new Prisma.Decimal(quantity),
        base_quantity: new Prisma.Decimal(quantity),
        balance_after: new Prisma.Decimal(balanceAfter),
        reference_type: "ADJUSTMENT",
        reference_id: adjustmentCode,
        note,
        created_by: userId,
      },
      select: transactionSelectFields,
    });

    return {
      ...transaction,
      balance_before: balanceBefore,
    };
  });
};

// ==================== EXPORT EXCEL ====================

/**
 * Xuất danh sách giao dịch ra file Excel (.xlsx)
 */
export const exportExcel = async (
  query: GetTransactionsQuery
): Promise<Buffer> => {
  const where = buildWhereClause(query);

  // Lấy toàn bộ dữ liệu (không phân trang)
  const transactions = await prisma.inventoryTransaction.findMany({
    where,
    select: transactionSelectFields,
    orderBy: { transaction_date: "desc" },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Warehouse Management System";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Lịch sử giao dịch");

  // Định nghĩa cột
  worksheet.columns = [
    { header: "STT", key: "stt", width: 6 },
    { header: "Mã giao dịch", key: "id", width: 12 },
    { header: "Ngày giao dịch", key: "transaction_date", width: 20 },
    { header: "Loại GD", key: "transaction_type", width: 14 },
    { header: "Mã SP", key: "product_code", width: 16 },
    { header: "Tên sản phẩm", key: "product_name", width: 30 },
    { header: "Kho", key: "warehouse", width: 16 },
    { header: "Vị trí", key: "location", width: 20 },
    { header: "Lô hàng", key: "lot_no", width: 16 },
    { header: "Số lượng", key: "quantity", width: 14 },
    { header: "Tồn trước GD", key: "balance_before", width: 16 },
    { header: "Tồn sau GD", key: "balance_after", width: 16 },
    { header: "Chứng từ", key: "reference", width: 20 },
    { header: "Người thực hiện", key: "creator", width: 20 },
    { header: "Ghi chú", key: "note", width: 30 },
  ];

  // Style header
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E86AB" },
  };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 24;

  // Thêm dữ liệu
  transactions.forEach((tx, index) => {
    const balanceBefore = computeBalanceBefore(
      Number(tx.balance_after),
      Number(tx.base_quantity),
      tx.transaction_type
    );

    worksheet.addRow({
      stt: index + 1,
      id: tx.id,
      transaction_date: new Date(tx.transaction_date).toLocaleString("vi-VN"),
      transaction_type: tx.transaction_type,
      product_code: tx.product.code,
      product_name: tx.product.name,
      warehouse: tx.location.warehouse?.name ?? "",
      location: tx.location.full_path,
      lot_no: tx.lot?.lot_no ?? "",
      quantity: Number(tx.base_quantity),
      balance_before: balanceBefore,
      balance_after: Number(tx.balance_after),
      reference: tx.reference_id ?? "",
      creator: tx.creator?.full_name ?? "",
      note: tx.note ?? "",
    });
  });

  // Style cho dữ liệu - viền ô
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.alignment = { vertical: "middle" };
    }
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as unknown as Buffer;
};

// ==================== EXPORT PDF ====================

/**
 * Xuất danh sách giao dịch ra file PDF
 */
export const exportPdf = async (
  query: GetTransactionsQuery
): Promise<Buffer> => {
  const where = buildWhereClause(query);

  const transactions = await prisma.inventoryTransaction.findMany({
    where,
    select: transactionSelectFields,
    orderBy: { transaction_date: "desc" },
  });

  // Cấu hình font cho PdfMake (sử dụng fonts đi kèm pdfmake)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const fontsDir = path.resolve(
    __dirname,
    "..",
    "..",
    "node_modules",
    "pdfmake",
    "fonts",
    "Roboto"
  );

  const fonts = {
    Roboto: {
      normal: path.join(fontsDir, "Roboto-Regular.ttf"),
      bold: path.join(fontsDir, "Roboto-Medium.ttf"),
      italics: path.join(fontsDir, "Roboto-Italic.ttf"),
      bolditalics: path.join(fontsDir, "Roboto-MediumItalic.ttf"),
    },
  };

  const printer = new (PdfPrinter as any)(fonts);

  // Xây dựng dữ liệu bảng
  const tableBody: string[][] = [
    [
      "STT",
      "Ngày GD",
      "Loại",
      "Mã SP",
      "Tên SP",
      "Vị trí",
      "SL",
      "Tồn trước",
      "Tồn sau",
      "Người TH",
    ],
  ];

  transactions.forEach((tx, index) => {
    const balanceBefore = computeBalanceBefore(
      Number(tx.balance_after),
      Number(tx.base_quantity),
      tx.transaction_type
    );

    tableBody.push([
      String(index + 1),
      new Date(tx.transaction_date).toLocaleDateString("vi-VN"),
      tx.transaction_type,
      tx.product.code,
      tx.product.name,
      tx.location.full_path,
      String(Number(tx.base_quantity)),
      String(balanceBefore),
      String(Number(tx.balance_after)),
      tx.creator?.full_name ?? "",
    ]);
  });

  const docDefinition: TDocumentDefinitions = {
    pageOrientation: "landscape",
    pageSize: "A4",
    content: [
      {
        text: "BÁO CÁO LỊCH SỬ GIAO DỊCH KHO",
        style: "header",
        alignment: "center",
        margin: [0, 0, 0, 10],
      },
      {
        text: `Ngày xuất: ${new Date().toLocaleString("vi-VN")}`,
        style: "subheader",
        alignment: "right",
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: [25, 60, 35, 55, "*", 80, 35, 45, 45, 70],
          body: tableBody,
        },
        layout: {
          fillColor: (rowIndex: number) => {
            if (rowIndex === 0) return "#2E86AB";
            return rowIndex % 2 === 0 ? "#F5F5F5" : null;
          },
        },
      },
      {
        text: `Tổng số giao dịch: ${transactions.length}`,
        margin: [0, 10, 0, 0],
        bold: true,
      },
    ],
    styles: {
      header: { fontSize: 16, bold: true },
      subheader: { fontSize: 10, italics: true, color: "#666666" },
    },
    defaultStyle: {
      fontSize: 8,
      font: "Roboto",
    },
  };

  // Render PDF sang Buffer
  return new Promise<Buffer>((resolve, reject) => {
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks: Uint8Array[] = [];

    pdfDoc.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks) as unknown as Buffer));
    pdfDoc.on("error", (err: Error) => reject(err));
    pdfDoc.end();
  });
};
