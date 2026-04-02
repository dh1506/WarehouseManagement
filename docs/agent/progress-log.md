# Progress Log

## 2026-04-02 - Warehouse occupancy warning thresholds

### Done

- Added a new low occupancy tier for warehouse visuals: 1-20%.
- Shifted partial occupancy to 21-60% and kept full at 61-100%.
- Updated warehouse service classification so bin occupancy state matches the new tiering.
- Added warning badges and color cues for warehouse cards, zone cards, rack buttons, and selected bins.
- Updated Spatial Layout Map legend and color coding to match the new thresholds.

### Touched Files

- `src/features/warehouses/types/warehouseType.ts`
- `src/services/warehouseService.ts`
- `src/features/warehouses/components/WarehouseHub.tsx`
- `src/features/warehouses/components/ZoneDetail.tsx`
- `src/features/warehouses/components/SpatialLayoutMap.tsx`
- `docs/agent/current-context.md`
- `docs/agent/progress-log.md`
- `docs/agent/decision-log.md`
- `docs/agent/next-steps.md`

### Assumptions

- Low occupancy should be visually highlighted instead of blending into partial occupancy.
- The same threshold model must remain consistent for hub summaries and detailed zone views.

### Verification

- `npm run -s build`: pass

## 2026-04-02 - Warehouse Hub location count clarification

### Done

- Investigated mismatch: DB has 9 warehouse locations while Hub showed 3.
- Confirmed data is not dropped; Hub groups location rows by `zone_code`.
- Added explicit `totalLocations` to Warehouse Hub model and service mapping.
- Updated Hub summary cards to show both `Locations` and `Total Zones`.
- Added visual label `Grouped by zone code` near zone section.

### Touched Files

- `src/features/warehouses/types/warehouseType.ts`
- `src/services/warehouseService.ts`
- `src/features/warehouses/components/WarehouseHub.tsx`
- `docs/agent/current-context.md`
- `docs/agent/progress-log.md`
- `docs/agent/decision-log.md`
- `docs/agent/next-steps.md`

### Assumptions

- Hub remains an aggregated zone-centric view.
- Users also need visibility of raw location count to avoid confusion during verification with DB.

### Verification

- `npx tsc -b`: pass

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
