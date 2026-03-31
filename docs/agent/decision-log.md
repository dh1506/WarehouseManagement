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
