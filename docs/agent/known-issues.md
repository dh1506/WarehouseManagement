# Known Issues & Backlog

File này theo dõi các vấn đề cần xử lý, bao gồm technical debt, bug, và backend dependency.

## Open Issues

### [INBOUND-01] KPI stats are approximate (limited to first 100 records)
**Impact**: `useStockInKpis` fetches `limit=100` — will undercount if total > 100.
**Resolution**: BE should expose a `/stock-ins/stats` endpoint, or increase limit once pagination total is known.

### [INBOUND-02] `warehouse_location_id` is a raw number input in Create form
**Impact**: Poor UX — user must know the numeric ID of the warehouse location.
**Resolution**: A warehouse location search/select component once a `GET /api/warehouse-locations` endpoint is available.


1. **Back-end Integration**
   - User management đã bỏ mock và gọi API thật `/api/users`.
   - Presigned URL API for upload ảnh avatar (Backblaze B2) chưa làm.
   - Role permission module đã chuyển sang API thật (`/api/roles`, `/api/roles/:id`, `/api/permissions`, `PUT /api/roles/:id/permissions`).
   - Nếu login payload backend thay đổi thêm field, cần cập nhật mapper tại `features/auth/api/login.ts` để tránh lệch `UserProfile`.

## Role permission follow-up (2026-03-31)

1. FE hiện map action backend `read/create/update/delete(/approve)` sang cột matrix `view/create/edit/delete/approve`.
2. Nếu backend không có action `approve`, cột Approve sẽ luôn false và không sinh `permission_id` khi lưu.
3. Backend schema hiện yêu cầu `permission_ids` tối thiểu 1 phần tử khi update role permission; FE đã chặn lưu khi tất cả quyền bị bỏ chọn.
4. FE đã căn theo backend hiện tại: đọc matrix qua `GET /api/roles/:id` (trường `permissions`) và lưu qua `PUT /api/roles/:id/permissions`.

## API design gaps from approved table (2026-03-31)

1. `PATCH /api/roles/:id/approval-config` chưa có backend implementation trong repo hiện tại; FE module approval config vẫn cần backend contract chính thức để bỏ mock hoàn toàn.
2. `GET /api/login-history` chưa có module/service FE tương ứng trong scope hiện tại.
3. `GET /api/audit-logs?page={}&limit={}&module={}` chưa có module/service FE tương ứng trong scope hiện tại.
4. API table dùng `PUT /api/roles/:id`, trong khi backend route hiện tại trong repo đang là `PATCH /api/roles/:id`; cần backend chốt một chuẩn cuối cùng để tránh mismatch môi trường.
5. Payload/response shape cho `approval-config` chưa được định nghĩa chính thức trong backend schemas, FE hiện map theo `WorkflowScenario` hiện có.
6. `GET /api/roles/:id/permissions` và `PATCH /api/roles/:id/permissions` hiện chưa tồn tại trong backend; FE đã tránh gọi để không còn 404 ở Permission Matrix.
7. `PUT /api/roles/:id` chưa có trong backend hiện tại (backend dùng `PATCH /api/roles/:id`), FE đã đổi sang PATCH để đồng bộ.

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
4. FE user service hiện trim optional strings và chặn `role_id` không hợp lệ trước khi submit, nên các lỗi 400 có nguồn gốc từ payload/query sai phía client sẽ không còn bị bắn lên `/api/users`.
5. Nếu User Management vẫn trả 400 sau bản vá này, cần xem exact request/response trong Network tab vì FE giờ đã hiển thị trực tiếp message validation/backend thay vì toast generic.
6. Header search ở layout hiện chỉ được nối API thật cho route `/admin/users`; các trang khác vẫn dùng ô search/filter riêng trong từng module.
7. **Sprint 1 Backend Dependencies**
   - Product Settings cần BE cung cấp CRUD cho unit of measure và brand/manufacturer master data.
   - Product Master cần BE cung cấp CRUD endpoint cùng option APIs cho category/unit/brand theo contract chính thức.
   - Warehouse Structure cần BE cung cấp CRUD cho kho và vị trí kho, bao gồm validation khi xóa kho có phát sinh location hoặc transaction.
   - Permission keys cho Product / Warehouse modules chưa được chốt từ backend. FE hiện tạm dùng `usePermission()` + wildcard `*`.

