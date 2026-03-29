# Known Issues & Backlog
File này theo dõi các vấn đề cần xử lý, bao gồm technical debt, bug, và backend dependency.

## Open Issues

1. **Back-end Integration**
   - Hiện tại đa số endpoint user management đang dùng Mock API local với một mảng. Cần đấu nối API thật.
   - Presigned URL API for upload ảnh avatar (Backblaze B2) chưa làm.
   - API cho lấy danh sách Roles (`GET /api/roles`), lấy quyền theo Role (`GET /api/roles/:id/permissions`), và Update Quyền (`PATCH /api/roles/:id/permissions`) cần được thực thi ở BE thì FE mới connect thật được.
