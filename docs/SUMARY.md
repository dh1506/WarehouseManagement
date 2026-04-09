# System Summary

## 1. Mục tiêu hệ thống

Hệ thống là backend quản lý kho hàng cho Warehouse Management. Nó hỗ trợ:

- Quản lý user, role, permission và xác thực JWT
- Quản lý dữ liệu chủ lực: sản phẩm, thương hiệu, đơn vị tính, nhà cung cấp, kho và vị trí
- Quản lý tồn kho theo location, gồm CRUD inventory và lịch sử giao dịch
- Quản lý quy trình nhập kho chi tiết với kiểm đếm, biên bản chênh lệch, phân bổ lô và hoàn tất
- Xuất báo cáo giao dịch dưới dạng Excel/PDF

## 2. Kiến trúc chính

- Framework: `Express` + `TypeScript`
- ORM: `Prisma`
- Xác thực: JWT token qua header `Authorization: Bearer ...`
- Validation: `zod` schema cho yêu cầu request
- Cấu trúc: route -> controller -> service -> prisma
- Middleware chính:
  - `helmet()` + `cors()` + `express.json()`
  - `AsyncLocalStorage` context cho mỗi request
  - `authenticate` xác thực JWT và load user + permission
  - `requirePermission` kiểm tra permission trước khi gọi controller
  - `validateRequest` kiểm tra dữ liệu request
  - `globalErrorHandler` bắt và chuẩn hóa lỗi

## 3. Luồng xử lý request chung

1. Request đến `src/index.ts`.
2. Express parse body và khởi tạo request context `als.run({})`.
3. Thực thi route tương ứng theo prefix `api/...`.
4. `authenticate` đọc token, verify, query user + role + permission, gắn `req.user` và `store.userId`.
5. `requirePermission` kiểm tra quyền cần thiết của action.
6. `validateRequest` xác thực payload/query/params.
7. Controller chuyển đổi dữ liệu request và gọi service phù hợp.
8. Service thực hiện logic nghiệp vụ, tương tác với database bằng Prisma.
9. Kết quả trả về controller, controller response JSON hoặc file buffer.
10. Nếu có lỗi, `globalErrorHandler` trả lỗi chuẩn.

## 4. Các module chính hiện có

### 4.1 Auth & RBAC

- `src/routes/auth.route.ts`
- `src/controllers/auth.controller.ts`
- `src/middlewares/auth.middleware.ts`
- `src/middlewares/permission.middleware.ts`
- `src/schemas/auth.schema.ts`

Nhiệm vụ:

- Đăng ký/đăng nhập user
- Xác thực JWT
- Tải thông tin role + permission từ database
- Chặn truy cập nếu user/his role bị inactive

### 4.2 User, Role, Permission

- `src/routes/user.route.ts`, `role.route.ts`, `permission.route.ts`
- Quản lý user, role và permission
- Mỗi route được bảo vệ qua permission tương ứng
- Hỗ trợ CRUD dữ liệu authorization

### 4.3 Master data sản phẩm và kho

- Product category: `product-category.route.ts`
- Brand: `brand.route.ts`
- Unit of measure: `unit-of-measure.route.ts`
- Supplier: `supplier.route.ts`
- Product: `product.route.ts`
- Warehouse: `warehouse.route.ts`
- Location allowed categories: `location-allowed-category.route.ts`

Các module này đảm bảo dữ liệu danh mục sạch và liên quan cho nghiệp vụ tồn kho.

### 4.4 Inventory

- `src/routes/inventory.route.ts`
- `src/controllers/inventory.controller.ts`
- `src/services/inventory.service.ts`

Nhiệm vụ:

- Quản lý số lượng tồn kho theo `product_id` và `warehouse_location_id`
- Hỗ trợ tìm kiếm phân trang, lấy chi tiết, tạo, cập nhật và xóa
- Kiểm soát ràng buộc: không tạo duplicate inventory cho cùng product/location, không cho phép `available_quantity` âm
- `available_quantity` mặc định bằng `quantity - reserved_quantity` nếu không cung cấp

### 4.5 Inventory transactions

