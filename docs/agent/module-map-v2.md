# Module Map - Sprint 1 Complete Implementation

## System Overview

The warehouse management system is organized into feature-based modules following AGENTS.md architecture:

- **Pages** (`src/pages/admin/`) - thin route components
- **Features** (`src/features/[module]/`) - business logic, types, schemas, hooks
- **Services** (`src/services/`) - raw API calls (mock for now)
- **Components** (`src/components/`) - shared presentational UI
- **Hooks** (`src/hooks/`) - shared custom hooks
- **Store** (`src/store/`) - Zustand state (auth, UI)

## Sprint 1 Master Data Modules

### 1. Product Settings (Unit of Measure + Brand)

**Location:** `src/features/productSettings/`

- **Components:**
  - `ProductReferenceManagement.tsx` - Main page with dual tabs (Unit/Brand), list/filter/create/edit/delete
  - Helper functions: `SearchInput`, `FilterSelect`, `Pagination`, `FormDialog`, `DeleteDialog`

- **Hooks:** `src/features/productSettings/hooks/useProductReferences.ts`
  - `useProductReferences(params)` - React Query for list with filtering
  - `useCreateProductReference()` - CREATE mutation
  - `useUpdateProductReference()` - UPDATE mutation
  - `useDeleteProductReference()` - DELETE mutation
  - Query keys: `PRODUCT_REFERENCE_KEYS`

- **Schemas:** `src/features/productSettings/schemas/referenceSchemas.ts`
  - `productReferenceFormSchema` - Zod schema with code/name/description/status validation

- **Types:** `src/features/productSettings/types/referenceType.ts`
  - `ProductReferenceItem` - Complete data model
  - `ProductReferenceType` ('unit' | 'brand')
  - `ProductReferenceListParams`, `ProductReferenceListResponse`
  - `ProductReferenceFormValues`

- **Service:** `src/services/productReferenceService.ts`
  - Mock CRUD with 6 items (3 units + 3 brands)
  - Functions: `getProductReferences`, `createProductReference`, `updateProductReference`, `deleteProductReference`, `getProductReferenceOptions`
  - Filtering by type/search/status

- **Page:** `src/pages/admin/ProductReferenceManagementPage.tsx`
  - Simple wrapper that renders ProductReferenceManagement

- **Route:** `/admin/product-settings`

### 2. Product Master Management

**Location:** `src/features/products/`

- **Components:**
  - `ProductManagement.tsx` - Full CRUD UI with table list, filters, sheet forms
  - Helper functions: `SearchInput`, `FilterSelect`, `ProductFormSheet`, `ActionButton`, `DeleteDialog`, `Pagination`, `Field`

- **Hooks:** `src/features/products/hooks/useProducts.ts`
  - `useProducts(params)` - List with pagination/search/filter
  - `useProductCategoryOptions()` - Category dropdown
  - `useProductUnitOptions()` - Unit dropdown
  - `useProductBrandOptions()` - Brand dropdown
  - `useCreateProduct()`, `useUpdateProduct()`, `useDeleteProduct()` - mutations
  - Query keys: `PRODUCT_KEYS`

- **Schemas:** `src/features/products/schemas/productSchemas.ts`
  - `productFormSchema` - Full product form validation (sku/name/category/unit/brand/manufacturer/stock/tracking/status/description)
  - Includes cross-field validation (minStock <= maxStock)

- **Types:** `src/features/products/types/productType.ts`
  - `ProductItem` - with resolved reference names (categoryName, unitName, brandName)
  - `ProductFormValues` - form input type
  - `ProductListParams`, `ProductListResponse`

- **Service:** `src/services/productService.ts`
  - Mock CRUD with 3 sample products
  - Functions: `getProducts`, `createProduct`, `updateProduct`, `deleteProduct`
  - Auto-resolves reference names from category/unit/brand masters
  - Filtering by search/status/categoryId/brandId

- **Page:** `src/pages/admin/ProductManagementPage.tsx`

- **Route:** `/admin/products`

### 3. Warehouse Structure Management

**Location:** `src/features/warehouses/`

- **Components:**
  - `WarehouseManagement.tsx` - Dual-tab interface (Warehouses tab + Locations tab)
  - Sub-components: `WarehouseRows`, `LocationRows`, helper functions
  - `WarehouseSheets.tsx` - Form dialogs for warehouse and location CRUD

- **Hooks:** `src/features/warehouses/hooks/useWarehouses.ts`
  - List hooks: `useWarehouses`, `useWarehouseLocations`, `useWarehouseOptions`
  - Mutation hooks: `useCreateWarehouse`, `useUpdateWarehouse`, `useDeleteWarehouse`
  - Mutation hooks: `useCreateWarehouseLocation`, `useUpdateWarehouseLocation`, `useDeleteWarehouseLocation`
  - Query keys: `WAREHOUSE_KEYS`

- **Schemas:** `src/features/warehouses/schemas/warehouseSchemas.ts`
  - `warehouseFormSchema` - Warehouse CRUD form
  - `warehouseLocationFormSchema` - Location CRUD form with cross-field validation
  - All fields validated (code/name/status/capacity, etc.)

