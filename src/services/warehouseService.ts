import type {
  WarehouseFormValues,
  WarehouseItem,
  WarehouseListParams,
  WarehouseListResponse,
  WarehouseLocationFormValues,
  WarehouseLocationItem,
  WarehouseLocationListParams,
  WarehouseLocationListResponse,
} from '@/features/warehouses/types/warehouseType';

let WAREHOUSES: WarehouseItem[] = [
  {
    id: 'wh-1',
    code: 'HCM-DC',
    name: 'Ho Chi Minh Distribution Center',
    manager: 'Nguyen Quoc Bao',
    address: 'District 9, Ho Chi Minh City',
    description: 'Trung tâm phân phối chính cho khu vực miền Nam.',
    capacityUsage: 72,
    locationCount: 18,
    status: 'operational',
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-03-28T08:00:00Z',
  },
  {
    id: 'wh-2',
    code: 'HN-HUB',
    name: 'Hanoi Fulfillment Hub',
    manager: 'Tran Hai Nam',
    address: 'Gia Lam, Hanoi',
    description: 'Kho trung chuyển và đóng gói đơn hàng miền Bắc.',
    capacityUsage: 58,
    locationCount: 12,
    status: 'operational',
    createdAt: '2026-03-03T08:00:00Z',
    updatedAt: '2026-03-26T08:00:00Z',
  },
  {
    id: 'wh-3',
    code: 'DNG-RSV',
    name: 'Da Nang Reserve Storage',
    manager: 'Le Minh Duc',
    address: 'Hoa Vang, Da Nang',
    description: 'Kho dự phòng cho luồng hàng dự án và an toàn tồn kho.',
    capacityUsage: 24,
    locationCount: 9,
    status: 'maintenance',
    createdAt: '2026-03-05T08:00:00Z',
    updatedAt: '2026-03-24T08:00:00Z',
  },
];

let WAREHOUSE_LOCATIONS: WarehouseLocationItem[] = [
  {
    id: 'loc-1',
    warehouseId: 'wh-1',
    warehouseName: 'Ho Chi Minh Distribution Center',
    code: 'HCM-A-01-01',
    zone: 'A',
    aisle: '01',
    bin: '01',
    capacity: 120,
    currentLoad: 92,
    productCount: 18,
    status: 'active',
    createdAt: '2026-03-06T08:00:00Z',
    updatedAt: '2026-03-28T08:00:00Z',
  },
  {
    id: 'loc-2',
    warehouseId: 'wh-1',
    warehouseName: 'Ho Chi Minh Distribution Center',
    code: 'HCM-B-03-07',
    zone: 'B',
    aisle: '03',
    bin: '07',
    capacity: 90,
    currentLoad: 90,
    productCount: 11,
    status: 'blocked',
    createdAt: '2026-03-06T08:00:00Z',
    updatedAt: '2026-03-27T08:00:00Z',
  },
  {
    id: 'loc-3',
    warehouseId: 'wh-2',
    warehouseName: 'Hanoi Fulfillment Hub',
    code: 'HN-C-02-03',
    zone: 'C',
    aisle: '02',
    bin: '03',
    capacity: 60,
    currentLoad: 26,
    productCount: 7,
    status: 'active',
    createdAt: '2026-03-07T08:00:00Z',
    updatedAt: '2026-03-28T09:00:00Z',
  },
];

let nextWarehouseId = 50;
let nextLocationId = 90;

const delay = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function syncWarehouseStats() {
  WAREHOUSES = WAREHOUSES.map((warehouse) => {
    const locations = WAREHOUSE_LOCATIONS.filter((location) => location.warehouseId === warehouse.id);
    return {
      ...warehouse,
      locationCount: locations.length,
    };
  });
}

export async function getWarehouses(params: WarehouseListParams = {}): Promise<WarehouseListResponse> {
  await delay(250);

  let filtered = [...WAREHOUSES];

  if (params.search) {
    const keyword = params.search.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.code.toLowerCase().includes(keyword) ||
        item.name.toLowerCase().includes(keyword) ||
        item.manager.toLowerCase().includes(keyword),
    );
  }

  if (params.status && params.status !== 'all') {
    filtered = filtered.filter((item) => item.status === params.status);
  }

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const start = (page - 1) * pageSize;

  return {
    data: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
  };
}

