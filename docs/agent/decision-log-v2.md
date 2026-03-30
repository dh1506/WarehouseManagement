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
