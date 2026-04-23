import type { ApiResponse } from '@/types/api';
import type { InventoryDetailRow, InventoryOverviewData, InventorySkuRow } from '@/features/inventory/types/inventoryType';
import apiClient from './apiClient';
import { collectPaginatedItems } from './searchFallback';

// ── Raw API types ─────────────────────────────────────────────────────────────

interface RawLot {
  id: number;
  lot_no: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  expired_date: string | null;
  production_date: string | null;
  received_at: string;
}

interface RawLocation {
  id: number;
  code: string;
  warehouse?: { id: number; name: string } | null;
}

interface RawInventoryRow {
  id: number;
  product_id: number;
  warehouse_location_id: number;
  quantity: string | number;
  reserved_quantity: string | number;
  available_quantity: string | number;
  location: RawLocation;
  lots: RawLot[];
}

interface RawInventoryPage {
  items?: RawInventoryRow[];
  inventories?: RawInventoryRow[];
  pagination: { total: number; page: number; limit: number; total_pages?: number; totalPages?: number };
}

export interface ProductInventoryAvailability {
  availableQty: number;
  preferredLocationId: number | null;
}

interface RawProductApiItem {
  id?: number;
  code?: string;
  name?: string;
  product_status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' | null;
  has_batch: boolean | null;
  expiry_date: string | null;
  min_stock: number | string | null;
  max_stock: number | string | null;
}

