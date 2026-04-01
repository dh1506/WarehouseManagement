# Progress Log

## 2026-03-28 - User Management Module

- Kh?i t?o `features/users/` theo d�ng ki?n tr�c AGENTS.
- Ho�n thi?n list/filter/pagination/sheet/dialog cho user management.
- Th�m mock CRUD, export Excel, dev login bypass, profile page, v� UI fixes li�n quan.

## 2026-03-28 - Role Permissions Foundation

- T?o page `/admin/role-permissions`.
- Th�m mock role service v� React Query hooks cho role permissions.
- G?n route v� sidebar cho module role permissions.

## 2026-03-29 - Category Management

- T?o page `/admin/categories`.
- Ho�n thi?n category tree, drawer form, delete dialog, v� export categories.
- �?ng b? route/sidebar v?i module category.

## 2026-03-29 - Sprint 1 Master Data Completion

### �� l�m

- Th�m reusable foundations nh?:
  - `PageHeader`
  - `StatusBadge`
  - `StatePanel`
  - `usePermission`
- Implement module Product Settings:
  - unit of measure
  - brand/manufacturer
  - list/detail/create/update/delete
- Implement module Product Management:
  - product master list/detail/create/update/delete
  - filter theo status/category/brand
  - form validation b?ng Zod
  - option data l?y t? category/unit/brand services
- Implement module Warehouse Management:
  - warehouse CRUD
  - warehouse location CRUD
  - tabs warehouses / locations
  - validation b?ng Zod
- C?p nh?t di?u hu?ng:
  - th�m route `/admin/product-settings`
  - th�m route `/admin/products`
  - thay `/warehouse` t? placeholder sang module th?t
  - c?p nh?t sidebar d? truy c?p c�c module m?i
- C?p nh?t working memory docs cho Sprint 1.

### Touched Files

- `src/App.tsx`
- `src/layouts/Sidebar.tsx`
- `src/components/PageHeader.tsx`
- `src/components/StatusBadge.tsx`
- `src/components/StatePanel.tsx`
- `src/hooks/usePermission.ts`
- `src/features/productSettings/types/referenceType.ts`
- `src/features/productSettings/schemas/referenceSchemas.ts`
- `src/features/productSettings/hooks/useProductReferences.ts`
- `src/features/productSettings/components/ProductReferenceManagement.tsx`
- `src/features/products/types/productType.ts`
- `src/features/products/schemas/productSchemas.ts`
- `src/features/products/hooks/useProducts.ts`
- `src/features/products/components/ProductManagement.tsx`
- `src/features/warehouses/types/warehouseType.ts`
- `src/features/warehouses/schemas/warehouseSchemas.ts`
- `src/features/warehouses/hooks/useWarehouses.ts`
- `src/features/warehouses/components/WarehouseManagement.tsx`
- `src/features/warehouses/components/WarehouseSheets.tsx`
- `src/services/productReferenceService.ts`
- `src/services/productService.ts`
- `src/services/warehouseService.ts`
- `src/pages/admin/ProductReferenceManagementPage.tsx`
- `src/pages/admin/ProductManagementPage.tsx`
- `src/pages/admin/WarehouseManagementPage.tsx`
- `docs/agent/current-context.md`
- `docs/agent/progress-log.md`
- `docs/agent/decision-log.md`
- `docs/agent/module-map.md`
- `docs/agent/known-issues.md`

### Assumptions

- Product supporting masters trong Sprint 1 g?m unit of measure v� brand/manufacturer.
- Mock services hi?n t?i l� c�ch ph� h?p d? FE ti?p t?c ti?n d? trong khi backend chua s?n s�ng.
- Product/Warehouse UI du?c re-implement theo ki?n tr�c repo hi?n t?i, ch? d�ng design language c� s?n l�m reference.

### Verification

- `npx tsc -b`: pass
- `npm run build`: fail do m�i tru?ng sandbox khi load Vite/Tailwind native binary
- ESLint theo ph?m vi file m?i/ch?nh s?a: pass

## 2026-03-31 - User Update and Reset Password Integration Fix

### Done

- Fixed FE user update call from `PUT /api/users/:id` to `PATCH /api/users/:id` so it matches current BE users route.
- Added missing BE endpoint for password reset:
  - `PATCH /api/users/:id/reset-password`
  - request schema validation (`new_password`)
  - controller action and service password hashing/update flow
- Kept FE reset password payload contract aligned with BE (`new_password`).

### Touched Files

- `FE/Warehouse_Management/src/services/userService.ts`
- `BE/Warehouse_Management/src/schemas/user.schema.ts`
- `BE/Warehouse_Management/src/routes/user.route.ts`
- `BE/Warehouse_Management/src/controllers/user.controller.ts`
- `BE/Warehouse_Management/src/services/user.service.ts`
- `FE/Warehouse_Management/docs/agent/current-context.md`
- `FE/Warehouse_Management/docs/agent/progress-log.md`
- `FE/Warehouse_Management/docs/agent/decision-log.md`
- `FE/Warehouse_Management/docs/agent/next-steps.md`

