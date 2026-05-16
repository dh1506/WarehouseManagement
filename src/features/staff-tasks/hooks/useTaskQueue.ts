import { useMemo } from 'react';
import { useStockIns } from '@/features/inbound/hooks/useInbound';
import { useStockOuts } from '@/features/outbound/hooks/useOutbound';
import { useStockCounts } from '@/features/stock-count/hooks/useStockCount';
import type { StockIn } from '@/features/inbound/types/inboundType';
import type { StockOut } from '@/features/outbound/types/outboundType';
import type { StockCount } from '@/features/stock-count/types/stockCountType';
import type { TaskItem, TaskPriority } from '../types/taskType';
import { TASK_PRIORITY_ORDER } from '../types/taskType';

// ── Stable query params (defined at module level to avoid re-creating query keys) ──
const STOCK_IN_PARAMS = { page: 1, limit: 50, search: '', status: 'all' as const };
const STOCK_OUT_PARAMS = { page: 1, limit: 50 };
const STOCK_COUNT_PARAMS = { page: 1, limit: 50 };

// ── Zone extraction (e.g. "WH001-AZONE-R01-L01-B01" → "AZONE") ──────────────
function extractZone(code: string | undefined | null): string {
  if (!code) return '—';
  const parts = code.split('-');
  return parts.length >= 2 ? parts[1] : parts[0];
}

// ── Transform domain items → TaskItem ────────────────────────────────────────

function fromStockIn(item: StockIn): TaskItem {
  const priority: TaskPriority = item.status === 'IN_PROGRESS' ? 'NORMAL' : 'LOW';
  const zone = extractZone(item.location?.location_code);
  return {
    id: item.id,
    code: item.code,
    type: 'PUTAWAY',
    priority,
    lineCount: item.details?.length ?? 0,
    zone,
    status: item.status,
    createdAt: item.created_at,
    navigationPath: `/inbound/${item.id}`,
  };
}

function fromStockOut(item: StockOut): TaskItem {
  const priority: TaskPriority = item.status === 'PICKING' ? 'HIGH' : 'NORMAL';
  const zone = item.location?.name ?? item.location?.code ?? '—';
  return {
    id: item.id,
    code: item.code,
    type: 'PICKING',
    priority,
    lineCount: item.details?.length ?? 0,
    zone,
    status: item.status,
    createdAt: item.created_at,
    navigationPath: `/outbound/${item.id}/picking`,
  };
}

function fromStockCount(item: StockCount): TaskItem {
  const firstDetail = item.details?.[0];
  const zone = extractZone(firstDetail?.location?.location_code) ?? item.scope_type;
  return {
    id: item.id,
    code: item.code,
    type: 'COUNTING',
    priority: 'NORMAL',
    lineCount: item.details?.length ?? 0,
    zone,
    status: item.status,
    createdAt: item.created_at,
    navigationPath: `/stock-count/${item.id}/blind-count`,
  };
}

function sortTasks(a: TaskItem, b: TaskItem): number {
  const pDiff = TASK_PRIORITY_ORDER[a.priority] - TASK_PRIORITY_ORDER[b.priority];
  if (pDiff !== 0) return pDiff;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTaskQueue() {
  const stockInsQuery = useStockIns(STOCK_IN_PARAMS);
  const stockOutsQuery = useStockOuts(STOCK_OUT_PARAMS);
  const stockCountsQuery = useStockCounts(STOCK_COUNT_PARAMS);

  const tasks = useMemo<TaskItem[]>(() => {
    const items: TaskItem[] = [];

    for (const s of stockInsQuery.data?.stockIns ?? []) {
      if (s.status === 'PENDING' || s.status === 'IN_PROGRESS') {
        items.push(fromStockIn(s));
      }
    }

    for (const s of stockOutsQuery.data?.items ?? []) {
      if (s.status === 'APPROVED' || s.status === 'PICKING') {
        items.push(fromStockOut(s));
      }
    }

    for (const s of stockCountsQuery.data?.stockCounts ?? []) {
      if (s.status === 'COUNTING') {
        items.push(fromStockCount(s));
      }
    }

    return items.sort(sortTasks);
  }, [stockInsQuery.data, stockOutsQuery.data, stockCountsQuery.data]);

  const isLoading =
    stockInsQuery.isLoading || stockOutsQuery.isLoading || stockCountsQuery.isLoading;

  const isError =
    stockInsQuery.isError && stockOutsQuery.isError && stockCountsQuery.isError;

  function refetch() {
    void stockInsQuery.refetch();
    void stockOutsQuery.refetch();
    void stockCountsQuery.refetch();
  }

  return { tasks, isLoading, isError, refetch };
}
