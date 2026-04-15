# Decision Log

## 2026-04-09 — Inbound Module Real-API Migration

- **Status enum**: Aligned to BE uppercase `StockInStatus` (`DRAFT|PENDING|IN_PROGRESS|DISCREPANCY|COMPLETED|CANCELLED`).
- **KPI stats**: No BE endpoint — derived client-side by fetching `limit=100` list and counting statuses.
- **Supplier gap**: `StockIn` has no `supplier_id`; table column replaced with `creator.full_name`.
- **Date gap**: No `expected_date`/`actual_date` on `StockIn`; table shows `created_at` (BE sorts desc by default).
- **WorkflowStepper**: Driven by `status` field — DRAFT→0, PENDING→1, IN_PROGRESS/DISCREPANCY→2, COMPLETED→3.
- **Hook rule**: `usePermission` called twice (not inside `.some()`) to avoid Rules of Hooks violation.
- **Motion**: All animations use `motion/react` v12 (`motion`, `AnimatePresence`).
- **Removed widgets**: `AiForecastWidget`, `SupplierPerformanceWidget` removed from dashboard — no real BE data.
- **Mock files deleted**: `data/mockInboundData.ts`, `data/mockInboundDetailData.ts`.


## 2026-04-10 — AllocateLotModal → AllocateBinMapModal (zone map UX)

- **Problem 1**: `AllocateLotModal` used a text-search dropdown (`WarehouseLocationSelect`) to select a bin — no spatial context for the employee.
- **Problem 2**: `WarehouseLocationSelect` fetched with `limit: 40` and hardcoded `location_status: 'AVAILABLE'`, cutting off most locations.
- **Decision**: Replaced `AllocateLotModal` entirely with `AllocateBinMapModal` in `StockInWorkerView.tsx`.
  - Two-panel layout: `ZoneMapEmbed` (left, full zone map with clickable bins) + product rows (right).
  - Zone is derived from `data.location.location_code` using existing `extractZoneCode()` helper.
  - Clicking a bin auto-assigns it to the "active" product row and advances to the next unassigned row.
  - Already-assigned bins are highlighted via `highlightBinCodes`; active selection shown via `selectedBinId`.
  - FULL bins are rejected with a toast warning.
- **ID mapping (v2 — fixed)**: `toZoneBin` in `warehouseService.ts` sets `bin.id = "loc-{numericId}"`. The numeric `location_id` is parsed directly via `Number(bin.id.replace(/^loc-/, ''))`. No secondary API lookup needed. The original text-search approach (`/api/warehouses/locations/search?search=zoneCode`) failed for R01 because the hub bins endpoint (`getWarehouseLocations` with `warehouseId`) and the search endpoint return different result sets. Parsing from `bin.id` is authoritative and works for every rack.
- **WarehouseLocationSelect fix**: `limit` increased 40→200; hardcoded `location_status: 'AVAILABLE'` filter removed. Status badge still shown in results for context.

## DEC-056 - Low occupancy is now a first-class warning tier

**Date:** 2026-04-02  
**Context:** The warehouse UI needed a clearer warning state for low-capacity areas, and the existing partial range was too broad for operational attention.  
**Decision:** Introduce a dedicated low tier for 1-20% occupancy, keep partial at 21-60%, and surface warning badges/colors across warehouse, zone, rack, and bin UI.  
**Rationale:** This makes low-capacity areas easier to spot and keeps the same rules consistent across all warehouse views.

## DEC-001 - Mock services for frontend progress

**Date:** 2026-03-28  
**Context:** Backend chua s?n s�ng nhung frontend Sprint 1 v?n c?n ho�n thi?n production-shaped flows.  
**Decision:** D�ng mock services mutable trong `src/services/` cho user, role, category, product settings, products, v� warehouses.  
**Rationale:** Gi? ti?n d? FE m� v?n b�m d�ng API boundary `services -> hooks -> feature UI`.

## DEC-002 - Separate create/update form handling when schema diverges

**Date:** 2026-03-28  
**Context:** M?t s? form c� create/update schema kh�c nhau r� r?t.  
**Decision:** T�ch ri�ng form flow khi c?n thay v� c? gom v�o m?t schema ph?c t?p.  
**Rationale:** Type-safe hon, �t xung d?t hon v?i React Hook Form v� Zod.

## DEC-003 - Category hierarchy computed in frontend

**Date:** 2026-03-29  
**Context:** Category tree c?n hi?n th? parent/child ngay c? khi BE chua tr? v? metadata c�y d?y d?.  
**Decision:** T�nh to�n hierarchy trong frontend t? danh s�ch category hi?n c�.  
**Rationale:** Gi? UI ph?n h?i t?t v� kh�ng ch?n ti?n d? do thi?u backend aggregation.

