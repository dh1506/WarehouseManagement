# Sprint Tracker

## Outbound Product Select Must Trigger Inventories API — 2026-04-17 (COMPLETED)

| Task                                                     | Status | Notes                                                                                           |
| -------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| Add force-network option for outbound availability       | ✅     | New `getOutboundProductInventoryAvailabilityWithOptions(..., { forceNetwork: true })`           |
| Trigger inventory API call right after product selection | ✅     | In `OutboundCreateSheet`, `onValueChange` now explicitly requests fresh inventory data from API |

**Files changed:**

- `src/features/outbound/services/outboundService.ts`
- `src/features/outbound/components/OutboundCreateSheet.tsx`

## Outbound Create Reuses Inventory Available Helper — 2026-04-17 (COMPLETED)

| Task                                                    | Status | Notes                                                                                         |
| ------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| Add reusable inventory helper for product available qty | ✅     | New `getProductAvailableFromInventory(productId)` in inventory service                        |
| Wire outbound availability to shared inventory helper   | ✅     | Outbound create now consumes Inventory service helper instead of duplicated aggregation logic |

**Files changed:**

- `src/services/inventoryOverviewService.ts`
- `src/features/outbound/services/outboundService.ts`

## Outbound Create Sheet — Product-ID Inventory Fast Path + AC UX Alignment — 2026-04-17 (COMPLETED)

| Task                                             | Status | Notes                                                                                                           |
| ------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------- |
| Optimize available fetch speed by product_id     | ✅     | Outbound availability now queries `/api/inventories` with `product_id` pagination first                         |
| Keep consistency with Inventory Overview logic   | ✅     | If product-filtered query returns empty, fallback to full inventory scan and client-side filter by `product_id` |
| Add short-lived cache + in-flight dedupe         | ✅     | Product availability cache (20s) + pending promise map to avoid duplicate requests across rows                  |
| Align validation/toast/save-loading text with AC | ✅     | Vietnamese validation strings, success toast `Tạo phiếu xuất thành công`, button state `Đang lưu...`            |

**Files changed:**

- `src/features/outbound/services/outboundService.ts`
- `src/features/outbound/components/OutboundCreateSheet.tsx`
- `src/features/outbound/hooks/useOutbound.ts`

## Outbound Create Uses Inventory Overview Available Logic — 2026-04-17 (COMPLETED)

| Task                                                                          | Status | Notes                                                                                |
| ----------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| Switch outbound available calculation to inventory-overview style aggregation | ✅     | Sum `available_quantity` from full paginated inventory rows filtered by `product_id` |
| Add short-lived inventory rows cache for create flow                          | ✅     | Cache full inventory rows for 30s to reduce repeat loading latency                   |
| Keep business validation unchanged                                            | ✅     | Outbound qty still blocked for `<= 0` and `> available`                              |

**File changed:**

- `src/features/outbound/services/outboundService.ts`

## Outbound Save Button Stuck Disabled Despite Valid Qty — 2026-04-17 (COMPLETED)

| Task                                                            | Status | Notes                                                   |
| --------------------------------------------------------------- | ------ | ------------------------------------------------------- |
| Remove hidden pre-submit disable gate on Save button            | ✅     | Save button now disabled only while mutation is pending |
| Keep business validation at submit-time with field errors/toast | ✅     | Existing `onSubmit` validation remains source of truth  |

**File changed:**

- `src/features/outbound/components/OutboundCreateSheet.tsx`

## Outbound Picking: Remove Proof + Mandatory Discrepancy Measure — 2026-04-17 (COMPLETED)

| Task                                           | Status | Notes                                                                  |
| ---------------------------------------------- | ------ | ---------------------------------------------------------------------- |
| Remove proof upload section from picking UI    | ✅     | `ProofUploadSection` removed from `OutboundPickingScreen.tsx`          |
| Require discrepancy mitigation before continue | ✅     | `DiscrepancyPanel` adds required textarea `Biện pháp xử lý chênh lệch` |
| Block continue until mitigation is entered     | ✅     | Continue button disabled when mitigation is empty                      |

**File changed:**

- `src/features/outbound/components/OutboundPickingScreen.tsx`

## Delivery Request Review Page Hardening — 2026-04-17 (COMPLETED)