- `src/routes/inventory-transaction.route.ts`
- `src/controllers/inventory-transaction.controller.ts`
- `src/services/inventory-transaction.service.ts`

Nhiệm vụ:

- Lưu trữ và truy vấn lịch sử giao dịch kho
- Hỗ trợ bộ lọc theo khoảng thời gian, sản phẩm, loại giao dịch, kho, vị trí, người tạo, loại/mã chứng từ
- Tính toán logic `balance_before` cho mỗi giao dịch dựa trên `balance_after`, `base_quantity` và `transaction_type`
- Tạo phiếu điều chỉnh tồn kho (`ADJUSTMENT`)
- Xuất báo cáo Excel và PDF từ dữ liệu transaction

### 4.6 Stock-in workflow

- `src/routes/stock-in.route.ts`
- `src/controllers/stock-in.controller.ts`
- `src/services/stock-in.service.ts`

Nhiệm vụ chính:

- Quản lý toàn bộ lifecycle của đề nghị nhập kho
- Hỗ trợ kiểm soát trạng thái và xử lý tồn kho thực tế

## 5. Luồng nghiệp vụ chi tiết của Stock-in

### 5.1 Tạo đề nghị nhập (DRAFT)

- Endpoint: `POST /api/stock-ins`
- Kiểm tra các điều kiện:
  - `warehouse_location_id` tồn tại
  - `supplier_id` tồn tại
  - Tất cả `product_id` trong details tồn tại
- Tạo phiếu với `status = DRAFT`
- Tạo chi tiết với `received_quantity = 0`
- Sinh mã phiếu bằng `generateStockInCode(count + 1)`

### 5.2 Duyệt phiếu sang PENDING

- Endpoint: `PATCH /api/stock-ins/:id/approve`
- Chỉ hợp lệ khi phiếu đang `DRAFT`
- Cập nhật `status = PENDING`
- Ghi `approved_by`

### 5.3 Ghi nhận kiểm đếm thực tế

- Endpoint: `PATCH /api/stock-ins/:id/record`
- Kiểm tra phiếu không ở trạng thái `COMPLETED` hoặc `CANCELLED`
- Cập nhật `received_quantity` theo từng detail
- Chuyển phiếu về trạng thái `IN_PROGRESS`

### 5.4 Xử lý chênh lệch

- Endpoint: `POST /api/stock-ins/:id/discrepancies`
- Tính tổng `expected_quantity` và `actual_qty`
- Nếu hai giá trị khác nhau, tạo biên bản `stockInDiscrepancy` với `status = PENDING`
- Đặt status phiếu là `DISCREPANCY`
- Nếu không có chênh lệch, từ chối tạo biên bản

### 5.5 Giải quyết biên bản chênh lệch

- Endpoint: `PATCH /api/stock-ins/:id/discrepancies/:discId/resolve`
- Kiểm tra biên bản tồn tại và thuộc đúng phiếu
- Chỉ thực hiện nếu chưa `RESOLVED`
- Cập nhật `status = RESOLVED`, `resolved_by`, `action_taken`
- Đưa phiếu trở lại `IN_PROGRESS`

### 5.6 Phân bổ lô hàng

- Endpoint: `POST /api/stock-ins/:id/allocate`
- Chỉ cho phép khi phiếu ở `IN_PROGRESS`
- Với mỗi phân bổ:
  - Tìm hoặc tạo `inventory` tại location đích
  - Tìm hoặc tạo `productLot` theo `lot_no`
  - Tạo bản ghi `stockInDetailLot`
- Kết quả: lô hàng đã được liên kết với detail và inventory đích

### 5.7 Hoàn tất phiếu nhập

- Endpoint: `PATCH /api/stock-ins/:id/complete`
- Kiểm tra:
  - Phiếu tồn tại
  - Phiếu chưa `COMPLETED`
  - Không còn biên bản chênh lệch `PENDING`
  - Nếu có khác biệt số lượng thì phải có biên bản
- Với mỗi detail và lô đã phân bổ:
  - Cập nhật `inventory.quantity` và `inventory.available_quantity`
  - Tạo `inventoryTransaction` loại `IN` cho mỗi lô
  - Ghi `reference_type = STOCK_IN`, `reference_id = stockIn.id`