## DEC-004 - Sprint 1 master-data modules implemented as architecture-first reimplementation

**Date:** 2026-03-29  
**Context:** Y�u c?u kh�ng reuse external/generated code structure, ch? gi? design language.  
**Decision:** Re-implement Product Settings, Product Management, Warehouse, v� Warehouse Locations theo d�ng structure hi?n c� c?a repo.  
**Rationale:** Tu�n th? `AGENTS.md`, gi? page m?ng, business logic trong `features/`, raw API calls trong `services/`.

## DEC-005 - Reusable foundation kept intentionally lightweight

**Date:** 2026-03-29  
**Context:** Sprint 1 c?n foundation d? Sprint 2 t�i s? d?ng nhung kh�ng du?c m? r?ng refactor ngo�i scope.  
**Decision:** Ch? th�m shared pieces th?t s? d�ng du?c ngay:

- `PageHeader`
- `StatusBadge`
- `StatePanel`
- `usePermission`
  **Rationale:** �? reuse cho master-data v� transaction screens sau n�y m� kh�ng t?o abstraction n?ng ho?c generic h�a qu� s?m.

## DEC-006 - Product supporting masters in Sprint 1 include unit and brand

**Date:** 2026-03-29  
**Context:** Scope ghi r� unit of measure v� brand/manufacturer "if included in scope", nhung workspace kh�ng c� contract ri�ng.  
**Decision:** Bao g?m `unit` v� `brand` trong Sprint 1 d? product master c� d? d? li?u g?c v?n h�nh.  
**Rationale:** ��y l� b? d? li?u t?i thi?u h?p l� d? Sprint 2 inbound/outbound/inventory c� th? t�i s? d?ng ngay.

## DEC-007 - Permission checks for new modules use shared hook with wildcard support

**Date:** 2026-03-29  
**Context:** Auth store hi?n c� user mock v?i `permissions: ['*']`, nhung chua c� permission guard d�ng chung cho module m?i.  
**Decision:** Th�m `usePermission()` d? UI m?i c� th? ?n/hi?n action theo permission v� v?n tuong th�ch v?i wildcard hi?n t?i.  
**Rationale:** Gi?m l?p logic permission trong component v� d? thay th? khi backend ch?t permission keys th?t.

## DEC-008 - Warehouse Hub switched to service-driven CRUD

**Date:** 2026-03-30  
**Context:** Warehouse Hub page was mutating local mock arrays directly in component, causing drift from architecture rules.  
**Decision:** Move warehouse hub CRUD, zone CRUD, and layout config persistence to `src/services/warehouseService.ts`, expose via React Query hooks in `src/features/warehouses/hooks/useWarehouses.ts`.  
**Rationale:** Keeps page thin, centralizes raw API logic, and aligns with AGENTS architecture (`services -> hooks -> feature UI`).

## DEC-009 - Swipe layout configuration stored per warehouse

**Date:** 2026-03-30  
**Context:** User requested configurable "so do kho dang luot" behavior on hub map.  
**Decision:** Add `layoutConfig` to `WarehouseHub` model (`viewMode`, `colorMode`, `columns`) and provide save/reset flow through layout mutation.  
**Rationale:** Enables configurable horizontal map browsing without introducing unrelated global state or heavy refactors.

## DEC-010 - Zone bins persisted on zone model instead of detached cache

**Date:** 2026-03-30  
**Context:** Zone Detail was reading bins generated lazily from a detached in-memory map, not from the hub zone payload.  
**Decision:** Persist bins directly in each `Zone` (`bins: Bin[]`) and update service flows (`getZoneBins`, `updateZoneBinCapacity`, zone update sync) to read/write that model.  
**Rationale:** Keeps zone detail aligned with warehouse hub resource shape, reduces model drift, and preserves architecture boundary `services -> hooks -> feature UI`.

## DEC-011 - Zone detail mutation actions follow warehouse manage permission

**Date:** 2026-03-30  
**Context:** Bin capacity controls were always editable in Zone Detail regardless of permission state.  
**Decision:** Gate edit actions using `usePermission('master_data.warehouses.manage')` and disable input/mutation controls for read-only users.  
**Rationale:** Aligns Zone Detail with permission-aware behavior already used in Warehouse Hub and other admin modules.

## DEC-012 - User Management switched from mock to real API contract

**Date:** 2026-03-30  
**Context:** User module still depended on mutable in-memory mock data and diverged from backend contract wrappers.  
**Decision:** Replace mock CRUD with real calls to `/api/users` and normalize FE/BE mapping in `userService.ts` (`username/full_name/role_id/user_status`).  
**Rationale:** Aligns sprint implementation with approved API contract and avoids data drift between FE behavior and backend persistence.

## DEC-013 - User role filter and form role selection now use role_id