| Task                                                  | Status | Notes                                                         |
| ----------------------------------------------------- | ------ | ------------------------------------------------------------- |
| Parallel load order + inventory for review page       | ✅     | Added `getStockOutReviewSnapshot` with `Promise.all`          |
| Realtime Available Qty + inline insufficiency warning | ✅     | Added `Khả dụng realtime` column and red warning style        |
| Replace Unit Price with Unit of Measurement           | ✅     | Review table now shows UoM column                             |
| Block approve when insufficient stock                 | ✅     | Approve disabled in PENDING if any line requested > available |
| Race-condition guard at approve click                 | ✅     | Force-network recheck before `PATCH /approve`                 |
| Integer-safe total requested quantity                 | ✅     | Total uses numeric truncation-safe reducer                    |
| Cancel reason required                                | ✅     | Cancel confirm blocks submit without reason                   |

**Files changed:**

- `src/features/outbound/services/outboundService.ts`
- `src/features/outbound/hooks/useOutbound.ts`
- `src/features/outbound/components/OutboundDetail.tsx`

## Outbound Picking Lot Code Auto-Mapping — 2026-04-17 (COMPLETED)

| Task                                     | Status | Notes                                                          |
| ---------------------------------------- | ------ | -------------------------------------------------------------- |
| Keep full lot code input (`LOT-...`)     | ✅     | Lot input remains text, no prefix truncation                   |
| Auto-map lot code -> `product_lot_id`    | ✅     | Resolve via `/api/inventories` lots data by product + location |
| Save/complete with mapped numeric lot id | ✅     | Payload still follows BE contract `product_lot_id: number`     |

**Files changed:**

- `src/features/outbound/services/outboundService.ts`
- `src/features/outbound/components/OutboundPickingScreen.tsx`

## Outbound Create Sheet Still Showing Exceeded (0) — 2026-04-17 (COMPLETED)

| Task                                                       | Status | Notes                                                                                                                    |
| ---------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| Fix unresolved-inventory UI state                          | ✅     | When product is selected but row inventory has not arrived yet, UI now shows `Loading...` instead of `0`                 |
| Prevent false over-limit warning before inventory resolved | ✅     | `quantityExceeded` now requires an existing inventory record and non-error state                                         |
| Add service fallback for broken product_id filter          | ✅     | If `/api/inventories?product_id=...` returns empty, service scans full inventory and filters client-side by `product_id` |

**Files changed:**

- `src/features/outbound/components/OutboundCreateSheet.tsx`
- `src/features/outbound/services/outboundService.ts`

## Outbound Create Sheet Available=0 Mismatch vs Inventory Overview — 2026-04-17 (COMPLETED)

| Task                                                                      | Status | Notes                                                                                                            |
| ------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| Align outbound inventory fetch with Inventory Overview aggregation        | ✅     | `getOutboundProductInventoryAvailability` now reads all inventory pages (`page 1..N`) instead of only first page |
| Remove silent API-fail fallback to misleading `available=0`               | ✅     | If inventory API fails and no fallback data exists, service throws explicit error                                |
| Prevent false `Exceeded available inventory (0)` message on fetch failure | ✅     | Create sheet now treats `inventory.error` as unavailable state and blocks save with dedicated message            |
| Keep blocking behavior for invalid outbound qty                           | ✅     | Still blocks `qty <= 0` and `qty > available`                                                                    |

**Files changed:**

- `src/features/outbound/services/outboundService.ts`
- `src/features/outbound/components/OutboundCreateSheet.tsx`

**Root cause addressed:**

- Inventory screen aggregates all rows/pages, while outbound create flow previously queried only first inventory page and swallowed API errors to `0`, causing false validation failures.

## Outbound Create Form (Detail Page) — Inventory Guard At Submit — 2026-04-17 (COMPLETED)

| Task                                               | Status | Notes                                                                                               |
| -------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| Add submit-time inventory validation per line item | ✅     | On submit, FE now re-checks each selected product against `getOutboundProductInventoryAvailability` |
| Block negative/zero outbound qty at submit layer   | ✅     | Adds manual error `Số lượng xuất phải lớn hơn 0` for invalid qty                                    |
| Block over-available outbound qty at submit layer  | ✅     | Adds manual error `Số lượng xuất vượt quá tồn kho khả dụng (X)`                                     |
| Focus first invalid field                          | ✅     | Uses `setFocus` to guide operator to first invalid line                                             |

**File changed:**

- `src/features/outbound/components/OutboundDetail.tsx`

**Why this was needed:**

- `LineItemEditor` already had realtime guard per row, but submit-time revalidation hardens safety and prevents edge-case bypass when inventory checks are still stabilizing.

## Outbound Create Sheet AC Alignment — 2026-04-17 (COMPLETED)

