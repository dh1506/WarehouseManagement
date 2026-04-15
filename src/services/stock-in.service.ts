import { prisma } from "../config/db.config";
import { AppError } from "../utils/app-error";
import { generateStockInCode } from "../utils/generate-code.util";
import { checkIsClosed } from "./inventory.service";
import type {
  CreateStockInInput,
  RecordReceiptInput,
  AllocateLotsInput,
  CreateDiscrepancyInput,
  ResolveDiscrepancyInput,
  GetStockInsQuery,
} from "../schemas/stock-in.schema";
import { Prisma } from "../generated";

const stockInSelectFields = {
  id: true,
  code: true,
  description: true,
  status: true,
  created_at: true,
  updated_at: true,
  location: { select: { id: true, location_code: true, full_path: true } },
  creator: { select: { id: true, username: true, full_name: true } },
  approver: { select: { id: true, username: true, full_name: true } },
  supplier: { select: { id: true, code: true, name: true } },
  details: {
    select: {
      id: true,
      product_id: true,
      expected_quantity: true,
      received_quantity: true,
      unit_price: true,
      product: {
        select: {
          code: true,
          name: true,
          base_uom: { select: { id: true, code: true, name: true } },
        },
      },
      lots: {
        select: {
          id: true,
          quantity: true,
          product_lot: {
            select: {
              id: true,
              lot_no: true,
              expired_date: true,
              inventory: {
                select: {
                  location: { select: { full_path: true, id: true } },
                },
              },
            },
          },
        },
      },
    },
  },
  discrepancies: true,
} as const;

/**
 * Lấy danh sách phiếu nhập
 */
export const getStockIns = async (query: GetStockInsQuery) => {
  const { page, limit, search, status, warehouse_location_id, supplier_id } = query;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (search) {
    where.code = { contains: search };
  }

  if (status) {
    where.status = status;
  }

  if (warehouse_location_id) {
    where.warehouse_location_id = warehouse_location_id;
  }

  if (supplier_id) {
    where.supplier_id = supplier_id;
  }

  const [stockIns, total] = await Promise.all([
    prisma.stockIn.findMany({
      where,
      select: stockInSelectFields,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    prisma.stockIn.count({ where }),
  ]);

  return {
    stockIns,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Lấy chi tiết phiếu nhập
 */
export const getStockInById = async (id: number) => {
  const stockIn = await prisma.stockIn.findUnique({
    where: { id },
    select: stockInSelectFields,
  });

  if (!stockIn) {
    throw new AppError("Không tìm thấy phiếu nhập", 404);
  }

  return stockIn;
};

/**
 * Tạo mới đề nghị nhập (DRAFT)
 */
export const createStockIn = async (userId: number, data: CreateStockInInput) => {
  const { warehouse_location_id, supplier_id, description, details } = data;

  // Kiểm tra location
  const location = await prisma.warehouseLocation.findUnique({
    where: { id: warehouse_location_id },
  });

  if (!location) {
    throw new AppError("Thuộc tính vùng lưu kho không tồn tại", 400);
  }

  // Lấy danh sách product check có tồn tại
  const productIds = details.map((d) => d.product_id);
  const productsCount = await prisma.product.count({
    where: { id: { in: productIds } },
  });

  if (productsCount !== productIds.length) {
    throw new AppError("Một số sản phẩm không tồn tại trong hệ thống", 400);
  }

  // Kiểm tra supplier
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplier_id },
  });

  if (!supplier) {
    throw new AppError("Nhà cung cấp không tồn tại", 400);
  }

  return prisma.$transaction(async (tx) => {
    // Generate Mã SI (Sequence có thể đếm theo số record hiện tại hoặc config)
    const count = await tx.stockIn.count();
    const code = generateStockInCode(count + 1);

    const stockIn = await tx.stockIn.create({
      data: {
        code,
        warehouse_location_id,
        supplier_id,
        description: description ?? null,
        created_by: userId,
        status: "DRAFT",
        details: {
          create: details.map((d) => ({
            product: { connect: { id: d.product_id } },
            expected_quantity: d.expected_quantity,
            unit_price: d.unit_price ?? null,
            received_quantity: 0,
          })),
        },
      },
      select: stockInSelectFields,
    });

    return stockIn;
  });
};

/**
 * Duyệt đề nghị nhập (DRAFT -> PENDING)
 */
export const approveStockIn = async (id: number, approverId: number) => {
  const stockIn = await prisma.stockIn.findUnique({ where: { id } });

  if (!stockIn) throw new AppError("Không tìm thấy phiếu nhập", 404);
  if (stockIn.status !== "DRAFT") {
    throw new AppError("Chỉ có thể duyệt khi phiếu ở trạng thái DRAFT", 400);
  }

  return prisma.stockIn.update({
    where: { id },
    data: {
      status: "PENDING",
      approved_by: approverId,
    },
    select: stockInSelectFields,
  });
};

/**
 * Cập nhật số lượng kiểm đếm
 */
export const recordReceipt = async (id: number, data: RecordReceiptInput) => {
  const stockIn = await prisma.stockIn.findUnique({
    where: { id },
    include: { details: true },
  });

  if (!stockIn) throw new AppError("Không tìm thấy phiếu nhập", 404);
  if (stockIn.status === "COMPLETED" || stockIn.status === "CANCELLED") {
    throw new AppError("Không thể cập nhật phiếu đã hoàn tất hoặc hủy", 400);
  }

  return prisma.$transaction(async (tx) => {
    for (const updateDetail of data.details) {
      const detail = stockIn.details.find(
        (d) => d.id === updateDetail.stock_in_detail_id
      );

      if (!detail) {
        throw new AppError(
          `Detail ID ${updateDetail.stock_in_detail_id} không thuộc phiếu này`,
          400
        );
      }

      await tx.stockInDetail.update({
        where: { id: detail.id },
        data: { received_quantity: updateDetail.received_quantity },
      });
    }

    const updatedStockIn = await tx.stockIn.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
      },
      select: stockInSelectFields,
    });

    return updatedStockIn;
  });
};