8. **Design / Contract Availability**
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

## Categories backend gap note (2026-04-01)

1. FE categories list/detail/create/update/delete now use real API contract from /api/product-categories.
2. Current backend category schema does not expose status/is_active, so AC-CAT-11 and AC-CAT-12 cannot be completed as true persisted behavior yet.
3. FE currently renders category status as unknown rather than faking active/inactive state.
4. To fully satisfy the AC, backend still needs:
   - category status field in list/detail payload
   - create/update support for status
   - business rule for inactive categories with child categories or linked products
5. FE validation prevents selecting self or descendant as parent using current loaded tree, but final integrity still depends on backend validation remaining in place.

- 2026-04-01: Category status remains intentionally absent from FE categories screens until backend exposes a real status field and mutation contract.

- 2026-04-01: The wider FE codebase still contains many Vietnamese user-facing strings outside Categories; this task standardized the live Categories V2 flow only.

- 2026-04-01: Products UI hides hard delete because backend currently supports GET/POST/PATCH for /api/products but not DELETE.
- 2026-04-01: Backend has no explicit boolean expiry-tracking field; FE derives expiry tracking from whether expiry_date is set and requires an expiry date when enabled.
- 2026-04-01: Product images and richer supplier/UOM conversion editing are still limited by the current screen design and were not expanded beyond the current sprint scope.
- 2026-04-02: Product export currently uses the existing list API by re-fetching the full filtered dataset with `pageSize = total`; if product volume grows large, backend may need a dedicated export endpoint or streaming export contract.
- 2026-04-02: Product import currently creates new products only; it does not update existing rows by SKU.
- 2026-04-02: Product import maps `Categories` from the export file to the first category name only because the current create contract accepts a single `categoryId`.
- 2026-04-02: Exported rows with unmapped master data labels such as missing Brand/Manufacturer/Unit in the current system will fail validation during import until those references exist again.

- 2026-04-01: Product supporting masters (unit/brand/manufacturer) are now API-backed, but backend still does not expose DELETE endpoints for these resources; FE delete action returns explicit backend-dependency error.
- 2026-04-01: Warehouse and warehouse-location list/create/update are API-backed, but backend currently has no DELETE warehouse/location routes; FE destructive actions are blocked with explicit error feedback.
- 2026-04-01: Warehouse backend contract does not currently persist manager/address/description/capacityUsage fields used by the existing FE design; FE keeps these fields in UI but only contract-supported fields (`code`, `name`, `is_active`) are persisted.
- 2026-04-01: Approval Configuration screen no longer uses in-memory mock scenarios; list is derived from real `/api/roles`. Create/delete scenario is blocked with explicit backend-dependency errors until dedicated endpoints exist.
- 2026-04-01: Advanced Permissions screen no longer uses mock matrices; permissions are derived from role assignments and permission catalog, projected to sidebar modules.

- 2026-04-02: Import/Export module is now implemented as a readiness dashboard using existing APIs, but backend still has no dedicated inbound/outbound transaction endpoints for creating/persisting import-export requests.
- 2026-04-02: AI Forecast module currently provides heuristic, read-only insights derived from product master signals; backend forecast model/endpoints are still required for persisted forecasting workflows.
- 2026-04-02: Inventory module is read-only and based on product policy + location load snapshots from existing contracts; transaction-level inventory movement APIs are still a backend dependency.
- 2026-04-03: FE search now includes a case-insensitive fallback when API search returns empty. This improves reliability without changing backend, but it can trigger extra paginated fetches on zero-result searches until BE exposes guaranteed case-insensitive search behavior.
- 2026-04-03: Category table search previously hid descendant-only matches because the tree renderer required parents to be present in the current dataset. FE now treats missing-parent matches as temporary roots during search/list rendering.

