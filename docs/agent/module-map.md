# Module Map

Đây là file tổng hợp các file và module chính của hệ thống.

## Features

- **Users**: Admin có thể quản lí user (`src/features/users/`)
  - `components/UserManagement.tsx`: Container chính, wire các components.
  - `components/UserTable.tsx`: Hiện thị danh sách user.
  - `components/UserFormSheet.tsx`: Thêm / sửa user với validation từ zods.
  - `hooks/useUsers.ts`: React Query lấy danh sách data.
  - `hooks/useUserMutations.ts`: Các actions như Create, Update, delete,...
  - `schemas/userSchema.ts`: Zod validate cho user form (đã bỏ gender, thêm phone chuẩn VN, fullName chỉ kiểm tra không rỗng sau trim).
  - `services/userService.ts`: Mapping FE/BE fields, đã thêm `phone` trong model/payload và bỏ `gender` khỏi add/update payload.
  - Lọc role và submit role dùng `role_id` thay vì label hardcode.
  - User table đã được đồng bộ với header hiện tại (User Name, Role, Full Name, Email, Status, Actions).
- **Roles**: Admin có thể quản lý phân quyền chức năng (`src/features/roles/`)
  - `components/RolePermissions.tsx`: Hiển thị danh sách role và ma trận quyền, cùng với action update.
  - `hooks/useRolePermissions.ts`: React Query fetch, cập nhật roles & permission.
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

- services/productReferenceService.ts: API-backed product supporting master service (`/api/units-of-measure`, `/api/brands`, `/api/manufacturers`), replacing mutable mock arrays.
- features/productSettings/types/referenceType.ts: reference type now includes `manufacturer`.
- features/productSettings/components/ProductReferenceManagement.tsx: tabs and form flow now support Unit/Brand/Manufacturer with real API mutations.
- services/warehouseService.ts: warehouse and location list/create/update now map to real backend routes (`/api/warehouses`, `/api/warehouses/locations/search`, `/api/warehouses/locations`); hub/zone/bin flows remain mock by design.
- services/roleService.ts: role permission matrix now reads assigned permissions from `GET /api/roles/:id` and writes via `PUT /api/roles/:id/permissions` to match current backend routes.
- services/advancedPermissionService.ts: advanced permission matrix is API-backed and projected from sidebar modules using role permissions + permission catalog.
- services/categoryService.ts: legacy category service now re-exports `categoryApiService` (no in-memory mock dataset).
- services/approvalConfigService.ts: scenario list derived from `/api/roles`; create/delete scenario operations now surface explicit backend dependency errors.