| Task                                                       | Status | Notes                                                                                            |
| ---------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| Ensure one empty row exists on open/reset                  | ✅     | `OutboundCreateSheet` now auto-appends an empty row when opened and resets with one row          |
| Keep close/cancel/overlay safe-close confirmation behavior | ✅     | Dialog copy aligned to unsaved-data warning requirement                                          |
| Strengthen block-submit UX for invalid forms               | ✅     | Added invalid submit callback to scroll/focus first error and trigger visual attention animation |
| Align quantity over-limit wording with AC                  | ✅     | Message now: `Exceeded available inventory (X)`                                                  |
| Align save loading label with AC                           | ✅     | Button label now `Saving...` while mutation is pending                                           |
| Preserve list auto-refresh and success toast flow          | ✅     | Existing invalidate pattern kept; sales success toast aligned to draft-created message           |

**Files changed:**

- `src/features/outbound/components/OutboundCreateSheet.tsx`
- `src/features/outbound/hooks/useOutbound.ts`
- `src/index.css`

**Notes:**

- No backend changes.
- Architecture boundaries preserved: UI in feature component, API in service, query/mutation in hook.

## Outbound LineItemEditor — Inventory Availability Display & Validation — 2026-04-17 (COMPLETED)

| Task                                                                       | Status | Notes                                                                  |
| -------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------- |
| Add `currentLoad` to `BinAssignmentValue` interface                        | ✅     | `warehouseService.ts` — interface extended                             |
| Pass `currentLoad: payload.currentLoad` in `setBinAssignmentFallback` call | ✅     | `updateZoneBinCapacity` in `warehouseService.ts`                       |
| Export `getProductAvailableQtyFromBinFallback(productId)`                  | ✅     | Reads all bin entries from localStorage, sums currentLoad by productId |
| Rewrite `getOutboundProductInventoryAvailability` — two-layer strategy     | ✅     | Layer 1: localStorage (sync). Layer 2: API. Prefer fallback when > 0   |
| Add `stockOutKeys.productInventory(productId)`                             | ✅     | `useOutbound.ts`                                                       |
| Add `useProductInventoryAvailability(productId)` hook                      | ✅     | `useOutbound.ts` — staleTime 2 min, enabled when productId > 0         |
| Extract `LineItemRow` sub-component                                        | ✅     | Per-row `useWatch` + debounced fetch + `useRef`-guarded setError       |
| Add `InventoryAvailabilityBadge` UI                                        | ✅     | Loading spinner / green "Tồn kho: X" / red "Hết hàng"                  |
| Quantity over-limit → `setError` → disables submit via `formState.isValid` | ✅     | `details.${index}.quantity` manual error                               |

**Root cause resolved:**

- `BinAssignmentValue` was missing `currentLoad` → localStorage fallback returned 0 → displayed nothing
- `getOutboundProductInventoryAvailability` was API-only → failed silently when BE hadn't synced

**Files changed:**

- `src/services/warehouseService.ts` — `BinAssignmentValue` + `getBinAssignmentFallbackMap` + `setBinAssignmentFallback` + `updateZoneBinCapacity` + new export `getProductAvailableQtyFromBinFallback`
- `src/features/outbound/services/outboundService.ts` — import + full rewrite of availability function
- `src/features/outbound/hooks/useOutbound.ts` — `productInventory` key + `useProductInventoryAvailability`
- `src/features/outbound/components/LineItemEditor.tsx` — full rewrite with `LineItemRow` + `InventoryAvailabilityBadge`

**Assumption:** Parent form submit button must bind `disabled={!formState.isValid || mutation.isPending}` for blocking to take effect. If not already done, that single change is required in the parent.

---

## Outbound Available Qty Always 0 After Warehouse Hub Update — 2026-04-16 (COMPLETED — simplified)

| Task                                                         | Status | Notes                                                                                                                                                                                    |
| ------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Diagnose `Available: 0` despite bin having currentLoad = 100 | ✅     | Three-layer failure: (1) `syncBinInventoryFromCurrentLoad` POST/PUT silently fails; (2) location API `current_weight` unreliable from BE; (3) `currentLoad` never stored in localStorage |
| Store `currentLoad` in `wm:bin-assignment-scope` on bin save | ✅     | `setBinAssignmentFallback` now includes `currentLoad: payload.currentLoad` — `warehouseService.ts`                                                                                       |
| Rewrite `getAvailabilityFromWarehouseHubFallback`            | ✅     | Reads `currentLoad` directly from localStorage (synchronous, no API call) — `outboundService.ts`                                                                                         |
| Priority fix: prefer fallback over stale inventory API       | ✅     | `getOutboundProductInventoryAvailability` runs both in parallel, uses fallback when > 0 — `outboundService.ts`                                                                           |
| Backward compat: legacy API fallback for old entries         | ✅     | `getAvailabilityFromLocationApiFallback` used only for localStorage entries without `currentLoad` field                                                                                  |