- **Types:** `src/features/warehouses/types/warehouseType.ts`
  - `WarehouseItem`, `WarehouseLocationItem`
  - Status enums: `WarehouseStatus` (operational/maintenance/inactive), `WarehouseLocationStatus` (active/blocked/inactive)
  - List params and response types

- **Service:** `src/services/warehouseService.ts`
  - Mock CRUD with 3 warehouses + 3 locations
  - Functions: `getWarehouses`, `createWarehouse`, `updateWarehouse`, `deleteWarehouse`
  - Functions: `getWarehouseLocations`, `createWarehouseLocation`, `updateWarehouseLocation`, `deleteWarehouseLocation`
  - Functions: `getWarehouseOptions`
  - Stats sync: location count updates when locations change

- **Page:** `src/pages/admin/WarehouseManagementPage.tsx`

- **Route:** `/warehouse`

## Shared Foundations (Reusable for Sprint 2+)

### Components (`src/components/`)

- **PageHeader** - Reusable page title section with eyebrow/title/description/actions
  - Used by: all Sprint 1 modules
  - Reusable by: all future modules

- **StatusBadge** - Color-coded status indicator
  - Status mappings: active/inactive/draft/archived/operational/maintenance/disabled/blocked
  - Used by: product and warehouse lists

- **StatePanel** - Loading/empty/error state presentation
  - Props: title, description, icon, tone (default/error), optional action
  - Used by: all module lists when loading/empty/error

### Hooks (`src/hooks/`)

- **usePermission(permission?: string)** - Permission checking with wildcard support
  - Returns: boolean indicating if user has permission or wildcard `*`
  - Used by: all modules to control button visibility/form readonly
  - Integrates with: authStore

### Store (`src/store/`)

- **authStore** - Zustand store for user/token/permissions
  - Does NOT store server state (only auth session)
  - Methods: setAuth, logout, updateUser, hasPermission

## Architecture Compliance Checklist

✓ **Pages are thin** - route components only compose layout + feature component
✓ **Business logic in features** - all CRUD, filtering, form logic in feature modules
✓ **Services raw API calls** - productService, productReferenceService, warehouseService contain only fetch/mock functions
✓ **React Query in hooks** - all queries/mutations wrapped in custom hooks within feature folders
✓ **Zod schemas** - all forms validated with Zod schemas in feature folders
✓ **Shared UI in components** - PageHeader, StatusBadge, StatePanel for reuse
✓ **No `any` types** - all TypeScript is strict
✓ **No hardcoded secrets** - only mock data in seed arrays
✓ **Permission-aware UI** - usePermission hook controls visibility
✓ **Loading/error/empty states** - StatePanel used throughout
✓ **Error handling** - try/catch + useToast for user feedback
✓ **Type safety** - complete type definitions, no inference gaps

## Dependencies Between Modules

```
ProductManagement
  ├─ depends on → productReferenceService (unit/brand options)
  ├─ depends on → categoryService (category options)
  └─ reuses → PageHeader, StatusBadge, StatePanel, usePermission

ProductReferenceManagement
  └─ reuses → PageHeader, StatusBadge, StatePanel, usePermission

WarehouseManagement
  ├─ dependencies between warehouse and location CRUD
  └─ reuses → PageHeader, StatusBadge, StatePanel, usePermission

Sprint 2-5 Transaction Modules (inbound/outbound/inventory)
  ├─ will depend on → Product master (SKU lookup, unit conversion)
  ├─ will depend on → Warehouse structure (location assignment)
  └─ will reuse → shared foundations (PageHeader, StatusBadge, StatePanel, usePermission)
```

## File Structure Summary

```
src/
├── features/
│   ├── productSettings/
│   │   ├── components/ProductReferenceManagement.tsx
│   │   ├── hooks/useProductReferences.ts
│   │   ├── schemas/referenceSchemas.ts
│   │   └── types/referenceType.ts
│   ├── products/
│   │   ├── components/ProductManagement.tsx
│   │   ├── hooks/useProducts.ts
│   │   ├── schemas/productSchemas.ts
│   │   └── types/productType.ts
│   └── warehouses/
│       ├── components/WarehouseManagement.tsx
│       ├── components/WarehouseSheets.tsx
│       ├── hooks/useWarehouses.ts
│       ├── schemas/warehouseSchemas.ts
│       └── types/warehouseType.ts
├── services/
│   ├── productReferenceService.ts
│   ├── productService.ts
│   └── warehouseService.ts
├── components/
│   ├── PageHeader.tsx
│   ├── StatusBadge.tsx
│   └── StatePanel.tsx
├── hooks/
│   └── usePermission.ts
├── store/
│   ├── authStore.ts
│   └── uiStore.ts
└── pages/admin/
    ├── ProductReferenceManagementPage.tsx
    ├── ProductManagementPage.tsx
    └── WarehouseManagementPage.tsx
```
