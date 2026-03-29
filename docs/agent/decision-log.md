# Decision Log

## DEC-001 — Mock data strategy: mutable array thay vì static const
**Date:** 2026-03-28  
**Context:** Cần test CRUD mà không có backend  
**Decision:** Export `MOCK_USERS` array dưới dạng `export const` (mutable reference). Các mock functions (`mockCreateUser`, `mockUpdateUser`, `mockLockUser`, `mockResetPassword`) mutate trực tiếp array này.  
**Rationale:** User có thể thêm/sửa/khoá user và thấy kết quả ngay trong session, không cần reload. Khi BE ready, chỉ cần xoá mock functions và bỏ comment API thật trong `useUserMutations.ts`.  
**Trade-off:** Data reset khi F5 — acceptable trong dev mode.

---

## DEC-002 — Tách 2 useForm instances cho create/update mode
**Date:** 2026-03-28  
**Context:** `UserFormSheet` cần phục vụ 2 schema khác nhau (`createUserSchema` vs `updateUserSchema`)  
**Decision:** Tạo 2 `useForm` instances riêng biệt (`createForm`, `updateForm`), render form JSX theo `isEdit` flag.  
**Rationale:** Dùng chung 1 instance với union type gây TypeScript error khó xử lý (FieldErrors intersection type không resolve đúng). Tách ra sạch, type-safe hoàn toàn.  
**Trade-off:** Một chút code duplication trong JSX — chấp nhận được vì 2 form có cấu trúc khác nhau đáng kể.

---

## DEC-003 — useController cho password field thay vì register + watch
**Date:** 2026-03-28  
**Context:** Password field cần: (1) user tự gõ được, (2) nhận giá trị từ generate function  
**Decision:** Dùng `useController({ name: 'password', control })` thay vì `register('password')` + `watch('password')`  
**Rationale:** `register` trả về ref-based (uncontrolled). Kết hợp thêm `value` prop từ `watch` tạo ra conflict controlled/uncontrolled → React warning + user không tự gõ được sau generate. `useController` trả về `field.value` + `field.onChange` đúng chuẩn controlled input.

---

## DEC-004 — exceljs thay xlsx cho export có styling
**Date:** 2026-03-28  
**Context:** User yêu cầu header màu xanh + chữ trắng, border rõ, màu cell theo role/status  
**Decision:** Cài `exceljs` thay vì dùng `xlsx` (SheetJS CE)  
**Rationale:** SheetJS community edition không hỗ trợ cell styling (fill color, font color, border) trong output `.xlsx` — chỉ SheetJS Pro mới có. `exceljs` là thư viện open-source hỗ trợ đầy đủ styling với TypeScript types tích hợp sẵn.  
**Trade-off:** Tăng bundle size (~500KB). Acceptable cho admin dashboard — không phải user-facing app.

---

## DEC-005 — Pagination luôn hiển thị khi có data
**Date:** 2026-03-28  
**Context:** Khi filter → kết quả ít hơn PAGE_LIMIT → totalPages = 1 → pagination ẩn  
**Decision:** Bỏ điều kiện `totalPages > 1`, giữ lại chỉ `(data?.total ?? 0) > 0`  
**Rationale:** User cần thấy "Showing X of Y" và biết mình đang ở đâu dù chỉ 1 trang. Prev/Next tự disabled khi không dùng được.

---

## DEC-006 — Email optional trong user form
**Date:** 2026-03-28  
**Context:** User yêu cầu email không bắt buộc  
**Decision:** `emailSchema` dùng `.optional()` + `.refine()` — nếu có điền thì phải đúng format, nếu trống thì pass.  
**Implementation:** `CreateUserPayload.email?: string` (optional), `UserItem.email` vẫn là `string` (dùng `?? ''` khi lưu vào mock).

---

## DEC-007 — Username chỉ có trong create form
**Date:** 2026-03-28  
**Context:** "Tên đăng nhập không thể cập nhật" — user yêu cầu xoá khỏi edit form  
**Decision:** `updateUserSchema` không có field `username`. Form edit không render username field.  
**Rationale:** Username là immutable identifier sau khi tạo — đúng với convention của hầu hết hệ thống auth.

---

## DEC-008 — Mock local API in Frontend for Role Permissions
**Date:** 2026-03-28  
**Context:** The API for List of roles (`GET /api/roles`) and Roles Permissions is currently not deployed but we need to develop the UI flow.
**Decision:** Create a mock list of roles in `roleService.ts` and fake the update request so that users can interact and save it locally in current session. Wait for backend to implement `PATCH /api/roles/:id/permissions` and `GET /api/roles/:id/permissions`.
**Rationale:** Allows Frontend to progress without backend blockers while adhering to the API contract.

---

## DEC-009 — Dynamic UI calculation for Category Hierarchy
**Date:** 2026-03-29
**Context:** Chức năng yêu cầu khi tạo 1 danh mục con, thì parent category tự động nhân diện và tăng đếm \`Sub-categories\`.
**Decision:** Thay vì gọi API riêng hoặc chờ BE gửi properties `subCategoriesCount`, Frontend tính toán động (`buildFlattenedTree` method) trên danh sách (`ProductCategory[]`) trả về để tạo relation `childrenCount`, `depth` và `hasChildren`.
**Rationale:** Đảm bảo UI phản hồi tức thì với thiết kế tree-line và đồng bộ số liệu con cháu (Sub-categories count) mà không phụ thuộc vào structure API backend. Thêm vào mảng hiện diện properties mới.