**Date:** 2026-03-30  
**Context:** FE was filtering and submitting users by hardcoded role labels (`Admin/Manager/Staff`) while backend expects `role_id`.  
**Decision:** Fetch role options from `/api/roles` and bind filter/form values to role IDs.  
**Rationale:** Keeps query and mutation payloads contract-accurate and removes hardcoded assumptions.

## DEC-014 - Login response normalized and persisted auth state hardened

**Date:** 2026-03-30  
**Context:** FE showed white-screen behavior in runtime while build stayed green after auth/user contract changes. Root cause risk came from mismatched login payload mapping and legacy persisted auth shape (missing `permissions`).  
**Decision:** Normalize login response in `features/auth/api/login.ts` (unwrap API envelope + map backend user/permissions to `UserProfile`) and harden permission guards/migration in auth store (`usePermission` + persisted state normalization).  
**Rationale:** Prevents runtime crashes from malformed user objects, keeps auth state contract-stable, and preserves architecture boundaries.

## DEC-015 - Permission fallback for warehouse manage interactions

**Date:** 2026-03-30  
**Context:** Warehouse drag/drop and edit actions were blocked after auth integration because FE checked `master_data.warehouses.manage` while backend permissions were not yet aligned to that key set.  
**Decision:** Extend `usePermission` with safe fallback rules: admin-style role bypass (`ADMIN`, `CEO`) and alias matching for warehouse manage keys (`warehouse(s):manage/update/write`).  
**Rationale:** Restores expected manage UX (including DnD) while waiting for backend permission contract to converge.

## DEC-016 - User export now follows explicit checkbox selection

**Date:** 2026-03-30  
**Context:** User requested row-level checkbox export behavior: export only selected rows; if header checkbox is selected, export full dataset.  
**Decision:** Add checkbox selection state in User table and wire export logic so header checkbox triggers full filtered fetch from BE (`getUsers` with `limit = total`), while row selection exports only selected rows on current view.  
**Rationale:** Matches user expectation and keeps data source API-driven instead of exporting implicit page data.

## DEC-017 - Role permission matrix switched to backend contract

**Date:** 2026-03-31  
**Context:** Role permission screen was still using in-memory mock data while backend already exposes `/api/roles`, `/api/roles/:id`, `/api/roles/:id/permissions`, and `/api/permissions`.  
**Decision:** Replace `roleService.ts` mock flow with API-driven mapping: fetch roles from `/api/roles`, build matrix from assigned permissions (`/api/roles/:id`) + permission catalog (`/api/permissions`), and submit updates via `PUT /api/roles/:id/permissions` with `permission_ids`.  
**Rationale:** Aligns FE behavior with approved API contract, removes data drift, and keeps architecture boundary `services -> hooks -> feature UI` intact.

## DEC-018 - Align FE methods with API design table (users/roles permissions)

**Date:** 2026-03-31  
**Context:** API design table specifies: `PUT /api/users/:id`, `PATCH /api/users/:id` (lock), `PATCH /api/users/:id/reset-password`, `GET /api/roles/:id/permissions`, `PATCH /api/roles/:id/permissions`.  
**Decision:** Update FE service methods/endpoints to match exactly this contract in `userService.ts` and `roleService.ts`.  
**Rationale:** Tránh lệch method/path giữa FE và tài liệu API đã chốt, giúp backend integration ổn định theo schema User/Role/Permission hiện có.

## DEC-019 - Complete API review for users, roles, permissions, approval

**Date:** 2026-03-31  
**Context:** API design table bổ sung nhóm quản lý vai trò (`POST/PUT /api/roles/:id`) và phê duyệt (`PATCH /api/roles/:id/approval-config`).  
**Decision:** Bổ sung hàm `createRole`, `updateRole` trong `roleService.ts` và đổi `updateApprovalConfig` sang gọi `PATCH /api/roles/:id/approval-config`.  
**Rationale:** Bao phủ đầy đủ 4 nhóm API trong scope review: người dùng, vai trò, phân quyền, phê duyệt theo đúng tài liệu đã thiết kế.

## DEC-020 - Backend role domain locked to CEO/MANAGER/STAFF

**Date:** 2026-03-31  
**Context:** Yêu cầu nghiệp vụ chốt chỉ dùng 3 role: CEO, MANAGER, STAFF.  
**Decision:** Khóa whitelist role ở BE tại `role.schema.ts` + `role.service.ts`, và đổi logic role mặc định khi register sang tra theo `name='STAFF'` thay vì hardcode `id=1`.  
**Rationale:** Đảm bảo không thể tạo/cập nhật role ngoài domain chuẩn và tránh sai lệch khi id role thay đổi theo dữ liệu thực tế.

## DEC-021 - Remove gender from user add/update and standardize full_name + VN phone validation

