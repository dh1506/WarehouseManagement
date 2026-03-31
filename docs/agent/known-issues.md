# Known Issues & Backlog

File này theo dõi các vấn đề cần xử lý, bao gồm technical debt, bug, và backend dependency.

## Open Issues

1. **Back-end Integration**
   - User management đã bỏ mock và gọi API thật `/api/users`.
   - Presigned URL API for upload ảnh avatar (Backblaze B2) chưa làm.
   - Role permission module đã chuyển sang API thật (`/api/roles`, `/api/roles/:id`, `/api/permissions`, `PUT /api/roles/:id/permissions`).
   - Nếu login payload backend thay đổi thêm field, cần cập nhật mapper tại `features/auth/api/login.ts` để tránh lệch `UserProfile`.

## Role permission follow-up (2026-03-31)

1. FE hiện map action backend `read/create/update/delete(/approve)` sang cột matrix `view/create/edit/delete/approve`.
2. Nếu backend không có action `approve`, cột Approve sẽ luôn false và không sinh `permission_id` khi lưu.
3. Backend schema hiện yêu cầu `permission_ids` tối thiểu 1 phần tử khi update role permission; FE đã chặn lưu khi tất cả quyền bị bỏ chọn.
4. FE đã đổi endpoint phân quyền sang `GET/PATCH /api/roles/:id/permissions` theo API design table.

## API design gaps from approved table (2026-03-31)

1. `PATCH /api/roles/:id/approval-config` chưa có backend implementation trong repo hiện tại; FE module approval config vẫn cần backend contract chính thức để bỏ mock hoàn toàn.
2. `GET /api/login-history` chưa có module/service FE tương ứng trong scope hiện tại.
3. `GET /api/audit-logs?page={}&limit={}&module={}` chưa có module/service FE tương ứng trong scope hiện tại.
4. API table dùng `PUT /api/roles/:id`, trong khi backend route hiện tại trong repo đang là `PATCH /api/roles/:id`; cần backend chốt một chuẩn cuối cùng để tránh mismatch môi trường.
5. Payload/response shape cho `approval-config` chưa được định nghĩa chính thức trong backend schemas, FE hiện map theo `WorkflowScenario` hiện có.

## Backend role-domain note (2026-03-31)

1. BE đã khóa domain role chỉ còn `CEO`, `MANAGER`, `STAFF` ở schema + service layer.
2. Nếu DB đang có role cũ ngoài whitelist, API list role hiện sẽ không trả ra; cần dọn dữ liệu legacy nếu muốn đồng bộ tuyệt đối.

## User field-validation note (2026-03-31)

1. Add/Update user đã bỏ `gender` khỏi FE form/payload.
2. `full_name` hiện chỉ validate không rỗng sau khi trim (không cấm số/ký tự đặc biệt).
3. `phone` validate theo chuẩn Việt Nam `^(+84|0)(3|5|7|8|9)\d{8}$` ở cả FE và BE.

## User module follow-up (2026-03-30)

1. User list/create/update/lock/reset-password hiện dùng API thật qua `/api/users` (lock/reset map qua PATCH update user).
2. User role filter và form role select đã chuyển sang role options thật từ `/api/roles`.
3. Nếu backend trả role names không tương ứng business labels cũ, FE vẫn hiển thị được nhờ role badge fallback style.
4. **Sprint 1 Backend Dependencies**
   - Product Settings cần BE cung cấp CRUD cho unit of measure và brand/manufacturer master data.
   - Product Master cần BE cung cấp CRUD endpoint cùng option APIs cho category/unit/brand theo contract chính thức.
   - Warehouse Structure cần BE cung cấp CRUD cho kho và vị trí kho, bao gồm validation khi xóa kho có phát sinh location hoặc transaction.
   - Permission keys cho Product / Warehouse modules chưa được chốt từ backend. FE hiện tạm dùng `usePermission()` + wildcard `*`.

5. **Design / Contract Availability**
   - Chưa thấy file API contract, database design, hoặc design reference riêng cho Product / Warehouse modules trong workspace hiện tại. FE đang suy luận theo design language và pattern đã có trong repo.

## Warehouse Hub open items (2026-03-30)

1. Warehouse Hub CRUD and Zone CRUD are currently mock-only in `warehouseService.ts`; data resets after page refresh.
2. Layout configuration for swipe map (`layoutConfig`) is persisted only in in-memory mock state.
3. Backend contract still needed for these resources:
   - Warehouse Hub summary model (totalSpace, totalZones, usedCapacity)
   - Zone model with structure fields (rows/shelves/levels/binCount/occupancy)
   - Layout config model (viewMode/colorMode/columns)
   - Zone bins model linked to zone resource (bin id/code/row/shelf/level/capacity/currentLoad/items/productCount/occupancy)

## Warehouse Hub updates (2026-03-30)

1. Zone Detail is now connected to zone-owned bin payload shape (`Zone.bins`) in service layer.
2. Bin update actions in Zone Detail now follow warehouse manage permission and disable controls for read-only users.
3. Remaining gap is backend contract + persistent storage, not frontend architecture or module separation.

## Runtime incident note (2026-03-30)

1. White-screen risk from auth payload mismatch was mitigated by:
   - mapping login response envelope -> `UserProfile` contract
   - guarding wildcard permission checks when `permissions` is missing
   - sanitizing persisted auth state during store migration
2. If blank page still appears on a specific browser profile, clear `localStorage.auth-storage` once and re-login.
