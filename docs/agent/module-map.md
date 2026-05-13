# Module Map

## Sales Data Management Module

### Page (thin wrapper)

- `src/pages/operations/SalesDataPage.tsx` → Tabs container with URL-synced `?tab=` param

### Feature Domain

- `src/features/sales/types/salesType.ts` — SalesTransaction, SalesDailySummary, SalesImportResult, query params, SalesFilterState
- `src/features/sales/schemas/salesSchemas.ts` — Zod filter schema, validateImportFile helper, ALLOWED_EXTENSIONS/MAX_FILE_SIZE constants
- `src/features/sales/hooks/useSales.ts` — SALES_KEYS factory + useSalesTransactions, useSalesDailySummaries, useImportSalesBatch
- `src/features/sales/components/ImportCenterTab.tsx` — Drag-and-drop import, lock overlay, success banner, error table (stagger animation)
- `src/features/sales/components/SalesFilterBar.tsx` — Shared date-range inputs + location combobox (Popover+Command)
- `src/features/sales/components/SalesTransactionsTab.tsx` — Paginated transaction table, SALE/RETURN badges, URL-synced filters
- `src/features/sales/components/DailySummariesTab.tsx` — Aggregated summary table, bold net_sales_qty, red negative revenue

### Service

- `src/services/salesService.ts` — importSalesBatch (multipart), getSalesTransactions, getSalesDailySummaries, getSampleFileUrl

### Routing

- `/sales-data` → `SalesDataPage` (already registered in App.tsx, no change needed)
- Tab state: `?tab=import|transactions|summaries`

---

## Stock Count Module

### Pages (thin wrappers)

- `src/pages/operations/StockCountListPage.tsx` → renders `StockCountList`
- `src/pages/operations/StockCountDetailPage.tsx` → renders `StockCountDetail` (with id param)

### Feature Domain

- `src/features/stock-count/types/stockCountType.ts` — all TS interfaces + label maps
- `src/features/stock-count/schemas/stockCountSchemas.ts` — Zod schemas for create + confirm variance forms
- `src/features/stock-count/hooks/useStockCount.ts` — all React Query hooks
- `src/features/stock-count/components/StockCountList.tsx` — list page with KPI strip, filters, table
- `src/features/stock-count/components/StockCountDetail.tsx` — master-detail: header, action buttons, grid
- `src/features/stock-count/components/StockCountDetailGrid.tsx` — counting grid with inline inputs
- `src/features/stock-count/components/CreateStockCountSheet.tsx` — slide-over create form
- `src/features/stock-count/components/ConfirmVarianceDialog.tsx` — variance reason bulk/single dialog
- `src/features/stock-count/components/CancelStockCountDialog.tsx` — cancel confirmation dialog

### Service

- `src/services/stockCountService.ts` — all raw Axios calls to `/api/stock-counts`

### Routing

- `/stock-count` → `StockCountListPage`
- `/stock-count/:id` → `StockCountDetailPage`

### Modified Files

- `src/App.tsx` — added 2 routes
- `src/layouts/Sidebar.tsx` — added nav item `fact_check / Stock Count`
- `src/lib/pageAccess.ts` — added `stock-count` to both `PAGE_PERMISSION_MAP` and `SIDEBAR_PAGE_ACCESS_CONFIG`

### Reused from Inbound Feature

- `src/features/inbound/components/ProductSearchSelect.tsx`
- `src/features/inbound/components/WarehouseLocationSelect.tsx`

## AI Forecast Module

### Pages (thin wrappers)

- `src/pages/operations/AiForecastPage.tsx` → renders `AiForecastList`
- `src/pages/operations/AiForecastDetailPage.tsx` → parses numeric `:id` param → renders `AiForecastDetail`

### Feature Domain