- Chuyển phiếu sang `COMPLETED`

## 6. Nghiệp vụ điều chỉnh tồn kho

### 6.1 Lập phiếu điều chỉnh

- Endpoint: `POST /api/inventory-transactions/adjustments`
- Validate:
  - `warehouse_location_id` tồn tại
  - `product_id` tồn tại
  - `product_uom_id` tồn tại
  - `lot_id` nếu có phải tồn tại và thuộc đúng sản phẩm
- Tìm inventory theo product + location:
  - Nếu chưa tồn tại và điều chỉnh là tăng, tạo record inventory mới
  - Nếu chưa tồn tại và điều chỉnh là giảm, từ chối
- Tính toán:
  - `balance_before = inventory.quantity`
  - `balance_after = balance_before + quantity`
- Nếu `balance_after < 0`, ném lỗi và ngăn chặn
- Cập nhật inventory bằng `increment`
- Tạo `inventoryTransaction` với:
  - `transaction_type = ADJUSTMENT`
  - `reference_type = ADJUSTMENT`
  - `reference_id` là mã điều chỉnh

## 7. Logic báo cáo và lịch sử giao dịch

### 7.1 Truy vấn lịch sử giao dịch

- Endpoint: `GET /api/inventory-transactions`
- Hỗ trợ filter:
  - `from_date` / `to_date`
  - `product_id`
  - `transaction_type`
  - `warehouse_id`
  - `warehouse_location_id`
  - `created_by`
  - `reference_type`
  - `reference_id`
- Kết quả trả về có phân trang và `totalPages`
- Mỗi record được enrich thêm `balance_before`

### 7.2 Tính `balance_before`

- `IN`, `TRANSFER`: `balance_before = balance_after - base_quantity`
- `OUT`: `balance_before = balance_after + base_quantity`
- `ADJUSTMENT`: cùng công thức `balance_after - base_quantity`, vì `base_quantity` có thể âm hoặc dương

### 7.3 Xuất báo cáo

- `GET /api/inventory-transactions/export/excel`
- `GET /api/inventory-transactions/export/pdf`
- Dữ liệu export dùng toàn bộ kết quả filter, không phân trang
- Báo cáo tạo file buffer và trả trực tiếp

## 8. Tính năng hỗ trợ và utility

- `src/utils/als.util.ts`:
  - Khởi tạo context request với `AsyncLocalStorage`
  - Cung cấp `getCurrentUserId()` và `getAlsStore()`
  - Dùng để truyền `userId` cho audit extensions hoặc logging mà không cần truyền ngón tay qua hàm
- `src/utils/app-error.ts` và `catchAsync` chuẩn hóa lỗi nghiệp vụ
- `src/middlewares/validate.middleware.ts` chuẩn hóa request validation

## 9. Ghi chú hiện tại

- Hệ thống đang vận hành theo pattern tách biệt rõ ràng giữa route/controller/service
- Tất cả route bảo vệ bằng `authenticate` và permission cụ thể
- Stock-in là luồng nghiệp vụ phức tạp nhất, bao gồm nhiều trạng thái và điều kiện nghiệm thu dữ liệu
- Inventory transaction chứa cả lịch sử giao dịch và nghiệp vụ điều chỉnh tồn kho
- `supplierRoutes` được mount hai lần trong `src/index.ts` (điểm quan sát), nhưng không làm thay đổi luồng chính

## 10. Tổng kết luồng nghiệp vụ chính

- Người dùng đăng nhập, nhận JWT
- Mỗi cuộc gọi API dùng token để query user, role và permission
- Với stock-in, quy trình đi từ `DRAFT -> PENDING -> IN_PROGRESS -> COMPLETED`, kèm kiểm đếm và chênh lệch
- Với inventory transaction, hệ thống hỗ trợ cả truy vấn lịch sử và tạo điều chỉnh tồn kho
- Với inventory, hệ thống đảm bảo dữ liệu hàng tồn đúng ràng buộc location/product và không cho phép `available_quantity` âm

