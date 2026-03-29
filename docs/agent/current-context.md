# Current Context

## Sprint / Task hi?n t?i
**Sprint 1 - N?n t?ng h? th?ng và d? li?u g?c**

## Tr?ng thái
- Ðã tri?n khai xong các module frontend chính trong ph?m vi Sprint 1.
- Các module m?i v?n dang dùng mock services shape-stable vì backend th?t chua s?n sàng.
- Ki?m tra k? thu?t hi?n t?i:
  - `npx tsc -b`: pass
  - `npm run build`: fail trong sandbox do Vite/Tailwind native binary, không ph?i l?i TypeScript app

## Nh?ng gì dã hoàn thành
- Qu?n tr? h? th?ng và phân quy?n:
  - user management
  - role permissions
  - advanced permissions / approval configuration n?n t?ng hi?n có
- D? li?u g?c s?n ph?m:
  - product categories
  - product settings: unit of measure, brand/manufacturer
  - product master CRUD
- C?u trúc kho:
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

## File tr?ng tâm v?a tri?n khai
- `src/features/productSettings/components/ProductReferenceManagement.tsx`
- `src/features/products/components/ProductManagement.tsx`
- `src/features/warehouses/components/WarehouseManagement.tsx`
- `src/features/warehouses/components/WarehouseSheets.tsx`

## Assumptions dang áp d?ng
- Workspace hi?n không có API contract / database design / UI reference riêng cho Product và Warehouse modules.
- FE dang bám theo design language và pattern ki?n trúc có s?n trong repo.
- Permission UI cho module m?i hi?n t?m d?a trên `usePermission()` và h? tr? wildcard `*`.
