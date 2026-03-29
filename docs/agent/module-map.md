# Module Map
Đây là file tổng hợp các file và module chính của hệ thống.

## Features
- **Users**: Admin có thể quản lí user (`src/features/users/`)
  - `components/UserManagement.tsx`: Container chính, wire các components.
  - `components/UserTable.tsx`: Hiện thị danh sách user.
  - `components/UserFormSheet.tsx`: Thêm / sửa user với validation từ zods.
  - `hooks/useUsers.ts`: React Query lấy danh sách data.
  - `hooks/useUserMutations.ts`: Các actions như Create, Update, delete,...
  - `schemas/userSchema.ts`: Schema schema Zod để validate user forms.
- **Roles**: Admin có thể quản lý phân quyền chức năng (`src/features/roles/`)
  - `components/RolePermissions.tsx`: Hiển thị danh sách role và ma trận quyền, cùng với action update.
  - `hooks/useRolePermissions.ts`: React Query fetch, cập nhật roles & permission.
  - `types/roleType.ts`: Interfaces cho Role và Permission.
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
- `src/services/roleService.ts`: File chứa các hàm giả lập gọi API CRUD cho roles.
- `src/services/categoryService.ts`: Mock APIs gọi danh mục (CRUD).
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
