# Module Map

Đây là file tổng hợp các file và module chính của hệ thống.

## Features

- **Users**: Admin có thể quản lí user (`src/features/users/`)
  - `components/UserManagement.tsx`: Container chính, wire các components.
  - `components/UserTable.tsx`: Hiện thị danh sách user.
  - `components/UserFormSheet.tsx`: Thêm / sửa user với validation từ zods, và hiện hiển thị message lỗi backend đã parse thay vì generic error.
  - `components/UserActionDialogs.tsx`: Lock/reset password dialogs dùng cùng parser lỗi backend để toast hiển thị rõ nguyên nhân request fail.
  - `hooks/useUsers.ts`: React Query lấy danh sách data.
  - `hooks/useUserMutations.ts`: Các actions như Create, Update, delete,...
  - `schemas/userSchema.ts`: Zod validate cho user form (đã bỏ gender, thêm phone chuẩn VN, fullName chỉ kiểm tra không rỗng sau trim).
  - `services/userService.ts`: Mapping FE/BE fields, đã thêm `phone` trong model/payload và bỏ `gender` khỏi add/update payload.
  - `services/userService.ts`: User requests được sanitize trước khi gửi (`search`, `email`, `phone`, `role_id`) và có shared helper để bóc message lỗi API cho UI.
  - Lọc role và submit role dùng `role_id` thay vì label hardcode.
  - User table đã được đồng bộ với header hiện tại (User Name, Role, Full Name, Email, Status, Actions).
- **Roles**: Admin có thể quản lý phân quyền chức năng (`src/features/roles/`)
  - `components/RolePermissions.tsx`: Hiển thị danh sách role bên trái, ma trận module permission chi tiết (View/Create/Edit/Delete/Approve + Access Level) bên phải. Dùng advanced permission hooks và service.
  - `hooks/useRolePermissions.ts`: React Query fetch, cập nhật roles & permission (legacy, vẫn dùng cho role CRUD).
  - `types/roleType.ts`: Interfaces cho Role và Permission, có metadata trạng thái/số lượng từ backend.
  - `services/roleService.ts`: Đã chuyển sang API thật, map action backend `read/create/update/delete(/approve)` sang matrix `view/create/edit/delete/approve`.
  - `RolePermissions.tsx`: Bổ sung đầy đủ state loading/error/empty/disabled/mutation + toast theo pattern chung.
- **Categories**: Quản lý danh mục Sản Phẩm (`src/features/categories/`)
  - `components/CategoryManagement.tsx`: Container điều phối luồng.
  - `components/CategoryTable.tsx`: Hiện thị danh sách phân cấp tree (`buildFlattenedTree`).
  - `components/CategoryFormSheet.tsx`: Drawer Form layout tạo/sửa mới, hoặc Read-only details.
  - `components/CategoryActionDialogs.tsx`: Dialog xác nhận action (xóa).
  - `types/categoryType.ts`: Interface definitions.
  - `hooks/useCategories.ts`: Hook list, create, update, delete.

## Stores (Zustand)

- `src/store/authStore.ts`: Lưu trữ trạng thái Authentication.
- `src/store/uiStore.ts`: Lưu trữ trạng thái giao diện UI (VD: Sidebar mode).

## Core API/Services

- `src/services/userService.ts`: File chứa các hàm gọi API liên quan tới Users.
- `src/services/userService.ts`: Đã đồng bộ method theo API table (`PUT /api/users/:id`, `PATCH /api/users/:id`, `PATCH /api/users/:id/reset-password`).
- `src/services/roleService.ts`: File chứa các hàm gọi API thật cho role list và permission assignment.
- `src/services/roleService.ts`: Đã đồng bộ endpoint phân quyền theo API table (`GET /api/roles/:id/permissions`, `PATCH /api/roles/:id/permissions`).
- `src/services/roleService.ts`: Đã bổ sung role CRUD theo API table (`POST /api/roles`, `PUT /api/roles/:id`).
- `src/services/categoryService.ts`: Mock APIs gọi danh mục (CRUD).
- `src/services/approvalConfigService.ts`: Đã đồng bộ endpoint cập nhật phê duyệt sang `PATCH /api/roles/:id/approval-config`.

