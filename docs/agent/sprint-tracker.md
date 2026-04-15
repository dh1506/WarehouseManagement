# Sprint Tracker

## Outbound Module Full Rewrite — 2026-04-15 (COMPLETED)

All 6 outbound feature files rewritten against real BE contract. No BE changes made.

| Task | Status | Notes |
|------|--------|-------|
| `outboundType.ts` — correct status/type enums | ✅ | `APPROVED` replaces `CONFIRMED`; `OutboundType` replaces `OutboundPriority` |
| `outboundSchema.ts` — Zod aligned to BE | ✅ | Two create schemas routed by type; picked-lots + cancel schemas added |
| `outboundService.ts` — real endpoints | ✅ | Dual POST routes, `PUT /picked-lots` atomic, proof stubs |
| `useOutbound.ts` — hooks + parallel KPI queries | ✅ | 4 `useQueries` for stats; 60s polling; mutations with toast |
| `OutboundStatusBadge.tsx` | ✅ | `OutboundTypeBadge` replaces `OutboundPriorityBadge` |
| `OutboundList.tsx` | ✅ | KPI cards (manager-only), filters, skeleton, pagination |
| `LineItemEditor.tsx` | ✅ | Matches new `CreateStockOutSchemaValues` |
| `OutboundDetail.tsx` | ✅ | `ConfirmDialog`, stepper, `ActionPanel` with RBAC, detail table + lots |
| `OutboundPickingScreen.tsx` | ✅ | Lot assignment, `ProofUploadSection` (B2 stub), `DiscrepancyPanel` |
| Tailwind v4 canonical classes | ✅ | Fixed `bg-gradient-to-r→bg-linear-to-r`, `max-w-[60px]→max-w-15`, `min-h-[400px]→min-h-100`, `min-w-[500px]→min-w-125` |

**Pending BE integration:**
- Proof upload presigned URL endpoint (`GET /api/stock-outs/:id/proof-upload-url`)
- Proof confirmation endpoint (`POST /api/stock-outs/:id/confirm-proof`)
- Available lot picker (currently free-text input for lot ID)

---

## Contract Gap Fixes — 2026-04-13 (COMPLETED)

All critical and medium-M4 gaps fixed. No BE changes made.

| Gap | Status | Fix |
|-----|--------|-----|
| GAP-C1 | ✅ Fixed | Removed `code` from `CategoryFormData`, `buildCategoryFormSchema`, `CategoryFormSheetV2` form UI, and both `categoryApiService` payloads |
| GAP-C2 | ✅ Fixed | `product_status` now only included in `mapProductPayload` when `mode === 'update'` |
| GAP-C3 | ✅ Fixed | `unit_price` changed from `min(0)` to `positive()` in both StockIn schemas; component payload guard added; input `min` → `0.01` |
| GAP-C4 | ✅ Fixed | Added `supplier_id` field to `createStockInFormSchema` |
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
