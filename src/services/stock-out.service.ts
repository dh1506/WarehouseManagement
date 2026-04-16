import { prisma } from '../config/db.config';
import { AppError } from '../utils/app-error';
import { generateStockOutCode } from '../utils/generate-code.util';
import { StockOutStatus, StockOutType, TransactionType, Prisma } from '../generated';
import { checkIsClosed, validateAvailableStock } from './inventory.service';
import type { CreateDiscrepancyInput, ResolveDiscrepancyInput } from '../schemas/stock-out.schema';

export interface CreateStockOutData {
  warehouse_location_id: number;
  type?: StockOutType;
  reference_number?: string;
  supplier_id?: number;
  description?: string;
  details: {
    product_id: number;
    quantity: number;
    unit_price?: number;
  }[];
}

export interface PickedLotData {
  lots: {
    stock_out_detail_id: number;
    product_lot_id: number;
    quantity: number;
  }[];
}

export const getStockOuts = async (query: any) => {
  const { page = 1, limit = 10, status, type, search } = query;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (search) {
    where.OR = [
      { code: { contains: search } },
      { reference_number: { contains: search } },
    ];
  }

  const [total, items] = await prisma.$transaction([
    prisma.stockOut.count({ where }),
    prisma.stockOut.findMany({
      where,
      skip,
      take,
      include: {
        location: true,
        creator: { select: { id: true, full_name: true, email: true } },
        details: {
          include: { product: true }
        }
      },
      orderBy: { created_at: 'desc' },
    }),
  ]);

  return { total, items, page: Number(page), limit: take };
};

export const getStockOutById = async (id: number) => {
  const stockOut = await prisma.stockOut.findUnique({
    where: { id },
    include: {
      location: true,
      creator: { select: { id: true, full_name: true, email: true } },
      approver: { select: { id: true, full_name: true, email: true } },
      supplier: true,
      details: {
        include: {
          product: true,
          lots: {
            include: { product_lot: true }
          }
        }
      },

    },
  });

  if (!stockOut) {
    throw new AppError('Không tìm thấy phiếu xuất', 404);
  }

  return stockOut;
};

export const createStockOut = async (data: CreateStockOutData, createdBy: number) => {
  return await prisma.$transaction(async (tx) => {
    const count = await tx.stockOut.count() + 1;
    const code = generateStockOutCode(count);

    const location = await tx.warehouseLocation.findUnique({
      where: { id: data.warehouse_location_id }
    });
    if (!location) {
      throw new AppError('Vị trí kho không tồn tại', 404);
    }

    const type = data.type || StockOutType.SALES;

    const newStockOut = await tx.stockOut.create({
      data: {
        code,
        warehouse_location_id: data.warehouse_location_id,
        type,
        reference_number: data.reference_number ?? null,
        supplier_id: data.supplier_id ?? null,
        description: data.description ?? null,
        status: StockOutStatus.DRAFT,
        created_by: createdBy,
        details: {
          createMany: {
            data: data.details.map((d) => ({
              product_id: d.product_id,
              quantity: d.quantity,
              unit_price: d.unit_price ?? null,
            })),
          }
        },

      },
      include: { details: true },
    });

    return newStockOut;
  });
};

export const submitStockOut = async (id: number, userId: number) => {
  const stockOut = await prisma.stockOut.findUnique({ where: { id } });
  if (!stockOut) throw new AppError('Không tìm thấy phiếu xuất', 404);
  
  if (stockOut.status !== StockOutStatus.DRAFT) {
    throw new AppError('Chỉ có thể gửi duyệt phiếu ở trạng thái NHÁP (DRAFT)', 400);
  }

  return await prisma.stockOut.update({
    where: { id },
    data: {
      status: StockOutStatus.PENDING,

    }
  });
};

export const approveStockOut = async (id: number, approvedBy: number) => {
  return await prisma.$transaction(async (tx) => {
    const stockOut = await tx.stockOut.findUnique({
      where: { id },
      include: { details: true }
    });

    if (!stockOut) throw new AppError('Không tìm thấy phiếu xuất', 404);
    if (stockOut.status !== StockOutStatus.PENDING) {
      throw new AppError('Chỉ có thể duyệt phiếu ở trạng thái CHỜ DUYỆT (PENDING)', 400);
    }

    // Kiểm tra khóa sổ
    await checkIsClosed(new Date());

    for (const detail of stockOut.details) {
      // Kiểm tra tồn kho khả dụng
      await validateAvailableStock(detail.product_id, stockOut.warehouse_location_id, Number(detail.quantity));

      const inventories: any[] = await tx.$queryRaw`
        SELECT id, available_quantity, reserved_quantity 
        FROM inventories 
        WHERE product_id = ${detail.product_id} 
        AND warehouse_location_id = ${stockOut.warehouse_location_id} 
        FOR UPDATE
      `;

      if (inventories.length === 0) {
        throw new AppError(`Không có tồn kho cho sản phẩm mang ID ${detail.product_id} tại kho này`, 400);
      }

      const inv = inventories[0];
      const availableQty = Number(inv.available_quantity);
      const detailQty = Number(detail.quantity);

      if (availableQty < detailQty) {
        throw new AppError(`Tồn kho khả dụng không đủ cho sản phẩm mang ID ${detail.product_id}. Cần: ${detailQty}, Khả dụng: ${availableQty}`, 400);
      }

      await tx.inventory.update({
        where: { id: inv.id },
        data: {
          available_quantity: { decrement: detail.quantity },
          reserved_quantity: { increment: detail.quantity }
        }
      });
    }

    return await tx.stockOut.update({
      where: { id },
      data: {
        status: StockOutStatus.APPROVED,
        approved_by: approvedBy,

      }
    });
  });
};

