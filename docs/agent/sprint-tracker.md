# Sprint Tracker

## Sprint: Staff Mobile App — 2026-05-15

### Status: COMPLETE ✅ — TypeScript passes, awaiting BE STAFF permission grant

**Screens delivered:** Task Queue · Execution barcode scan · Blind Count · Exception Reporting

**Critical BE dependency:** STAFF role needs `:update` + discrepancy `:create` permissions added to seed file before mutations will work.

**Next steps:** See KI-SM-1 through KI-SM-5 in known-issues.md.

---

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
- [x] Hooks: `src/features/sales/hooks/useSales.ts` — SALES_KEYS factory + useSalesTransactions, useSalesDailySummaries, useImportSalesBatch mutation
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

---

## Sprint: AI Forecast (Dự báo AI) — 2026-05-05

### Status: IMPLEMENTED (FE) ✅

## Completed Tasks

- [x] Types: `src/features/ai-forecast/types/aiForecastType.ts` — full replacement: AiForecastStatus, ReviewStatus, MapeAlertLevel, PromotionType, ForecastChannel enums + label/style maps; AiForecastEvent, AiForecastResult, AiForecast, AiForecastDetail, AiRetrainBatch entities; query/filter/form value types
- [x] Schemas: `src/features/ai-forecast/schemas/aiForecastSchemas.ts` — full replacement: triggerForecastSchema, createEventSchema, reviewResultSchema, updateActualSchema, listFilterSchema + exported inferred types
- [x] Service: `src/services/aiForecastService.ts` — NEW file: 8 endpoints covering events CRUD, forecast trigger (120s timeout), history list, detail, result review, actual qty update, retrain
- [x] Hooks: `src/features/ai-forecast/hooks/useAiForecast.ts` — NEW file: AI_FORECAST_KEYS factory, useAiForecastHistory, useAiForecastDetail, useAiForecastEvents, useTriggerForecast, useCreateForecastEvent, useReviewForecastResult, useUpdateActualQty, useTriggerRetrain
- [x] Component: `TriggerForecastSheet.tsx` — slide-over form: forecast_month (validated YYYY-MM), event_id select (from events list), city optional; Loader2 spinner during mutation; navigate to detail on success
- [x] Component: `CreateEventSheet.tsx` — slide-over form: event_month, program_name, promotion_types (checkboxes), channels (checkboxes), date range, applicable_products, expected_target, estimated_budget, notes; full Zod validation
- [x] Component: `ReviewResultDialog.tsx` — approve/reject toggle buttons; reject_reason textarea (conditional, min 10 chars); references product name + forecast qty in header
- [x] Component: `UpdateActualDialog.tsx` — actual_qty input; client-side MAPE preview with color-coded threshold display; updates on save → triggers MAPE recalculation on BE
- [x] Component: `AiForecastList.tsx` — list page: PageHeader + Trigger/Events buttons; KPI strip (total/completed/running/fallback counts); filter bar (month + status); animated table with status badges (pulsing for RUNNING); pagination; empty + error states
- [x] Component: `AiForecastDetail.tsx` — detail page: back nav; status badge; fallback warning banner; WeatherCard; EventCard (with channel/promotion badges); AiInsightsPanel (collapsible, chat-like per-product confidence bars + AI notes from ai_raw_response); full results table with Approve/Reject/Set Actual actions; MAPE display with WARNING/CRITICAL alerts; Retrain button (when eligible results exist)
- [x] Page: `AiForecastPage.tsx` — thin wrapper → AiForecastList
- [x] Page: `AiForecastDetailPage.tsx` — thin wrapper: parses numeric :id param, guards invalid IDs with redirect
- [x] Routing: `App.tsx` — renamed route param `:sku` → `:id`
- [x] Access: `pageAccess.ts` — added `ai-forecast` entry to `PAGE_PERMISSION_MAP` with `modules: ['ai_forecasts']`

## Next Steps

1. Verify exact BE response envelope shape for `POST /api/ai-forecasts/trigger` — service returns `prisma.aiForecast.findUnique()` without `triggered_user` include; if BE controller doesn't include it, the detail navigation after trigger will still work (only `id` is used for navigation)
2. Verify `confidence` (0–1 scale) and `note` fields are present in `ai_raw_response.results` — currently cross-referenced from `AiForecast.ai_raw_response` by product_id; if not present (fallback), the AI Insights panel shows appropriate fallback message
3. Test retrain button eligibility logic — requires `review_status !== 'PENDING'` AND `actual_qty !== null` AND `is_retrain_submitted = false`
4. Add pagination to `GET /api/ai-forecasts/events` if event list grows large
5. Consider adding a dedicated analytics endpoint to the BE for global status counts (currently KPI cards show page-level counts only)
6. Retire orphaned files: `useAiForecastInsights.ts` and `AiForecastDashboard.tsx` in a cleanup sprint

---

## Sprint: AI Forecast — Bulk Actual Feedback — 2026-05-14

### Status: COMPLETED ✅

## Context

Backend upgraded to bulk APIs: `POST /api/ai-forecasts/bulk-review` and `POST /api/ai-forecasts/bulk-actual`. Auto-creates Stock In (DRAFT) for approved products grouped by supplier. Sends consolidated MAPE email.

## Completed Tasks

- [x] `BulkActualDialog.tsx` — NEW: dialog for entering actual_qty per selected product in one batch; skips empty rows; per-row MAPE preview; submits via `useBulkUpdateActualQty`
- [x] `AiForecastDetail.tsx` — Added `onSetActualAll` prop to `BulkActionBar`; added "Nhập thực tế" button; wired `bulkActualOpen` state + `selectedItems` memo + `handleBulkActualSuccess`; rendered `<BulkActualDialog>`
- [x] `aiForecastService.ts` — Removed leftover debug `console.log` from `bulkReviewForecastResults`

## Next Steps

1. QA bulk actual flow: select 3+ products → Nhập thực tế → enter mixed values → verify only filled rows are sent to `/bulk-actual`
2. QA bulk approve: verify toast shows `created_stock_ins` codes for approved products with a mapped supplier
3. Verify BE error message when an approved product has no supplier (BE should throw 4xx with meaningful message; FE shows it via destructive toast)

---

## Sprint: Inbound Create Flow — 2026-05-13

### Status: IMPLEMENTED (FE) ✅

## Completed Tasks

- [x] Create stock-in form chọn kho theo danh mục, tự gán `warehouse_location_id` đại diện
- [x] Hiển thị trạng thái kho phù hợp và cảnh báo khi không có vị trí hợp lệ