interface RawProductPage {
  products: RawProductApiItem[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

function unwrap<T>(response: unknown): T {
  const r = response as { data?: { data?: T } | T };
  if (r?.data && typeof r.data === 'object' && 'data' in (r.data as object)) {
    return (r.data as { data: T }).data;
  }
  return (r?.data as T) ?? (response as T);
}

/**
 * Reusable inventory availability reader used by outbound create flow.
 * Uses the same /api/inventories source as Inventory Overview.
 */
export async function getProductAvailableFromInventory(
  productId: number,
): Promise<ProductInventoryAvailability> {
  const rows = await collectPaginatedItems<RawInventoryPage, RawInventoryRow>({
    fetchPage: async (page, limit) => {
      const res = await apiClient.get<ApiResponse<RawInventoryPage>>('/api/inventories', {
        params: { page, limit, product_id: productId },
      });
      return unwrap<RawInventoryPage>(res);
    },
    getItems: (payload) => payload.items ?? payload.inventories ?? [],
    getTotalPages: (payload) => payload.pagination.total_pages ?? payload.pagination.totalPages ?? 1,
  });

  let availableQty = 0;
  let preferredLocationId: number | null = null;

  rows.forEach((row) => {
    availableQty += Number(row.available_quantity) || 0;
    if (preferredLocationId == null && Number.isFinite(row.warehouse_location_id)) {
      preferredLocationId = row.warehouse_location_id;
    }
  });

  return { availableQty, preferredLocationId };
}

const NEAR_EXPIRY_DAYS = 30;

// ── getInventoryOverviewData ──────────────────────────────────────────────────
// Fetches all products + all inventory rows, joins client-side.
// warehouseId filter is applied on the inventory side (location.warehouse.id).

export async function getInventoryOverviewData(warehouseId?: string): Promise<InventoryOverviewData> {
  const nearExpiryMs = Date.now() + NEAR_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

  const [allProducts, allInventoryRows] = await Promise.all([
    collectPaginatedItems<RawProductPage, RawProductApiItem>({
      fetchPage: async (page, limit) => {
        const res = await apiClient.get<ApiResponse<RawProductPage>>('/api/products', {
          params: { page, limit, product_status: 'ACTIVE' },
        });
        return unwrap<RawProductPage>(res);
      },
      getItems: (p) => p.products,
      getTotalPages: (p) => p.pagination.totalPages ?? 1,
    }),
    collectPaginatedItems<RawInventoryPage, RawInventoryRow>({
      fetchPage: async (page, limit) => {
        const res = await apiClient.get<ApiResponse<RawInventoryPage>>('/api/inventories', {
          params: { page, limit },
        });
        return unwrap<RawInventoryPage>(res);
      },
      getItems: (p) => p.items ?? p.inventories ?? [],
      getTotalPages: (p) => p.pagination.total_pages ?? p.pagination.totalPages ?? 1,
    }),
  ]);

  // Filter inventory rows by warehouse if specified
  const inventoryRows = warehouseId
    ? allInventoryRows.filter((r) => String(r.location?.warehouse?.id) === warehouseId)
    : allInventoryRows;

  // Group inventory rows by product_id for O(1) lookup
  const byProduct = new Map<number, RawInventoryRow[]>();
  for (const row of inventoryRows) {
    const list = byProduct.get(row.product_id) ?? [];
    list.push(row);
    byProduct.set(row.product_id, list);
  }

  // Build per-SKU rows
  const skuRows: InventorySkuRow[] = allProducts.map((p) => {
    const productId = String(p.id ?? '');
    const rows = byProduct.get(Number(p.id)) ?? [];

    const onHand = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    const allocated = rows.reduce((s, r) => s + (Number(r.reserved_quantity) || 0), 0);
    const available = rows.reduce((s, r) => s + (Number(r.available_quantity) || 0), 0);

    const allLots = rows.flatMap((r) => r.lots ?? []);
    const hasExpiringSoon = allLots.some(
      (l) => l.status === 'ACTIVE' && l.expired_date != null
        && new Date(l.expired_date).getTime() <= nearExpiryMs,
    );
    const hasBlockedLot = allLots.some((l) => l.status === 'INACTIVE');

    const minStock = Number(p.min_stock) || 0;
    const maxStock = Number(p.max_stock) || 0;

    return {
      productId,
      sku: p.code ?? productId,
      productName: p.name ?? 'Unnamed',
      minStock,
      maxStock,
      trackedByLot: Boolean(p.has_batch),
      trackedByExpiry: Boolean(p.expiry_date),
      onHand,
      allocated,
      available,
      isLowStock: minStock > 0 && available <= minStock,
      isOverstock: maxStock > 0 && onHand >= maxStock,
      hasExpiringSoon,
      hasBlockedLot,
    };
  });

  // Derive warehouse options from inventory rows (all rows, unfiltered)
  const warehouseMap = new Map<string, string>();
  for (const row of allInventoryRows) {
    const wh = row.location?.warehouse;
    if (wh) warehouseMap.set(String(wh.id), wh.name);
  }

  const activeProductCount = skuRows.filter((r) => r.onHand > 0).length;
  const lowStockCount = skuRows.filter((r) => r.isLowStock).length;
  const expiringSoonCount = skuRows.filter((r) => r.hasExpiringSoon).length;
  const blockedCount = skuRows.filter((r) => r.hasBlockedLot).length;

  return {
    skuRows,
    activeProductCount,
    lowStockCount,
    expiringSoonCount,
    blockedCount,
    warehouseOptions: Array.from(warehouseMap.entries()).map(([id, name]) => ({ id, name })),
  };
}

// ── getProductLocationInventory ───────────────────────────────────────────────
// Returns per-location breakdown for the drill-down detail view of one product.
// Sum of row.onHand across all returned rows MUST equal the master's onHand value.

export async function getProductLocationInventory(
  productId: string,
  warehouseId?: string,
): Promise<InventoryDetailRow[]> {
  const res = await apiClient.get<ApiResponse<RawInventoryPage>>('/api/inventories', {
    params: { product_id: Number(productId), limit: 100, page: 1 },
  });

  const payload = unwrap<RawInventoryPage>(res);
  let rows = payload.items ?? payload.inventories ?? [];

  if (warehouseId) {
    rows = rows.filter((r) => String(r.location?.warehouse?.id) === warehouseId);
  }

  return rows.map((row) => {
    const lots = row.lots ?? [];
    const lotCodes = lots.map((l) => l.lot_no);
    const expiries = lots
      .filter((l) => l.expired_date)
      .map((l) => l.expired_date as string)
      .sort();

    return {
      locationId: row.warehouse_location_id,
      locationCode: row.location?.code ?? `LOC-${row.warehouse_location_id}`,
      warehouseName: row.location?.warehouse?.name ?? null,
      lotCodes,
      earliestExpiry: expiries[0] ?? null,
      hasHoldLot: lots.some((l) => l.status === 'INACTIVE'),
      onHand: Number(row.quantity) || 0,
      available: Number(row.available_quantity) || 0,
    };
  });
}
