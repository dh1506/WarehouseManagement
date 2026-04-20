import { prisma } from "../config/db.config";
import { AppError } from "../utils/app-error";
import { generateStockDisposalCode } from "../utils/generate-code.util";
import { checkIsClosed, validateAvailableStock } from "./inventory.service";
import { Prisma, StockDisposalStatus } from "../generated";
import type {
  CreateStockDisposalInput,
  GetStockDisposalsQuery,
  GetDisposalAnalyticsQuery,
} from "../schemas/stock-disposal.schema";

// ==================== SELECT FIELDS ====================

const stockDisposalSelectFields = {
  id: true,
  code: true,
  description: true,
  status: true,
  created_at: true,
  updated_at: true,
  creator: { select: { id: true, username: true, full_name: true } },
  approver: { select: { id: true, username: true, full_name: true } },
  details: {
    include: {
      location: { select: { id: true, location_code: true, full_path: true } },
      product: { select: { id: true, code: true, name: true, base_uom: true } },
      lot: { select: { id: true, lot_no: true, expired_date: true } },
      reason: true,
    },
  },
  history: {
    include: {
      creator: { select: { id: true, username: true, full_name: true } },
    },
    orderBy: { created_at: "asc" as Prisma.SortOrder },
  },
} as const;

// ==================== SERVICE FUNCTIONS ====================

/**
 * Lấy danh mục nguyên nhân hủy
 */
export const getDisposalReasons = async (isActive?: boolean) => {
  return await prisma.disposalReason.findMany({
    where: isActive !== undefined ? { is_active: isActive } : {},
    orderBy: { name: "asc" },
  });
};

/**
 * Lấy danh sách phiếu hủy có phân trang và bộ lọc
 */