**Root cause (complete chain):**

1. User saves bin (currentLoad=100) → `PATCH /api/warehouses/locations/:id` succeeds ✅
2. `syncBinInventoryFromCurrentLoad` → `POST /api/inventories` silently fails (BE may not allow direct inventory writes) ❌
3. `setBinAssignmentFallback` wrote `{ productId, categoryId, productName }` to localStorage — **`currentLoad` was missing** ❌
4. Fallback read `current_weight` from location API — BE may not persist this reliably → returns 0 ❌
5. Both sources return 0 → Available: 0 in outbound sheet ❌

**Fix:** `currentLoad` is now persisted in `wm:bin-assignment-scope` at save time. Fallback reads it directly — zero dependency on BE response fields or inventory write success.

**Files changed:**

- `src/services/warehouseService.ts` — `BinAssignmentValue` interface + `setBinAssignmentFallback` call
- `src/features/outbound/services/outboundService.ts` — `BinAssignmentValue` interface + full fallback rewrite

---

## Zone Detail Bin Re-select Persistence Fix — 2026-04-16 (COMPLETED)

| Task                                    | Status | Notes                                                                                     |
| --------------------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| Persist location category scope on save | ✅     | `updateZoneBinCapacity` now calls `syncLocationCategoryScope([locationId], [categoryId])` |
| Re-hydrate latest bin data on re-select | ✅     | `ZoneDetail` now triggers `binsQuery.refetch()` when clicking a bin                       |
| Re-hydrate latest bin data after save   | ✅     | `ZoneDetail` now refetches right after successful mutation                                |
| Save pending protection                 | ✅     | Save button disabled + spinner while request is pending                                   |
| Overload preview behavior alignment     | ✅     | `currentLoad` validation allows `>=0`; preview bar can exceed 100% and render red         |

**Root cause:** Category scope for a specific bin/location was not persisted in FE save flow, so subsequent reads could fallback to zone-level category and show wrong/missing Assigned Product even when inventory data existed in DB.

**Verification:** TypeScript checks pass for edited files (`ZoneDetail.tsx`, `warehouseService.ts`, `warehouseSchemas.ts`).

### Follow-up stabilization (same date)

- Removed blocking `/api/inventories` write calls from Zone Detail save flow.
- Added FE fallback bin-assignment persistence (`locationId -> categoryId/productId/productName`) and merged it into bin hydration mapping.
- Added inventory fetch circuit-breaker (5 minutes) after first API failure to reduce repeated console/network errors.

---

## Outbound Audit Log History Timeline — 2026-04-16 (COMPLETED)

| Task                                                                         | Status | Notes                                                                                                                |
| ---------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| `outboundType.ts` — add `StockOutHistoryItem`                                | ✅     | `action`, `old_data`, `new_data`, `note`, `created_at`, `creator`                                                    |
| `outboundService.ts` — add `getStockOutHistory(id)`                          | ✅     | `GET /api/stock-outs/:id/history`; unwraps array                                                                     |
| `useOutbound.ts` — add `stockOutKeys.history(id)` + `useStockOutHistory(id)` | ✅     | `enabled: id > 0`                                                                                                    |
| `OutboundDetail.tsx` — add `ActivityTimeline` component + render             | ✅     | Status transition badges, relative time, actor name, note; loading skeleton + error + empty states                   |
| `stock-out.service.ts` — add `getStockOutHistory()`                          | ✅     | Queries `audit_logs` where `entity_type='StockOut'` and `entity_id=id`; ordered `created_at asc`; includes `creator` |
| `stock-out.controller.ts` — add `getStockOutHistory` handler                 | ✅     | Standard envelope response                                                                                           |
| `stock-out.route.ts` — add `GET /:id/history`                                | ✅     | `requirePermission('stock_outs:read')` + `stockOutIdParamSchema` validation                                          |

**How audit entries are created (no schema changes needed):**
The Prisma extension in `db.config.ts` already auto-writes to `audit_logs` on every `create`/`update`/`delete` for `StockOut`. Each status change (`submitStockOut`, `approveStockOut`, etc.) triggers an `UPDATE` log entry with `old_data` = full previous row and `new_data` = full updated row. The `ActivityTimeline` reads `old_data.status` → `new_data.status` for the transition badges.