### Assumptions

- BE users module continues to use `PATCH /api/users/:id` as canonical update endpoint.
- Reset-password action remains under users domain and protected by `users:update` permission.
- Existing FE mutation hooks are stable and do not require API envelope shape changes.

### Verification

- `npx tsc -p tsconfig.json` (BE): pass
- `npx tsc -b` (FE): pass

## 2026-03-31 - Role create/update/status management on Role screen

### Completed

- Added role create flow on the Role page using the real `POST /api/roles` backend contract.
- Added role edit flow for metadata (`description`, `isActive`) using `PATCH /api/roles/:id`.
- Added active/inactive toggle action directly in the role hierarchy list.
- Added Zod-backed role form schema constrained to `CEO | MANAGER | STAFF`.
- Added reusable `RoleFormDialog` for create/edit flows and wired React Query mutations in `useRolePermissions.ts`.

### Touched Files

- `FE/Warehouse_Management/src/features/roles/components/RolePermissions.tsx`
- `FE/Warehouse_Management/src/features/roles/components/RoleFormDialog.tsx`
- `FE/Warehouse_Management/src/features/roles/hooks/useRolePermissions.ts`
- `FE/Warehouse_Management/src/features/roles/schemas/roleSchemas.ts`
- `FE/Warehouse_Management/docs/agent/decision-log.md`
- `FE/Warehouse_Management/docs/agent/module-map.md`
- `FE/Warehouse_Management/docs/agent/known-issues.md`

### Assumptions

- Backend continues to restrict role names to `CEO`, `MANAGER`, and `STAFF`.
- Editing role name is not needed in this task; FE keeps it read-only in edit mode to avoid changing role identity unexpectedly.

### Verification

- `npx tsc -b` (FE): pass

## 2026-04-01 - Supplier module + user admin stabilization

### Done

- Added FE Suppliers module using existing backend contract:
  - supplier list with search/status filter/pagination
  - create/edit/view sheet
  - route `/admin/suppliers`
  - sidebar navigation entry
- Added supplier service/hook/schema/type layers following AGENTS architecture:
  - raw API calls in `services/`
  - React Query hooks in `features/suppliers/hooks/`
  - Zod schemas in `features/suppliers/schemas/`
- Fixed user role dropdown fallback:
  - `userService.getUserRoleOptions()` now recognizes forbidden errors from current `apiClient` shape
  - fallback to `/api/users` derived roles works again for accounts without `roles:read`
- Improved reset-password UX in FE:
  - success toast after reset
  - error toast on failure
  - dialog closes and resets state after success
- Restored BE reset-password route in current workspace:
  - `PATCH /api/users/:id/reset-password`
  - schema/controller/service wiring with password hashing

### Touched Files

- `FE/Warehouse_Management/src/features/suppliers/types/supplierType.ts`
- `FE/Warehouse_Management/src/features/suppliers/schemas/supplierSchemas.ts`
- `FE/Warehouse_Management/src/features/suppliers/hooks/useSuppliers.ts`
- `FE/Warehouse_Management/src/features/suppliers/components/SupplierManagement.tsx`
- `FE/Warehouse_Management/src/features/suppliers/components/SupplierFormSheet.tsx`
- `FE/Warehouse_Management/src/services/supplierService.ts`
- `FE/Warehouse_Management/src/pages/admin/SupplierManagementPage.tsx`
- `FE/Warehouse_Management/src/layouts/sidebar-navigation.ts`
- `FE/Warehouse_Management/src/App.tsx`
- `FE/Warehouse_Management/src/services/userService.ts`
- `FE/Warehouse_Management/src/features/users/components/UserActionDialogs.tsx`
- `BE/Warehouse_Management/src/schemas/user.schema.ts`
- `BE/Warehouse_Management/src/routes/user.route.ts`
- `BE/Warehouse_Management/src/controllers/user.controller.ts`
- `BE/Warehouse_Management/src/services/user.service.ts`
- `FE/Warehouse_Management/docs/agent/current-context.md`
- `FE/Warehouse_Management/docs/agent/progress-log.md`
- `FE/Warehouse_Management/docs/agent/decision-log.md`
- `FE/Warehouse_Management/docs/agent/next-steps.md`

### Assumptions

- Supplier delete is intentionally out of scope because the current backend contract has no delete endpoint.
- Role dropdown fallback from `/api/users` is acceptable UX when `roles:read` is denied.
- Running backend server must be restarted to pick up restored reset-password route changes.

### Verification

- `npx tsc -b` (FE): pass
- `npx tsc -p tsconfig.json` (BE): not a reliable regression signal in this workspace because unrelated NodeNext/module-resolution errors already exist outside this task
