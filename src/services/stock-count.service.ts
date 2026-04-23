import { prisma } from "../config/db.config";
import { AppError } from "../utils/app-error";
import { generateStockCountCode, generateAdjustmentCode } from "../utils/generate-code.util";
import { checkIsClosed } from "./inventory.service";
import { Prisma } from "../generated";
import ExcelJS from "exceljs";
// @ts-ignore
import PdfPrinterModule from "pdfmake/js/printer";
// @ts-ignore
import virtualfsModule from "pdfmake/js/virtual-fs";
// @ts-ignore
import URLResolverModule from "pdfmake/js/URLResolver";

const PdfPrinter = (PdfPrinterModule as any).default || PdfPrinterModule;
const virtualfs = (virtualfsModule as any).default || virtualfsModule;
const URLResolver = (URLResolverModule as any).default || URLResolverModule;
import path from "path";
import { fileURLToPath } from "url";
import type { TDocumentDefinitions } from "pdfmake/interfaces";
import type {
  GetStockCountsQuery,
  CreateStockCountInput,
  RecordCountedQuantityInput,
  ConfirmVarianceInput,
} from "../schemas/stock-count.schema";

// ==================== SELECT FIELDS ====================

const stockCountSelectFields = {
  id: true,
  code: true,
  type: true,
  scope_type: true,
  description: true,
  status: true,
  created_at: true,
  updated_at: true,
  creator: { select: { id: true, username: true, full_name: true } },
  approver: { select: { id: true, username: true, full_name: true } },
  details: {
    select: {
      id: true,
      warehouse_location_id: true,
      product_id: true,
      lot_id: true,
      system_quantity: true,
      counted_quantity: true,
      variance_quantity: true,
      unit_price: true,
      variance_reason: true,
      is_confirmed: true,
      counted_by: true,
      counted_at: true,
      location: {
        select: {
          id: true,
          location_code: true,
          full_path: true,
          warehouse: { select: { id: true, code: true, name: true } },
        },
      },
      product: {
        select: {
          id: true,
          code: true,
          name: true,
          base_uom: { select: { id: true, code: true, name: true } },
        },
      },
      lot: {
        select: {
          id: true,
          lot_no: true,
          expired_date: true,
          production_date: true,
        },
      },
      counter: { select: { id: true, username: true, full_name: true } },
    },
  },
  adjustments: {
    select: {
      id: true,
      adjustment_type: true,
      adjustment_quantity: true,
      note: true,
      created_at: true,
      product: { select: { id: true, code: true, name: true } },
      location: { select: { id: true, location_code: true, full_path: true } },
      lot: { select: { id: true, lot_no: true } },
      creator: { select: { id: true, username: true, full_name: true } },
    },
  },
} as const;

// ==================== HELPER: KIỂM TRA KHÓA GIAO DỊCH ====================

/**
 * Kiểm tra xem vị trí + sản phẩm có đang bị khóa bởi đợt kiểm kê hay không.
 * Nếu bị khóa, throw AppError để chặn giao dịch.
 */
export const checkStockCountLock = async (
  warehouseLocationId: number,
  productId: number
): Promise<void> => {
  const lockedDetail = await prisma.stockCountDetail.findFirst({
    where: {
      warehouse_location_id: warehouseLocationId,
      product_id: productId,
      stock_count: {
        status: "COUNTING",
      },
    },
    include: {
      stock_count: { select: { code: true } },
    },
  });

  if (lockedDetail) {
    throw new AppError(
      `Sản phẩm (ID: ${productId}) tại vị trí (ID: ${warehouseLocationId}) đang bị khóa bởi đợt kiểm kê ${lockedDetail.stock_count.code}. Không thể thực hiện giao dịch.`,
      400
    );
  }
};

// ==================== SERVICE FUNCTIONS ====================

/**
 * Lấy danh sách đợt kiểm kê có phân trang và bộ lọc
 */