**Date:** 2026-03-31  
**Context:** Yêu cầu nghiệp vụ bỏ trường giới tính trong luồng add/update user; full_name chỉ cần không rỗng (kể cả trim), phone phải theo chuẩn số Việt Nam.  
**Decision:** Xoá `gender` khỏi FE user form/schema/payload và cập nhật validate `full_name` + `phone` ở cả BE (`user.schema.ts`) và FE (`features/users/schemas/userSchema.ts`). Đồng thời thêm field `phone` vào payload/user model FE và form UI add/update.  
**Rationale:** Đồng bộ behavior nhập liệu giữa FE và BE theo yêu cầu business, giảm sai lệch validate và đảm bảo dữ liệu sạch trước khi lưu.

## DEC-045 - Categories switched from mock data to real API contract

**Date:** 2026-04-01  
**Context:** FE categories module was still driven by in-memory mock data even though backend already exposes product-category CRUD routes and hierarchical counters.  
**Decision:** Add src/services/categoryApiService.ts and repoint category hooks/page flow to real API calls for list/detail/create/update/delete. Legacy mock files remain only as isolated references.  
**Rationale:** Removes mock drift and makes category management use the actual persisted backend source of truth.

## DEC-046 - Category status remains a backend dependency

**Date:** 2026-04-01  
**Context:** The AC includes active/inactive display and status mutation, but current backend category schema/routes do not expose status/is_active fields or a dedicated status endpoint.  
**Decision:** Ship the API-backed categories page without fake status mutation. FE renders status as unknown and documents the contract gap instead of inventing unsupported persistence.  
**Rationale:** Keeps FE behavior honest to the current API contract and avoids misleading users with non-persisted UI state.

- 2026-04-01: Categories V2 removed status UI/export because backend category contract still has no persisted status field; pagination footer aligned to User Management interaction pattern; delete confirmation dialog refreshed for clearer destructive UX.

- 2026-04-01: Standardized the API-backed Categories V2 module to English for all user-facing copy, validation messages, dialog content, and date formatting (en-US).

- 2026-04-01: Categories V2 layout now uses fixed-height flex sections so only the table content scrolls; table header is sticky and pagination stays pinned at the bottom of the page content area.

- 2026-04-01: Product Management list layout now matches Categories with internal table scrolling, sticky table headers, and a bottom-pinned pagination footer using the same numbered paging pattern.

- 2026-04-01: Products module now uses real APIs for list/detail/create/update plus category/brand/unit/manufacturer option loading through productApiService; delete was removed from UI because backend currently exposes no DELETE /api/products endpoint.

## DEC-047 - Product supporting masters switched from mock to real API endpoints

**Date:** 2026-04-01  
**Context:** Product supporting masters (`unit`, `brand`) were still using in-memory mock arrays and did not include manufacturer in the same management flow.  
**Decision:** Replace `productReferenceService.ts` with API-backed calls to `/api/units-of-measure`, `/api/brands`, and `/api/manufacturers`; extend FE type and UI tabs to support `manufacturer`.  
**Rationale:** Keeps supporting masters aligned with backend persistence and removes data drift before Sprint 2 transaction modules.

## DEC-048 - Warehouse and location master CRUD switched to backend contract

**Date:** 2026-04-01  
**Context:** `warehouseService.ts` was using local mutable mock datasets for warehouses and locations while backend routes already exist.  
**Decision:** Map FE warehouse/location queries and mutations to `/api/warehouses` and `/api/warehouses/locations*`, including envelope unwrapping and status mapping.  
**Rationale:** Ensures master data in Warehouse Management reflects persisted backend state and keeps architecture boundary `services -> hooks -> feature UI` unchanged.

## DEC-049 - Keep unsupported delete actions as explicit backend dependency

**Date:** 2026-04-01  
**Context:** Current backend contracts for product references and warehouses expose GET/POST/PATCH only (no DELETE routes).  
**Decision:** Keep delete mutations in FE flow but return explicit contract error messages from service layer instead of fake local deletion.  
**Rationale:** Prevents misleading users with non-persisted destructive actions while preserving current UI structure and scope.

## DEC-050 - Fix role permission matrix 404 without backend changes

**Date:** 2026-04-01  
**Context:** FE permission matrix was calling `GET /api/roles/:id/permissions` and `PATCH /api/roles/:id/permissions`, but backend currently exposes `GET /api/roles/:id` and `PUT /api/roles/:id/permissions`.  
**Decision:** Read assigned permissions from `GET /api/roles/:id` response and save matrix via `PUT /api/roles/:id/permissions`; also align role update to `PATCH /api/roles/:id`.  
**Rationale:** Removes runtime 404 immediately while keeping FE consistent with current deployed backend contract.

## DEC-051 - Advanced permissions projected from sidebar modules and real role permissions

