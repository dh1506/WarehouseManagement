# Current Context

## Sprint / Task hiện tại
**User Management Module** — Production-ready implementation

## Trạng thái
✅ **Hoàn thành** — Toàn bộ module User Management đã được implement và tối ưu.
- Dev server đang chạy tại: `npm run dev` (Vite)
- Backend chưa sẵn sàng — đang dùng **mock data** cho tất cả API calls

## Feature scope của sprint này
- [x] Trang danh sách User (`UserManagementPage` → `UserManagement`)
- [x] Table với sticky header, scroll nội bộ, action buttons luôn hiển thị
- [x] Filter (search, role, status) + debounce
- [x] Pagination luôn hiển thị khi có data
- [x] Form thêm mới user (`UserFormSheet` — mode create)
- [x] Form cập nhật user (`UserFormSheet` — mode update)
- [x] Dialog khoá / mở khoá tài khoản (`LockUserDialog`)
- [x] Dialog đặt lại mật khẩu (`ResetPasswordDialog`)
- [x] Password generator thoả schema (6 ký tự, số, ký tự đặc biệt)
- [x] Export Excel với full styling (exceljs)
- [x] Mock data tương tác thật (CRUD trên MOCK_USERS array)
- [x] Dev bypass login (`admin` / `Admin@123`)

## File đang active
- `src/features/users/components/UserManagement.tsx` — page container chính