## Sprint 1 Additions

- **Product Settings** (`src/features/productSettings/`)
  - `components/ProductReferenceManagement.tsx`: Tabs unit/brand, list/filter/detail/create/update/delete.
  - `hooks/useProductReferences.ts`: React Query hooks cho master data tham chiếu.
  - `schemas/referenceSchemas.ts`: Zod schema cho unit/brand form.
  - `types/referenceType.ts`: Type definitions cho unit/brand.
- **Products** (`src/features/products/`)
  - `components/ProductManagement.tsx`: Product list/detail/create/update/delete, filter theo category/brand/status.
  - `hooks/useProducts.ts`: Hooks CRUD + category/unit/brand option queries.
  - `schemas/productSchemas.ts`: Zod schema cho product form.
  - `types/productType.ts`: Type definitions cho product master.
- **Warehouses** (`src/features/warehouses/`)
  - `components/WarehouseManagement.tsx`: Tabs warehouses/locations, list/filter/detail/delete.
  - `components/WarehouseSheets.tsx`: Form sheets create/update/view cho warehouse và location.
  - `hooks/useWarehouses.ts`: Hooks CRUD + warehouse option queries.
  - `schemas/warehouseSchemas.ts`: Zod schemas cho warehouse/location forms.
  - `types/warehouseType.ts`: Type definitions cho warehouse structure.

## New Shared Foundations

- `src/components/PageHeader.tsx`: Page header reusable cho admin modules.
- `src/components/StatusBadge.tsx`: Generic badge cho status master-data.
- `src/components/StatePanel.tsx`: Shared loading/empty/error panel.
- `src/hooks/usePermission.ts`: Shared permission-aware hook, hỗ trợ wildcard `*`.

## New Services

- `src/services/productReferenceService.ts`: Mock APIs cho unit/brand master data.
- `src/services/productService.ts`: Mock APIs cho product master CRUD.
- `src/services/warehouseService.ts`: Mock APIs cho warehouse và warehouse location CRUD.

## Warehouse Hub (Sprint extension)

- `src/features/warehouses/components/WarehouseHub.tsx`
  - Hub cards for Central/North/West capacity overview
  - Zone CRUD (create/edit/delete) per selected warehouse
  - Layout config save/reset flow for swipe map behavior
- `src/features/warehouses/components/SpatialLayoutMap.tsx`
  - Configurable map rendering (grid/hierarchy, occupancy/type color, dynamic columns)
  - Horizontal browsing layout for zone visualization
- `src/features/warehouses/components/ZoneDetail.tsx`
  - Zone-level bin map and bin-inspector form
  - Bin capacity mutation flow with loading/error/disabled states
  - Permission-aware edit controls via `usePermission('master_data.warehouses.manage')`
- `src/features/warehouses/hooks/useWarehouses.ts`
  - Added hub hooks: `useWarehouseHubs`, `useCreateWarehouseHub`, `useUpdateWarehouseHub`, `useDeleteWarehouseHub`
  - Added zone hooks: `useCreateWarehouseZone`, `useUpdateWarehouseZone`, `useDeleteWarehouseZone`
  - Added layout hook: `useUpdateWarehouseLayoutConfig`
  - Added zone bin hooks: `useZoneBins`, `useUpdateZoneBinCapacity`
- `src/services/warehouseService.ts`
  - Added in-memory hub dataset and zone dataset
  - Added CRUD APIs for hub + zone and layout config persistence
  - Zone bins now persist directly in each zone model (`Zone.bins`) instead of detached cache state
  - Bin occupancy sync updates zone occupancy and hub used capacity after mutation
- `src/features/warehouses/types/warehouseType.ts`
  - Added `WarehouseLayoutConfig`, `WarehouseHubFormValues`, `WarehouseZoneFormValues`
  - `Zone` now uses `bins: Bin[]` as the stable zone detail payload shape

## Categories API Alignment (2026-04-01)

- src/services/categoryApiService.ts
  - Real API layer for category list/detail/create/update/delete against /api/product-categories.
- src/features/categories/hooks/useCategories.ts
  - Added detail hook and repointed mutations/queries to API-backed service.
