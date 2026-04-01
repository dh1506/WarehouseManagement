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
  - `services/userService.ts`: Role options khi tạo user ưu tiên `/api/roles`; nếu bị `403` sẽ fallback lấy role từ `/api/users` để tránh dropdown rỗng.
  - Lọc role và submit role dùng `role_id` thay vì label hardcode.
  - `components/UserManagement.tsx`: Đã thêm action-level permission guard cho add/edit/lock/reset với toast thông báo khi người dùng không có quyền.
  - User table đã được đồng bộ với header hiện tại (User Name, Role, Full Name, Email, Status, Actions).
- **Roles**: Admin có thể quản lý phân quyền chức năng (`src/features/roles/`)
  - `components/RolePermissions.tsx`: Hiển thị danh sách role và ma trận quyền, cùng với action update.
  - `components/RoleFormDialog.tsx`: Dialog dùng cho tạo mới và cập nhật metadata role.
  - `hooks/useRolePermissions.ts`: React Query fetch, cập nhật roles & permission.
  - `hooks/useRolePermissions.ts`: Bổ sung `useCreateRole` và `useUpdateRole` cho create/edit/toggle status.
  - `schemas/roleSchemas.ts`: Zod schema cho create/update role, khóa whitelist `CEO | MANAGER | STAFF`.
  - `types/roleType.ts`: Interfaces cho Role và Permission, có metadata trạng thái/số lượng từ backend.
  - `services/roleService.ts`: Đã chuyển sang API thật, map action backend `read/create/update/delete(/approve)` sang matrix `view/create/edit/delete/approve`.
  - `RolePermissions.tsx`: Bổ sung đầy đủ state loading/error/empty/disabled/mutation + toast theo pattern chung.
  - `RolePermissions.tsx`: Ma trận hiện bám theo toàn bộ page đang xuất hiện ở sidebar hiện tại, thay vì chỉ render raw module backend.
  - `RolePermissions.tsx`: Bổ sung action tạo role, chỉnh sửa role và bật/tắt trạng thái role ngay ở cột danh sách bên trái.
  - `RolePermissions.tsx`: Ma trận Roles hiện chỉ cấu hình quyền `view` (visible/hidden) theo từng page sidebar.
  - `types/roleType.ts`: Bổ sung `availableModules` để FE biết action nào backend thực sự hỗ trợ cho từng module/page.
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
- `src/layouts/sidebar-navigation.ts`: Shared source of truth cho sidebar items, route/icon/label và mapping page -> permission module dùng chung cho Sidebar và Role Permissions.

## Advanced Page Access

- `src/features/advancedPermissions/components/AdvancedPagePermissions.tsx`: Matrix phân quyền theo từng page sidebar hiện tại, phục vụ cấu hình quyền vào trang cho từng role.
- `src/services/advancedPagePermissionService.ts`: API-backed adapter cho advanced permissions, map dữ liệu từ `roleService.getRolePermissions` và lưu qua `roleService.updateRolePermissions`.
- `src/pages/admin/AdvancedPermissionsPage.tsx`: Đã chuyển sang render `AdvancedPagePermissions`.
- `src/features/advancedPermissions/components/AdvancedPagePermissions.tsx`: Đã lọc page theo `view` grants từ Roles matrix (`useRolePermissions`) trước khi cho cấu hình action nâng cao.
- `src/features/advancedPermissions/hooks/useAdvancedPermissions.ts`: Mutation save đã invalidate thêm cache role-permission để đồng bộ ngay sau khi lưu.

## Product action-level RBAC update (2026-04-01)

- `src/features/products/components/ProductManagement.tsx`
  - Guard riêng cho `create`, `edit`, `delete` theo module `products`.
  - Khi user bấm action không có quyền sẽ hiển thị toast "không có quyền" thay vì thực thi mutation.
- `src/features/products/components/ProductDetail.tsx`
  - Nút chỉnh sửa và submit update đều kiểm tra quyền `edit` trước khi mở sheet/gửi mutation.

## Runtime RBAC (2026-04-01)

- `src/utils/module-permission.ts`
  - Shared utility kiểm tra quyền theo `module + action` (view/create/edit/delete/approve).
  - Hỗ trợ alias action (`read/view`, `update/edit`, `remove/delete`) và fallback key dạng `master_data.<module>.manage`.
- `src/layouts/Sidebar.tsx`
  - Sidebar items được filter theo quyền `view` của user hiện tại.
- `src/App.tsx`
  - Thêm `ModuleProtectedRoute` để guard route theo module permission.
  - Thêm `PermissionDeniedRedirect` + toast trước khi chuyển `/403`.
  - Root redirect `/` tự chọn page đầu tiên mà user có quyền xem.
- `src/components/ui/toaster.tsx`
  - Được mount ở root app để hiển thị popup không có quyền từ route guard.

## New Services