export const getStockCounts = async (query: GetStockCountsQuery) => {
  const { page, limit, search, status, type, scope_type } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (search) {
    where.code = { contains: search };
  }

  if (status) {
    where.status = status;
  }

  if (type) {
    where.type = type;
  }

  if (scope_type) {
    where.scope_type = scope_type;
  }

  const [stockCounts, total] = await Promise.all([
    prisma.stockCount.findMany({
      where,
      select: stockCountSelectFields,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    prisma.stockCount.count({ where }),
  ]);

  return {
    stockCounts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Lấy chi tiết đợt kiểm kê theo ID
 */
export const getStockCountById = async (id: number) => {
  const stockCount = await prisma.stockCount.findUnique({
    where: { id },
    select: stockCountSelectFields,
  });

  if (!stockCount) {
    throw new AppError("Không tìm thấy đợt kiểm kê", 404);
  }

  return stockCount;
};

/**
 * Tạo đợt kiểm kê mới (DRAFT)
 * Chốt system_quantity từ Inventory tại thời điểm tạo
 */
export const createStockCount = async (
  userId: number,
  data: CreateStockCountInput
) => {
  const { type, scope_type, description, details } = data;

  // Validate: kiểm tra tất cả location + product tồn tại
  const locationIds = [...new Set(details.map((d) => d.warehouse_location_id))];
  const productIds = [...new Set(details.map((d) => d.product_id))];
  const lotIds = details
    .filter((d) => d.lot_id)
    .map((d) => d.lot_id as number);

  const [locationsCount, productsCount, lotsCount] = await Promise.all([
    prisma.warehouseLocation.count({
      where: { id: { in: locationIds } },
    }),
    prisma.product.count({
      where: { id: { in: productIds } },
    }),
    lotIds.length > 0
      ? prisma.productLot.count({ where: { id: { in: lotIds } } })
      : Promise.resolve(0),
  ]);

  if (locationsCount !== locationIds.length) {
    throw new AppError("Một số vị trí kho không tồn tại", 400);
  }

  if (productsCount !== productIds.length) {
    throw new AppError("Một số sản phẩm không tồn tại", 400);
  }

  if (lotIds.length > 0 && lotsCount !== lotIds.length) {
    throw new AppError("Một số lô hàng không tồn tại", 400);
  }

  return prisma.$transaction(async (tx) => {
    // Sinh mã kiểm kê
    const count = await tx.stockCount.count();
    const code = generateStockCountCode(count + 1);

    // Chốt system_quantity từ Inventory cho mỗi dòng chi tiết
    const detailsWithSystemQty = await Promise.all(
      details.map(async (d) => {
        const inventory = await tx.inventory.findUnique({
          where: {
            product_id_warehouse_location_id: {
              product_id: d.product_id,
              warehouse_location_id: d.warehouse_location_id,
            },
          },
        });

        // Tồn kho = 0 nếu chưa có bản ghi inventory
        const systemQty = inventory ? Number(inventory.quantity) : 0;

        return {
          warehouse_location_id: d.warehouse_location_id,
          product_id: d.product_id,
          lot_id: d.lot_id ?? null,
          system_quantity: new Prisma.Decimal(systemQty),
          unit_price: d.unit_price != null ? new Prisma.Decimal(d.unit_price) : null,
        };
      })
    );

    const stockCount = await tx.stockCount.create({
      data: {
        code,
        type,
        scope_type,
        description: description ?? null,
        status: "DRAFT",
        created_by: userId,
        details: {
          create: detailsWithSystemQty,
        },
      },
      select: stockCountSelectFields,
    });

    return stockCount;
  });
};

/**
 * Bắt đầu kiểm kê (DRAFT → COUNTING)
 * Khóa giao dịch trên tất cả vị trí + sản phẩm trong phạm vi
 */
export const startCounting = async (id: number) => {
  const stockCount = await prisma.stockCount.findUnique({
    where: { id },
    include: { details: true },
  });

  if (!stockCount) {
    throw new AppError("Không tìm thấy đợt kiểm kê", 404);
  }

  if (stockCount.status !== "DRAFT") {
    throw new AppError("Chỉ có thể bắt đầu đếm khi đợt kiểm kê ở trạng thái DRAFT", 400);
  }

  if (stockCount.details.length === 0) {
    throw new AppError("Đợt kiểm kê chưa có chi tiết nào", 400);
  }

  // Kiểm tra xem có đợt kiểm kê COUNTING nào đang chồng chéo phạm vi không
  for (const detail of stockCount.details) {
    const conflicting = await prisma.stockCountDetail.findFirst({
      where: {
        warehouse_location_id: detail.warehouse_location_id,
        product_id: detail.product_id,
        stock_count: {
          status: "COUNTING",
          id: { not: id },
        },
      },
      include: { stock_count: { select: { code: true } } },
    });

    if (conflicting) {
      throw new AppError(
        `Sản phẩm (ID: ${detail.product_id}) tại vị trí (ID: ${detail.warehouse_location_id}) đang được kiểm kê bởi đợt ${conflicting.stock_count.code}`,
        400
      );
    }
  }

  return prisma.stockCount.update({
    where: { id },
    data: { status: "COUNTING" },
    select: stockCountSelectFields,
  });
};

/**
 * Nhập số lượng thực tế kiểm kê
 * Tự động tính variance_quantity = counted_quantity - system_quantity
 */
export const recordCountedQuantity = async (
  id: number,
  userId: number,
  data: RecordCountedQuantityInput
) => {
  const stockCount = await prisma.stockCount.findUnique({
    where: { id },
    include: { details: true },
  });

  if (!stockCount) {
    throw new AppError("Không tìm thấy đợt kiểm kê", 404);
  }

  if (stockCount.status !== "COUNTING") {
    throw new AppError("Chỉ có thể nhập số liệu khi đợt kiểm kê đang ở trạng thái COUNTING", 400);
  }

  return prisma.$transaction(async (tx) => {
    for (const item of data.details) {
      const detail = stockCount.details.find((d) => d.id === item.detail_id);

      if (!detail) {
        throw new AppError(
          `Chi tiết kiểm kê ID ${item.detail_id} không thuộc đợt kiểm kê này`,
          400
        );
      }

      // Tính variance = counted - system
      const systemQty = Number(detail.system_quantity);
      const countedQty = item.counted_quantity;
      const varianceQty = countedQty - systemQty;

      await tx.stockCountDetail.update({
        where: { id: item.detail_id },
        data: {
          counted_quantity: new Prisma.Decimal(countedQty),
          variance_quantity: new Prisma.Decimal(varianceQty),
          counted_by: userId,
          counted_at: new Date(),
        },
      });
    }

    return tx.stockCount.findUnique({
      where: { id },
      select: stockCountSelectFields,
    });
  });
};

/**
 * Xác nhận chênh lệch kiểm kê + nhập lý do sai lệch
 */
export const confirmVariance = async (
  id: number,
  data: ConfirmVarianceInput
) => {
  const stockCount = await prisma.stockCount.findUnique({
    where: { id },
    include: { details: true },
  });

  if (!stockCount) {
    throw new AppError("Không tìm thấy đợt kiểm kê", 404);
  }

  if (stockCount.status !== "COUNTING") {
    throw new AppError("Chỉ được xác nhận chênh lệch khi đợt kiểm kê đang COUNTING", 400);
  }

  return prisma.$transaction(async (tx) => {
    for (const item of data.details) {
      const detail = stockCount.details.find((d) => d.id === item.detail_id);

      if (!detail) {
        throw new AppError(
          `Chi tiết kiểm kê ID ${item.detail_id} không thuộc đợt kiểm kê này`,
          400
        );
      }

      if (detail.counted_quantity === null) {
        throw new AppError(
          `Chi tiết kiểm kê ID ${item.detail_id} chưa nhập số lượng thực tế`,
          400
        );
      }

      await tx.stockCountDetail.update({
        where: { id: item.detail_id },
        data: {
          variance_reason: item.variance_reason,
          is_confirmed: true,
        },
      });
    }

    return tx.stockCount.findUnique({
      where: { id },
      select: stockCountSelectFields,
    });
  });
};

/**
 * Hoàn tất đếm (COUNTING → COMPLETED)
 * Validate: tất cả detail phải đã đếm và đã xác nhận chênh lệch (nếu có)
 */
export const completeCounting = async (id: number) => {
  const stockCount = await prisma.stockCount.findUnique({
    where: { id },
    include: { details: true },
  });

  if (!stockCount) {
    throw new AppError("Không tìm thấy đợt kiểm kê", 404);
  }

  if (stockCount.status !== "COUNTING") {
    throw new AppError("Chỉ có thể hoàn tất khi đang ở trạng thái COUNTING", 400);
  }

  // Kiểm tra tất cả detail đã được đếm
  const uncountedDetails = stockCount.details.filter(
    (d) => d.counted_quantity === null
  );

  if (uncountedDetails.length > 0) {
    throw new AppError(
      `Còn ${uncountedDetails.length} dòng chưa nhập số lượng thực tế`,
      400
    );
  }

  // Kiểm tra các dòng có chênh lệch phải đã xác nhận
  const unconfirmedVariances = stockCount.details.filter(
    (d) =>
      d.variance_quantity !== null &&
      Number(d.variance_quantity) !== 0 &&
      !d.is_confirmed
  );

  if (unconfirmedVariances.length > 0) {
    throw new AppError(
      `Còn ${unconfirmedVariances.length} dòng có chênh lệch chưa được xác nhận`,
      400
    );
  }

  return prisma.stockCount.update({
    where: { id },
    data: { status: "COMPLETED" },
    select: stockCountSelectFields,
  });
};

/**
 * Phê duyệt kết quả kiểm kê (COMPLETED → APPROVED)
 * - Tạo phiếu điều chỉnh tồn tăng/giảm cho từng dòng có chênh lệch
 * - Cập nhật Inventory
 * - Ghi InventoryTransaction
 * - Mở khóa giao dịch (chuyển status → APPROVED)
 */
export const approveStockCount = async (id: number, approverId: number) => {
  const stockCount = await prisma.stockCount.findUnique({
    where: { id },
    include: {
      details: {
        include: {
          product: { select: { base_uom_id: true } },
        },
      },
    },
  });

  if (!stockCount) {
    throw new AppError("Không tìm thấy đợt kiểm kê", 404);
  }

  if (stockCount.status !== "COMPLETED") {
    throw new AppError(
      "Chỉ có thể phê duyệt khi đợt kiểm kê ở trạng thái COMPLETED",
      400
    );
  }

  // Kiểm tra khóa sổ
  await checkIsClosed(new Date());

  return prisma.$transaction(async (tx) => {
    // Duyệt từng dòng chi tiết có chênh lệch → tạo phiếu điều chỉnh + cập nhật tồn kho
    for (const detail of stockCount.details) {
      const variance = Number(detail.variance_quantity ?? 0);

      // Bỏ qua nếu không có chênh lệch
      if (variance === 0) continue;

      const adjustmentType = variance > 0 ? "INCREASE" : "DECREASE";
      const absVariance = Math.abs(variance);

      // 1. Tìm hoặc tạo Inventory
      let inventory = await tx.inventory.findUnique({
        where: {
          product_id_warehouse_location_id: {
            product_id: detail.product_id,
            warehouse_location_id: detail.warehouse_location_id,
          },
        },
      });

      if (!inventory) {
        // Nếu chưa có inventory và chênh lệch giảm → lỗi
        if (variance < 0) {
          throw new AppError(
            `Không thể điều chỉnh giảm khi chưa có tồn kho tại vị trí (ID: ${detail.warehouse_location_id}) cho sản phẩm (ID: ${detail.product_id})`,
            400
          );
        }

        inventory = await tx.inventory.create({
          data: {
            product_id: detail.product_id,
            warehouse_location_id: detail.warehouse_location_id,
            quantity: 0,
            available_quantity: 0,
            reserved_quantity: 0,
          },
        });
      }

      // 2. Kiểm tra tồn kho sau điều chỉnh không được âm
      const newQty = Number(inventory.quantity) + variance;
      if (newQty < 0) {
        throw new AppError(
          `Tồn kho sau điều chỉnh không được âm. Sản phẩm (ID: ${detail.product_id}), tồn hiện tại: ${inventory.quantity}, chênh lệch: ${variance}`,
          400
        );
      }

      // 3. Cập nhật Inventory
      const updatedInventory = await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity: { increment: variance },
          available_quantity: { increment: variance },
        },
      });

      // 4. Tìm ProductUom mặc định
      const productUom = await tx.productUom.findFirst({
        where: { product_id: detail.product_id },
        orderBy: { is_default: "desc" },
      });

      if (!productUom) {
        throw new AppError(
          `Không tìm thấy đơn vị tính cho sản phẩm (ID: ${detail.product_id})`,
          400
        );
      }

      // 5. Sinh mã phiếu điều chỉnh
      const adjCount = await tx.inventoryTransaction.count({
        where: { transaction_type: "ADJUSTMENT" },
      });
      const adjustmentCode = generateAdjustmentCode(adjCount + 1);

      // 6. Ghi InventoryTransaction
      await tx.inventoryTransaction.create({
        data: {
          warehouse_location_id: detail.warehouse_location_id,
          product_id: detail.product_id,
          lot_id: detail.lot_id,
          product_uom_id: productUom.id,
          transaction_type: "ADJUSTMENT",
          quantity: new Prisma.Decimal(variance),
          base_quantity: new Prisma.Decimal(variance),
          balance_after: updatedInventory.quantity,
          reference_type: "STOCK_COUNT",
          reference_id: stockCount.code,
          reference_line_id: detail.id.toString(),
          note: `Điều chỉnh ${adjustmentType === "INCREASE" ? "tăng" : "giảm"} ${absVariance} từ kiểm kê ${stockCount.code}. Lý do: ${detail.variance_reason ?? "N/A"}`,
          created_by: approverId,
        },
      });

      // 7. Tạo bản ghi StockCountAdjustment
      await tx.stockCountAdjustment.create({
        data: {
          stock_count_id: id,
          stock_count_detail_id: detail.id,
          warehouse_location_id: detail.warehouse_location_id,
          product_id: detail.product_id,
          lot_id: detail.lot_id,
          adjustment_type: adjustmentType,
          adjustment_quantity: new Prisma.Decimal(absVariance),
          note: `${adjustmentType === "INCREASE" ? "Dôi dư" : "Thất thoát"} phát hiện trong kiểm kê ${stockCount.code}`,
          created_by: approverId,
        },
      });
    }

    // 8. Cập nhật trạng thái → APPROVED
    const approved = await tx.stockCount.update({
      where: { id },
      data: {
        status: "APPROVED",
        approved_by: approverId,
      },
      select: stockCountSelectFields,
    });

    return approved;
  });
};

/**
 * Hủy đợt kiểm kê (DRAFT / COUNTING → CANCELLED)
 * Mở khóa giao dịch nếu đang COUNTING
 */
export const cancelStockCount = async (id: number) => {
  const stockCount = await prisma.stockCount.findUnique({
    where: { id },
  });

  if (!stockCount) {
    throw new AppError("Không tìm thấy đợt kiểm kê", 404);
  }

  if (stockCount.status !== "DRAFT" && stockCount.status !== "COUNTING") {
    throw new AppError(
      "Chỉ có thể hủy khi đợt kiểm kê ở trạng thái DRAFT hoặc COUNTING",
      400
    );
  }

  return prisma.stockCount.update({
    where: { id },
    data: { status: "CANCELLED" },
    select: stockCountSelectFields,
  });
};

// ==================== EXPORT BIÊN BẢN KIỂM KÊ (EXCEL) ====================

/**
 * Xuất biên bản kiểm kê ra file Excel
 */
export const exportStockCountExcel = async (id: number): Promise<Buffer> => {
  const stockCount = await prisma.stockCount.findUnique({
    where: { id },
    select: stockCountSelectFields,
  });

  if (!stockCount) {
    throw new AppError("Không tìm thấy đợt kiểm kê", 404);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Warehouse Management System";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Biên bản kiểm kê");

  // Tiêu đề chính
  worksheet.mergeCells("A1:L1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "BIÊN BẢN KIỂM KÊ KHO";
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(1).height = 30;

  // Thông tin chung
  worksheet.getCell("A3").value = `Mã kiểm kê: ${stockCount.code}`;
  worksheet.getCell("A4").value = `Loại: ${stockCount.type === "PERIODIC" ? "Định kỳ" : "Đột xuất"}`;
  worksheet.getCell("A5").value = `Phạm vi: ${stockCount.scope_type}`;
  worksheet.getCell("A6").value = `Trạng thái: ${stockCount.status}`;
  worksheet.getCell("A7").value = `Người tạo: ${stockCount.creator.full_name}`;
  worksheet.getCell("A8").value = `Người duyệt: ${stockCount.approver?.full_name ?? "Chưa duyệt"}`;
  worksheet.getCell("A9").value = `Ngày tạo: ${new Date(stockCount.created_at).toLocaleString("vi-VN")}`;
  worksheet.getCell("A10").value = `Mô tả: ${stockCount.description ?? ""}`;

  // Bảng chi tiết kiểm kê
  const headerRow = 12;
  worksheet.getRow(headerRow).values = [
    "STT",
    "Mã SP",
    "Tên sản phẩm",
    "ĐVT",
    "Vị trí",
    "Lô hàng",
    "Tồn hệ thống",
    "Thực đếm",
    "Chênh lệch",
    "Đơn giá",
    "Giá trị CL",
    "Lý do",
    "Người đếm",
    "Thời gian đếm",
  ];

  // Style header bảng
  const hRow = worksheet.getRow(headerRow);
  hRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  hRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E86AB" },
  };
  hRow.alignment = { horizontal: "center", vertical: "middle" };
  hRow.height = 24;

  // Định nghĩa cột
  worksheet.columns = [
    { key: "stt", width: 6 },
    { key: "product_code", width: 14 },
    { key: "product_name", width: 28 },
    { key: "uom", width: 10 },
    { key: "location", width: 22 },
    { key: "lot_no", width: 16 },
    { key: "system_qty", width: 14 },
    { key: "counted_qty", width: 14 },
    { key: "variance_qty", width: 14 },
    { key: "unit_price", width: 14 },
    { key: "variance_value", width: 14 },
    { key: "reason", width: 26 },
    { key: "counter", width: 18 },
    { key: "counted_at", width: 20 },
  ];

  // Thêm dữ liệu
  stockCount.details.forEach((detail, index) => {
    const sysQty = Number(detail.system_quantity);
    const cntQty = detail.counted_quantity !== null ? Number(detail.counted_quantity) : null;
    const varQty = detail.variance_quantity !== null ? Number(detail.variance_quantity) : null;
    const price = detail.unit_price !== null ? Number(detail.unit_price) : 0;
    const varValue = varQty !== null ? varQty * price : 0;

    worksheet.addRow({
      stt: index + 1,
      product_code: detail.product.code,
      product_name: detail.product.name,
      uom: detail.product.base_uom?.name ?? "",
      location: detail.location.full_path,
      lot_no: detail.lot?.lot_no ?? "",
      system_qty: sysQty,
      counted_qty: cntQty ?? "",
      variance_qty: varQty ?? "",
      unit_price: price,
      variance_value: varValue,
      reason: detail.variance_reason ?? "",
      counter: detail.counter?.full_name ?? "",
      counted_at: detail.counted_at
        ? new Date(detail.counted_at).toLocaleString("vi-VN")
        : "",
    });
  });

  // Tổng kết
  const totalVarValue = stockCount.details.reduce((sum, d) => {
    const varQty = d.variance_quantity !== null ? Number(d.variance_quantity) : 0;
    const price = d.unit_price !== null ? Number(d.unit_price) : 0;
    return sum + varQty * price;
  }, 0);

  const summaryRow = worksheet.addRow({});
  summaryRow.getCell(1).value = "";
  const lastDataRow = worksheet.lastRow?.number ?? headerRow + 1;
  worksheet.getCell(`J${lastDataRow + 1}`).value = "Tổng giá trị CL:";
  worksheet.getCell(`J${lastDataRow + 1}`).font = { bold: true };
  worksheet.getCell(`K${lastDataRow + 1}`).value = totalVarValue;
  worksheet.getCell(`K${lastDataRow + 1}`).font = { bold: true };

  // Style viền ô cho data
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber >= headerRow) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    }
  });

  // Chữ ký
  const signRow = lastDataRow + 4;
  worksheet.getCell(`A${signRow}`).value = "Người lập phiếu";
  worksheet.getCell(`A${signRow}`).font = { bold: true };
  worksheet.getCell(`E${signRow}`).value = "Người kiểm kê";
  worksheet.getCell(`E${signRow}`).font = { bold: true };
  worksheet.getCell(`I${signRow}`).value = "Người duyệt";
  worksheet.getCell(`I${signRow}`).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as unknown as Buffer;
};