- src/features/categories/schemas/categorySchemas.ts
  - Zod validation for category form, duplicate checks, self-parent and descendant-parent prevention.
- src/features/categories/components/CategoryManagementV2.tsx
  - New permission-aware category management screen with search, export, tree table, pagination, empty/error states.
- src/features/categories/components/CategoryTableV2.tsx
  - Expand/collapse hierarchical rendering with action visibility by permission.
- src/features/categories/components/CategoryFormSheetV2.tsx
  - API-backed create/edit/view sheet using real detail query.
- src/features/categories/components/CategoryActionDialogsV2.tsx
  - Delete confirmation dialog aligned with backend delete rule.
- src/features/categories/types/categoryType.ts
  - Added API-backed fields: code, parentCode, childrenCount, detail shape.
- src/features/categories/utils/exportCategories.ts
  - Export now includes code and sub-category count from API-backed data.

- categories/components/CategoryManagementV2.tsx: API-backed category list page with search, permission-aware actions, and User Management-style pagination.
- categories/components/CategoryActionDialogsV2.tsx: destructive delete confirmation dialog for category removal.
- categories/components/CategoryFormSheetV2.tsx: category create/edit/detail sheet without status UI.

- categories/components/CategoryManagementV2.tsx, CategoryFormSheetV2.tsx, CategoryActionDialogsV2.tsx, CategoryTableV2.tsx, schemas/categorySchemas.ts, utils/exportCategories.ts: English-only API-backed Categories V2 flow.

- services/productApiService.ts: real API integration for products, brands, manufacturers, and units-of-measure used by Products UI.
- features/products/hooks/useProducts.ts, useProductDetail.ts: React Query hooks bound to real product APIs.
- features/products/components/ProductManagement.tsx, ProductDetail.tsx, ProductFormSheets.tsx: API-backed product list/detail/form flows.
- features/products/components/ProductManagement.tsx: product list now supports row selection + header selection for export, with full filtered export behavior matching User Management.
- features/products/utils/exportProducts.ts: ExcelJS exporter for product catalog fields (SKU, type, categories, unit, brand, manufacturer, stock policy, tracking, status, timestamps).
- features/products/components/ProductManagement.tsx: header actions now include product Excel import, file selection, row-by-row create flow, and import result toast summaries.
- features/products/utils/importProducts.ts: `.xlsx` parser for the product export format, including header validation, master-data name-to-ID mapping, stock/tracking parsing, and per-row schema validation.

- services/productReferenceService.ts: API-backed product supporting master service (`/api/units-of-measure`, `/api/brands`, `/api/manufacturers`), replacing mutable mock arrays.
- features/productSettings/types/referenceType.ts: reference type now includes `manufacturer`.
- features/productSettings/components/ProductReferenceManagement.tsx: tabs and form flow now support Unit/Brand/Manufacturer with real API mutations.
- services/warehouseService.ts: warehouse and location list/create/update now map to real backend routes (`/api/warehouses`, `/api/warehouses/locations/search`, `/api/warehouses/locations`); hub/zone/bin flows remain mock by design.
- services/warehouseService.ts: zone create/update now provisions and reconciles real `warehouse_locations` from `rows/shelves/levels` (aggregate zone model from contract-backed location records, limit 500 slots/request).
- features/warehouses/schemas/warehouseSchemas.ts: location schema now requires `rack` + `level`; zone schema now enforces bounded structure sizing (`rows * shelves * levels <= 500`).
- features/warehouses/components/WarehouseSheets.tsx: location sheet now captures full coordinate set (`zone/aisle/rack/level/bin`) to match backend storage model.
- features/warehouses/components/WarehouseManagement.tsx: location coordinate column now shows `rack` and `level` for operational traceability.
- features/warehouses/components/WarehouseHub.tsx: zone dialog messaging updated to reflect location-slot provisioning behavior; removed non-contract occupancy input from zone form.
- features/warehouses/components/WarehouseHub.tsx: warehouse form now configures allowed storage categories (multi-select); zone form now only allows subset category selection from parent warehouse scope.
- features/warehouses/components/WarehouseHub.tsx: add/edit warehouse and zone forms now render in shadcn `Sheet`; warehouse cards expose inline edit/delete actions.
- features/warehouses/components/WarehouseHub.tsx: each warehouse card now includes its own `Add Zone` action and category option data is refetched when warehouse/zone sheet is opened.
- features/warehouses/components/ZoneDetail.tsx: bin inspector now enforces category + single-product assignment for each bin, filtered by zone scope.
- features/warehouses/hooks/useWarehouses.ts: added warehouse-specific option hooks for category list and product list by category.
- features/warehouses/types/warehouseType.ts: added scope fields (`allowedCategoryIds`) and bin assignment fields (`assignedCategoryId`, `assignedProductId`, `assignedProductName`).
- features/warehouses/schemas/warehouseSchemas.ts: added Zod rules for warehouse categories, zone category subset selection, and mandatory bin category/product assignment.
- services/warehouseService.ts: added FE-persisted maps for warehouse scope, zone scope, and bin assignment; validates scope chain warehouse -> zone -> bin product on mutations; warehouse category option list is sourced from Category API service.
- services/roleService.ts: role permission matrix now reads assigned permissions from `GET /api/roles/:id` and writes via `PUT /api/roles/:id/permissions` to match current backend routes.
- services/advancedPermissionService.ts: advanced permission matrix is API-backed and projected from sidebar modules using role permissions + permission catalog.
- services/categoryService.ts: legacy category service now re-exports `categoryApiService` (no in-memory mock dataset).
- services/approvalConfigService.ts: scenario list derived from `/api/roles`; create/delete scenario operations now surface explicit backend dependency errors.

