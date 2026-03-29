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