/**
 * Tạo biên bản chênh lệch
 */
export const createDiscrepancy = async (
  id: number,
  reporterId: number,
  data: CreateDiscrepancyInput
) => {
  const stockIn = await prisma.stockIn.findUnique({
    where: { id },
    include: { details: true },
  });

  if (!stockIn) throw new AppError("Không tìm thấy phiếu", 404);

  // Tính tổng chênh lệch
  const expectedQty = stockIn.details.reduce(
    (acc, val) => acc + Number(val.expected_quantity),
    0
  );
  const actualQty = stockIn.details.reduce(
    (acc, val) => acc + Number(val.received_quantity),
    0
  );

  if (expectedQty === actualQty) {
    throw new AppError("Số lượng không có chênh lệch", 400);
  }

  return prisma.$transaction(async (tx) => {
    const discrepancy = await tx.stockInDiscrepancy.create({
      data: {
        stock_in_id: id,
        reported_by: reporterId,
        expected_qty: new Prisma.Decimal(expectedQty),
        actual_qty: new Prisma.Decimal(actualQty),
        reason: data.reason,
        status: "PENDING",
      },
    });

    await tx.stockIn.update({
      where: { id },
      data: { status: "DISCREPANCY" },
    });

    return discrepancy;
  });
};

/**
 * Duyệt biên bản xử lý
 */
export const resolveDiscrepancy = async (
  id: number,
  discId: number,
  resolverId: number,
  data: ResolveDiscrepancyInput
) => {
  const discrepancy = await prisma.stockInDiscrepancy.findUnique({
    where: { id: discId },
  });

  if (!discrepancy || discrepancy.stock_in_id !== id) {
    throw new AppError("Biên bản chênh lệch không tồn tại", 404);
  }
  if (discrepancy.status === "RESOLVED") {
    throw new AppError("Biên bản chênh lệch đã được xử lý", 400);
  }

  return prisma.$transaction(async (tx) => {
    const resolved = await tx.stockInDiscrepancy.update({
      where: { id: discId },
      data: {
        status: "RESOLVED",
        resolved_by: resolverId,
        action_taken: data.action_taken,
      },
    });

    // Quay lại IN_PROGRESS cho stockin
    await tx.stockIn.update({
      where: { id },
      data: { status: "IN_PROGRESS" },
    });

    return resolved;
  });
};

/**
 * Phân bổ vị trí lô
 */