**Date:** 2026-04-01  
**Context:** Advanced Permissions UI was entirely mock-backed and disconnected from real role assignments.  
**Decision:** Replace mock service with API-backed projection: fetch role + permission catalog, map backend module/actions to sidebar modules, and persist through `PUT /api/roles/:id/permissions`.  
**Rationale:** Keeps advanced permission UX aligned with actual access control state and enforces Sprint 1 requirement that advanced modules reflect sidebar pages.

## DEC-052 - Implement operations placeholders as contract-safe insight modules

**Date:** 2026-04-02  
**Context:** Routes `/import-export`, `/inventory`, `/ai-forecast` were placeholders while backend currently has no dedicated transaction/forecast endpoints in contract.  
**Decision:** Implement these modules as production-ready insight screens using only existing APIs (`/api/products`, `/api/warehouses`, `/api/warehouses/locations/search`) and keep unsupported actions (create import/export request, persistent forecast actions) as explicit backend dependencies with clear user feedback.  
**Rationale:** Unblocks frontend navigation and operational visibility without inventing unsupported API shapes, while preserving architecture boundaries `services -> feature hooks -> feature UI`.

## DEC-053 - Warehouse Hub shows both raw location count and grouped zone count

**Date:** 2026-04-02  
**Context:** User validated database and found 9 rows in `warehouse_locations`, but Hub card showed only 3 which looked like API data loss.  
**Decision:** Keep current zone aggregation behavior for Hub visualization, and add explicit `totalLocations` metric alongside `totalZones` in Hub summary UI.  
**Rationale:** Preserves the intended zone-centric UX while making raw data volume visible and auditable.

## DEC-054 - Keep zone aggregation labeling explicit in UI

**Date:** 2026-04-02  
**Context:** Zone list can be interpreted as raw row list if not labeled.  
**Decision:** Add a clear contextual label `Grouped by zone code` at the zone section heading.  
**Rationale:** Reduces interpretation ambiguity during QA/DB cross-check without changing backend contract or data model.

## DEC-055 - Warehouse zone configuration now provisions real location slots

**Date:** 2026-04-02  
**Context:** Zone create/edit form accepted `rows/shelves/levels` but service previously created only one placeholder location, causing mismatch between UI intent and persisted backend data.  
**Decision:** Re-implement zone create/update in `warehouseService.ts` so zone structure is materialized through `/api/warehouses/locations` records (contract-backed aggregation model), with guard limit `<= 500` generated locations per request.  
**Rationale:** Keeps FE truthful to backend storage design (`warehouse_locations` is source of truth for zones) while preserving existing architecture and avoiding fake zone persistence.

## DEC-056 - Warehouse location form aligned to DB coordinate model

**Date:** 2026-04-02  
**Context:** FE location form omitted `rack` and `level`, while backend schema and DB design include `rack_code` and `level_code` and hub/zone visualization relies on these coordinates.  
**Decision:** Extend FE location type/schema/form/service payload with `rack` and `level`, and update location table coordinates display accordingly.  
**Rationale:** Improves contract fidelity, keeps zone/bin mapping consistent, and prevents partial coordinate data entry in warehouse administration flow.

## DEC-063 - Product export mirrors user-selection behavior with product-shaped columns

**Date:** 2026-04-02  
**Context:** Product Management needed an export flow similar to User Management without copying the user spreadsheet structure directly.  
**Decision:** Add row/header checkbox selection to the product list, export selected rows on the current page, and when the header checkbox is active fetch the full filtered product dataset before generating Excel in `features/products/utils/exportProducts.ts`.  
**Rationale:** Keeps export behavior consistent across admin tables while preserving product-specific fields, labels, and formatting.

## DEC-064 - Product import accepts the same Excel shape as product export

**Date:** 2026-04-02  
**Context:** User requested product import using the same Excel format currently generated by the product export flow.  
**Decision:** Add client-side `.xlsx` parsing in `features/products/utils/importProducts.ts`, map exported labels back to current master-data IDs, validate each row with `productFormSchema`, and create products row-by-row from Product Management.  
**Rationale:** Reuses the approved export shape as the import contract, keeps raw API writes inside existing product mutation flow, and avoids inventing a separate backend import API.

## DEC-057 - Warehouse category scope configured at warehouse level

**Date:** 2026-04-02  
**Context:** Business rule requires each warehouse to define one-or-many categories eligible for storage before zone/bin configuration. Backend currently has no dedicated warehouse-category mapping endpoint.  
**Decision:** Add warehouse-level category multi-select in Warehouse Hub form and persist FE scope map by warehouse ID in local storage via `warehouseService.ts`.  
**Rationale:** Enforces operational rule immediately in FE while keeping backend contract untouched and architecture boundaries intact.

## DEC-058 - Zone category scope is constrained by parent warehouse scope

