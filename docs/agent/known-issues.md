# Known Issues & Gaps

## Stock Count Module

### KI-1: Assignee field not implemented

The UI design shows an "Assignees" multi-select. The BE schema has no `assigned_to` field on `StockCount`.
**Action needed:** BE to add assignee support. FE create form to be updated when available.

### KI-2: Export download requires query-param auth

BE export endpoints use Bearer token auth (header). `window.open()` cannot set headers.
Currently opens a new tab which may fail auth. **Action needed:** BE to support `?token=` query param on export endpoints, OR FE to use blob download via apiClient.

### KI-3: FULL scope auto-population

Creating a FULL scope audit requires manually adding each item. There's no "load all inventory" endpoint.
**Action needed:** BE to expose `GET /api/inventory?warehouse_id=all` that returns all items for auto-population.

### KI-4: Cancel reason not persisted

BE cancel endpoint accepts no body. Cancel form is confirmation-only. Audit log records status change.
If a cancel reason is needed for traceability, the BE `cancelStockCountSchema` must be extended.

### KI-5: PENDING_CEO status missing

`kiemke.md` describes escalation to `PENDING_CEO` if variance value exceeds threshold. Not in BE schema.
**Action needed:** BE to add `PENDING_CEO` status and threshold logic.

### KI-6: ProductSearchSelect + WarehouseLocationSelect cross-feature import

These components live in `features/inbound/components/`. They should be migrated to `components/shared/`.
**Action needed:** Refactor in a dedicated cleanup sprint.

### KI-7: Lot search not implemented in create form

Create form doesn't support selecting a `lot_id`. The detail row only has product + location.
**Action needed:** Add lot search dropdown once a `/api/products/:id/lots` endpoint is available.

## Stock Disposal Module

### KI-8: No separate reject endpoint/state rollback

BE exposes `PATCH /api/stock-disposals/:id/cancel` but no dedicated reject-to-draft endpoint.
Current FE maps rejection/cancellation to terminal `CANCELLED` state.

### KI-9: FE pre-check uses live inventory snapshot only

Create form validates `quantity <= available_quantity` using `/api/inventories` before submit.
Concurrency can still change stock before mutation reaches BE.
BE validation remains authoritative.

## Sales Data Management Module

### KI-11: Import error envelope shape is assumed

FE assumes 4xx import error body is `{ success, message, data: { batchId, errorCount, errors: [{row,column,value,reason}] } }`. If BE returns a flat shape or uses different field names, only `ImportCenterTab.tsx` needs updating (the `catch` block's `SalesImportApiError` cast + `.data.errors` access).

### KI-12: Sample file endpoint not confirmed

`getSampleFileUrl()` returns `{VITE_API_URL}/api/sales/import/sample`. If BE uses a different path or requires auth headers for download, replace with an apiClient blob-download approach (same pattern as KI-2 for stock count export).

### KI-13: BE endpoint paths for transactions/summaries not verified

Assumed: `GET /api/sales/transactions` and `GET /api/sales/summaries`. Confirm with BE and update `salesService.ts` path strings if different.

### KI-14: Pagination component duplicated between SalesTransactionsTab and DailySummariesTab

The `<Pagination>` component is inlined in both tab files. Candidate for extraction to `components/shared/Pagination.tsx` once a third module needs it (per DRY threshold rule).

## AI Forecast Module

### KI-15: Trigger response missing `triggered_user` include

`POST /api/ai-forecasts/trigger` calls `prisma.aiForecast.findUnique()` without the `triggered_user` include. The FE only uses `data.id` and `data.is_fallback` from the trigger response (for toast + navigation), so this is not currently a problem. If the trigger response is displayed directly in future, the BE controller must add the include.

### KI-16: `confidence` field is 0–1, not 0–100

Gemini returns `confidence` in the range 0–1. The `AiInsightsPanel` multiplies by 100 for display (`gemini.confidence * 100`). If the BE changes this convention, update the multiplication in `AiForecastDetail.tsx`.

### KI-17: KPI cards show page-level counts, not global

The 4 KPI cards (Completed/Running/Fallback) on `AiForecastList` are computed from the current page's items only, not the full dataset. A dedicated BE analytics endpoint (`GET /api/ai-forecasts/stats`) would fix this.

### KI-18: Retrain is a global operation, not per-forecast

`POST /api/ai-forecasts/retrain` collects feedback from ALL forecasts in the system (not just the one currently viewed). The Retrain button is placed on the detail page as a UX convenience but operates globally.

### KI-19: Orphaned files not deleted

`useAiForecastInsights.ts` and `AiForecastDashboard.tsx` are no longer imported but still exist in the codebase. They compile without errors and do not affect the app. Schedule for removal in a cleanup sprint.

---

### KI-10: Lot source is inventory-aggregated, not dedicated lot search API

Lot options are deduped from `/api/inventories` rows.
If BE later provides dedicated lot lookup with richer metadata, FE should switch for better precision/performance.
