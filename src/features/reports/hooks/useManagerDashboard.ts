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

// ── Khóa query cho React Query ────────────────────────────────────────────────

export const MANAGER_DASHBOARD_KEYS = {
  workflow: () => ['manager-dashboard', 'workflow'] as const,
  inventory: () => ['manager-dashboard', 'inventory'] as const,
  zoneHealth: () => ['manager-dashboard', 'zone-health'] as const,
  workforce: () => ['manager-dashboard', 'workforce'] as const,
};

// ── Hàm tiện ích ─────────────────────────────────────────────────────────────

function buildOutboundFunnel(
  pending: number,
  approved: number,
  picking: number,
): FunnelStep[] {
  const total = pending + approved + picking;
  if (total === 0) return [];
  return [
    {
      label: 'Chờ duyệt',
      count: pending,
      pct: Math.round((pending / total) * 100),
      color: 'bg-slate-400',
    },
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

// ── Widget 1: Tồn đọng công việc ─────────────────────────────────────────────

export function useWorkflowBacklog() {
  return useQuery<WorkflowData>({
    queryKey: MANAGER_DASHBOARD_KEYS.workflow(),
    queryFn: async (): Promise<WorkflowData> => {
      const [pendingIns, inProgressIns, discrepancyIns, pendingOuts, approvedOuts, pickingOuts, countingRes] =
        await Promise.all([
          getStockIns({ page: 1, limit: 100, search: '', status: 'PENDING' }),
          getStockIns({ page: 1, limit: 100, search: '', status: 'IN_PROGRESS' }),
          getStockIns({ page: 1, limit: 100, search: '', status: 'DISCREPANCY' }),
          getStockOuts({ page: 1, limit: 100, status: 'PENDING' }),
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

      const outboundPending = pendingOuts.items.map(toOutboundItem);
      const outboundApproved = approvedOuts.items.map(toOutboundItem);
      const outboundPicking = pickingOuts.items.map(toOutboundItem);
      const outbound = [...outboundPending, ...outboundApproved, ...outboundPicking].sort(
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
        funnelOutbound: buildOutboundFunnel(outboundPending.length, outboundApproved.length, outboundPicking.length),
      };
    },
    staleTime: 0,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
}

// ── Widget 2: Cảnh báo tồn kho ───────────────────────────────────────────────

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
    refetchInterval: POLL_INTERVAL_MS * 2,
    refetchIntervalInBackground: false,
  });
}

// ── Widget 3: Sức khỏe khu vực kho ──────────────────────────────────────────

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
  product_id?: number | null;
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

function zoneStatus(lowStockCount: number): ZoneStatus {
  if (lowStockCount >= 3) return 'critical';
  if (lowStockCount >= 1) return 'warn';
  return 'ok';
}

export function useZoneHealth() {
  return useQuery<ZoneHealthData>({
    queryKey: MANAGER_DASHBOARD_KEYS.zoneHealth(),
    queryFn: async (): Promise<ZoneHealthData> => {
      const [warehouseRes, inventoryRes, discrepancyRes, overviewData] = await Promise.all([
        apiClient.get('/api/warehouses', { params: { page: 1, limit: 50 } }),
        apiClient.get('/api/inventories', { params: { page: 1, limit: 500 } }),
        getStockIns({ page: 1, limit: 15, search: '', status: 'DISCREPANCY' }),
        getInventoryOverviewData(),
      ]);

      const warehouseData = unwrapApiData<RawWarehouseList>(warehouseRes);
      const warehouses: RawWarehouse[] = warehouseData?.warehouses ?? warehouseData?.data ?? [];

      const inventoryData = unwrapApiData<RawInventoryPage>(inventoryRes);
      const inventoryRows: RawInventoryItem[] = inventoryData?.items ?? inventoryData?.inventories ?? [];

      // Lấy danh sách product ID thiếu hàng toàn cục
      const lowStockProductIds = new Set(
        overviewData.skuRows
          .filter((r) => r.isLowStock)
          .map((r) => Number(r.productId)),
      );

      // Đếm sản phẩm và sản phẩm thiếu hàng theo kho
      const itemCountByWarehouse = new Map<number, number>();
      const lowStockByWarehouse = new Map<number, Set<number>>();

      for (const row of inventoryRows) {
        const whId = row.location?.warehouse?.id;
        if (whId == null) continue;

        itemCountByWarehouse.set(whId, (itemCountByWarehouse.get(whId) ?? 0) + 1);

        const productId = row.product_id;
        if (productId != null && lowStockProductIds.has(productId)) {
          if (!lowStockByWarehouse.has(whId)) lowStockByWarehouse.set(whId, new Set());
          lowStockByWarehouse.get(whId)!.add(productId);
        }
      }

      const zones: ZoneData[] = warehouses.map((wh) => {
        const itemCount = itemCountByWarehouse.get(wh.id) ?? 0;
        const lowStockCount = lowStockByWarehouse.get(wh.id)?.size ?? 0;
        return {
          id: wh.id,
          name: wh.name,
          code: wh.code,
          itemCount,
          lowStockCount,
          status: zoneStatus(lowStockCount),
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

// ── Widget 4: Nhân sự ────────────────────────────────────────────────────────

const ONLINE_THRESHOLD_HOURS = 8;

function isOnline(lastLogin: string): boolean {
  if (!lastLogin) return false;
  const hours = (Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60);
  return hours <= ONLINE_THRESHOLD_HOURS;
}

// Tiến độ công việc ước tính dựa trên user id (ổn định qua các lần render)
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
