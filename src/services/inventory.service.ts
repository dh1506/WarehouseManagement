import { prisma } from "../config/db.config";
import { AppError } from "../utils/app-error";
import type {
  GetInventoriesQuery,
  CreateInventoryInput,
  UpdateInventoryInput,
} from "../schemas/inventory.schema";

export const getInventories = async (query: GetInventoriesQuery) => {
  const { page, limit, product_id, warehouse_location_id } = query;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (product_id) where.product_id = product_id;
  if (warehouse_location_id)
    where.warehouse_location_id = warehouse_location_id;

  const [inventories, total] = await Promise.all([
    prisma.inventory.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updated_at: "desc" },
      include: {
        product: { select: { id: true, code: true, name: true } },
        location: {
          select: { id: true, location_code: true, full_path: true },
        },
      },
    }),
    prisma.inventory.count({ where }),
  ]);

  return {
    inventories,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
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