- `src/features/ai-forecast/types/aiForecastType.ts` — AiForecastStatus, ReviewStatus, MapeAlertLevel, PromotionType, ForecastChannel enums; label/style maps; AiForecastEvent, AiForecastResult, AiForecast, AiForecastDetail, AiRetrainBatch entities; query/filter/form types
- `src/features/ai-forecast/schemas/aiForecastSchemas.ts` — triggerForecastSchema, createEventSchema, reviewResultSchema, updateActualSchema, listFilterSchema
- `src/features/ai-forecast/hooks/useAiForecast.ts` — AI_FORECAST_KEYS factory; useAiForecastHistory, useAiForecastDetail, useAiForecastEvents queries; useTriggerForecast, useCreateForecastEvent, useReviewForecastResult, useUpdateActualQty, useTriggerRetrain mutations
- `src/features/ai-forecast/components/AiForecastList.tsx` — list page: KPI strip, filters, table with pulsing RUNNING badge, pagination, TriggerForecastSheet + CreateEventSheet
- `src/features/ai-forecast/components/AiForecastDetail.tsx` — detail: WeatherCard, EventCard, fallback banner, AiInsightsPanel (collapsible chat-like Gemini notes + confidence bars), results table with Approve/Reject/Set Actual, MAPE display, Retrain button
- `src/features/ai-forecast/components/TriggerForecastSheet.tsx` — slide-over: forecast_month, event_id, city; 120s AI timeout
- `src/features/ai-forecast/components/CreateEventSheet.tsx` — slide-over: event_month, program_name, promotion_types (checkboxes), channels (checkboxes), dates, budget
- `src/features/ai-forecast/components/ReviewResultDialog.tsx` — approve/reject toggle; conditional reject_reason textarea
- `src/features/ai-forecast/components/UpdateActualDialog.tsx` — actual_qty input; client-side MAPE preview

### Service

- `src/services/aiForecastService.ts` — 8 raw API calls to `/api/ai-forecasts/*`

### Routing

- `/ai-forecast` → `AiForecastPage`
- `/ai-forecast/:id` → `AiForecastDetailPage` (param renamed from `:sku` in App.tsx)

### Modified Files

- `src/App.tsx` — renamed route param `:sku` → `:id` on detail route
- `src/lib/pageAccess.ts` — added `ai-forecast` entry to `PAGE_PERMISSION_MAP` with `modules: ['ai_forecasts']`

### Orphaned (not imported, safe to delete in cleanup sprint)

- `src/features/ai-forecast/hooks/useAiForecastInsights.ts`
- `src/features/ai-forecast/components/AiForecastDashboard.tsx`

---

## Stock Disposal Module

### Pages (thin wrappers)

- `src/pages/operations/StockDisposalListPage.tsx` -> renders `StockDisposalList`
- `src/pages/operations/StockDisposalDetailPage.tsx` -> loads id param + renders `StockDisposalDetail`

### Feature Domain

- `src/features/stock-disposal/types/stockDisposalType.ts` - BE-aligned entity, status, list/query, analytics types
- `src/features/stock-disposal/schemas/stockDisposalSchemas.ts` - Zod create schema for header + detail lines
- `src/features/stock-disposal/hooks/useStockDisposal.ts` - query/mutation hooks + lot options + available quantity hooks
- `src/features/stock-disposal/components/StockDisposalList.tsx` - list, filter, KPI strip, pagination
- `src/features/stock-disposal/components/StockDisposalDetail.tsx` - detail, workflow timeline, status actions
- `src/features/stock-disposal/components/CreateStockDisposalSheet.tsx` - create form with reusable selectors and stock checks

### Service

- `src/services/stockDisposalService.ts` - stock disposal CRUD/status APIs + inventory helper calls for lot/availability

### Reused Building Blocks

- `src/features/inbound/components/ProductSearchSelect.tsx`
- `src/features/inbound/components/WarehouseLocationSelect.tsx`
- `src/components/PageHeader.tsx`
- `src/hooks/use-toast.ts`

---

## Inbound Module

- `src/features/inbound/components/CreatePurchaseOrderSheet.tsx` — chọn kho + tự gán `warehouse_location_id` đại diện theo danh mục; phân bổ vị trí chi tiết thực hiện ở bước nhận hàng