## Operations Modules (2026-04-02)

- `src/features/import-export/`
  - `components/ImportExportBoard.tsx`: import/export readiness dashboard with filters, product readiness table, and capacity alerts.
  - `hooks/useImportExportInsights.ts`: React Query hook deriving readiness insights from existing products/warehouses/location APIs.
  - `schemas/importExportSchemas.ts`: Zod filter validation for search/status/warehouse filter inputs.
  - `types/importExportType.ts`: typed insight models for readiness rows and capacity alerts.
- `src/features/inventory/`
  - `components/InventoryOverview.tsx`: inventory load overview with warehouse/location usage and product policy snapshot.
  - `hooks/useInventorySnapshot.ts`: React Query hook aggregating location load and policy metrics.
  - `schemas/inventorySchemas.ts`: Zod filter validation for inventory filters.
  - `types/inventoryType.ts`: typed snapshot models for location loads and policy rows.
- `src/features/ai-forecast/`
  - `components/AiForecastDashboard.tsx`: demand confidence board with heuristic forecast list and recommendations.
  - `hooks/useAiForecastInsights.ts`: React Query hook deriving forecast insights from approved product master fields.
  - `schemas/aiForecastSchemas.ts`: Zod filter validation for search/status filters.
  - `types/aiForecastType.ts`: typed forecast item models.
- `src/services/operationsInsightService.ts`
  - Orchestrates read-only aggregation calls via existing contracts: `/api/products`, `/api/warehouses`, `/api/warehouses/locations/search`.
- `src/pages/operations/`
  - `ImportExportPage.tsx`, `InventoryPage.tsx`, `AiForecastPage.tsx`: thin route/page wrappers.
- `src/App.tsx`
  - Replaced placeholder redirects with real route bindings for `/import-export`, `/inventory`, `/ai-forecast`.

## Product Settings Suppliers (2026-04-03)

- `src/features/productSettings/components/ProductReferenceManagement.tsx`
  - Product Settings now includes a `Suppliers` tab using the same page shell, table, form dialog, and permission-aware actions as the other supporting masters.
- `src/features/productSettings/types/referenceType.ts`
  - `ProductReferenceType` now includes `supplier`, with optional supplier contact fields on reference items/forms.
- `src/features/productSettings/schemas/referenceSchemas.ts`
  - Supplier form fields are validated for contact person, phone, email, and address.
- `src/services/productReferenceService.ts`
  - Added supplier list/create/update mapping for `/api/suppliers` while keeping units/brands/manufacturers in the same service boundary.