// ==================== EXPORT BIÊN BẢN KIỂM KÊ (PDF) ====================

/**
 * Xuất biên bản kiểm kê ra file PDF
 */
export const exportStockCountPdf = async (id: number): Promise<Buffer> => {
  const stockCount = await prisma.stockCount.findUnique({
    where: { id },
    select: stockCountSelectFields,
  });

  if (!stockCount) {
    throw new AppError("Không tìm thấy đợt kiểm kê", 404);
  }

  // Cấu hình font
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

  const urlResolver = new (URLResolver as any)(virtualfs);
  const printer = new (PdfPrinter as any)(fonts, virtualfs, urlResolver);

  // Xây dựng dữ liệu bảng
  const tableBody: string[][] = [
    [
      "STT",
      "Mã SP",
      "Tên SP",
      "Vị trí",
      "Tồn HT",
      "Thực đếm",
      "Chênh lệch",
      "Lý do",
      "Người đếm",
    ],
  ];

  stockCount.details.forEach((detail, index) => {
    const sysQty = Number(detail.system_quantity);
    const cntQty =
      detail.counted_quantity !== null
        ? Number(detail.counted_quantity)
        : "-";
    const varQty =
      detail.variance_quantity !== null
        ? Number(detail.variance_quantity)
        : "-";

    tableBody.push([
      String(index + 1),
      detail.product.code,
      detail.product.name,
      detail.location.full_path,
      String(sysQty),
      String(cntQty),
      String(varQty),
      detail.variance_reason ?? "",
      detail.counter?.full_name ?? "",
    ]);
  });

  const docDefinition: TDocumentDefinitions = {
    pageOrientation: "landscape",
    pageSize: "A4",
    content: [
      {
        text: "BIÊN BẢN KIỂM KÊ KHO",
        style: "header",
        alignment: "center",
        margin: [0, 0, 0, 10],
      },
      {
        columns: [
          {
            width: "50%",
            text: [
              { text: "Mã kiểm kê: ", bold: true },
              stockCount.code,
              "\n",
              { text: "Loại: ", bold: true },
              stockCount.type === "PERIODIC" ? "Định kỳ" : "Đột xuất",
              "\n",
              { text: "Phạm vi: ", bold: true },
              stockCount.scope_type,
            ],
          },
          {
            width: "50%",
            text: [
              { text: "Trạng thái: ", bold: true },
              stockCount.status,
              "\n",
              { text: "Người tạo: ", bold: true },
              stockCount.creator.full_name,
              "\n",
              { text: "Ngày tạo: ", bold: true },
              new Date(stockCount.created_at).toLocaleString("vi-VN"),
            ],
          },
        ],
        margin: [0, 0, 0, 10],
      },
      {
        text: stockCount.description ?? "",
        italics: true,
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: [25, 55, "*", 80, 40, 45, 50, "*", 70],
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
        text: `Tổng số mặt hàng: ${stockCount.details.length}`,
        margin: [0, 10, 0, 0],
        bold: true,
      },
      {
        columns: [
          {
            width: "33%",
            text: [
              { text: "\n\n\nNgười lập phiếu\n\n\n\n", bold: true },
              stockCount.creator.full_name,
            ],
            alignment: "center",
          },
          {
            width: "33%",
            text: [
              { text: "\n\n\nNgười kiểm kê\n\n\n\n", bold: true },
              "",
            ],
            alignment: "center",
          },
          {
            width: "33%",
            text: [
              { text: "\n\n\nNgười duyệt\n\n\n\n", bold: true },
              stockCount.approver?.full_name ?? "",
            ],
            alignment: "center",
          },
        ],
        margin: [0, 20, 0, 0],
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

  return new Promise<Buffer>(async (resolve, reject) => {
    try {
      const pdfDoc = await printer.createPdfKitDocument(docDefinition);
      const chunks: Uint8Array[] = [];

      pdfDoc.on("data", (chunk: Uint8Array) => chunks.push(chunk));
      pdfDoc.on("end", () => resolve(Buffer.concat(chunks) as unknown as Buffer));
      pdfDoc.on("error", (err: Error) => reject(err));
      pdfDoc.end();
    } catch (err) {
      reject(err);
    }
  });
};
