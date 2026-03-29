# Known Issues & Backlog
File này theo dõi các vấn đề cần xử lý, bao gồm technical debt, bug, và backend dependency.

## Open Issues

1. **Back-end Integration**
   - Hiện tại đa số endpoint user management đang dùng Mock API local với một mảng. Cần đấu nối API thật.
   - Presigned URL API for upload ảnh avatar (Backblaze B2) chưa làm.
   - API cho lấy danh sách Roles (`GET /api/roles`), lấy quyền theo Role (`GET /api/roles/:id/permissions`), và Update Quyền (`PATCH /api/roles/:id/permissions`) cần được thực thi ở BE thì FE mới connect thật được.
2. **Sprint 1 Backend Dependencies**
   - Product Settings cần BE cung cấp CRUD cho unit of measure và brand/manufacturer master data.
   - Product Master cần BE cung cấp CRUD endpoint cùng option APIs cho category/unit/brand theo contract chính thức.
   - Warehouse Structure cần BE cung cấp CRUD cho kho và vị trí kho, bao gồm validation khi xóa kho có phát sinh location hoặc transaction.
   - Permission keys cho Product / Warehouse modules chưa được chốt từ backend. FE hiện tạm dùng `usePermission()` + wildcard `*`.

3. **Design / Contract Availability**
   - Chưa thấy file API contract, database design, hoặc design reference riêng cho Product / Warehouse modules trong workspace hiện tại. FE đang suy luận theo design language và pattern đã có trong repo.
