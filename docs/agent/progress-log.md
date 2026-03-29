# Progress Log

## 2026-03-28 — User Management Module (Sprint 1)

### Session 1 — Initial Implementation
**Thời gian:** ~2026-03-27

**Đã làm:**
- Khởi tạo cấu trúc thư mục `features/users/` theo kiến trúc AGENTS.md
- Implement `UserManagementPage` (thin page) + `UserManagement` (container)
- Implement `UserTable` với skeleton loading, empty state, status/role badges
- Implement `useUsers` hook (React Query + Axios)
- Implement `userService.ts` với full API contract (6 endpoints)
- Thêm mock data 12 users để dev local

**Files tạo:**
- `src/features/users/components/UserManagement.tsx`
- `src/features/users/components/UserTable.tsx`
- `src/features/users/hooks/useUsers.ts`
- `src/services/userService.ts`
- `src/pages/admin/UserManagementPage.tsx`

---

### Session 2 — UI Optimization
**Thời gian:** 2026-03-28 sáng

**Đã làm:**
- Xoá 3 stat cards để bảng chiếm toàn bộ không gian
- Layout `flex-col h-full` với table scroll nội bộ (không cuộn màn hình)
- Sticky table header (`thead sticky top-0`)
- Action buttons luôn hiển thị (bỏ hover-only)
- Căn giữa cột Security Role, Status, Actions
- Giảm padding pagination
- Dev login bypass: `admin` / `Admin@123`

**Files sửa:**
- `src/features/users/components/UserManagement.tsx`
- `src/features/users/components/UserTable.tsx`
- `src/layouts/MainLayout.tsx` — overflow-hidden để hỗ trợ scroll nội bộ
- `src/features/auth/components/LoginForm.tsx` — dev bypass

---

### Session 3 — Add/Edit User Form
**Thời gian:** 2026-03-28 10:00

**Đã làm:**
- Tạo `UserFormSheet.tsx` dùng shadcn Sheet, 2 mode create/update
- Zod schema validate: fullName, username (create only), email (optional), password (create only), role, gender
- Email: optional, validate format nếu có điền
- Username: không hiển thị trong form edit
- Password: ẩn/hiện toggle + nút generate tự động
- Mock CRUD thực sự ghi vào MOCK_USERS array (add/update/lock/reset)
- `useController` cho password field (fix conflict controlled/uncontrolled)

**Files tạo:**
- `src/features/users/schemas/userSchema.ts`
- `src/features/users/hooks/useUserMutations.ts`
- `src/features/users/components/UserFormSheet.tsx`

**Files sửa:**
- `src/services/userService.ts` — thêm gender field, mock CRUD functions
- `src/features/users/components/UserTable.tsx` — prop onEdit callback

---

### Session 4 — Action Dialogs + Export Excel
**Thời gian:** 2026-03-28 11:00

**Đã làm:**
- `LockUserDialog`: xác nhận khoá/mở khoá tài khoản, icon/màu theo trạng thái
- `ResetPasswordDialog`: form mật khẩu mới, toggle + generator
- Export Excel: cài `exceljs`, header xanh đậm + chữ trắng, border rõ ràng, màu Role/Status khớp design
- Fix pagination: bỏ điều kiện `totalPages > 1` → luôn hiện khi có data
- Wire tất cả vào `UserManagement.tsx`

**Files tạo:**
- `src/features/users/components/UserActionDialogs.tsx`
- `src/features/users/utils/exportUsers.ts`

**Files sửa:**
- `src/features/users/hooks/useUserMutations.ts` — thêm `useLockUser`, `useResetUserPassword`
- `src/services/userService.ts` — thêm `mockLockUser`, `mockResetPassword`
- `src/features/users/components/UserTable.tsx` — props `onLock`, `onResetPassword`
- `src/features/users/components/UserManagement.tsx` — wire tất cả + export
- **Installed:** `xlsx`, `exceljs`

---

### Session 5 — Bug Fixes & Refactoring
**Thời gian:** 2026-03-28 12:30

**Đã làm:**
- Fix lỗi `Cannot find module '@/store/uiStore'` khi import vào `Sidebar.tsx`.
- Khởi tạo file `uiStore.ts` bằng Zustand để quản lý state của sidebar, tuân thủ theo rule chỉ lưu client/UI state vào Zustand.
- Tạo các file documentation Agent cần thiết (module-map.md, known-issues.md) theo chuẩn AGENTS.md.
- Sửa lỗi runtime crash tại trang Sidebar khi `user.name` bị `undefined`, dẫn đến hàm `toUpperCase()` không thể hoạt động. Fix bằng toán tử 3 ngôi (Ternary).
- Thay đổi UI theo yêu cầu: Di chuyển nút thu phóng (toggle) sidebar từ dưới cùng lên Header, kế bên Logo, đổi dùng icon `menu` hamburger. Khi thu nhỏ, logo fade out nhường chỗ cho nút menu căn giữa.
- Implement UI hoàn chỉnh cho trang lỗi 403 (Forbidden) và 404 (Not Found) dựa trên thiết kế Stitch HTML, convert sang React component với tailwind classes + typography chính xác theo config.
- Khởi tạo trang User Profile (`UserProfilePage` và `UserProfile` component) dựa trên HTML design, tối ưu animations (hover scale, focus rings) & responsive grid layout. Liên kết khối Avatar/Tên hiển thị trên Sidebar thành một `NavLink` chuyển hướng sang trang `/profile`.
- Bổ sung chức năng chỉnh sửa mật khẩu trong trang Profile:
  - Tích hợp `react-hook-form` và `zod` (`changePasswordSchema`) để xử lý logic và validate dữ liệu (độ dài, ký tự bắt buộc, confirm trùng khớp).
  - Thêm hiệu ứng loading, success alert và error text trực tiếp trên form đổi mật khẩu.
