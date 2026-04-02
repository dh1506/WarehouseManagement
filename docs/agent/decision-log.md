# Decision Log

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
