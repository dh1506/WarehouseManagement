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