---

## Product Table — Batch Count, Stock Qty, Three-dot Actions — 2026-04-16 (COMPLETED)

| Task                                                                         | Status | Notes                                                                                                       |
| ---------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| `productType.ts` — add `LotStatus`, `ProductLotItem`, `ProductInventoryData` | ✅     | Expiry thresholds: critical ≤7d, near ≤30d                                                                  |
| `productApiService.ts` — add `getProductInventoryData()`                     | ✅     | Calls `GET /api/inventories?product_id=X&limit=100`; aggregates qty + lot list client-side                  |
| `useProducts.ts` — add `useProductInventoryData(productId, enabled)`         | ✅     | `PRODUCT_KEYS.inventory(id)`; staleTime 2 min                                                               |
| `BatchListDialog.tsx` — new component                                        | ✅     | Lazy fetch (enabled=open); lot list with expiry color rows; `LotStatusBadge`                                |
| `ProductManagement.tsx` — In Stock + Batches columns                         | ✅     | `StockQtyCell` + `BatchCountCell` inline components; amber warning icon if qty < minStock                   |
| `ProductManagement.tsx` — three-dot DropdownMenu                             | ✅     | Replaces inline `ActionButton` group; uses shadcn `DropdownMenu`; destructive variant for delete/deactivate |

**No BE changes made.**

**Pending:**

- `BatchCountCell` fetches inventory for lot-tracked products only (`enabled: trackedByLot`)
- Products with `trackedByLot: false` show `—` in the Batches column

---

## Outbound Module Full Rewrite — 2026-04-15 (COMPLETED)

All 6 outbound feature files rewritten against real BE contract. No BE changes made.

| Task                                            | Status | Notes                                                                                                                  |
| ----------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| `outboundType.ts` — correct status/type enums   | ✅     | `APPROVED` replaces `CONFIRMED`; `OutboundType` replaces `OutboundPriority`                                            |
| `outboundSchema.ts` — Zod aligned to BE         | ✅     | Two create schemas routed by type; picked-lots + cancel schemas added                                                  |
| `outboundService.ts` — real endpoints           | ✅     | Dual POST routes, `PUT /picked-lots` atomic, proof stubs                                                               |
| `useOutbound.ts` — hooks + parallel KPI queries | ✅     | 4 `useQueries` for stats; 60s polling; mutations with toast                                                            |
| `OutboundStatusBadge.tsx`                       | ✅     | `OutboundTypeBadge` replaces `OutboundPriorityBadge`                                                                   |
| `OutboundList.tsx`                              | ✅     | KPI cards (manager-only), filters, skeleton, pagination                                                                |
| `LineItemEditor.tsx`                            | ✅     | Matches new `CreateStockOutSchemaValues`                                                                               |
| `OutboundDetail.tsx`                            | ✅     | `ConfirmDialog`, stepper, `ActionPanel` with RBAC, detail table + lots                                                 |
| `OutboundPickingScreen.tsx`                     | ✅     | Lot assignment, `DiscrepancyPanel` with required mitigation input before continue                                      |
| Tailwind v4 canonical classes                   | ✅     | Fixed `bg-gradient-to-r→bg-linear-to-r`, `max-w-[60px]→max-w-15`, `min-h-[400px]→min-h-100`, `min-w-[500px]→min-w-125` |

**Pending BE integration:**

- Available lot picker (currently free-text input for lot ID)

---

## Contract Gap Fixes — 2026-04-13 (COMPLETED)

All critical and medium-M4 gaps fixed. No BE changes made.

| Gap    | Status   | Fix                                                                                                                                        |
| ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| GAP-C1 | ✅ Fixed | Removed `code` from `CategoryFormData`, `buildCategoryFormSchema`, `CategoryFormSheetV2` form UI, and both `categoryApiService` payloads   |
| GAP-C2 | ✅ Fixed | `product_status` now only included in `mapProductPayload` when `mode === 'update'`                                                         |
| GAP-C3 | ✅ Fixed | `unit_price` changed from `min(0)` to `positive()` in both StockIn schemas; component payload guard added; input `min` → `0.01`            |
| GAP-C4 | ✅ Fixed | Added `supplier_id` field to `createStockInFormSchema`                                                                                     |
| GAP-M4 | ✅ Fixed | `updateWarehouseLocation` no longer sends `location_status` for `'active'` locations; only sends `MAINTENANCE` when `status === 'blocked'` |

