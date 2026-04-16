import { prisma } from "../config/db.config";
import { AppError } from "../utils/app-error";
import type {
  QueryInventoryInput,
  SetStockThresholdInput,
  InventoryClosingInput,
  InventoryAlertsQuery,
  UpdateInventoryInput,
  CreateInventoryInput,
} from "../schemas/inventory.schema";

/**
 * Tra cứu tồn kho với nhiều tiêu chí (Sản phẩm, Kho, Khu vực, Lô, Hạn dùng)
 */
export const getInventories = async (query: QueryInventoryInput) => {
  const {
    page = 1,
    limit = 10,
    product_id,
    warehouse_id,
    warehouse_location_id,
    lot_id,
    expires_before,
    is_available,
    search,
  } = query;

  const skip = (page - 1) * limit;

  const where: any = {};

  if (product_id) where.product_id = product_id;
  if (warehouse_location_id) where.warehouse_location_id = warehouse_location_id;
  
  if (warehouse_id) {
    where.location = {
      warehouse_id: warehouse_id,
    };
  }

  if (lot_id) {
    where.lots = {
      some: { id: lot_id },
    };
  }

  if (expires_before) {
    where.lots = {
      some: {
        expired_date: {
          lte: expires_before,
        },
      },
    };
  }

  if (is_available !== undefined) {
    if (is_available) {
      where.available_quantity = { gt: 0 };
    } else {
      where.available_quantity = { lte: 0 };
    }
  }

  if (search) {
    where.product = {
      OR: [
        { name: { contains: search } },
        { code: { contains: search } },
      ],
    };
  }

  const [items, total] = await Promise.all([
    prisma.inventory.findMany({
      where,
      skip,
      take: limit,
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            base_uom: true,
            min_stock: true,
            max_stock: true,
            safe_stock: true,
          },
        },
        location: {
          include: {
            warehouse: true,
          },
        },
        lots: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { updated_at: "desc" },
    }),
    prisma.inventory.count({ where }),
  ]);

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    },
  };
};

export const getInventoryById = async (id: number) => {
  const inventory = await prisma.inventory.findUnique({
    where: { id },
    include: {
      product: { select: { id: true, code: true, name: true } },
      location: { select: { id: true, location_code: true, full_path: true } },
    },
  });

  if (!inventory) {
    throw new AppError("Không tìm thấy inventory", 404);
  }

  return inventory;
};

export const createInventory = async (data: CreateInventoryInput) => {
  const product = await prisma.product.findUnique({
    where: { id: data.product_id },
  });
  if (!product) {
    throw new AppError("Product không tồn tại", 400);
  }

  const location = await prisma.warehouseLocation.findUnique({
    where: { id: data.warehouse_location_id },
  });
  if (!location) {
    throw new AppError("Warehouse location không tồn tại", 400);
  }

  const existing = await prisma.inventory.findUnique({
    where: {
      product_id_warehouse_location_id: {
        product_id: data.product_id,
        warehouse_location_id: data.warehouse_location_id,
      },
    },
  });

  if (existing) {
    throw new AppError(
      "Inventory cho product/warehouse location này đã tồn tại",
      400,
    );
  }

  const quantity = data.quantity ?? 0;
  const reserved = data.reserved_quantity ?? 0;
  const available = data.available_quantity ?? quantity - reserved;

  if (available < 0) {
    throw new AppError("available_quantity không thể âm", 400);
  }

  return prisma.inventory.create({
    data: {
      product_id: data.product_id,
      warehouse_location_id: data.warehouse_location_id,
      quantity,
      reserved_quantity: reserved,
      available_quantity: available,
    },
  });
};

export const updateInventory = async (
  id: number,
  data: UpdateInventoryInput,
) => {
  const existing = await prisma.inventory.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Không tìm thấy inventory", 404);
  }

  const existingQuantity =
    "toNumber" in existing.quantity
      ? existing.quantity.toNumber()
      : Number(existing.quantity);
  const existingReserved =
    "toNumber" in existing.reserved_quantity
      ? existing.reserved_quantity.toNumber()
      : Number(existing.reserved_quantity);

  const quantity = Number(data.quantity ?? existingQuantity);
  const reserved = Number(data.reserved_quantity ?? existingReserved);

  const available = Number(data.available_quantity ?? quantity - reserved);

  if (available < 0) {
    throw new AppError("available_quantity không thể âm", 400);
  }

  return prisma.inventory.update({
    where: { id },
    data: {
      quantity,
      reserved_quantity: reserved,
      available_quantity: available,
    },
  });
};

