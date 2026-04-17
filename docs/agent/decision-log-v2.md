# Decision Log - Sprint 1 Implementation

## DEC-001 - Mock services for frontend progress

**Date:** 2026-03-28
**Context:** Backend not ready yet, but frontend Sprint 1 still needs production-shaped data flows.
**Decision:** Use mock services in `src/services/` for product settings, products, and warehouses.
**Rationale:** Maintains clean API boundary (services → hooks → feature UI) while unblocking FE progress.

## DEC-002 - Separate create/update form handling when schema diverges

**Date:** 2026-03-28
**Context:** Some forms have different create/update schema requirements.
**Decision:** use single schema but handle both create and edit modes via mode flag in form component.
**Rationale:** Type-safe, reduces complexity with React Hook Form + Zod.

## DEC-003 - Reusable foundations kept lightweight

**Date:** 2026-03-29
**Context:** Sprint 1 needs foundations for Sprint 2-5 reuse, but shouldn't over-engineer.
**Decision:** Add only: PageHeader, StatusBadge, StatePanel, usePermission
**Rationale:** These are immediately reusable across all master-data and transaction screens.

## DEC-004 - Sprint 1 modules follow architecture-first approach

**Date:** 2026-03-29
**Context:** Requirement to NOT reuse external code structure, only preserve design language.
**Decision:** Re-implement Product Settings, Products, Warehouse following AGENTS.md architecture.
**Rationale:** Ensures consistency with project structure: pages stay thin, features contain business logic, services stay raw API calls.

## DEC-005 - Product masters include unit of measure and brand

**Date:** 2026-03-29
**Context:** Scope includes "unit of measure and brand/manufacturer if included".
**Decision:** Include both unit and brand as separate master data tables.
**Rationale:** Core prerequisite for product master. Sprint 2 transactions depend on these.

## DEC-006 - Permission checks use shared usePermission hook

**Date:** 2026-03-29
**Context:** Need permission-aware UI behavior for new modules.
**Decision:** Create usePermission() hook with wildcard support.
**Rationale:** Reduces duplicated permission logic, supports current `permissions: ['*']` mock, easy to replace with real permission keys later.

## DEC-007 - Helper components embedded in module level

**Date:** 2026-03-30
**Context:** SearchInput, FilterSelect, ActionButton, Pagination needed for module-specific tables.
**Decision:** Embed as inline functions within ProductManagement.tsx and ProductReferenceManagement.tsx.
**Rationale:** These are module-specific, unlikely to be reused elsewhere. Co-location improves maintainability. Can extract to separate files if patterns stabilize.

## DEC-008 - Warehouse + Location forms in single file

**Date:** 2026-03-30
**Context:** WarehouseFormDialog and LocationFormDialog are related forms.
**Decision:** Keep both in WarehouseSheets.tsx.
**Rationale:** Related forms benefit from co-location. Both handle warehouse domain. Reduces file fragmentation.

## DEC-009 - Tailwind utility optimization

**Date:** 2026-03-30
**Context:** Build system flagged `min-w-[240px]` should be `min-w-60`.
**Decision:** Updated to use optimized Tailwind utilities in SearchInput components.
**Rationale:** Consistency with Tailwind conventions, reduces CSS payload.

## DEC-010 - No `any` types - use `unknown` with type narrowing

**Date:** 2026-03-30
**Context:** AGENTS.md forbids `any` type.
**Decision:** Replaced `err: any` with `err: unknown` using `instanceof Error` type narrowing.
**Rationale:** Maintains TypeScript strict mode compliance and runtime type safety.

## DEC-011 - Stock-In types barrel export file (types.ts)

**Date:** 2026-04-09
**Context:** User requested a `types.ts` file containing Interfaces and Enums. Project already has `inboundType.ts` and `inboundDetailType.ts`.
**Decision:** Create `types.ts` as a barrel re-export from existing type files + add explicit `DiscrepancyStatus` type.
**Rationale:** Avoids duplicating type definitions. Single clean import path for consumers. `DiscrepancyStatus` was implicitly defined inline in `StockInDiscrepancy` but needed an explicit type alias.

## DEC-012 - Separate stockInSchemas.ts vs existing inboundSchemas.ts

