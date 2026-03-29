# Next Steps

## 🔴 Ưu tiên cao — Backend integration

### NEXT-001: Switch từ mock sang API thật
**Điều kiện:** Backend sẵn sàng  
**Việc cần làm:** Trong `src/features/users/hooks/useUserMutations.ts`, với từng hook:
1. Xoá dòng `return mockXxx(...)`
2. Bỏ comment dòng `return realApiFunction(...)`

**Hooks cần switch (4 hooks):**
| Hook | Mock function → API function |
|------|------|
| `useCreateUser` | `mockCreateUser` → `createUser` |
| `useUpdateUser` | `mockUpdateUser` → `updateUser` |
| `useLockUser` | `mockLockUser` → `lockUser` |
| `useResetUserPassword` | `mockResetPassword` → `resetUserPassword` |

Đồng thời trong `userService.ts`:
- `getUsers`: xoá `return getMockUsers(params)`, bỏ comment `return apiClient.get(...)`

### NEXT-002: Cleanup DEV artifacts
**Điều kiện:** Trước khi release  
**Việc cần làm:**
- `src/features/auth/components/LoginForm.tsx` — xoá block `// ⚠️ DEV ONLY` login bypass
- `src/services/userService.ts` — xoá `MOCK_USERS`, `getMockUsers`, `mockCreateUser`, `mockUpdateUser`, `mockLockUser`, `mockResetPassword`
- `src/features/users/hooks/useUserMutations.ts` — xoá các import mock functions

---

## 🟡 Ưu tiên trung bình — Feature completion

### NEXT-003: Toast notifications
**Context:** Hiện tại khi create/update/lock/reset thành công, không có feedback UI rõ ràng (chỉ đóng dialog).  
**Việc cần làm:** Thêm `useToast` (shadcn/ui) vào `onSuccess` của các mutation hooks hoặc tại `UserManagement.tsx`.  
**Pattern gợi ý:**
```tsx
onSuccess: () => {
  toast({ title: 'Thành công', description: 'Người dùng đã được tạo.' });
  queryClient.invalidateQueries(...);
}
```

### NEXT-004: Export toàn bộ (không chỉ trang hiện tại)
**Context:** Nút Export hiện chỉ export `data.data` của trang đang xem (10 users).  
**Việc cần làm:** Thêm API call lấy tất cả users (limit lớn hoặc endpoint riêng), sau đó export.  
**Assumption cần confirm với BE:** Có endpoint `GET /api/users?limit=all` hay cần loop pagination?

### NEXT-005: Confirm trước khi xoá user (nếu có tính năng xoá)
**Context:** Hiện chưa có tính năng xoá user — chỉ khoá.  
**Việc cần làm:** Nếu BE hỗ trợ `DELETE /api/users/:id`, thêm `DeleteUserDialog` tương tự `LockUserDialog`.

---

## 🟢 Ưu tiên thấp — Refinement

### NEXT-006: Hiển thị `username` trong UserTable
**Context:** `UserItem` hiện không có field `username` trong response của `GET /api/users` (API list).  
**Việc cần làm:** Khi BE trả về `username` trong response, thêm cột Username vào bảng.

### NEXT-007: Avatar upload
**Context:** `UserItem` có field `avatar?: string` nhưng chưa sử dụng.  
**Việc cần làm:** Khi form create/edit user cần avatar, implement theo flow Backblaze B2 (presigned URL → PUT → metadata về BE).

### NEXT-008: Gender hiển thị trong UserTable
**Context:** Cột Gender chưa có trong UserTable.  
**Cân nhắc:** Có thể thêm vào tooltip hoặc thêm cột nếu thiết kế cho phép.

### NEXT-009: Module tiếp theo
**Gợi ý thứ tự implement:**
1. **Inventory Management** (Quản lý kho / sản phẩm)
2. **Import/Export Requests** (Phiếu nhập xuất)
3. **Dashboard** (Tổng quan + biểu đồ)
4. **Reports** (Báo cáo)