**Date:** 2026-04-02  
**Context:** Business rule states zone categories must be a subset of categories configured on the parent warehouse.  
**Decision:** Extend zone form with category multi-select limited to warehouse scope; service validation rejects out-of-scope category IDs during create/update.  
**Rationale:** Prevents invalid storage configuration early and keeps zone setup behavior deterministic for downstream bin assignment.

## DEC-059 - Bin assignment enforces single product within allowed category scope

**Date:** 2026-04-02  
**Context:** Each storage bin must hold one specific product type, and that product must belong to the zone-allowed category set.  
**Decision:** Add bin inspector fields (`categoryId`, `productId`) with Zod-required validation; on save, service verifies category-in-zone and product-in-category, then stores assignment state per bin in FE local storage.  
**Rationale:** Implements strict bin-level storage governance now, despite lacking backend persistence fields for product-slot assignment.

## DEC-060 - Warehouse Hub add/edit flow standardized to shadcn Sheet

**Date:** 2026-04-02  
**Context:** User requested add/edit forms in warehouse area to use side sheet UI instead of modal dialog.  
**Decision:** Replace warehouse and zone form containers in `WarehouseHub.tsx` from `Dialog` to `Sheet` with the same validation/mutation flow.  
**Rationale:** Keeps UI interaction consistent with existing admin form patterns in the project and improves data-entry workflow for larger forms.

## DEC-061 - Warehouse card now exposes direct edit/delete actions

**Date:** 2026-04-02  
**Context:** User requested warehouse edit/delete controls to be visible directly on each warehouse card.  
**Decision:** Add per-card action buttons (edit/delete) in warehouse hub card grid and keep selection behavior intact.  
**Rationale:** Reduces extra clicks and aligns action discoverability with card-centric management UX.

## DEC-062 - Category API refreshed on warehouse/zone form open

**Date:** 2026-04-02  
**Context:** User requested category list must be called when opening create/edit flows for warehouse or zone.  
**Decision:** Trigger category option refetch whenever warehouse sheet or zone sheet opens in Warehouse Hub.  
**Rationale:** Ensures form options stay up to date with current category master data.

## DEC-065 - Suppliers are managed inside Product Settings

**Date:** 2026-04-03  
**Context:** Backend already exposes supplier CRUD routes and FE permission modeling already groups `suppliers` with Product Settings, but the Product Settings UI had no supplier management surface.  
**Decision:** Extend the existing `ProductReferenceManagement` module with a fourth `Suppliers` tab instead of creating a separate page/module.  
**Rationale:** This keeps the sprint change scoped, preserves the existing design language, and matches the current page-access and advanced-permission architecture where suppliers belong to Product Settings.

## DEC-066 - User requests are sanitized before hitting `/api/users`

**Date:** 2026-04-03  
**Context:** User Management was surfacing runtime `400 Bad Request` errors from malformed query/body values such as whitespace-only optional fields or invalid role identifiers, while UI error feedback stayed too generic for debugging.  
**Decision:** Sanitize user query and mutation payloads in `userService.ts` (trim empty optional strings, normalize empty values to `undefined` or `null`, validate positive `role_id` before submit) and reuse parsed backend error messages in user forms and action dialogs.  
**Rationale:** This prevents avoidable contract-invalid requests from leaving the frontend and makes any remaining backend validation failures visible with actionable messages.

## DEC-067 - Users header search is now URL-driven and API-backed

**Date:** 2026-04-03  
**Context:** The shared top-header search input looked interactive but was still a static UI element, so typing there did not affect the Users list or trigger any API search call.  
**Decision:** Wire the MainLayout header search for `/admin/users` to the shared `search` URL query param, and make `UserManagement` consume that query param as the source of truth for its debounced `/api/users?search=` request.  
**Rationale:** This keeps the route/page thin, avoids adding duplicate client state, and makes both the header search and page-level search input drive the same real API flow.

## DEC-068 - FE search falls back to case-insensitive local matching when API search returns empty

**Date:** 2026-04-03  
**Context:** Multiple backend list endpoints accept `search`, but current BE implementations use direct `contains` matching. In practice this can fail for common admin lookups such as typing `snacks` while the stored value is `Snacks`, especially when BE/database collation is case-sensitive.  
**Decision:** Keep calling the real API search first, but when a search request returns zero rows, fetch the relevant filtered dataset from the same API contract and apply a frontend case-insensitive fallback match before paginating locally.  
**Rationale:** This preserves the approved API flow, avoids BE changes, and fixes cross-page search reliability for current sprint modules with minimal UI churn.

## DEC-069 - Category search results render orphan matches as temporary roots

