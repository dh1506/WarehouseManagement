# Current Context

## Sprint / Task hi?n t?i

**Sprint 1 - N?n t?ng h? th?ng v� d? li?u g?c**

## Tr?ng th�i

- �� tri?n khai xong c�c module frontend ch�nh trong ph?m vi Sprint 1.
- C�c module m?i v?n dang d�ng mock services shape-stable v� backend th?t chua s?n s�ng.
- Ki?m tra k? thu?t hi?n t?i:
  - `npx tsc -b`: pass
  - `npm run build`: fail trong sandbox do Vite/Tailwind native binary, kh�ng ph?i l?i TypeScript app

## Nh?ng g� d� ho�n th�nh

- Qu?n tr? h? th?ng v� ph�n quy?n:
  - user management
  - role permissions
  - advanced permissions / approval configuration n?n t?ng hi?n c�
- D? li?u g?c s?n ph?m:
  - product categories
  - product settings: unit of measure, brand/manufacturer
  - product master CRUD
- C?u tr�c kho:
  - warehouse CRUD
  - warehouse location CRUD
- Reusable foundations:
  - `PageHeader`
  - `StatusBadge`
  - `StatePanel`
  - `usePermission`

## Routes m?i/dang active

- `/admin/product-settings`
- `/admin/products`
- `/warehouse`

## File tr?ng t�m v?a tri?n khai

- `src/features/productSettings/components/ProductReferenceManagement.tsx`
- `src/features/products/components/ProductManagement.tsx`
- `src/features/warehouses/components/WarehouseManagement.tsx`
- `src/features/warehouses/components/WarehouseSheets.tsx`

## Assumptions dang �p d?ng

- Workspace hi?n kh�ng c� API contract / database design / UI reference ri�ng cho Product v� Warehouse modules.
- FE dang b�m theo design language v� pattern ki?n tr�c c� s?n trong repo.
- Permission UI cho module m?i hi?n t?m d?a tr�n `usePermission()` v� h? tr? wildcard `*`.

---

## Latest Update (2026-03-31)

### What was done

- Fixed user update API mismatch in FE: update now calls `PATCH /api/users/:id` to match current BE route.
- Implemented full BE reset-password flow for users:
  - schema validation for `PATCH /api/users/:id/reset-password`
  - route wiring + controller handler
  - service logic to hash and store new password
- Confirmed FE reset-password service contract remains aligned: payload field `new_password`.
- Build validation after changes:
  - FE `npx tsc -b`: pass
  - BE `npx tsc -p tsconfig.json`: pass

### Touched files (latest batch)

- `FE/Warehouse_Management/src/services/userService.ts`
- `BE/Warehouse_Management/src/schemas/user.schema.ts`
- `BE/Warehouse_Management/src/routes/user.route.ts`
- `BE/Warehouse_Management/src/controllers/user.controller.ts`
- `BE/Warehouse_Management/src/services/user.service.ts`

### Active assumptions

- `users:update` permission is required for update/lock/reset-password actions.
- Canonical user update method in the running BE is currently `PATCH /api/users/:id`.
- FE user dialogs expect API-level error messages to be returned through standard error middleware.

### Immediate recommended task

- Execute end-to-end smoke test for user actions (update, lock/unlock, reset-password) on non-CEO and CEO roles to confirm permission behavior and UX feedback are consistent.

### Latest FE role-admin update

- Role screen now includes create role, edit role metadata, and enable/disable role actions on top of the existing permission matrix.
- Current FE validation/domain assumes only `CEO`, `MANAGER`, and `STAFF` are valid role names, matching the present backend restriction.

---

## Latest Update (2026-04-01)

### What was done

- Implemented new FE supplier module from existing backend contract:
  - route `/admin/suppliers`
  - sidebar navigation entry
  - API-backed supplier list/detail/create/update flows
  - Zod form/filter schemas and permission-aware UI actions
- Fixed user role dropdown fallback:
  - `getUserRoleOptions()` now correctly detects `403` from the current `apiClient` error shape
  - FE can fallback to derive role options from `/api/users` when `/api/roles` is forbidden
- Fixed reset-password UX in FE:
  - success toast after password reset
  - destructive toast on failure
  - popup closes and form state resets after success
- Restored BE reset-password endpoint again in current workspace state:
  - `PATCH /api/users/:id/reset-password`
  - request schema validation for `new_password`
  - route/controller/service wiring with password hashing

### Touched files (latest batch)

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

### Active assumptions

- `suppliers` is a valid Sprint 1/early master-data module because backend route/schema/model already exist in workspace.
- User accounts that can manage users may not have `roles:read`; in that case FE must keep fallback role options behavior.
- Reset-password action remains protected by `users:update`.
- Backend in this workspace still has broader TypeScript/module-resolution issues unrelated to the reset-password change, so endpoint behavior is the main source of truth for this task rather than a clean BE project build.

### Immediate recommended task

- Run integrated manual QA for User Management and Suppliers against the running backend:
  - create/edit user
  - role dropdown visibility under restricted permissions
  - lock/unlock user
  - reset password success/error flow
  - supplier list/create/edit/detail