export const allocateLots = async (id: number, data: AllocateLotsInput) => {
  const stockIn = await prisma.stockIn.findUnique({
    where: { id },
    include: { details: true },
  });

  if (!stockIn) throw new AppError("Không tìm thấy phiếu", 404);
  if (stockIn.status !== "IN_PROGRESS") {
    throw new AppError("Chỉ có thể phân bổ khi phiếu đang IN_PROGRESS", 400);
  }

  return prisma.$transaction(async (tx) => {
    for (const alloc of data.allocations) {
      const detail = stockIn.details.find(
        (d) => d.id === alloc.stock_in_detail_id
      );
      if (!detail) {
        throw new AppError(`Detail ID ${alloc.stock_in_detail_id} sai`, 400);
      }

      // 1. Lấy hoặc Tạo Inventory ở location được chỉ định
      let inventory = await tx.inventory.findUnique({
        where: {
          product_id_warehouse_location_id: {
            product_id: detail.product_id,
            warehouse_location_id: alloc.location_id,
          },
        },
      });

      if (!inventory) {
        inventory = await tx.inventory.create({
          data: {
            product_id: detail.product_id,
            warehouse_location_id: alloc.location_id,
            quantity: 0,
            available_quantity: 0,
            reserved_quantity: 0,
          },
        });
      }

      // 2. Lấy hoặc Tạo ProductLot
      let productLot = await tx.productLot.findUnique({
        where: { lot_no: alloc.lot_no },
      });

      if (!productLot) {
        productLot = await tx.productLot.create({
          data: {
            lot_no: alloc.lot_no,
            product_id: detail.product_id,
            inventories_id: inventory.id,
            production_date: alloc.production_date ? new Date(alloc.production_date) : null,
            expired_date: alloc.expired_date ? new Date(alloc.expired_date) : null,
            status: "ACTIVE",
          },
        });
      }

      // 3. Tạo phân bổ
      await tx.stockInDetailLot.create({
        data: {
          stock_in_detail_id: detail.id,
          product_lot_id: productLot.id,
          quantity: alloc.quantity,
        },
      });
    }

    return prisma.stockIn.findUnique({
      where: { id },
      select: stockInSelectFields,
    });
  });
};

/**
 * Hoàn tất quy trình nhập
 */
export const completeStockIn = async (id: number, userId: number) => {
  const stockIn = await prisma.stockIn.findUnique({
    where: { id },
    include: {
      details: {
        include: { lots: { include: { product_lot: true } }, product: true },
      },
      discrepancies: true,
    },
  });

  if (!stockIn) throw new AppError("Không tìm thấy phiếu", 404);
  if (stockIn.status === "COMPLETED") {
    throw new AppError("Phiếu đã hoàn tất từ trước", 400);
  }

  // 1. Kiểm tra discrepancies Pending
  const hasPendingDisc = stockIn.discrepancies.some(
    (d) => d.status === "PENDING"
  );
  if (hasPendingDisc) {
    throw new AppError("Vẫn còn biên bản chênh lệch chưa giải quyết", 400);
  }

  // 2. Validate expected vs received nếu không có biên bản
  let isDiff = false;
  for (const detail of stockIn.details) {
    if (Number(detail.expected_quantity) !== Number(detail.received_quantity)) {
      isDiff = true;
      break;
    }
  }

  if (isDiff && stockIn.discrepancies.length === 0) {
    throw new AppError(
      "Có chênh lệch số lượng nhưng chưa có biên bản xử lý nào được tạo",
      400
    );
  }

  // 3. Kiểm tra khóa sổ
  await checkIsClosed(new Date());

  // 4. Hoàn tất & Ghi nhận tồn kho
  return prisma.$transaction(async (tx) => {
    for (const detail of stockIn.details) {
      for (const mapLot of detail.lots) {
        const qty = Number(mapLot.quantity);
        const invId = mapLot.product_lot.inventories_id;

        // Cập nhật Inventory
        const inventory = await tx.inventory.update({
          where: { id: invId },
          data: {
            quantity: { increment: qty },
            available_quantity: { increment: qty },
          },
        });

        // Tìm uom ID
        // Note: product.base_uom_id
        await tx.inventoryTransaction.create({
          data: {
            warehouse_location_id: inventory.warehouse_location_id,
            product_id: detail.product_id,
            lot_id: mapLot.product_lot_id,
            product_uom_id: detail.product.base_uom_id, // Ghi theo đơn vị base
            transaction_type: "IN",
            quantity: new Prisma.Decimal(qty),
            base_quantity: new Prisma.Decimal(qty),
            balance_after: inventory.quantity, // Value post-update
            reference_type: "STOCK_IN",
            reference_id: stockIn.id.toString(),
            reference_line_id: detail.id.toString(),
            created_by: userId,
          },
        });
      }
    }

    const completed = await tx.stockIn.update({
      where: { id },
      data: { status: "COMPLETED" },
      select: stockInSelectFields,
    });

    return completed;
  });
};