- `src/lib/pageAccess.ts`
  - Product Settings page access now also recognizes `suppliers:*` permissions.

## Users Search Sync (2026-04-03)

- `src/layouts/MainLayout.tsx`
  - Header search is now route-aware for `/admin/users` and writes to the shared `search` URL query param instead of acting as a static input.
- `src/features/users/components/UserManagement.tsx`
  - User list search now reads the `search` query param as its source of truth, so both the page filter input and header search trigger the same debounced `/api/users` call.

## Search Fallback Reliability (2026-04-03)

- `src/services/searchFallback.ts`
  - Shared helpers for collecting paginated API datasets and applying case-insensitive fallback filtering plus local pagination.
- `src/services/categoryApiService.ts`
  - Category list search now retries through FE case-insensitive fallback when API search returns no rows.
- `src/services/productApiService.ts`
  - Product list search now falls back on FE matching across SKU, name, category, brand, manufacturer, supplier, and descriptive fields.
- `src/services/productReferenceService.ts`
  - Unit/Brand/Manufacturer/Supplier searches now share the same case-insensitive fallback behavior.
- `src/services/userService.ts`
  - User list search now falls back on FE matching across username, full name, email, phone, and role if API search returns empty.
- `src/services/warehouseService.ts`
  - Warehouse and warehouse-location searches now support the same fallback behavior; operations insight screens inherit this through existing service reuse.
- `src/features/categories/components/CategoryTableV2.tsx`
  - Category tree rendering now lifts matching child rows to temporary roots when their parents are not included in the current search result set, so search hits remain visible in the table.

## Permission Enforcement Pattern (2026-04-03)

All modules now follow the same permission enforcement pattern:

- **Action buttons are hidden** when the user lacks the corresponding permission (not shown as disabled)
- **Handler functions do not check permissions** — they assume the button would not be visible if unauthorized
- **Form submit callbacks do not check permissions** — the form itself is only reachable via a visible button

### Files updated:

- `src/features/users/components/UserManagement.tsx`
  - Add User button hidden when `!canCreateUser`
  - Edit/Lock/Reset Password action buttons hidden when `!canUpdateUser`
  - Permission toast checks removed from handlers
- `src/features/users/components/UserTable.tsx`
  - Added `canEdit`, `canLock`, `canResetPassword` props to conditionally render action buttons
- `src/features/products/components/ProductManagement.tsx`
  - Import and New Product buttons hidden when `!canCreate`
  - Edit and Delete action buttons hidden when `!canEdit` / `!canDelete`
  - Permission toast checks removed from handlers and form submit
- `src/features/productSettings/components/ProductReferenceManagement.tsx`
  - New button hidden when `!canCreateCurrentTab`
  - Edit and Status Toggle action buttons hidden when `!canUpdateCurrentTab`
  - Permission toast checks removed from handlers and form submit
- `src/features/categories/components/CategoryManagementV2.tsx`
  - Already had correct button visibility pattern (conditional rendering)
  - Permission toast checks removed from handlers

### Modules already following correct pattern:

- `src/features/warehouses/components/WarehouseHub.tsx` — uses `{canManage ? <button> : null}`
- `src/features/warehouses/components/WarehouseManagement.tsx` — same pattern
- `src/features/warehouses/components/ZoneDetail.tsx` — disables controls when `!canManage`

## Role Permissions Advanced Matrix (2026-04-03)

- `src/features/roles/components/RolePermissions.tsx`
  - Right pane replaced with full 7-column advanced module permission matrix (System Module, View, Create, Edit, Delete, Approve, Access Level).
  - Reuses `PermCheckbox` and `ApproveToggle` sub-components from advanced permission pattern.
  - Uses `useAdvancedRolePermissions` and `useUpdateAdvancedPermissions` hooks from `@/features/advancedPermissions/hooks/`.
  - Module filter input and detailed/compact view toggle included.
  - Role context bar shows active modules count and high-risk permissions.
  - Left role list pane and all role CRUD dialogs (create/edit/status toggle) remain unchanged.
  - Reuses `computeAccessLevel` and `ACCESS_LEVEL_META` from advanced permission types.
