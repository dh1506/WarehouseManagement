import type {
  Bin,
  BinCapacityFormValues,
  BinOccupancyLevel,
  WarehouseHub,
  WarehouseHubFormValues,
  WarehouseLayoutConfig,
  WarehouseFormValues,
  WarehouseItem,
  WarehouseListParams,
  WarehouseListResponse,
  WarehouseLocationFormValues,
  WarehouseLocationItem,
  WarehouseLocationListParams,
  WarehouseLocationListResponse,
  WarehouseZoneFormValues,
  Zone,
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
let nextHubId = 10;
let nextZoneId = 100;

const DEFAULT_LAYOUT_CONFIG: WarehouseLayoutConfig = {
  viewMode: 'grid',
  colorMode: 'occupancy',
  columns: 4,
  zoneOrder: [],
};

let WAREHOUSE_HUBS: WarehouseHub[] = [
  {
    id: 'hub-1',
    code: 'WH-CHI-01',
    name: 'Central Hub',
    location: 'Chicago, IL - Tier 1 Node',
    tier: 'Tier 1',
    totalSpace: 125000,
    totalZones: 4,
    usedCapacity: 84,
    layoutConfig: { ...DEFAULT_LAYOUT_CONFIG },
    zones: [
      {
        id: 'zone-1',
        warehouseId: 'hub-1',
        code: 'ZONE-A',
        name: 'High-Velocity Picking',
        type: 'Picking',
        rows: 12,
        shelves: 8,
        levels: 5,
        binCount: 480,
        occupancy: 92,
        bins: [],
      },
      {
        id: 'zone-2',
        warehouseId: 'hub-1',
        code: 'ZONE-B',
        name: 'Bulk Storage',
        type: 'Storage',
        rows: 6,
        shelves: 4,
        levels: 10,
        binCount: 240,
        occupancy: 76,
        bins: [],
      },
      {
        id: 'zone-3',
        warehouseId: 'hub-1',
        code: 'ZONE-C',
        name: 'Cold Storage',
        type: 'Cold',
        rows: 4,
        shelves: 6,
        levels: 4,
        binCount: 96,
        occupancy: 88,
        bins: [],
      },
      {
        id: 'zone-4',
        warehouseId: 'hub-1',
        code: 'ZONE-D',
        name: 'Returns Processing',
        type: 'Returns',
        rows: 8,
        shelves: 12,
        levels: 3,
        binCount: 288,
        occupancy: 45,
        bins: [],
      },
    ],
  },
  {
    id: 'hub-2',
    code: 'WH-TOR-02',
    name: 'North Branch',
    location: 'Toronto, ON - Regional',
    tier: 'Regional',
    totalSpace: 85000,
    totalZones: 0,
    usedCapacity: 42,
    layoutConfig: { ...DEFAULT_LAYOUT_CONFIG, columns: 3 },
    zones: [],
  },
  {
    id: 'hub-3',
    code: 'WH-PHX-03',
    name: 'West Distribution',
    location: 'Phoenix, AZ - Fulfillment',
    tier: 'Fulfillment',
    totalSpace: 210000,
    totalZones: 0,
    usedCapacity: 96,
    layoutConfig: { ...DEFAULT_LAYOUT_CONFIG, columns: 5 },
    zones: [],
  },
];

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

function syncHubZoneStats() {
  WAREHOUSE_HUBS = WAREHOUSE_HUBS.map((hub) => ({
    ...hub,
    totalZones: hub.zones.length,
  }));
}

function toZonePayload(warehouseId: string, payload: WarehouseZoneFormValues): Zone {
  return {
    id: `zone-${nextZoneId++}`,
    warehouseId,
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    type: payload.type.trim(),
    rows: payload.rows,
    shelves: payload.shelves,
    levels: payload.levels,
    binCount: payload.rows * payload.shelves * payload.levels,
    occupancy: payload.occupancy,
    bins: [],
  };
}

function getBinOccupancyLevel(occupancy: number): BinOccupancyLevel {
  if (occupancy === 0) return 'empty';
  if (occupancy <= 60) return 'partial';
  if (occupancy <= 100) return 'full';
  return 'overloaded';
}

function createZoneBins(zone: Zone): Bin[] {
  const bins: Bin[] = [];

  for (let level = zone.levels; level >= 1; level -= 1) {
    for (let row = 1; row <= zone.rows; row += 1) {
      for (let shelf = 1; shelf <= zone.shelves; shelf += 1) {
        const stableSeed = (row * 17 + shelf * 23 + level * 31 + zone.code.length * 13) % 97;
        const capacity = 80 + stableSeed;
        const currentLoad = Math.min(capacity, Math.max(0, Math.floor(capacity * ((stableSeed % 70) / 100))));
        const occupancy = Math.round((currentLoad / capacity) * 100);

        bins.push({
          id: `${zone.id}-bin-${row}-${shelf}-${level}`,
          code: `${String.fromCharCode(64 + row)}-${String(level).padStart(2, '0')}-${String(shelf).padStart(2, '0')}`,
          row,
          shelf,
          level,
          occupancy,
          occupancyLevel: getBinOccupancyLevel(occupancy),
          capacity,
          currentLoad,
          items: 1 + (stableSeed % 12),
          productCount: 1 + (stableSeed % 5),
          temperature: zone.type.toLowerCase().includes('cold') ? 4 + (stableSeed % 4) : 18 + (stableSeed % 8),
          humidity: 35 + (stableSeed % 20),
          lastUpdated: new Date().toISOString(),
        });
      }
    }
  }

  return bins;
}

function ensureZoneBins(zone: Zone): Zone {
  if (zone.bins.length > 0) {
    return zone;
  }

  return {
    ...zone,
    bins: createZoneBins(zone),
  };
}

function syncZoneOccupancy(warehouseId: string, zoneId: string) {
  const hubIndex = WAREHOUSE_HUBS.findIndex((item) => item.id === warehouseId);
  if (hubIndex === -1) return;

  const zone = WAREHOUSE_HUBS[hubIndex].zones.find((item) => item.id === zoneId);
  if (!zone) return;

  const ensuredZone = ensureZoneBins(zone);
  const zoneOccupancy = ensuredZone.bins.length > 0
    ? Math.round(ensuredZone.bins.reduce((sum, bin) => sum + bin.occupancy, 0) / ensuredZone.bins.length)
    : 0;

  WAREHOUSE_HUBS[hubIndex] = {
    ...WAREHOUSE_HUBS[hubIndex],
    zones: WAREHOUSE_HUBS[hubIndex].zones.map((zone) => (
      zone.id === zoneId
        ? {
          ...ensuredZone,
          occupancy: zoneOccupancy,
          binCount: ensuredZone.bins.length,
        }
        : zone
    )),
  };

  const zones = WAREHOUSE_HUBS[hubIndex].zones;
  WAREHOUSE_HUBS[hubIndex] = {
    ...WAREHOUSE_HUBS[hubIndex],
    usedCapacity: zones.length > 0
      ? Math.round(zones.reduce((sum, zone) => sum + zone.occupancy, 0) / zones.length)
      : WAREHOUSE_HUBS[hubIndex].usedCapacity,
  };
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

export async function getWarehouseHubs(): Promise<WarehouseHub[]> {
  await delay(250);
  return WAREHOUSE_HUBS.map((item) => ({
    ...item,
    zones: item.zones.map((zone) => ({
      ...zone,
      bins: zone.bins.map((bin) => ({ ...bin })),
    })),
  }));
}

export async function createWarehouseHub(payload: WarehouseHubFormValues): Promise<WarehouseHub> {
  await delay(300);
  const hub: WarehouseHub = {
    id: `hub-${nextHubId++}`,
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    location: payload.location.trim(),
    tier: payload.tier.trim(),
    totalSpace: payload.totalSpace,
    totalZones: 0,
    usedCapacity: payload.usedCapacity,
    layoutConfig: { ...DEFAULT_LAYOUT_CONFIG, zoneOrder: [] },
    zones: [],
  };

  WAREHOUSE_HUBS = [hub, ...WAREHOUSE_HUBS];
  return { ...hub };
}

export async function updateWarehouseHub(id: string, payload: WarehouseHubFormValues): Promise<WarehouseHub> {
  await delay(300);
  const index = WAREHOUSE_HUBS.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error('Không tìm thấy warehouse hub cần cập nhật.');
  }

  WAREHOUSE_HUBS[index] = {
    ...WAREHOUSE_HUBS[index],
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    location: payload.location.trim(),
    tier: payload.tier.trim(),
    totalSpace: payload.totalSpace,
    usedCapacity: payload.usedCapacity,
  };

  return {
    ...WAREHOUSE_HUBS[index],
    zones: WAREHOUSE_HUBS[index].zones.map((zone) => ({ ...zone })),
  };
}

export async function deleteWarehouseHub(id: string): Promise<void> {
  await delay(250);
  WAREHOUSE_HUBS = WAREHOUSE_HUBS.filter((item) => item.id !== id);
}

export async function createWarehouseZone(warehouseId: string, payload: WarehouseZoneFormValues): Promise<Zone> {
  await delay(300);
  const hubIndex = WAREHOUSE_HUBS.findIndex((item) => item.id === warehouseId);
  if (hubIndex === -1) {
    throw new Error('Không tìm thấy kho để thêm khu vực.');
  }

  const nextZone = toZonePayload(warehouseId, payload);
  WAREHOUSE_HUBS[hubIndex] = {
    ...WAREHOUSE_HUBS[hubIndex],
    zones: [nextZone, ...WAREHOUSE_HUBS[hubIndex].zones],
  };
  syncHubZoneStats();

  return { ...nextZone };
}

export async function updateWarehouseZone(
  warehouseId: string,
  zoneId: string,
  payload: WarehouseZoneFormValues,
): Promise<Zone> {
  await delay(300);
  const hubIndex = WAREHOUSE_HUBS.findIndex((item) => item.id === warehouseId);
  if (hubIndex === -1) {
    throw new Error('Không tìm thấy kho để cập nhật khu vực.');
  }

  const zoneIndex = WAREHOUSE_HUBS[hubIndex].zones.findIndex((item) => item.id === zoneId);
  if (zoneIndex === -1) {
    throw new Error('Không tìm thấy khu vực cần cập nhật.');
  }

  const currentZone = WAREHOUSE_HUBS[hubIndex].zones[zoneIndex];
  const draftZone: Zone = {
    ...currentZone,
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    type: payload.type.trim(),
    rows: payload.rows,
    shelves: payload.shelves,
    levels: payload.levels,
    occupancy: payload.occupancy,
    binCount: payload.rows * payload.shelves * payload.levels,
    bins: currentZone.bins,
  };

  const shouldRegenerateBins =
    currentZone.rows !== draftZone.rows ||
    currentZone.shelves !== draftZone.shelves ||
    currentZone.levels !== draftZone.levels ||
    currentZone.code !== draftZone.code ||
    currentZone.type !== draftZone.type;

  const nextZone: Zone = {
    ...draftZone,
    bins: shouldRegenerateBins ? createZoneBins(draftZone) : draftZone.bins,
    binCount: shouldRegenerateBins
      ? draftZone.rows * draftZone.shelves * draftZone.levels
      : (draftZone.bins.length > 0
        ? draftZone.bins.length
        : draftZone.rows * draftZone.shelves * draftZone.levels),
  };

  WAREHOUSE_HUBS[hubIndex] = {
    ...WAREHOUSE_HUBS[hubIndex],
    zones: WAREHOUSE_HUBS[hubIndex].zones.map((zone) => (zone.id === zoneId ? nextZone : zone)),
  };

  return { ...nextZone };
}

export async function deleteWarehouseZone(warehouseId: string, zoneId: string): Promise<void> {
  await delay(250);
  const hubIndex = WAREHOUSE_HUBS.findIndex((item) => item.id === warehouseId);
  if (hubIndex === -1) {
    throw new Error('Không tìm thấy kho để xóa khu vực.');
  }

  WAREHOUSE_HUBS[hubIndex] = {
    ...WAREHOUSE_HUBS[hubIndex],
    zones: WAREHOUSE_HUBS[hubIndex].zones.filter((zone) => zone.id !== zoneId),
  };
  syncHubZoneStats();
}

export async function updateWarehouseLayoutConfig(
  warehouseId: string,
  payload: WarehouseLayoutConfig,
): Promise<WarehouseLayoutConfig> {
  await delay(250);
  const hubIndex = WAREHOUSE_HUBS.findIndex((item) => item.id === warehouseId);
  if (hubIndex === -1) {
    throw new Error('Không tìm thấy kho để cấu hình sơ đồ.');
  }

  WAREHOUSE_HUBS[hubIndex] = {
    ...WAREHOUSE_HUBS[hubIndex],
    layoutConfig: {
      viewMode: payload.viewMode,
      colorMode: payload.colorMode,
      columns: payload.columns,
      zoneOrder: payload.zoneOrder,
    },
  };

  return { ...WAREHOUSE_HUBS[hubIndex].layoutConfig };
}

export async function getZoneBins(warehouseId: string, zoneId: string): Promise<Bin[]> {
  await delay(200);
  const hubIndex = WAREHOUSE_HUBS.findIndex((item) => item.id === warehouseId);
  if (hubIndex === -1) {
    throw new Error('Không tìm thấy kho cần xem sơ đồ.');
  }

  const zone = WAREHOUSE_HUBS[hubIndex].zones.find((item) => item.id === zoneId);
  if (!zone) {
    throw new Error('Không tìm thấy khu vực kho cần xem.');
  }

  const ensuredZone = ensureZoneBins(zone);
  if (ensuredZone !== zone) {
    WAREHOUSE_HUBS[hubIndex] = {
      ...WAREHOUSE_HUBS[hubIndex],
      zones: WAREHOUSE_HUBS[hubIndex].zones.map((item) => (item.id === ensuredZone.id ? ensuredZone : item)),
    };
    syncZoneOccupancy(warehouseId, zoneId);
  }

  return ensuredZone.bins.map((bin) => ({ ...bin }));
}

export async function updateZoneBinCapacity(
  warehouseId: string,
  zoneId: string,
  binId: string,
  payload: BinCapacityFormValues,
): Promise<Bin> {
  await delay(220);
  const hubIndex = WAREHOUSE_HUBS.findIndex((item) => item.id === warehouseId);
  if (hubIndex === -1) {
    throw new Error('Không tìm thấy kho cần cập nhật sức chứa.');
  }

  const zone = WAREHOUSE_HUBS[hubIndex].zones.find((item) => item.id === zoneId);
  if (!zone) {
    throw new Error('Không tìm thấy khu vực kho cần cập nhật.');
  }

  const ensuredZone = ensureZoneBins(zone);
  const index = ensuredZone.bins.findIndex((item) => item.id === binId);
  if (index === -1) {
    throw new Error('Không tìm thấy bin cần cập nhật.');
  }

  const occupancy = Math.min(999, Math.round((payload.currentLoad / payload.capacity) * 100));
  const nextBins = ensuredZone.bins.map((bin, binIndex) => (binIndex === index
    ? {
      ...bin,
      capacity: payload.capacity,
      currentLoad: payload.currentLoad,
      items: payload.items,
      productCount: payload.productCount,
      occupancy,
      occupancyLevel: getBinOccupancyLevel(occupancy),
      lastUpdated: new Date().toISOString(),
    }
    : bin));

  const nextZone: Zone = {
    ...ensuredZone,
    bins: nextBins,
    binCount: nextBins.length,
  };

  WAREHOUSE_HUBS[hubIndex] = {
    ...WAREHOUSE_HUBS[hubIndex],
    zones: WAREHOUSE_HUBS[hubIndex].zones.map((item) => (item.id === zoneId ? nextZone : item)),
  };

  syncZoneOccupancy(warehouseId, zoneId);

  return { ...nextBins[index] };
}
