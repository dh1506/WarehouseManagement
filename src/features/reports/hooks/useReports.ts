import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDashboardSummary,
  getStockInReport,
  getStockOutReport,
  getStockCountReport,
  getStockDisposalReport,
  getInventoryReport,
  getReportConfigs,
  createReportConfig,
  updateReportConfig,
  deleteReportConfig,
} from '@/services/reportService';
import type {
  DashboardSummary,
  DashboardSummaryParams,
  StockInReportParams,
  StockInReportResponse,
  StockOutReportParams,
  StockOutReportResponse,
  StockCountReportParams,
  StockCountReportResponse,
  StockDisposalReportParams,
  StockDisposalReportResponse,
  InventoryReportParams,
  InventoryReportResponse,
  ReportConfig,
  CreateReportConfigPayload,
  UpdateReportConfigPayload,
} from '../types/reportType';

// ── Query key factory ─────────────────────────────────────────────────────────

export const REPORT_KEYS = {
  all: ['reports'] as const,
  dashboard: (params?: DashboardSummaryParams) => ['reports', 'dashboard', params ?? {}] as const,
  stockIn: (params: StockInReportParams) => ['reports', 'stock-in', params] as const,
  stockOut: (params: StockOutReportParams) => ['reports', 'stock-out', params] as const,
  stockCount: (params: StockCountReportParams) => ['reports', 'stock-count', params] as const,
  stockDisposal: (params: StockDisposalReportParams) => ['reports', 'stock-disposal', params] as const,
  inventory: (params: InventoryReportParams) => ['reports', 'inventory', params] as const,
  configs: ['reports', 'configs'] as const,
};

// ── Dashboard Summary ─────────────────────────────────────────────────────────

export function useDashboardSummary(params?: DashboardSummaryParams) {
  return useQuery<DashboardSummary>({
    queryKey: REPORT_KEYS.dashboard(params),
    queryFn: () => getDashboardSummary(params),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
  });
}

// ── Detailed Reports ──────────────────────────────────────────────────────────

const REPORT_STALE_TIME = 2 * 60 * 1000; // 2 min — prevents refetch on every window focus

export function useStockInReport(params: StockInReportParams) {
  return useQuery<StockInReportResponse>({
    queryKey: REPORT_KEYS.stockIn(params),
    queryFn: () => getStockInReport(params),
    placeholderData: (prev) => prev,
    staleTime: REPORT_STALE_TIME,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useStockOutReport(params: StockOutReportParams) {
  return useQuery<StockOutReportResponse>({
    queryKey: REPORT_KEYS.stockOut(params),
    queryFn: () => getStockOutReport(params),
    placeholderData: (prev) => prev,
    staleTime: REPORT_STALE_TIME,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useStockCountReport(params: StockCountReportParams) {
  return useQuery<StockCountReportResponse>({
    queryKey: REPORT_KEYS.stockCount(params),
    queryFn: () => getStockCountReport(params),
    placeholderData: (prev) => prev,
    staleTime: REPORT_STALE_TIME,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useStockDisposalReport(params: StockDisposalReportParams) {
  return useQuery<StockDisposalReportResponse>({
    queryKey: REPORT_KEYS.stockDisposal(params),
    queryFn: () => getStockDisposalReport(params),
    placeholderData: (prev) => prev,
    staleTime: REPORT_STALE_TIME,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useInventoryReport(params: InventoryReportParams) {
  return useQuery<InventoryReportResponse>({
    queryKey: REPORT_KEYS.inventory(params),
    queryFn: () => getInventoryReport(params),
    placeholderData: (prev) => prev,
    staleTime: REPORT_STALE_TIME,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

// ── Report Configs ────────────────────────────────────────────────────────────

export function useReportConfigs() {
  return useQuery<ReportConfig[]>({
    queryKey: REPORT_KEYS.configs,
    queryFn: getReportConfigs,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateReportConfig() {
  const qc = useQueryClient();
  return useMutation<ReportConfig, Error, CreateReportConfigPayload>({
    mutationFn: createReportConfig,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REPORT_KEYS.configs });
    },
  });
}

interface UpdateConfigVars {
  id: number;
  data: UpdateReportConfigPayload;
}

export function useUpdateReportConfig() {
  const qc = useQueryClient();
  return useMutation<ReportConfig, Error, UpdateConfigVars>({
    mutationFn: ({ id, data }) => updateReportConfig(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REPORT_KEYS.configs });
    },
  });
}

export function useDeleteReportConfig() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteReportConfig,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REPORT_KEYS.configs });
    },
  });
}
