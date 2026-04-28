# Sprint Tracker

## Sprint: Stock Count (Kiểm Kê) — 2026-04-22

### Status: COMPLETED ✅

---

## Completed Tasks

- [x] Types: `stockCountType.ts` — full response shape + label maps
- [x] Schemas: `stockCountSchemas.ts` — create + confirmVariance Zod schemas
- [x] Service: `stockCountService.ts` — all 9 endpoints + export URL helpers
- [x] Hooks: `useStockCount.ts` — all React Query hooks (list, detail, 7 mutations)
- [x] Component: `StockCountList.tsx` — list page with KPI strip, filters, animated table, pagination
- [x] Component: `CreateStockCountSheet.tsx` — slide-over Sheet with type/scope/detail rows
- [x] Component: `StockCountDetail.tsx` — master-detail header + action buttons + adjustments table
- [x] Component: `StockCountDetailGrid.tsx` — counting grid with inline qty inputs, variance calc, save/confirm
- [x] Component: `ConfirmVarianceDialog.tsx` — per-row or bulk variance reason dialog
- [x] Component: `CancelStockCountDialog.tsx` — confirmation dialog, audit log noted
- [x] Page: `StockCountListPage.tsx` — thin wrapper
- [x] Page: `StockCountDetailPage.tsx` — thin wrapper with skeleton + error state
- [x] Routing: `App.tsx` — `/stock-count` and `/stock-count/:id`
- [x] Navigation: `Sidebar.tsx` — `fact_check / Stock Count` nav item
- [x] Access: `pageAccess.ts` — `stock_counts` module mapped to `/stock-count`
- [x] Working memory: `decision-log.md`, `module-map.md`, `known-issues.md`

---

## Next Steps

1. Test auth-gated export download (KI-2)
2. Migrate `ProductSearchSelect` + `WarehouseLocationSelect` to `components/shared/` (KI-6)
3. Add lot_id search to create form when BE endpoint available (KI-7)
4. Backend: add `assigned_to` field to StockCount (KI-1)
5. Backend: expose full-inventory endpoint for FULL scope auto-population (KI-3)

---

## Sprint: Stock Disposal (Hủy hàng) — 2026-04-22

### Status: IMPLEMENTED (FE) ✅

## Completed Tasks

- [x] Confirmed contract from BE `routes/schemas/services` for stock disposal
- [x] Aligned FE state flow to BE statuses: `DRAFT -> PENDING -> APPROVED -> COMPLETED | CANCELLED`
- [x] Service updates: availability + lot helper queries from `/api/inventories`
- [x] Hook updates: `useDisposalAvailableQuantity`, `useDisposalLotOptions`
- [x] Create form rebuilt: reusable product/location selectors, reason + lot selection, submit-time quantity guard
- [x] List animation tuning: reduced-motion support and lighter transitions
- [x] Detail animation tuning: reduced-motion support and typed error extraction

## Next Steps

1. QA full disposal flow with real role-based accounts (`create/update/approve/cancel`)
2. Add edit-draft flow UI if sprint scope requires draft modification on detail page
3. Monitor `/api/inventories` performance for lot/availability lookup under large datasets

---

## Sprint: Sales Data Management (Quản lý Dữ liệu Bán hàng) — 2026-04-28

### Status: IMPLEMENTED (FE) ✅

## Completed Tasks

- [x] Types: `src/features/sales/types/salesType.ts` — SalesTransaction, SalesDailySummary, SalesImportResult, SalesImportApiError, query params, SalesFilterState
- [x] Schemas: `src/features/sales/schemas/salesSchemas.ts` — salesFilterSchema (with endDate ≥ startDate refinement), validateImportFile, ALLOWED_EXTENSIONS/MAX_FILE_SIZE
- [x] Service: `src/services/salesService.ts` — importSalesBatch (multipart/60s), getSalesTransactions, getSalesDailySummaries, getSampleFileUrl
- [x] Hooks: `src/features/sales/hooks/useSales.ts` — SALES_KEYS factory, useSalesTransactions, useSalesDailySummaries, useImportSalesBatch mutation
- [x] Component: `SalesFilterBar.tsx` — date range inputs (native) + location Popover/Command combobox + Apply button; validation highlighting; responsive stacking
- [x] Component: `ImportCenterTab.tsx` — drag-and-drop dropzone, file card with remove, lock overlay (AnimatePresence), success banner, error banner, stagger-animated error table
- [x] Component: `SalesTransactionsTab.tsx` — skeleton loading, SALE/RETURN badges, RETURN row tint, URL-synced pagination, empty state + clear filters
- [x] Component: `DailySummariesTab.tsx` — bold net_sales_qty, red text for negative revenue, URL-synced pagination, empty state + clear filters
- [x] Page: `SalesDataPage.tsx` — thin Tabs wrapper, URL-synced ?tab= param, AnimatePresence tab transition, forceMount to preserve React Query subscriptions
- [x] Working memory: decision-log.md, module-map.md updated

## Next Steps

1. QA import flow end-to-end with real BE `/api/sales/import` (verify error envelope shape matches SalesImportApiError)
2. Confirm BE endpoint paths: `/api/sales/transactions` and `/api/sales/summaries` (update salesService.ts if different)
3. Verify BE returns SalesDailySummaryListResponse with `meta.totalPages` (not `meta.totalPages` from a different key)
4. Add product_id filter if BE and sprint scope expand to support it
5. Consider extracting the Pagination component to `components/shared/` once used in 3+ modules