export const updatePickedLots = async (id: number, data: PickedLotData, userId: number) => {
  return await prisma.$transaction(async (tx) => {
    const stockOut = await tx.stockOut.findUnique({
      where: { id },
      include: { details: true }
    });

    if (!stockOut) throw new AppError('Không tìm thấy phiếu', 404);
    if (stockOut.status !== StockOutStatus.APPROVED && stockOut.status !== StockOutStatus.PICKING) {
      throw new AppError('Chỉ có thể gán lô ở trạng thái ĐÃ DUYỆT hoăc ĐANG LẤY HÀNG', 400);
    }

    for (const detail of stockOut.details) {
      await tx.stockOutDetailLot.deleteMany({
        where: { stock_out_detail_id: detail.id }
      });
    }

    for (const lot of data.lots) {
      const detail = stockOut.details.find(d => d.id === lot.stock_out_detail_id);
      if (!detail) throw new AppError(`Chi tiết phiếu mang ID ${lot.stock_out_detail_id} không hợp lệ`, 400);

      const productLot = await tx.productLot.findUnique({
        where: { id: lot.product_lot_id }
      });
      if (!productLot) throw new AppError(`Lô hàng mang ID ${lot.product_lot_id} không tồn tại`, 400);
      if (productLot.product_id !== detail.product_id) {
        throw new AppError(`Lô hàng mang ID ${lot.product_lot_id} không khớp với sản phẩm ID ${detail.product_id}`, 400);
      }

      await tx.stockOutDetailLot.create({
        data: {
          stock_out_detail_id: lot.stock_out_detail_id,
          product_lot_id: lot.product_lot_id,
          quantity: lot.quantity
        }
      });
    }

    if (stockOut.status === StockOutStatus.APPROVED) {
      await tx.stockOut.update({
        where: { id },
        data: {
          status: StockOutStatus.PICKING,

        }
      });
    }

    return await tx.stockOut.findUnique({ where: { id }, include: { details: { include: { lots: true } } } });
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
  const stockOut = await prisma.stockOut.findUnique({
    where: { id },
    include: { details: { include: { lots: true } } },
  });

  if (!stockOut) throw new AppError("Không tìm thấy phiếu xuất", 404);

  // Tính tổng chênh lệch
  const expectedQty = stockOut.details.reduce(
    (acc, val) => acc + Number(val.quantity),
    0
  );
  const actualQty = stockOut.details.reduce(
    (acc, val) => {
      const picked = val.lots.reduce((sum, l) => sum + Number(l.quantity), 0);
      return acc + picked;
    },
    0
  );

  if (expectedQty === actualQty) {
    throw new AppError("Số lượng không có chênh lệch", 400);
  }

  return prisma.$transaction(async (tx) => {
    const discrepancy = await tx.stockOutDiscrepancy.create({
      data: {
        stock_out_id: id,
        reported_by: reporterId,
        expected_qty: new Prisma.Decimal(expectedQty),
        actual_qty: new Prisma.Decimal(actualQty),
        reason: data.reason,
        status: "PENDING",
      },
    });

    await tx.stockOut.update({
      where: { id },
      data: { status: StockOutStatus.DISCREPANCY },
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
  const discrepancy = await prisma.stockOutDiscrepancy.findUnique({
    where: { id: discId },
  });

  if (!discrepancy || discrepancy.stock_out_id !== id) {
    throw new AppError("Biên bản chênh lệch không tồn tại", 404);
  }
  if (discrepancy.status === "RESOLVED") {
    throw new AppError("Biên bản chênh lệch đã được xử lý", 400);
  }

  return prisma.$transaction(async (tx) => {
    const resolved = await tx.stockOutDiscrepancy.update({
      where: { id: discId },
      data: {
        status: "RESOLVED",
        resolved_by: resolverId,
        action_taken: data.action_taken,
      },
    });

    // Quay lại PICKING cho stockout
    await tx.stockOut.update({
      where: { id },
      data: { status: StockOutStatus.PICKING },
    });

    return resolved;
  });
};

export const completeStockOut = async (id: number, userId: number) => {
  return await prisma.$transaction(async (tx) => {
    const stockOut = await tx.stockOut.findUnique({
      where: { id },
      include: {
        details: {
          include: { lots: true }
        }
      }
    });

    if (!stockOut) throw new AppError('Không tìm thấy phiếu', 404);
    if (stockOut.status !== StockOutStatus.PICKING && stockOut.status !== StockOutStatus.DISCREPANCY) {
      throw new AppError('Chỉ có thể hoàn tất khi phiếu ở trạng thái ĐANG LẤY HÀNG (PICKING) hoặc CHÊNH LỆCH (DISCREPANCY)', 400);
    }

    // 1. Kiểm tra discrepancies Pending
    const discrepancies = await tx.stockOutDiscrepancy.findMany({
      where: { stock_out_id: id }
    });
    const hasPendingDisc = discrepancies.some(
      (d) => d.status === "PENDING"
    );
    if (hasPendingDisc) {
      throw new AppError("Vẫn còn biên bản chênh lệch chưa giải quyết", 400);
    }

    // 2. Validate expected vs received nếu không có biên bản (nếu có chênh lệch thì bắt buộc phải có biên bản)
    let isDiff = false;
    for (const detail of stockOut.details) {
      const totalPicked = detail.lots.reduce((sum, l) => sum + Number(l.quantity), 0);
      if (totalPicked !== Number(detail.quantity)) {
        isDiff = true;
        break;
      }
    }

    if (isDiff && discrepancies.length === 0) {
      throw new AppError(
        "Có chênh lệch số lượng nhưng chưa có biên bản xử lý nào được tạo",
        400
      );
    }

    // Kiểm tra khóa sổ
    await checkIsClosed(new Date());

    for (const detail of stockOut.details) {
      const totalPicked = detail.lots.reduce((sum, l) => sum + Number(l.quantity), 0);
      // Bỏ check totalPicked !== Number(detail.quantity) cũ vì đã handled bởi discrepancy ở trên

      const inventories: any[] = await tx.$queryRaw`
        SELECT id, quantity, reserved_quantity 
        FROM inventories 
        WHERE product_id = ${detail.product_id} 
        AND warehouse_location_id = ${stockOut.warehouse_location_id} 
        FOR UPDATE
      `;

      if (inventories.length === 0) throw new AppError(`Lỗi tồn kho sản phẩm ${detail.product_id}`, 500);
      const inv = inventories[0];

      await tx.inventory.update({
        where: { id: inv.id },
        data: {
          quantity: { decrement: detail.quantity },
          reserved_quantity: { decrement: detail.quantity }
        }
      });

      const product = await tx.product.findUnique({
        where: { id: detail.product_id }, select: { base_uom_id: true }
      });
      if (!product || !product.base_uom_id) throw new AppError('Sản phẩm bị thiếu đơn vị đo (UoM)', 500);

      for (const lot of detail.lots) {
        const pLots: any[] = await tx.$queryRaw`SELECT 1 FROM product_lots WHERE id = ${lot.product_lot_id} FOR UPDATE`;
        if (pLots.length === 0) throw new AppError(`Không tìm thấy lô ID ${lot.product_lot_id}`, 404);

        const inventoryAfter = Number(inv.quantity) - Number(detail.quantity);

        await tx.inventoryTransaction.create({
          data: {
            warehouse_location_id: stockOut.warehouse_location_id,
            product_id: detail.product_id,
            lot_id: lot.product_lot_id,
            product_uom_id: product.base_uom_id,
            transaction_type: TransactionType.OUT,
            quantity: lot.quantity,
            base_quantity: lot.quantity,
            balance_after: inventoryAfter,
            reference_type: 'STOCK_OUT',
            reference_id: stockOut.code,
            reference_line_id: detail.id.toString(),
            note: `Xuất kho lô ${lot.product_lot_id}`,
            created_by: userId,
          }
        });
      }
    }

    return await tx.stockOut.update({
      where: { id },
      data: {
        status: StockOutStatus.COMPLETED,

      }
    });

  });
};

export const cancelStockOut = async (id: number, userId: number, reason?: string) => {
  return await prisma.$transaction(async (tx) => {
    const stockOut = await tx.stockOut.findUnique({
      where: { id },
      include: { details: true }
    });

    if (!stockOut) throw new AppError('Không tìm thấy phiếu', 404);
    if (stockOut.status === StockOutStatus.COMPLETED || stockOut.status === StockOutStatus.CANCELLED) {
      throw new AppError('Không thể hủy phiếu đã hoàn tất hoặc đã hủy', 400);
    }

    // Kiểm tra khóa sổ
    await checkIsClosed(new Date());

    if (stockOut.status === StockOutStatus.APPROVED || stockOut.status === StockOutStatus.PICKING) {
      for (const detail of stockOut.details) {
        const inventories: any[] = await tx.$queryRaw`
          SELECT id 
          FROM inventories 
          WHERE product_id = ${detail.product_id} 
          AND warehouse_location_id = ${stockOut.warehouse_location_id} 
          FOR UPDATE
        `;

        if (inventories.length > 0) {
          await tx.inventory.update({
            where: { id: inventories[0].id },
            data: {
              available_quantity: { increment: detail.quantity },
              reserved_quantity: { decrement: detail.quantity },
            }
          });
        }
      }
    }

    return await tx.stockOut.update({
      where: { id },
      data: {
        status: StockOutStatus.CANCELLED,

      }
    });
  });
};