export const deleteInventory = async (id: number) => {
  const existing = await prisma.inventory.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Không tìm thấy inventory", 404);
  }

  await prisma.inventory.delete({ where: { id } });
  return { success: true };
};

/**
 * Cập nhật cấu hình hạn mức tồn kho cho sản phẩm
 */
export const updateProductStockConfig = async (
  productId: number,
  data: SetStockThresholdInput
) => {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new AppError("Không tìm thấy sản phẩm", 404);

  return await prisma.product.update({
    where: { id: productId },
    data: {
      ...(data.min_stock !== undefined && { min_stock: data.min_stock }),
      ...(data.max_stock !== undefined && { max_stock: data.max_stock }),
      ...(data.safe_stock !== undefined && { safe_stock: data.safe_stock }),
    },
  });
};

/**
 * Lấy danh sách cảnh báo tồn kho
 */
export const getInventoryAlerts = async (query: InventoryAlertsQuery) => {
  const { days_old = 30 } = query;
  const now = new Date();
  
  // 1. Tồn âm
  const negativeStock = await prisma.inventory.findMany({
    where: { available_quantity: { lt: 0 } },
    include: { product: true, location: true },
  });

  // 2. Dưới mức an toàn/tối thiểu (Fetch and filter since Prisma doesn't support cross-relation field comparison easily)
  const allWithThreshold = await prisma.inventory.findMany({
    where: {
      product: {
        OR: [
          { min_stock: { not: null } },
          { safe_stock: { not: null } },
        ]
      }
    },
    include: { product: true, location: true }
  });

  const stockLevelAlerts = allWithThreshold.filter(inv => {
    const min = inv.product.min_stock ? Number(inv.product.min_stock) : 0;
    const safe = inv.product.safe_stock ? Number(inv.product.safe_stock) : 0;
    const current = Number(inv.available_quantity);
    return current <= min || current <= safe;
  });

  // 3. Sắp hết hạn (trong vòng 7 ngày tới)
  const expiringLots = await prisma.productLot.findMany({
    where: {
      expired_date: {
        lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        gt: now
      },
      status: "ACTIVE"
    },
    include: { product: true, inventory: { include: { location: true } } }
  });

  // 4. Tồn lâu ngày (Không có giao dịch xuất trong x ngày)
  const oldDate = new Date(now.getTime() - days_old * 24 * 60 * 60 * 1000);
  const oldStock = await prisma.inventory.findMany({
    where: {
      updated_at: { lte: oldDate },
      available_quantity: { gt: 0 }
    },
    include: { product: true, location: true }
  });

  return {
    negative_stock: negativeStock,
    low_stock: stockLevelAlerts,
    expiring_lots: expiringLots,
    stale_stock: oldStock
  };
};

/**
 * Khóa sổ hệ thống
 */
export const closeInventoryPeriod = async (data: InventoryClosingInput, userId: number) => {
  // Kiểm tra xem ngày này đã khóa chưa
  const existing = await prisma.inventoryClosing.findUnique({
    where: { closing_date: data.closing_date }
  });
  
  if (existing) throw new AppError("Ngày này đã được khóa sổ trước đó", 400);

  return await prisma.inventoryClosing.create({
    data: {
      closing_date: data.closing_date,
      closed_by: userId
    }
  });
};

/**
 * Kiểm tra xem một thời điểm giao dịch có bị khóa sổ không
 */
export const checkIsClosed = async (transactionDate: Date) => {
  const latestClosing = await prisma.inventoryClosing.findFirst({
    orderBy: { closing_date: "desc" }
  });

  if (latestClosing && transactionDate <= latestClosing.closing_date) {
    throw new AppError(`Hệ thống đã khóa sổ đến ngày ${latestClosing.closing_date.toLocaleDateString()}. Không thể thực hiện giao dịch trước thời điểm này.`, 400);
  }
};

/**
 * Kiểm tra tồn kho khả dụng (tránh tồn âm)
 */
export const validateAvailableStock = async (productId: number, locationId: number, requiredQty: number) => {
  const inventory = await prisma.inventory.findUnique({
    where: {
      product_id_warehouse_location_id: {
        product_id: productId,
        warehouse_location_id: locationId
      }
    }
  });

  if (!inventory || Number(inventory.available_quantity) < requiredQty) {
    throw new AppError(`Sản phẩm (ID: ${productId}) không đủ tồn kho khả dụng tại vị trí này.`, 400);
  }
};