- 2026-04-02: Warehouse zone create/update now materializes rows/shelves/levels via multiple location API calls. For very large zone structures, backend rate-limit/timeout behavior may need dedicated bulk endpoints to optimize performance.
- 2026-04-02: Zone-level naming and metadata (`zone name`) are still derived on FE because backend contract currently persists zone through `warehouse_locations` only and has no dedicated zone resource/table.
- 2026-04-02: Warehouse-category scope, zone-category scope, and bin product assignment are currently FE-persisted (local storage) because backend has no dedicated mapping endpoints/tables for these constraints yet.
- 2026-04-02: Multi-user consistency for zone/bin assignment constraints depends on backend contract support; current FE-only persistence is per-browser and suitable for sprint behavior validation, not cross-user source of truth.
- 2026-04-03: Supplier management is now available in Product Settings, but backend still exposes only GET/POST/PATCH for `/api/suppliers`; FE delete remains intentionally blocked until a delete contract exists.
- 2026-04-03: Product create/update flows still do not expose supplier assignment editing in FE, even though product detail payloads can include supplier relations from backend.
- 2026-04-03: Role Permissions page now uses the advanced module permission matrix. The legacy `useRolePermissions` hook is still exported from `features/roles/hooks/useRolePermissions.ts` but is no longer used by the `RolePermissions` component (only `useRoles`, `useCreateRole`, `useUpdateRole` remain in use). The legacy `Permission` type and `RolePermissionResponse`/`UpdateRolePermissionPayload` types in `roleType.ts` are also no longer consumed by the RolePermissions component.
- 2026-04-03: Permission enforcement across User Management, Product Management, Product Settings, and Categories now uses conditional rendering (hide buttons) instead of toast-blocking. Warehouse modules already followed this pattern. The `hasPermission` helper in `CategoryManagementV2.tsx` is still used for that component's permission checks and could be migrated to `usePermission` hook in a future refactor.

## 2026-04-07 - Prisma schema impact gaps for FE

- Current FE still references `/api/manufacturers` in product and product-settings flows, but BE routes currently expose no manufacturer endpoints.
- Current FE product payload still sends singleton fields (for example `brand_id` and `manufacturer_id`) while updated DB design emphasizes mapping tables (`BrandProduct`, `ProductSupplier`, `ProductUom`, `ProductWarehouse`).
- Inventory/operations FE remains read-only; DB now includes lot and transaction entities (`product_lots`, `inventory_transactions`) that will require new FE modules once backend API contract is available.

## 2026-04-07 - Remaining backend dependencies after FE patch

- Manufacturer master endpoints are still missing in backend route surface. FE currently degrades gracefully by disabling API dependency rather than persisting manufacturer masters.
- To fully support manufacturer CRUD again, backend needs official `/api/manufacturers` routes and contract docs.
- FE warehouse location coordinate contract is now aligned to `zone/rack/level/bin`; `aisle` was removed from active warehouse forms/services.

- 2026-04-08: Warehouse module no longer sends `aisle_code` in location create/provision flows and no longer depends on aisle in zone/bin visualization derivation.

- 2026-04-07: Product list/detail rendering still depends on BE including core fields (`id`, `code`, `name`, `base_uom`). FE mapper is now defensive, but if BE omits those fields entirely the UI will show fallback placeholders.

## 2026-04-07 - Post contract-alignment status

- Manufacturer tab/queries were removed from active Product Settings and Product form flows to match current backend route surface (no `/api/manufacturers`).
- Product import/export no longer includes Manufacturer column in the active file contract.
- Approval Configuration save now returns explicit dependency error because backend still has no approval workflow persistence endpoint.

## 2026-04-07 - Remaining backend dependencies

- Backend still needs an official approval workflow contract (list/detail/update endpoints) if Approval Configuration should be persisted beyond role projection.
- If manufacturer master data is required again in future sprints, backend must publish `/api/manufacturers` routes and schema before FE can safely re-enable that module.

## 2026-04-08 - Warehouse UX polish notes

- Zone metadata fallback (name/type) still depends on FE localStorage key `wm:zone-metadata-scope` because current location contract has no zone-level metadata fields.
- Bin assignment selectors in Zone Detail now display query loading/error/empty states, but retry UX still relies on normal React Query refetch behavior (no dedicated inline retry button yet).
- Production build still reports a large chunk-size warning from Vite reporter; this is pre-existing and not introduced by the warehouse UI polish scope.