export async function createWarehouse(payload: WarehouseFormValues): Promise<WarehouseItem> {
  await delay(300);

  const warehouse: WarehouseItem = {
    id: `wh-${nextWarehouseId++}`,
    ...payload,
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    manager: payload.manager.trim(),
    address: payload.address.trim(),
    description: payload.description.trim(),
    locationCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  WAREHOUSES = [warehouse, ...WAREHOUSES];
  return warehouse;
}

export async function updateWarehouse(id: string, payload: WarehouseFormValues): Promise<WarehouseItem> {
  await delay(300);

  const index = WAREHOUSES.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error('Không tìm thấy kho cần cập nhật.');
  }

  WAREHOUSES[index] = {
    ...WAREHOUSES[index],
    ...payload,
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    manager: payload.manager.trim(),
    address: payload.address.trim(),
    description: payload.description.trim(),
    updatedAt: new Date().toISOString(),
  };

  return { ...WAREHOUSES[index] };
}

export async function deleteWarehouse(id: string): Promise<void> {
  await delay(250);
  WAREHOUSES = WAREHOUSES.filter((item) => item.id !== id);
  WAREHOUSE_LOCATIONS = WAREHOUSE_LOCATIONS.filter((location) => location.warehouseId !== id);
}

export async function getWarehouseLocations(
  params: WarehouseLocationListParams = {},
): Promise<WarehouseLocationListResponse> {
  await delay(250);

  let filtered = [...WAREHOUSE_LOCATIONS];

  if (params.search) {
    const keyword = params.search.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.code.toLowerCase().includes(keyword) ||
        item.warehouseName.toLowerCase().includes(keyword) ||
        item.zone.toLowerCase().includes(keyword),
    );
  }

  if (params.status && params.status !== 'all') {
    filtered = filtered.filter((item) => item.status === params.status);
  }

  if (params.warehouseId) {
    filtered = filtered.filter((item) => item.warehouseId === params.warehouseId);
  }

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const start = (page - 1) * pageSize;

  return {
    data: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
  };
}

export async function createWarehouseLocation(
  payload: WarehouseLocationFormValues,
): Promise<WarehouseLocationItem> {
  await delay(300);

  const warehouse = WAREHOUSES.find((item) => item.id === payload.warehouseId);
  if (!warehouse) {
    throw new Error('Kho được chọn không còn tồn tại.');
  }

  const location: WarehouseLocationItem = {
    id: `loc-${nextLocationId++}`,
    ...payload,
    warehouseName: warehouse.name,
    code: payload.code.trim().toUpperCase(),
    zone: payload.zone.trim().toUpperCase(),
    aisle: payload.aisle.trim().toUpperCase(),
    bin: payload.bin.trim().toUpperCase(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  WAREHOUSE_LOCATIONS = [location, ...WAREHOUSE_LOCATIONS];
  syncWarehouseStats();
  return location;
}

export async function updateWarehouseLocation(
  id: string,
  payload: WarehouseLocationFormValues,
): Promise<WarehouseLocationItem> {
  await delay(300);

  const index = WAREHOUSE_LOCATIONS.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error('Không tìm thấy vị trí kho cần cập nhật.');
  }

  const warehouse = WAREHOUSES.find((item) => item.id === payload.warehouseId);
  if (!warehouse) {
    throw new Error('Kho được chọn không còn tồn tại.');
  }

  WAREHOUSE_LOCATIONS[index] = {
    ...WAREHOUSE_LOCATIONS[index],
    ...payload,
    warehouseName: warehouse.name,
    code: payload.code.trim().toUpperCase(),
    zone: payload.zone.trim().toUpperCase(),
    aisle: payload.aisle.trim().toUpperCase(),
    bin: payload.bin.trim().toUpperCase(),
    updatedAt: new Date().toISOString(),
  };

  syncWarehouseStats();
  return { ...WAREHOUSE_LOCATIONS[index] };
}

export async function deleteWarehouseLocation(id: string): Promise<void> {
  await delay(250);
  WAREHOUSE_LOCATIONS = WAREHOUSE_LOCATIONS.filter((item) => item.id !== id);
  syncWarehouseStats();
}