- `src/services/productReferenceService.ts`: Mock APIs cho unit/brand master data.
- `src/services/productService.ts`: Mock APIs cho product master CRUD.
- `src/services/warehouseService.ts`: Mock APIs cho warehouse và warehouse location CRUD.

## Product API Integration Update (2026-04-01)

- `src/services/productReferenceService.ts`
  - Đã chuyển từ mock sang API thật cho unit/brand:
    - `GET /api/units-of-measure`
    - `POST /api/units-of-measure`
    - `PATCH /api/units-of-measure/:id`
    - `GET /api/brands`
    - `POST /api/brands`
    - `PATCH /api/brands/:id`
  - Giữ nguyên response shape FE (`ProductReferenceItem`) để không phá vỡ UI/hook hiện có.

- `src/services/productService.ts`
  - Đã chuyển từ mock sang API thật:
    - `GET /api/products`
    - `GET /api/products/:id`
    - `POST /api/products`
    - `PATCH /api/products/:id`
    - `GET /api/product-categories` (options)
    - `GET /api/manufacturers` (options)
  - Bổ sung mapper FE/BE cho product status, id conversion, category_ids/base_uom_id/brand_id/manufacturer_id.

- `src/features/products/hooks/useProducts.ts`
  - `useProductCategoryOptions` đã dùng API category options từ `productService`.
  - Bổ sung `useProductManufacturerOptions`.

- `src/features/products/components/ProductManagement.tsx`
  - Form product đổi từ manufacturer text sang manufacturer select.
  - Đã wire thêm manufacturer options query vào create/edit flow.

- `src/features/products/components/ProductFormSheets.tsx`
  - Shared product sheet đã đổi field sang `manufacturerId` để đồng bộ với contract BE.

- `src/features/products/components/ProductDetail.tsx`
  - Edit sheet đã nhận thêm manufacturer options.

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

## Suppliers (2026-04-01)

- `src/features/suppliers/components/SupplierManagement.tsx`
  - Supplier list screen with search, status filter, pagination, permission-aware create/edit actions, and view drawer trigger.
- `src/features/suppliers/components/SupplierFormSheet.tsx`
  - Shared create/edit/view sheet with Zod validation and related-product summary in view mode.
- `src/features/suppliers/hooks/useSuppliers.ts`
  - React Query hooks for supplier list/detail/create/update.
- `src/features/suppliers/schemas/supplierSchemas.ts`
  - Zod schemas cho supplier form và filter.
- `src/features/suppliers/types/supplierType.ts`
  - Type definitions cho supplier list/detail/form payloads.
- `src/services/supplierService.ts`
  - API-backed supplier service:
    - `GET /api/suppliers`
    - `GET /api/suppliers/:id`
    - `POST /api/suppliers`
    - `PATCH /api/suppliers/:id`
  - Mapper FE/BE cho `is_active <-> status`, nullable contact fields, và `productSuppliers` summary.
- `src/pages/admin/SupplierManagementPage.tsx`
  - Thin route wrapper cho supplier feature component.
- `src/App.tsx`
  - Added protected route `/admin/suppliers`.
- `src/layouts/sidebar-navigation.ts`
  - Added sidebar item `Suppliers` using permission module `suppliers`.

## Warehouse Master Contract Alignment (2026-04-01)

- `src/services/warehouseMasterService.ts`
  - Raw API layer for Sprint 1 warehouse foundation:
    - `GET /api/warehouses`
    - `POST /api/warehouses`
    - `PATCH /api/warehouses/:id`
    - `GET /api/warehouses/locations/search`
    - `POST /api/warehouses/locations`
    - `PATCH /api/warehouses/locations/:id`
  - Maps BE pagination envelopes and warehouse/location persistence models into FE module types.
- `src/features/warehouses/hooks/useWarehouses.ts`
  - Warehouse master and location master hooks now consume `warehouseMasterService`.
  - Hub/zone/bin hooks continue using legacy `warehouseService.ts`.
- `src/features/warehouses/types/warehouseType.ts`
  - Warehouse master/location types now follow API-backed fields:
    - warehouse `isActive`, `locationCount`
    - location path fields, occupancy data, storage condition, active flag
- `src/features/warehouses/schemas/warehouseSchemas.ts`
  - Zod schemas updated for API-backed warehouse and location forms.
- `src/features/warehouses/components/WarehouseSheets.tsx`
  - Form sheet updated for actual warehouse master/location payloads.
  - Location edit mode locks immutable path fields that current backend does not update.
- `src/features/warehouses/components/WarehouseManagementV2.tsx`
  - New API-backed Sprint 1 warehouse master UI with permission-aware create/edit flows and proper loading/error/empty states.
- `src/pages/admin/WarehouseManagementPage.tsx`
  - Thin page now mounts `WarehouseManagementV2`.
- `src/components/StatusBadge.tsx`
  - Added visual states for `available`, `partial`, and `full`.