export const getStockDisposals = async (query: GetStockDisposalsQuery) => {
  const { page, limit, search, status } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.StockDisposalWhereInput = {};

  if (search) {
    where.code = { contains: search };
  }

  if (status) {
    where.status = status;
  }

  const [items, total] = await Promise.all([
    prisma.stockDisposal.findMany({
      where,
      select: stockDisposalSelectFields,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    prisma.stockDisposal.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Lấy chi tiết phiếu hủy
 */
export const getStockDisposalById = async (id: number) => {
  const item = await prisma.stockDisposal.findUnique({
    where: { id },
    select: stockDisposalSelectFields,
  });

  if (!item) throw new AppError("Không tìm thấy phiếu hủy", 404);
  return item;
};

/**
 * Tạo phiếu hủy hàng mới (DRAFT)
 */
export const createStockDisposal = async (userId: number, data: CreateStockDisposalInput) => {
  const { description, details } = data;

  return await prisma.$transaction(async (tx) => {
    const count = await tx.stockDisposal.count();
    const code = generateStockDisposalCode(count + 1);

    const stockDisposal = await tx.stockDisposal.create({
      data: {
        code,
        description: description ?? null,
        status: "DRAFT",
        created_by: userId,
        details: {
          create: details.map((d) => ({
            location: { connect: { id: d.warehouse_location_id } },
            product: { connect: { id: d.product_id } },
            ...(d.lot_id ? { lot: { connect: { id: d.lot_id } } } : {}),
            reason: { connect: { id: d.reason_id } },
            quantity: new Prisma.Decimal(d.quantity),
            unit_price: d.unit_price !== undefined ? new Prisma.Decimal(d.unit_price) : null,
            reason_note: d.reason_note ?? null,
          })),
        },
        history: {
          create: {
            status: "DRAFT",
            note: "Tạo mới phiếu hủy hàng",
            created_by: userId,
          },
        },
      },
    });

    return stockDisposal;
  });
};

/**
 * Cập nhật phiếu hủy (Chỉ ở trạng thái DRAFT)
 */
export const updateStockDisposal = async (id: number, userId: number, data: CreateStockDisposalInput) => {
  const existing = await prisma.stockDisposal.findUnique({ where: { id } });
  if (!existing) throw new AppError("Không tìm thấy phiếu hủy", 404);
  if (existing.status !== "DRAFT") throw new AppError("Chỉ có thể cập nhật phiếu ở trạng thái NHÁP", 400);

  return await prisma.$transaction(async (tx) => {
    // Xóa chi tiết cũ
    await tx.stockDisposalDetail.deleteMany({ where: { stock_disposal_id: id } });

    const updated = await tx.stockDisposal.update({
      where: { id },
      data: {
        description: data.description ?? null,
        details: {
          create: data.details.map((d) => ({
            location: { connect: { id: d.warehouse_location_id } },
            product: { connect: { id: d.product_id } },
            ...(d.lot_id ? { lot: { connect: { id: d.lot_id } } } : {}),
            reason: { connect: { id: d.reason_id } },
            quantity: new Prisma.Decimal(d.quantity),
            unit_price: d.unit_price !== undefined ? new Prisma.Decimal(d.unit_price) : null,
            reason_note: d.reason_note ?? null,
          })),
        },
        history: {
          create: {
            status: "DRAFT",
            note: "Cập nhật nội dung phiếu",
            created_by: userId,
          },
        },
      },
    });

    return updated;
  });
};

/**
 * Gửi phê duyệt (DRAFT -> PENDING)
 */
export const submitStockDisposal = async (id: number, userId: number) => {
  const existing = await prisma.stockDisposal.findUnique({ where: { id } });
  if (!existing) throw new AppError("Không tìm thấy phiếu hủy", 404);
  if (existing.status !== "DRAFT") throw new AppError("Chỉ có thể gửi duyệt phiếu ở trạng thái NHÁP", 400);

  return await prisma.stockDisposal.update({
    where: { id },
    data: {
      status: "PENDING",
      history: {
        create: {
          status: "PENDING",
          note: "Gửi yêu cầu phê duyệt",
          created_by: userId,
        },
      },
    },
  });
};

/**
 * Phê duyệt phiếu hủy (PENDING -> APPROVED)
 */
export const approveStockDisposal = async (id: number, userId: number) => {
  const existing = await prisma.stockDisposal.findUnique({ where: { id } });
  if (!existing) throw new AppError("Không tìm thấy phiếu hủy", 404);
  if (existing.status !== "PENDING") throw new AppError("Chỉ có thể phê duyệt phiếu ở trạng thái CHỜ DUYỆT", 400);

  return await prisma.stockDisposal.update({
    where: { id },
    data: {
      status: "APPROVED",
      approved_by: userId,
      history: {
        create: {
          status: "APPROVED",
          note: "Đã phê duyệt phiếu hủy",
          created_by: userId,
        },
      },
    },
  });
};

/**
 * Hoàn tất quy trình hủy (APPROVED -> COMPLETED)
 * Logic chính: Trừ tồn kho + Ghi nhận giao dịch
 */
export const completeStockDisposal = async (id: number, userId: number) => {
  const stockDisposal = await prisma.stockDisposal.findUnique({
    where: { id },
    include: {
      details: {
        include: { product: true }
      }
    }
  });

  if (!stockDisposal) throw new AppError("Không tìm thấy phiếu hủy", 404);
  if (stockDisposal.status !== "APPROVED") throw new AppError("Chỉ có thể hoàn tất phiếu đã được PHÊ DUYỆT", 400);

  // Kiểm tra khóa sổ
  await checkIsClosed(new Date());

  return await prisma.$transaction(async (tx) => {
    for (const detail of stockDisposal.details) {
      const { product_id, warehouse_location_id, quantity } = detail;
      const qtyNum = Number(quantity);

      // 1. Kiểm tra tồn kho khả dụng
      await validateAvailableStock(product_id, warehouse_location_id, qtyNum);

      // 2. Lock inventory record để tránh race condition
      const inventories: any[] = await tx.$queryRaw`
        SELECT id, quantity, available_quantity 
        FROM inventories 
        WHERE product_id = ${product_id} 
        AND warehouse_location_id = ${warehouse_location_id} 
        FOR UPDATE
      `;

      if (inventories.length === 0) {
        throw new AppError(`Không tìm thấy tồn kho cho sản phẩm mang ID ${product_id}`, 400);
      }

      const inv = inventories[0];
      const newQty = Number(inv.quantity) - qtyNum;
      const newAvailableQty = Number(inv.available_quantity) - qtyNum;

      if (newAvailableQty < 0) {
        throw new AppError(`Sản phẩm mang ID ${product_id} không đủ tồn kho khả dụng để thực hiện hủy.`, 400);
      }

      // 3. Cập nhật tồn kho
      await tx.inventory.update({
        where: { id: inv.id },
        data: {
          quantity: new Prisma.Decimal(newQty),
          available_quantity: new Prisma.Decimal(newAvailableQty),
        },
      });

      // 4. Tìm ProductUom mặc định
      const productUom = await tx.productUom.findFirst({
        where: { product_id },
        orderBy: { is_default: "desc" },
      });

      if (!productUom) {
        throw new AppError(`Không tìm thấy đơn vị tính cho sản phẩm ID ${product_id}`, 500);
      }

      // 5. Ghi nhận giao dịch (TransactionType.OUT)
      await tx.inventoryTransaction.create({
        data: {
          warehouse_location_id,
          product_id,
          lot_id: detail.lot_id,
          product_uom_id: productUom.id,
          transaction_type: "OUT",
          quantity: quantity,
          base_quantity: quantity,
          balance_after: new Prisma.Decimal(newQty),
          reference_type: "STOCK_DISPOSAL",
          reference_id: stockDisposal.code,
          reference_line_id: detail.id.toString(),
          note: `Hủy hàng theo phiếu ${stockDisposal.code}. Nguyên nhân ID: ${detail.reason_id}`,
          created_by: userId,
        },
      });
    }

    // 6. Cập nhật trạng thái phiếu
    const updated = await tx.stockDisposal.update({
      where: { id },
      data: {
        status: "COMPLETED",
        history: {
          create: {
            status: "COMPLETED",
            note: "Đã thực hiện hủy hàng thành công",
            created_by: userId,
          },
        },
      },
    });

    return updated;
  });
};

/**
 * Hủy phiếu (CANCELLED)
 */
export const cancelStockDisposal = async (id: number, userId: number) => {
  const existing = await prisma.stockDisposal.findUnique({ where: { id } });
  if (!existing) throw new AppError("Không tìm thấy phiếu hủy", 404);
  
  if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
    throw new AppError("Không thể hủy phiếu đã hoàn tất hoặc đã hủy trước đó", 400);
  }

  return await prisma.stockDisposal.update({
    where: { id },
    data: {
      status: "CANCELLED",
      history: {
        create: {
          status: "CANCELLED",
          note: "Hủy bỏ phiếu hủy hàng",
          created_by: userId,
        },
      },
    },
  });
};

/**
 * Thống kê phân tích dữ liệu hủy hàng
 */
export const getDisposalAnalytics = async (query: GetDisposalAnalyticsQuery) => {
  const { from_date, to_date, reason_id, warehouse_id } = query;
  const where: Prisma.StockDisposalDetailWhereInput = {};

  if (from_date || to_date) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (from_date) dateFilter.gte = from_date;
    if (to_date) dateFilter.lte = to_date;

    const stockDisposalFilter: Prisma.StockDisposalWhereInput = {
      status: "COMPLETED",
      created_at: dateFilter,
    };

    where.stock_disposal = {
      is: stockDisposalFilter,
    };
  } else {
    where.stock_disposal = {
      is: {
        status: "COMPLETED",
      },
    };
  }

  if (reason_id) {
    where.reason_id = reason_id;
  }

  if (warehouse_id) {
    where.location = {
      warehouse_id: warehouse_id,
    };
  }

  // Nhóm theo nguyên nhân
  const groupByReason = await prisma.stockDisposalDetail.groupBy({
    by: ["reason_id"],
    where,
    _sum: {
      quantity: true,
    },
    _count: {
      id: true,
    },
  });

  // Lấy tên nguyên nhân
  const reasons = await prisma.disposalReason.findMany({
    where: { id: { in: groupByReason.map((r) => r.reason_id) } },
    select: { id: true, name: true },
  });

  const reasonStats = groupByReason.map((stat) => ({
    reason_id: stat.reason_id,
    reason_name: reasons.find((r) => r.id === stat.reason_id)?.name || "Unknown",
    total_quantity: Number(stat._sum.quantity || 0),
    total_lines: stat._count.id,
  }));

  // Tổng số lượng và giá trị (ước tính)
  const totals = await prisma.stockDisposalDetail.aggregate({
    where,
    _sum: {
      quantity: true,
    },
  });

  return {
    reason_stats: reasonStats,
    total_quantity: Number(totals._sum.quantity || 0),
  };
};
