# Known Issues & Gaps

## Staff Mobile App (2026-05-15)

### KI-SM-1: STAFF role has only :read permissions — execution actions will 403

BE seed gives STAFF only `stock_ins:read`, `stock_outs:read`, `stock_counts:read`. Actions like `recordCountedQuantity`, `updatePickedLots`, `completeCounting`, `createDiscrepancy` all require `:update` or `:create` permissions. **Action needed:** BE to add `stock_ins:update`, `stock_outs:update`, `stock_counts:update`, `stock_ins_discrepancies:create`, `stock_outs_discrepancies:create` to the STAFF role in `auth.seed.ts`.

### KI-SM-2: Task queue lineCount shows 0 if BE list endpoint omits details

`StockIn`, `StockOut`, `StockCount` list endpoints may not include nested `details[]` to save bandwidth. `lineCount` in `TaskItem` falls back to 0 via `?.length ?? 0`. **Action needed:** Verify BE list endpoints include `details` (or add a `detail_count` field) and update `fromStockIn/Out/Count` mappers accordingly.

### KI-SM-3: Photo in ExceptionReportModal is local preview only

No BE endpoint for media upload. Photo cannot be persisted server-side. **Action needed:** BE to expose `POST /api/exceptions/attachment` or attach image URL to discrepancy payload.

### KI-SM-4: "Send notification to Manager" (AC 4.4) not implemented

No push/email notification endpoint available. The discrepancy `createDiscrepancy` API call is the only signal to management. Real-time notification requires BE WebSocket or push service.

### KI-SM-5: BlindCountScreen requires `stock_counts:update` — same as KI-SM-1

`recordCountedQuantity` and `completeCounting` both need `stock_counts:update`. Blocked until KI-SM-1 is resolved.

---

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

### KI-20: Stock-in create vẫn cần `warehouse_location_id`

BE contract `POST /api/stock-ins` yêu cầu `warehouse_location_id`. FE đã tự gán vị trí đại diện theo kho/danh mục, nhưng nếu doanh nghiệp muốn tạo phiếu ở cấp kho (không gán vị trí), cần mở rộng contract BE để nhận `warehouse_id` hoặc cho phép `warehouse_location_id` null.

---

### KI-21: Supplier-missing approval error is BE-thrown, not FE-validated

When a user bulk-approves a product that has no `supplier_id`, the BE throws an error and the FE shows it via destructive toast. The FE cannot pre-validate this because supplier data is not included in `TriggerForecastResponse`. If needed, add a `has_supplier: boolean` flag to `ForecastRecommendation` so the FE can warn users before submission.

---

### KI-10: Lot source is inventory-aggregated, not dedicated lot search API

Lot options are deduped from `/api/inventories` rows.
If BE later provides dedicated lot lookup with richer metadata, FE should switch for better precision/performance.

---

## Stock Out Module

### KI-22: Stock-out approval fails despite sufficient inventory (✅ FIXED)

**Reported:** 2026-05-17  
**Fixed:** 2026-05-17  
**Severity:** HIGH  
**Status:** ✅ RESOLVED

**Symptoms:**
- Error: "Không thể phê duyệt - Sản phẩm Cà phê hạt Trung Nguyên 500g thiếu tồn kho: yêu cầu 100, khả dụng 0"
- Product has 400 units available in warehouse location LOC-110
- System incorrectly reports 0 units available

**Root Cause:**
- **File:** `BE/Warehouse_Management/src/services/stock-out.service.ts`
- **Function:** `approveStockOut` (lines 176-199)
- **Issue:** Inventory aggregate query missing `warehouse_location_id` filter
- Query checked inventory across ALL locations instead of the specific warehouse location

**Fix Applied:**
```typescript
// ✅ FIXED
const totalInventory = await tx.inventory.aggregate({
  where: { 
    product_id: detail.product_id,
    warehouse_location_id: stockOut.warehouse_location_id // ✅ ADDED
  },
  _sum: { available_quantity: true },
});

// Also improved error message to include product name
const product = await tx.product.findUnique({
  where: { id: detail.product_id },
  select: { name: true }
});

throw new AppError(
  `Sản phẩm ${product?.name || 'ID ' + detail.product_id} thiếu tồn kho: yêu cầu ${requiredQty}, khả dụng ${totalAvailable}`,
  400,
);
```

**Impact:** Stock-out approval validation now works correctly. Users can approve valid stock-out requests.

**Testing Required:**
1. ✅ Product with sufficient stock in target location → should approve
2. ❌ Product with stock in other locations but not target → should reject with clear error
3. ❌ Product with no stock anywhere → should reject with clear error

**Note:** The `completeStockOut` function already used location-specific queries correctly. This fix aligned `approveStockOut` with the same pattern.