**Date:** 2026-04-03  
**Context:** Category search can legitimately return child categories without their parents in the current result set. The tree table previously traversed only from `parentId = null`, so matching child rows such as `Snacks` were hidden even when the API/service returned them correctly.  
**Decision:** Normalize any category whose parent is absent from the current dataset to a temporary root when building the flattened tree in `CategoryTableV2`.  
**Rationale:** This preserves the hierarchy UI for full lists while ensuring search results remain visible when only descendant matches are returned.

## DEC-070 - Role Permissions page uses advanced module permission matrix

**Date:** 2026-04-03  
**Context:** The Role Permissions page previously showed a simple 2-column toggle table (sidebar page visibility only). Users need the same granular View/Create/Edit/Delete/Approve matrix with access level computation as the Advanced Permissions page.  
**Decision:** Replace the right pane of `RolePermissions.tsx` with the full 7-column advanced module permission matrix (System Module, View, Create, Edit, Delete, Approve, Access Level), including filter input, detailed/compact view toggle, and role context bar. The component now uses `useAdvancedRolePermissions` and `useUpdateAdvancedPermissions` hooks instead of the legacy `useRolePermissions`/`useUpdateRolePermissions` hooks. The left role list pane and all role CRUD dialogs remain unchanged.  
**Rationale:** Unifies the permission editing experience across both pages, gives role administrators the same granular control as the advanced permission screen, and reuses the existing advanced permission service which already maps to the same backend contract (`PUT /api/roles/:id/permissions`).

## DEC-071 - Permission enforcement changed from toast-blocking to UI-hiding

**Date:** 2026-04-03  
**Context:** Permission checks across modules (User Management, Product Management, Product Settings, Categories) were using a "show button, block on click with toast error" pattern. This violated the principle that users should not see controls they cannot use.  
**Decision:** Replace all toast-based permission guards with conditional rendering: action buttons (Create, Edit, Delete, Import, Export, Lock, Reset Password, Status Toggle) are now hidden entirely when the user lacks the corresponding permission. Handler functions no longer check permissions or show "Access denied" toasts — they assume the button would not be visible if the action was unauthorized.  
**Rationale:** This aligns with standard UX expectations: invisible controls mean "you don't have access" rather than "you can see it but it won't work." It also reduces code duplication by removing redundant permission checks from both handlers and form submit callbacks.

## DEC-072 - FE must align to updated Prisma product/location model

**Date:** 2026-04-07
**Context:** The latest Prisma schema in BE shifts product relations to mapping tables (`BrandProduct`, `ProductWarehouse`, `ProductSupplier`, `ProductUom`) and confirms `WarehouseLocation` uses `zone/rack/level/bin` coordinates without `aisle_code`.
**Decision:** Frontend product and warehouse service/form contracts should be updated to remove unsupported singleton assumptions (manufacturer endpoint, single `brand_id`) and align location payload shape to the schema-backed API fields.
**Rationale:** This prevents FE/BE contract drift and runtime failures when BE services are regenerated or aligned to the latest schema.

## DEC-073 - FE product flow no longer hard-depends on manufacturer API

**Date:** 2026-04-07
**Context:** Current backend routes do not expose `/api/manufacturers`, but product/product-settings FE was calling that endpoint in options and reference flows.
**Decision:** Keep manufacturer as optional display field on FE product models, stop outbound manufacturer API dependency in product service options, and make manufacturer create/update in Product Settings fail fast with explicit backend-dependency error instead of 404 runtime calls.
**Rationale:** Prevents request failures in current sprint while keeping changes isolated to affected FE modules only.

## DEC-074 - Product FE mapper aligned to BE list/detail shape

**Date:** 2026-04-07
**Context:** Product list endpoint from BE returns relation arrays (`brands`, `warehouses`) and may omit some singleton fields expected by FE mapper.
**Decision:** Update FE product mapper/payload to support BE relation-array shape (`brands`) and make mapping resilient when optional fields are missing.
**Rationale:** Prevent FE runtime crashes on product list fetch and keep payload contract aligned (`brand_ids` instead of `brand_id`).

## DEC-075 - Remove manufacturer-driven FE flows until backend contract exists

**Date:** 2026-04-07
**Context:** Current backend route surface has no `/api/manufacturers`, but FE product and product-settings modules still rendered manufacturer tabs/fields/import columns.
**Decision:** Remove manufacturer input/query/export-import dependencies from active FE modules (Products, Product Settings, page-access and advanced-permission metadata) and keep modules aligned to `brands`, `uoms`, `suppliers`.
**Rationale:** Eliminates broken UX paths and prevents runtime errors from non-existent endpoints while keeping changes scoped to sprint modules.

## DEC-076 - Approval configuration save flow is dependency-gated

**Date:** 2026-04-07
**Context:** FE save flow called `PATCH /api/roles/:id/approval-config`, but current backend routes do not expose this endpoint.
**Decision:** Stop issuing the unsupported API call and fail fast with an explicit backend-dependency error surfaced through the existing toast flow.
**Rationale:** Prevents repeated failing network calls and makes the missing backend contract explicit to users and QA.

