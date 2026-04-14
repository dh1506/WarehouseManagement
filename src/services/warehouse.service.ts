import { prisma } from '../config/db.config';
import { AppError } from '../utils/app-error';
import { generateLocationCode } from '../utils/generate-code.util';
import type {
  GetWarehousesQuery,
  CreateWarehouseInput,
  UpdateWarehouseInput,
  GetLocationsQuery,
  CreateLocationInput,
  UpdateLocationInput,
} from '../schemas/warehouse.schema';

// ==========================================
// WAREHOUSE (KHO CHÍNH)
// ==========================================

export const getWarehouses = async (query: GetWarehousesQuery) => {
  const { page, limit, search, is_active } = query;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
    ];
  }

  if (is_active !== undefined) {
    where.is_active = is_active;
  }

  const [warehouses, total] = await Promise.all([
    prisma.warehouse.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: { locations: true }
        }
      }
    }),
    prisma.warehouse.count({ where }),
  ]);

  return {
    warehouses,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getWarehouseById = async (id: number) => {
  const warehouse = await prisma.warehouse.findUnique({
    where: { id },
    include: {
        _count: {
          select: { locations: true }
        }
      }
  });

  if (!warehouse) {
    throw new AppError('Không tìm thấy kho', 404);
  }

  return warehouse;
};

export const createWarehouse = async (data: CreateWarehouseInput) => {
  const existing = await prisma.warehouse.findUnique({
    where: { code: data.code },
  });
  if (existing) {
    throw new AppError('Mã kho đã tồn tại', 400);
  }

  return prisma.warehouse.create({
    data: {
      code: data.code,
      name: data.name,
      is_active: data.is_active ?? true,
    },
  });
};

export const updateWarehouse = async (id: number, data: UpdateWarehouseInput) => {
  const existing = await prisma.warehouse.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Không tìm thấy kho', 404);
  }

  if (data.code && data.code !== existing.code) {
    const duplicate = await prisma.warehouse.findUnique({ where: { code: data.code } });
    if (duplicate) {
      throw new AppError('Mã kho đã tồn tại', 400);
    }
  }

  if (data.is_active === false) {
    const [productAssignments, inventoryCount] = await Promise.all([
      prisma.productWarehouse.count({ where: { warehouse_id: id } }),
      prisma.inventory.count({ where: { location: { warehouse_id: id } } }),
    ]);

    if (productAssignments > 0 || inventoryCount > 0) {
      throw new AppError(
        'Không thể hủy kích hoạt kho khi vẫn còn sản phẩm hoặc tồn kho trong kho',
        400,
      );
    }
  }

  const updateData: any = {};
  if (data.code !== undefined) updateData.code = data.code;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;

  return prisma.warehouse.update({
    where: { id },
    data: updateData,
  });
};

// ==========================================
// WAREHOUSE LOCATIONS (VỊ TRÍ KHO)
// ==========================================

export const getLocations = async (query: GetLocationsQuery) => {
  const { page, limit, warehouse_id, zone_code, rack_code, location_status, storage_condition, search } = query;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (warehouse_id) where.warehouse_id = warehouse_id;
  if (zone_code) where.zone_code = zone_code;
  if (rack_code) where.rack_code = rack_code;
  if (location_status) where.location_status = location_status;
  if (storage_condition) where.storage_condition = storage_condition;

  if (search) {
    where.OR = [
      { location_code: { contains: search } },
      { full_path: { contains: search } },
    ];
  }

  const [locations, total] = await Promise.all([
    prisma.warehouseLocation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        warehouse: {
          select: { name: true, code: true }
        }
      }
    }),
    prisma.warehouseLocation.count({ where }),
  ]);

  return {
    locations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getLocationById = async (id: number) => {
  const location = await prisma.warehouseLocation.findUnique({
    where: { id },
    include: {
      warehouse: {
         select: { name: true, code: true }
      }
    }
  });

  if (!location) {
    throw new AppError('Không tìm thấy vị trí kho', 404);
  }

  return location;
};

export const createLocation = async (data: CreateLocationInput) => {
  // Check warehouse exists
  const warehouse = await prisma.warehouse.findUnique({ where: { id: data.warehouse_id } });
  if (!warehouse) {
    throw new AppError('Không tìm thấy mã kho (warehouse_id) tương ứng', 404);
  }

  const generatedLocationCode = generateLocationCode(
    warehouse.code,
    data.zone_code ?? undefined,
    data.rack_code ?? undefined,
    data.level_code ?? undefined,
    data.bin_code ?? undefined
  );

  // Check duplicate location code
  const existing = await prisma.warehouseLocation.findUnique({
    where: { location_code: generatedLocationCode },
  });
  if (existing) {
    throw new AppError('Mã vị trí kho (location_code) đã tồn tại', 400);
  }

  const full_path = generatedLocationCode;

  const insertData = { ...data };
  if (insertData.zone_code === undefined) insertData.zone_code = null;
  if (insertData.rack_code === undefined) insertData.rack_code = null;
  if (insertData.level_code === undefined) insertData.level_code = null;
  if (insertData.bin_code === undefined) insertData.bin_code = null;
  if (insertData.max_weight === undefined) insertData.max_weight = null;
  if (insertData.max_volume === undefined) insertData.max_volume = null;
  
  return prisma.warehouseLocation.create({
    data: {
      ...(insertData as any),
      full_path,
      location_code: generatedLocationCode,
    },
  });
};

export const updateLocation = async (id: number, data: UpdateLocationInput) => {
  const existing = await prisma.warehouseLocation.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Không tìm thấy vị trí kho', 404);
  }

  // Tính lại occupancy_percent nếu có update dung tích/trọng lượng
  const updatePayload: any = { ...data };
  
  const currentWeight = data.current_weight ?? existing.current_weight;
  const maxWeight = data.max_weight ?? existing.max_weight;

  const currentVolume = data.current_volume ?? existing.current_volume;
  const maxVolume = data.max_volume ?? existing.max_volume;

  let occupancyPercent = 0;
  
  // Tính dựa trên phần trăm cao nhất giữa Khối lượng và Thể tích (Bottiom Neck)
  if (maxWeight && Number(maxWeight) > 0) {
    occupancyPercent = Math.max(occupancyPercent, (Number(currentWeight) / Number(maxWeight)) * 100);
  }
  
  if (maxVolume && Number(maxVolume) > 0) {
    occupancyPercent = Math.max(occupancyPercent, (Number(currentVolume) / Number(maxVolume)) * 100);
  }

  // Cảnh báo (Throw lỗi) nếu % > 100%
  if (occupancyPercent > 100) {
     throw new AppError('Sức chứa vượt quá mức cho phép (Tải trọng hoặc thể tích đều đầy)', 400);
  }

  // Auto set Status based on occupancy
  if (occupancyPercent >= 100) {
    updatePayload.location_status = 'FULL';
  } else if (occupancyPercent > 0) {
    updatePayload.location_status = 'PARTIAL';
  } else {
    updatePayload.location_status = 'AVAILABLE';
  }

  updatePayload.occupancy_percent = occupancyPercent;

  return prisma.warehouseLocation.update({
    where: { id },
    data: updatePayload,
  });
};