**Date:** 2026-04-09
**Context:** User explicitly requested `stockInSchemas.ts` for Create Voucher + Resolve Discrepancy forms. `inboundSchemas.ts` already has `resolveDiscrepancySchema`.
**Decision:** Create `stockInSchemas.ts` with the Create Voucher schema (including `supplier_id` validation) and a dedicated Resolve form schema.
**Rationale:** The existing `createPurchaseRequestSchema.ts` lacks `supplier_id` field. The explicit request warrants a separate file to keep concerns distinct per workflow step.

## DEC-013 - Toast-integrated hooks (useAllocateStockIn, useCompleteStockIn)

**Date:** 2026-04-09
**Context:** Existing `useCompleteStockIn` in `useInbound.ts` and `useAllocateLots` in `useInboundDetail.ts` don't include toast handling. User explicitly requested hooks with built-in toast success/error.
**Decision:** Create separate hook files following the outbound hooks pattern (`useOutbound.ts`) which embeds `useToast` inside the hook.
**Rationale:** Consistent with outbound module pattern. Reduces boilerplate at call-sites. Original hooks remain untouched for backward compatibility.

## DEC-014 - StockInDetailActions component design

**Date:** 2026-04-09
**Context:** User requested a component that conditionally renders action buttons based on StockIn status.
**Decision:** Use simple conditional rendering (`&&` guards) rather than switch/case. Hard-block Complete button with disabled state + Tooltip warning when status is DISCREPANCY or pending discrepancies exist.
**Rationale:** Conditional `&&` is more readable for JSX rendering and matches the existing InboundDetail.tsx pattern. Tooltip on disabled button requires wrapping in `<span>` for Radix compatibility.

## DEC-015 - StockInWorkerView rework: remove zone map from counting flow

**Date:** 2026-04-09
**Context:** Per user instruction, the inventory counting step does NOT require viewing the warehouse layout diagram. Zone map was removed from counting flow.
**Decision:** Rework StockInWorkerView to use direct product-level quantity entry (ProductCard components) during counting. Zone map / bin-level entry was fully removed. All workflow actions (discrepancy, resolve, allocate, complete) wired to real API hooks. Lot allocation uses a Dialog with WarehouseLocationSelect instead of zone map.
**Rationale:** The zone map is relevant for spatial allocation, not physical counting. Staff count goods at the product level, not bin level. This simplifies UX and aligns with the BE flow (Step 5.3: record received quantities per detail, not per bin).



## DEC-016 - Two-layer inventory availability: localStorage fallback + API

**Date:** 2026-04-17
**Context:** Outbound LineItemEditor shows available_quantity = 0 because `syncBinInventoryFromCurrentLoad` silently fails (BE may reject direct inventory writes), and `/api/inventories` may not reflect latest Zone Detail saves.
**Decision:** Store `currentLoad` in `wm:bin-assignment-scope` localStorage at Zone Detail save time. Outbound reads localStorage first (synchronous, no network), falls back to API if localStorage has no data. Prefer localStorage when > 0.
**Rationale:** Zero network dependency for freshness. Always reflects the operator's last Zone Detail save. API still consulted as secondary source for cases where localStorage has no entry (e.g., fresh browser session).

## DEC-017 - LineItemRow as internal sub-component of LineItemEditor

**Date:** 2026-04-17
**Context:** Each row in LineItemEditor needs its own independent inventory query (different product_id per row).
**Decision:** Extract `LineItemRow` as a named function within the same file (not a separate file). Each instance calls `useProductInventoryAvailability(debouncedProductId)` independently.
**Rationale:** Avoids prop-drilling inventory state across dynamic field array indices. TanStack Query deduplicates identical productId queries automatically. Same-file extraction avoids file bloat for an internal implementation detail.

## DEC-018 - useRef to guard manual setError from clearing Zod resolver errors

**Date:** 2026-04-17
**Context:** RHF's `clearErrors` clears ALL errors for a field, not just 'manual' type. Calling it unconditionally could wipe Zod errors (e.g., "Số lượng phải lớn hơn 0") after a submit attempt.
**Decision:** Track `hasManualErrorRef` per row. Only call `clearErrors` when we previously called `setError`. Zod resolver re-applies on next submit regardless.
**Rationale:** Prevents UX flicker where schema errors disappear mid-form. Manual error and Zod errors are mutually exclusive in practice (Zod catches qty ≤ 0; manual catches qty > availableQty > 0).
