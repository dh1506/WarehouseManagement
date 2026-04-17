# Sprint Tracker

## Outbound LineItemEditor — Inventory Availability Display & Validation — 2026-04-17 (COMPLETED)

| Task | Status | Notes |
|------|--------|-------|
| Add `currentLoad` to `BinAssignmentValue` interface | ✅ | `warehouseService.ts` — interface extended |
| Pass `currentLoad: payload.currentLoad` in `setBinAssignmentFallback` call | ✅ | `updateZoneBinCapacity` in `warehouseService.ts` |
| Export `getProductAvailableQtyFromBinFallback(productId)` | ✅ | Reads all bin entries from localStorage, sums currentLoad by productId |
| Rewrite `getOutboundProductInventoryAvailability` — two-layer strategy | ✅ | Layer 1: localStorage (sync). Layer 2: API. Prefer fallback when > 0 |
| Add `stockOutKeys.productInventory(productId)` | ✅ | `useOutbound.ts` |
| Add `useProductInventoryAvailability(productId)` hook | ✅ | `useOutbound.ts` — staleTime 2 min, enabled when productId > 0 |
| Extract `LineItemRow` sub-component | ✅ | Per-row `useWatch` + debounced fetch + `useRef`-guarded setError |
| Add `InventoryAvailabilityBadge` UI | ✅ | Loading spinner / green "Tồn kho: X" / red "Hết hàng" |
| Quantity over-limit → `setError` → disables submit via `formState.isValid` | ✅ | `details.${index}.quantity` manual error |

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

| Task | Status | Notes |
|------|--------|-------|
| Diagnose `Available: 0` despite bin having currentLoad = 100 | ✅ | Three-layer failure: (1) `syncBinInventoryFromCurrentLoad` POST/PUT silently fails; (2) location API `current_weight` unreliable from BE; (3) `currentLoad` never stored in localStorage |
| Store `currentLoad` in `wm:bin-assignment-scope` on bin save | ✅ | `setBinAssignmentFallback` now includes `currentLoad: payload.currentLoad` — `warehouseService.ts` |
| Rewrite `getAvailabilityFromWarehouseHubFallback` | ✅ | Reads `currentLoad` directly from localStorage (synchronous, no API call) — `outboundService.ts` |
| Priority fix: prefer fallback over stale inventory API | ✅ | `getOutboundProductInventoryAvailability` runs both in parallel, uses fallback when > 0 — `outboundService.ts` |
| Backward compat: legacy API fallback for old entries | ✅ | `getAvailabilityFromLocationApiFallback` used only for localStorage entries without `currentLoad` field |

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
| `OutboundPickingScreen.tsx`                     | ✅     | Lot assignment, `ProofUploadSection` (B2 stub), `DiscrepancyPanel`                                                     |
| Tailwind v4 canonical classes                   | ✅     | Fixed `bg-gradient-to-r→bg-linear-to-r`, `max-w-[60px]→max-w-15`, `min-h-[400px]→min-h-100`, `min-w-[500px]→min-w-125` |

**Pending BE integration:**

- Proof upload presigned URL endpoint (`GET /api/stock-outs/:id/proof-upload-url`)
- Proof confirmation endpoint (`POST /api/stock-outs/:id/confirm-proof`)
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