- Chức năng Avartar: Bổ sung logic cho phép Upload/Chụp ảnh từ điện thoại (`accept="image/*" capture="user"`) giới hạn 5MB, upload qua File Reader chuyển thành Base64 rồi lưu trực tiếp vào cache bằng Zustand `useAuthStore` mockup.
- **Bug Fix**: Sửa lỗi "Màn hình trắng" (Compile crashed) của Vite do sai khác cấu hình module TypeScript (Fix bằng việc sử dụng `import type` cho `ChangePasswordFormValues` từ Schema thay vì import chung). Bổ sung phương thức `updateUser` trong Zustand store cho sạch logic thay thế trạng thái tạm thời.

**Files tạo:**
- `src/features/profile/schemas/profileSchema.ts`
- `src/features/profile/components/UserProfile.tsx`
- `src/pages/profile/UserProfilePage.tsx`
- `src/store/uiStore.ts`
- `docs/agent/module-map.md`
- `docs/agent/known-issues.md`

**Files sửa:**
- `src/App.tsx` (thêm route `/profile`)
- `src/layouts/Sidebar.tsx` (sửa lỗi avatar crash + dời nút toggle + bọc Link sang /profile)
- `src/pages/errors/NotFoundPage.tsx` (cập nhật UI 404 mới)
- `src/pages/errors/ForbiddenPage.tsx` (cập nhật UI 403 mới)
- `docs/agent/progress-log.md`

---

### Session 6 — Role Permissions Management
**Thời gian:** 2026-03-28 Chiều

**Đã làm:**
- Tạo page `/admin/role-permissions` dựa trên design được cung cấp (Stitch HTML).
- Xây dựng layout 2 pane: Left Pane để chọn Role, Right Pane để hiển thị Ma trận Quyền (Permission Matrix).
- Chỉnh sửa `Sidebar.tsx` thêm mục "Roles" vào dưới cùng.
- Cập nhật `App.tsx` thêm Route mới.
- Tạo `src/features/roles/types/roleType.ts` để định nghĩa Interface.
- Tạo `src/services/roleService.ts` với đầy đủ Mock Data cho 4 Roles (Director, Warehouse Manager, Staff, Auditor) theo đúng yêu cầu API (`GET /api/roles/...`, `PATCH`).
- Thêm `UseRoles` & `useRolePermissions` using TanStack React Query để fetch và sync dữ liệu.
- Viết tính năng local override lưu trữ thay đổi quyền trực tiếp trong session thông qua state của component và React Query Mutation.

**Files tạo:**
- `src/features/roles/types/roleType.ts`
- `src/features/roles/hooks/useRolePermissions.ts`
- `src/features/roles/components/RolePermissions.tsx`
- `src/services/roleService.ts`
- `src/pages/admin/RolePermissionsPage.tsx`

**Files sửa:**
  - `src/App.tsx`
- `src/layouts/Sidebar.tsx`
- `docs/agent/module-map.md`
- `docs/agent/decision-log.md`
- `docs/agent/known-issues.md`

---

### Session 7 — Categories Management
**Thời gian:** 2026-03-29
**Đã làm:**
- Tạo page `/admin/categories` dựa trên design tham chiếu.
- Tự động hiển thị và tính toán cây phân cấp (hierarchy) từ danh sách category, làm sâu các thẻ con.
- Thay đổi `CategoryFormSheet` sử dụng Drawer Layout giống với mẫu design mới nhất.
- Bổ sung `CategoryActionDialogs` cho action Delete.
- Thêm module xuất Excel `exportCategories`.
- Sửa lại Sidebar path thành `/admin/categories` và App.tsx để trỏ đến UI này.

**Files tạo/sửa:**
- `src/features/categories/components/CategoryManagement.tsx`
- `src/features/categories/components/CategoryTable.tsx`
- `src/features/categories/components/CategoryFormSheet.tsx`
- `src/features/categories/components/CategoryActionDialogs.tsx`
- `src/features/categories/utils/exportCategories.ts`
- `src/pages/admin/CategoryManagementPage.tsx`
- `src/App.tsx`
- `src/layouts/Sidebar.tsx`

