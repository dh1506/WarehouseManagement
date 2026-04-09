import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getInboundDocuments,
  getInboundKpis,
  getSupplierPerformance,
  createInboundPO,
  updateInboundPO,
} from '../services/inboundService';
import type {
  InboundKpiMetrics,
  InboundPaginatedResult,
  InboundQueryParams,
  SupplierPerformanceItem,
} from '../types/inboundType';
import type { CreateInboundPayload, UpdateInboundPayload, CreateInboundResponse } from '../services/inboundService';

// ── Query keys ổn định và nhất quán ─────────────────────────────────────────
const INBOUND_KEYS = {
  all: ['inbound'] as const,
  documents: (params: InboundQueryParams) =>
    ['inbound', 'documents', params] as const,
  kpis: () => ['inbound', 'kpis'] as const,
  supplierPerformance: () => ['inbound', 'supplier-performance'] as const,
};

// ── Hook: Lấy danh sách phiếu nhập có phân trang ────────────────────────────
export function useInboundDocuments(params: InboundQueryParams) {
  return useQuery<InboundPaginatedResult>({
    queryKey: INBOUND_KEYS.documents(params),
    queryFn: () => getInboundDocuments(params),
    placeholderData: (previousData) => previousData,
  });
}

// ── Hook: KPI tổng quan với short-polling (AC 17) ───────────────────────────
export function useInboundKpis() {
  return useQuery<InboundKpiMetrics>({
    queryKey: INBOUND_KEYS.kpis(),
    queryFn: getInboundKpis,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

// ── Hook: Hiệu suất nhà cung cấp ───────────────────────────────────────────
export function useSupplierPerformance() {
  return useQuery<SupplierPerformanceItem[]>({
    queryKey: INBOUND_KEYS.supplierPerformance(),
    queryFn: getSupplierPerformance,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Hook: Tạo PO ────────────────────────────────────────────────────────────
export function useCreateInbound() {
  const queryClient = useQueryClient();

  return useMutation<CreateInboundResponse, Error, CreateInboundPayload>({
    mutationFn: createInboundPO,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INBOUND_KEYS.all });
    },
  });
}

// ── Hook: Cập nhật PO ───────────────────────────────────────────────────────
export function useUpdateInbound() {
  const queryClient = useQueryClient();

  return useMutation<CreateInboundResponse, Error, UpdateInboundPayload>({
    mutationFn: updateInboundPO,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: INBOUND_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['inbound', 'detail', variables.id] });
    },
  });
}