---

## BE/FE Contract Gap Analysis — 2026-04-13

### CRITICAL GAPS (fix before integration testing)

#### GAP-C1 — Category `code` silently dropped by BE

- **FE sends**: `{ code, name, description, parent_id }` in create AND update
- **BE accepts**: `{ name, description?, parent_id? }` only — `code` is NOT in schema
- **Result**: Zod strips `code` silently. User-entered codes never persisted.
- **Files**: `services/categoryApiService.ts:200,221` vs `BE/schemas/product-category.schema.ts`
- **Fix**: Add `code` to BE create/update schema, OR remove `code` from FE service payloads

#### GAP-C2 — Product create sends `product_status`, BE schema doesn't accept it

- **FE sends**: `product_status` in create payload (`mapProductPayload` mode='create')
- **BE accepts**: `product_status` in UPDATE schema only, not create
- **Result**: New products always use BE default status regardless of UI selection
- **Files**: `services/productApiService.ts:215` vs `BE/schemas/product.schema.ts:79-117`
- **Fix**: Remove `product_status` from `mapProductPayload` when mode='create', or add to BE createProductSchema

#### GAP-C3 — `unit_price` validation mismatch in StockIn create

- **FE schema**: `unit_price: z.coerce.number().min(0)` — allows 0
- **BE schema**: `unit_price: z.number().positive()` — requires > 0
- **Result**: user entering 0 passes FE, fails BE with 400
- **Files**: `features/inbound/schemas/stockInSchemas.ts` vs `BE/schemas/stock-in.schema.ts:50`
- **Fix**: Change FE to `.positive()` to match BE

#### GAP-C4 — `createStockInFormSchema` missing `supplier_id`

- **FE form schema** (`createPurchaseRequestSchema.ts`): `{ warehouse_location_id, description, details[] }` — no `supplier_id`
- **FE service** (`inboundService.ts`): `CreateStockInPayload` requires `supplier_id`
- **BE schema**: `supplier_id` is required in body
- **Also**: two create schemas exist (`createStockInVoucherSchema` in stockInSchemas.ts also has supplier_id) — duplication
- **Fix**: Add `supplier_id` to `createStockInFormSchema` + consolidate schemas

---

### MEDIUM GAPS

#### GAP-M1 — UOM type hardcoded

- `productReferenceService.ts` always sends `uom_type: 'QUANTITY'`
- BE accepts WEIGHT/VOLUME/LENGTH/QUANTITY/PACK
- Users cannot create non-quantity UOMs from UI

#### GAP-M2 — User `warehouse_id` not exposed

- BE create/list accepts `warehouse_id`; FE doesn't send/filter by it

#### GAP-M3 — Location `max_volume` never sent

- BE createLocationSchema accepts `max_weight` AND `max_volume`; FE only sends `max_weight`

#### GAP-M4 — Location status mapping incomplete

- `mapLocationStatusForRequest` maps only `'blocked'→'MAINTENANCE'`, rest→`'AVAILABLE'`
- BE supports PARTIAL and FULL — these are never sent back

---

### MINOR / INFO GAPS

#### GAP-I1 — BE duplicate route registration

- `BE/src/index.ts` lines 46–47: `/api/suppliers` registered twice
- **BE bug** — no FE fix needed

#### GAP-I2 — Product/StockIn/User query filter coverage

- Product: `product_type`, `warehouse_id`, date-range filters not used in FE
- StockIn: `warehouse_location_id` filter not sent
- User: `warehouse_id` filter not exposed
- Feature gaps only

#### GAP-I3 — `location_allowed_categories` CRUD not implemented

- BE: full CRUD at `/api/location-allowed-categories`
- FE: read-only (used in warehouseService for bin category rules)

#### GAP-I4 — Stale module-map reference

- `docs/agent/module-map.md` still references `/api/manufacturers` (removed in DEC-075)

---

### What is confirmed aligned ✅

- All stock-in endpoints (approve/record/discrepancy/allocate/complete)
- All inventory-transaction endpoints + export
- Warehouse + location URLs and payloads
- `/api/inventories` URL (confirmed in BE index.ts:49)
- Auth (login/register)
- User CRUD via `PATCH /api/users/:id`
- Role CRUD + `PUT /api/roles/:id/permissions`
- Brand/Supplier/UOM list + CRUD payloads
- Response envelope unwrapping pattern
- Status enum casing conversions (title-case ↔ UPPER_CASE)