## DEC-077 - Warehouse location FE coordinates aligned to zone/rack/level/bin

**Date:** 2026-04-08
**Context:** Backend warehouse location schema and updated DB design expose location coordinates via `zone_code`, `rack_code`, `level_code`, `bin_code` without `aisle_code`, but FE warehouse forms and service mapping still carried aisle fields.
**Decision:** Remove aisle from warehouse location FE types/schemas/forms/table copy and stop sending/deriving `aisle_code` in warehouse service payloads and zone/bin mapping logic.
**Rationale:** Keeps FE strictly aligned to the approved API contract and schema-backed data model, while minimizing scope to warehouse modules only.

## DEC-079 - BE/FE contract gap analysis completed (2026-04-13)

**Findings**: 4 critical gaps, 4 medium gaps, 4 minor gaps identified from full read of all 14 BE route+schema files vs all FE services/types.
- **GAP-C1**: Category `code` sent by FE silently dropped by BE (not in schema)
- **GAP-C2**: Product create sends `product_status` — not in BE createProductSchema
- **GAP-C3**: `unit_price` min(0) in FE vs positive() in BE for StockIn
- **GAP-C4**: `supplier_id` missing from `createStockInFormSchema`
- Full details in `sprint-tracker.md`

## DEC-080 - Outbound module full rewrite aligned to real BE API (2026-04-15)

**Date:** 2026-04-15
**Context:** Outbound FE was built against a stale spec with wrong status values (`CONFIRMED` state does not exist in BE), an invented `PickingTask` abstraction with no backend equivalent, and a `OutboundPriorityBadge` where the type should be `SALES | RETURN_TO_SUPPLIER`. The new BE contract was reviewed end-to-end before rewriting.

**Critical discrepancies corrected:**
1. **Status flow**: FE had `DRAFT→PENDING→CONFIRMED→PICKING→COMPLETED`. BE is `DRAFT→PENDING→APPROVED→PICKING→COMPLETED` (+ `CANCELLED`). Fixed in types, schema, stepper, all components.
2. **PickingTask eliminated**: FE invented a `PickingTask` abstraction (model, hooks, service) with no backend counterpart. Replaced with direct `StockOutDetail[]` model and local `LotAssignment[]` state submitted atomically via `PUT /api/stock-outs/:id/picked-lots`.
3. **Lot assignment endpoint**: `PUT /picked-lots` is atomic replacement — all lots at once, not incremental patch per lot.
4. **Type field**: Renamed from `priority` (FE) to `type: SALES | RETURN_TO_SUPPLIER` (BE). `OutboundPriorityBadge` replaced with `OutboundTypeBadge`.
5. **Create routing**: BE has two separate POST endpoints: `POST /api/stock-outs/sales` and `POST /api/stock-outs/returns`. FE `OutboundCreateForm` routes to the correct mutation based on `type` selection.

**Architecture decisions:**
- **KPI**: No dedicated stats endpoint — use 4 parallel `useQueries` calls each with `limit: 1` for a specific status, reading `.total` from list response. Manager-only via `hasPermission('stock_outs:approve')`.
- **Proof upload (B2)**: Full upload UI built against service stubs (`getProofUploadUrl`, `uploadFileToB2`, `confirmProofUpload`). On service failure: `uploadStatus: 'error'` shown with Vietnamese friendly message, no crash.
- **Discrepancy handling**: Two-layer — (1) local pre-check (picked qty vs required qty) before hitting BE; (2) catches BE 400 error. Both surface `DiscrepancyPanel`.
- **RBAC gate**: `hasPermission('stock_outs:approve')` distinguishes manager (can approve) from staff (sees info badge only).
- **Tailwind v4 canonical classes**: Used `bg-linear-to-r`, `min-h-100`, `max-w-15`, `min-w-125` throughout.
- **Motion**: All animations via `motion/react` v12 (`motion`, `AnimatePresence`). Staggered entrance for KPI cards, animated progress bars in picking screen.

**Rationale:** Eliminates all FE/BE contract drift in the outbound module. No BE changes made — read-only reference.

## DEC-078 - Warehouse hub and zone detail UX polish kept scope-safe

**Date:** 2026-04-08
**Context:** Sprint follow-up required preserving approved warehouse UI language while improving interaction quality and explicit form states.
**Decision:** Add lightweight `motion` entry transitions in warehouse list/zone cards and zone-grid panels, and surface explicit loading/error/empty states for category/product assignment selectors in Zone Detail without changing service, schema, or hook contracts.
**Rationale:** Improves responsiveness and user clarity while strictly preserving architecture boundaries (`services` -> `hooks` -> `features`) and avoiding unrelated refactors.
