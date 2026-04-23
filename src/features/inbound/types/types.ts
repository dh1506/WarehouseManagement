// ── Re-export tất cả types cốt lõi từ inboundType & inboundDetailType ────────
// File này đóng vai trò barrel export theo yêu cầu đặt tên "types.ts"
// để dùng cho Stock-In Workflow module.

export type {
  StockInStatus,
  StockIn,
  StockInDetail,
  StockInDetailLot,
  StockInDiscrepancy,
  StockInSupplier,
  StockInLocation,
  StockInCreator,
  StockInDetailProduct,
  StockInListResponse,
  StockInPagination,
  StockInQueryParams,
  StockInKpiStats,
} from './inboundType';

export {
  STOCK_IN_STATUS_LABELS,
  computeStockInTotalValue,
} from './inboundType';

export type {
  InboundWorkflowStep,
  WorkflowStepInfo,
  RecordReceiptPayload,
  CreateDiscrepancyPayload,
  ResolveDiscrepancyPayload,
  AllocateLotPayload,
} from './inboundDetailType';

// ── Discrepancy status enum tường minh cho FE logic ─────────────────────────
export type DiscrepancyStatus = 'PENDING' | 'RESOLVED';
