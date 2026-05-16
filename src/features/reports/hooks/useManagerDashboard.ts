import { useQuery } from '@tanstack/react-query';
import { getStockIns } from '@/features/inbound/services/inboundService';
import { getStockOuts } from '@/features/outbound/services/outboundService';
import { getStockCounts } from '@/services/stockCountService';
import { getInventoryOverviewData } from '@/services/inventoryOverviewService';
import { getUsers } from '@/services/userService';
import apiClient from '@/services/apiClient';
import type {
  WorkflowData,
  BacklogItem,
  FunnelStep,
  InventoryAlertData,
  AlertSkuItem,
  ZoneHealthData,
  ZoneData,
  ZoneStatus,
  ExceptionItem,
  WorkerItem,
} from '../types/managerDashboardType';
import { computeHoursAging, AGING_THRESHOLD_HOURS } from '../types/managerDashboardType';

const POLL_INTERVAL_MS = 30_000;

// ── Query key factory ─────────────────────────────────────────────────────────

export const MANAGER_DASHBOARD_KEYS = {
  workflow: () => ['manager-dashboard', 'workflow'] as const,
  inventory: () => ['manager-dashboard', 'inventory'] as const,
  zoneHealth: () => ['manager-dashboard', 'zone-health'] as const,
  workforce: () => ['manager-dashboard', 'workforce'] as const,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildOutboundFunnel(
  approved: number,
  picking: number,
): FunnelStep[] {
  const total = approved + picking;
  if (total === 0) return [];
  return [
    {
      label: 'Chờ lấy hàng',
      count: approved,
      pct: Math.round((approved / total) * 100),
      color: 'bg-amber-400',
    },
    {
      label: 'Đang lấy hàng',
      count: picking,
      pct: Math.round((picking / total) * 100),
      color: 'bg-blue-500',
    },
  ];
}

// ── Widget 1: Workflow Backlog ────────────────────────────────────────────────

export function useWorkflowBacklog() {
  return useQuery<WorkflowData>({
    queryKey: MANAGER_DASHBOARD_KEYS.workflow(),
    queryFn: async (): Promise<WorkflowData> => {
      const [pendingIns, inProgressIns, discrepancyIns, approvedOuts, pickingOuts, countingRes] =
        await Promise.all([
          getStockIns({ page: 1, limit: 100, search: '', status: 'PENDING' }),
          getStockIns({ page: 1, limit: 100, search: '', status: 'IN_PROGRESS' }),
          getStockIns({ page: 1, limit: 100, search: '', status: 'DISCREPANCY' }),
          getStockOuts({ page: 1, limit: 100, status: 'APPROVED' }),
          getStockOuts({ page: 1, limit: 100, status: 'PICKING' }),
          getStockCounts({ page: 1, limit: 100, status: 'COUNTING' }),
        ]);

      const toInboundItem = (si: { id: number; code: string; status: string; created_at: string }): BacklogItem => ({
        id: si.id,
        code: si.code,
        status: si.status,
        created_at: si.created_at,
        hoursAging: computeHoursAging(si.created_at),
        path: `/inbound/${si.id}`,
      });

      const toOutboundItem = (so: { id: number; code: string; status: string; created_at: string }): BacklogItem => ({
        id: so.id,
        code: so.code,
        status: so.status,
        created_at: so.created_at,
        hoursAging: computeHoursAging(so.created_at),
        path: `/outbound/${so.id}`,
      });

      const toAuditItem = (sc: { id: number; code: string; created_at: string }): BacklogItem => ({
        id: sc.id,
        code: sc.code,
        status: 'COUNTING',
        created_at: sc.created_at,
        hoursAging: computeHoursAging(sc.created_at),
        path: `/stock-count/${sc.id}`,
      });

      const inbound = [
        ...pendingIns.stockIns.map(toInboundItem),
        ...inProgressIns.stockIns.map(toInboundItem),
        ...discrepancyIns.stockIns.map(toInboundItem),
      ].sort((a, b) => b.hoursAging - a.hoursAging);

      const outboundApproved = approvedOuts.stockOuts.map(toOutboundItem);
      const outboundPicking = pickingOuts.stockOuts.map(toOutboundItem);
      const outbound = [...outboundApproved, ...outboundPicking].sort(
        (a, b) => b.hoursAging - a.hoursAging,
      );

      const audits = countingRes.stockCounts.map(toAuditItem).sort(
        (a, b) => b.hoursAging - a.hoursAging,
      );

      return {
        inbound,
        outbound,
        audits,
        agingInbound: inbound.filter((i) => i.hoursAging > AGING_THRESHOLD_HOURS),
        agingOutbound: outbound.filter((i) => i.hoursAging > AGING_THRESHOLD_HOURS),
        funnelOutbound: buildOutboundFunnel(outboundApproved.length, outboundPicking.length),
      };
    },
    staleTime: 0,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
}

// ── Widget 2: Inventory Alerts ────────────────────────────────────────────────

export function useInventoryAlerts() {
  return useQuery<InventoryAlertData>({
    queryKey: MANAGER_DASHBOARD_KEYS.inventory(),
    queryFn: async (): Promise<InventoryAlertData> => {
      const overview = await getInventoryOverviewData();

      const toAlertItem = (r: {
        productId: string;
        sku: string;
        productName: string;
        available: number;
        minStock: number;
        hasBlockedLot: boolean;
        isLowStock: boolean;
      }): AlertSkuItem => ({
        productId: r.productId,
        sku: r.sku,
        productName: r.productName,
        available: r.available,
        minStock: r.minStock,
        isBlocked: r.hasBlockedLot,
      });

      const criticalSkus = overview.skuRows
        .filter((r) => r.isLowStock)
        .map(toAlertItem)
        .sort((a, b) => a.available - b.available)
        .slice(0, 20);

      const blockedSkus = overview.skuRows
        .filter((r) => r.hasBlockedLot)
        .map(toAlertItem);

      return {
        criticalSkus,
        blockedSkus,
        blockedCount: overview.blockedCount,
        lowStockCount: overview.lowStockCount,
      };
    },
    staleTime: 60_000,
    refetchInterval: POLL_INTERVAL_MS * 2, // less frequent — expensive call
    refetchIntervalInBackground: false,
  });
}

// ── Widget 3: Zone Health ─────────────────────────────────────────────────────

interface RawWarehouse {
  id: number;
  name: string;
  code: string;
}

interface RawWarehouseList {
  warehouses?: RawWarehouse[];
  data?: RawWarehouse[];
}

interface RawInventoryItem {
  location?: {
    warehouse?: { id: number } | null;
  } | null;
}

interface RawInventoryPage {
  items?: RawInventoryItem[];
  inventories?: RawInventoryItem[];
}

function unwrapApiData<T>(response: unknown): T {
  const r = response as { data?: { data?: T } | T };
  if (r?.data && typeof r.data === 'object' && 'data' in (r.data as object)) {
    return (r.data as { data: T }).data;
  }
  return (r?.data as T) ?? (response as T);
}

function zoneStatus(pct: number): ZoneStatus {
  if (pct >= 90) return 'critical';
  if (pct >= 80) return 'warn';
  return 'ok';
}

export function useZoneHealth() {
  return useQuery<ZoneHealthData>({
    queryKey: MANAGER_DASHBOARD_KEYS.zoneHealth(),
    queryFn: async (): Promise<ZoneHealthData> => {
      const [warehouseRes, inventoryRes, discrepancyRes] = await Promise.all([
        apiClient.get('/api/warehouses', { params: { page: 1, limit: 50 } }),
        apiClient.get('/api/inventories', { params: { page: 1, limit: 500 } }),
        getStockIns({ page: 1, limit: 15, search: '', status: 'DISCREPANCY' }),
      ]);

      const warehouseData = unwrapApiData<RawWarehouseList>(warehouseRes);
      const warehouses: RawWarehouse[] = warehouseData?.warehouses ?? warehouseData?.data ?? [];

      const inventoryData = unwrapApiData<RawInventoryPage>(inventoryRes);
      const inventoryRows: RawInventoryItem[] = inventoryData?.items ?? inventoryData?.inventories ?? [];

      // Count inventory rows per warehouse as occupancy proxy
      const countByWarehouse = new Map<number, number>();
      for (const row of inventoryRows) {
        const whId = row.location?.warehouse?.id;
        if (whId != null) {
          countByWarehouse.set(whId, (countByWarehouse.get(whId) ?? 0) + 1);
        }
      }

      // Compute a dynamic capacity: max observed count + 20% headroom
      const maxCount = Math.max(0, ...countByWarehouse.values());
      const capacityPerZone = Math.max(10, Math.ceil(maxCount * 1.2));

      const zones: ZoneData[] = warehouses.map((wh) => {
        const itemCount = countByWarehouse.get(wh.id) ?? 0;
        const occupancyPct = Math.min(100, Math.round((itemCount / capacityPerZone) * 100));
        return {
          id: wh.id,
          name: wh.name,
          code: wh.code,
          itemCount,
          occupancyPct,
          status: zoneStatus(occupancyPct),
        };
      });

      const exceptions: ExceptionItem[] = discrepancyRes.stockIns.map((si) => ({
        id: si.id,
        code: si.code,
        description: si.description,
        created_at: si.created_at,
      }));

      return { zones, exceptions };
    },
    staleTime: 0,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
}

// ── Widget 4: Workforce ───────────────────────────────────────────────────────

const ONLINE_THRESHOLD_HOURS = 8;

function isOnline(lastLogin: string): boolean {
  if (!lastLogin) return false;
  const hours = (Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60);
  return hours <= ONLINE_THRESHOLD_HOURS;
}

// Deterministic mock task progress seeded by user id (stable across re-renders)
function mockTaskProgress(idStr: string): { done: number; total: number } {
  const seed = idStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const total = 10 + (seed % 15);
  const done = Math.floor((seed % 10) / 10 * total);
  return { done, total };
}

export function useWorkforce() {
  return useQuery<WorkerItem[]>({
    queryKey: MANAGER_DASHBOARD_KEYS.workforce(),
    queryFn: async (): Promise<WorkerItem[]> => {
      const response = await getUsers({ page: 1, limit: 50, status: 'Active' });
      const users = response.data;

      const avgTotal = users.length
        ? users.reduce((s, u) => {
            const { total } = mockTaskProgress(u.id);
            return s + total;
          }, 0) / users.length
        : 0;

      return users.map((u) => {
        const { done, total } = mockTaskProgress(u.id);
        const online = isOnline(u.lastLogin);
        const isOverloaded = online && total > avgTotal * 1.3 && done / total < 0.4;
        return {
          id: u.id,
          name: u.fullName || u.name,
          role: u.role,
          lastLogin: u.lastLogin,
          tasksDone: done,
          tasksTotal: total,
          isOnline: online,
          isOverloaded,
        };
      });
    },
    staleTime: 0,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
}
