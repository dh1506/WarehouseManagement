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
5. Role matrix hiện đã hiển thị đủ các page đang có trong sidebar, nhưng backend seed mới chỉ có permission thật cho một phần module.
6. Các page chưa có permission backend tương ứng đang hiển thị read-only với nhãn `Chưa có permission backend`; cần backend seed/thêm module permission nếu muốn lưu được quyền cho các page đó.

## Role CRUD note (2026-03-31)

1. Role screen hiện đã hỗ trợ tạo mới, cập nhật metadata và bật/tắt trạng thái role qua API thật.
2. FE đang chủ động khóa create role theo whitelist `CEO`, `MANAGER`, `STAFF`; nếu cả 3 role đã tồn tại thì luồng tạo mới sẽ không mở.
3. Luồng edit hiện giữ `name` ở trạng thái read-only để tránh đổi identity role ngoài scope nghiệp vụ hiện tại; phần cập nhật tập trung vào `description` và `isActive`.
4. Nếu backend mở rộng thêm role names hoặc lifecycle rules trong tương lai, cần cập nhật `src/features/roles/schemas/roleSchemas.ts` để đồng bộ validation FE.

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
4. Role dropdown trong Add/Edit User hiện có fallback khi `/api/roles` bị 403: FE suy ra role options từ danh sách `/api/users`. Truong hop dữ liệu users hiện tại không chứa đủ mọi role hệ thống, dropdown có thể thiếu role chưa được gán cho user nào.
5. Để đảm bảo dropdown role luôn đầy đủ khi user không có `roles:read`, backend nên bổ sung endpoint role-options dành riêng cho user creation flow (permission theo `users:create`).
6. **Sprint 1 Backend Dependencies**
   - Product Settings cần BE cung cấp CRUD cho unit of measure và brand/manufacturer master data.
   - Product Master cần BE cung cấp CRUD endpoint cùng option APIs cho category/unit/brand theo contract chính thức.
   - Warehouse Structure cần BE cung cấp CRUD cho kho và vị trí kho, bao gồm validation khi xóa kho có phát sinh location hoặc transaction.
   - Permission keys cho Product / Warehouse modules chưa được chốt từ backend. FE hiện tạm dùng `usePermission()` + wildcard `*`.

7. **Design / Contract Availability**
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

## Product integration note (2026-04-01)

1. Product Settings (unit/brand) và Product Management đã chuyển từ mock sang API thật theo contract BE hiện tại.
2. FE product form đã đổi manufacturer input sang manufacturer select (`manufacturer_id`) để khớp schema BE.
3. Backend hiện chưa có endpoint delete cho `products`, `brands`, `units-of-measure` theo route hiện tại; FE đang giữ action xóa ở mức cảnh báo lỗi contract nếu người dùng bấm.
4. Product create schema BE không nhận trực tiếp `product_status`; FE xử lý bằng bước cập nhật trạng thái sau create khi trạng thái form khác `active`.
5. Nếu muốn hỗ trợ đầy đủ luồng xóa trên UI, backend cần bổ sung API contract delete tương ứng hoặc FE cần tắt hẳn action delete theo quyết định nghiệp vụ.

## Runtime incident note (2026-03-30)

1. White-screen risk from auth payload mismatch was mitigated by:
   - mapping login response envelope -> `UserProfile` contract
   - guarding wildcard permission checks when `permissions` is missing
   - sanitizing persisted auth state during store migration
2. If blank page still appears on a specific browser profile, clear `localStorage.auth-storage` once and re-login.

## Advanced page permission note (2026-03-31)

1. `/admin/advanced-permission` da doi sang API-backed flow thong qua `roleService` (khong con mock in-memory).
2. Save advanced permissions hien da persist vao role permissions backend va refetch lai ngay sau khi luu.
3. Runtime quyen cua user dang login co the can re-auth (hoac refresh profile endpoint) de nhan bo permission moi neu role cua chinh user vua bi thay doi trong cung session.

## Action-level permission behavior (2026-04-01)

1. Product module da ap dung guard rieng cho `create`, `edit`, `delete` va hien toast khi user thao tac vuot quyen.
2. Cac module khac (warehouses, categories, users, import-export...) can duoc chuyen dan sang guard module-action tuong tu neu can dong nhat UX toan he thong.

## RBAC runtime note (2026-04-01)

1. FE da ap dung route guard + sidebar hide theo module `view` permission tu token login.
2. Advanced Permissions da bi rang buoc boi Roles view grants (module co `view=false` se khong hien de cau hinh action nang cao).
3. `roleService.getRolePermissions` hien fallback bo qua `/api/permissions` khi user khong co quyen doc catalog, de tranh vo trang Roles vi 403 khong can thiet.
4. De quyen hien/hidden trang hoat dong chinh xac o production, backend can dam bao payload login tra ve day du permission names theo module-action convention (`<module>:read|create|update|delete|approve`).
5. FE currently coi role `CEO` la admin bypass; neu backend doi role super-admin khac ten, can cap nhat `src/utils/module-permission.ts`.

## Roles visibility note (2026-04-01)

1. Trang Roles da doi sang che do bat/tat `view` cho tung page (visible/hidden) thay vi sua action nang cao.
2. Neu mot page chua co permission module tu backend seed, row se hien read-only va khong the luu toggle cho page do.

## Supplier module note (2026-04-01)

1. FE da co module Suppliers theo contract backend hien tai: list/detail/create/update.
2. Backend chua co delete supplier endpoint trong workspace nay, nen FE khong hien action xoa.
3. Sidebar va route guard dang ky theo permission module `suppliers`; backend login payload can tra ve `suppliers:read|create|update` de UI hien dung theo role.
4. Supplier view drawer hien danh sach san pham lien ket dua tren `productSuppliers`; neu backend thay doi select shape nay, can cap nhat mapper trong `src/services/supplierService.ts`.

## Warehouse master integration note (2026-04-01)

1. FE warehouse master and location master now call real backend routes through `src/services/warehouseMasterService.ts`.
2. Current backend workspace route shape is:
   - `GET/POST/PATCH /api/warehouses`
   - `GET /api/warehouses/locations/search`
   - `POST/PATCH /api/warehouses/locations/:id?` with create at `/api/warehouses/locations`
3. This differs from the higher-level sprint table that described `/api/locations` and `PUT` methods. FE currently follows the contract that actually exists in the running workspace to stay executable.
4. Backend currently does not expose delete endpoints for warehouse master or warehouse locations, so FE intentionally hides delete actions.
5. Warehouse location update in backend only supports mutable operational fields (`status`, `is_active`, weight/volume, storage condition). FE therefore locks warehouse/path/code fields during edit mode.
6. `src/services/warehouseService.ts` and `src/features/warehouses/components/WarehouseManagement.tsx` remain legacy mock/hub codepaths for non-sprint hub-zone visualization; they were left isolated to avoid unrelated refactor during this task.
