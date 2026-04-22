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

### KI-10: Lot source is inventory-aggregated, not dedicated lot search API

Lot options are deduped from `/api/inventories` rows.
If BE later provides dedicated lot lookup with richer metadata, FE should switch for better precision/performance.
