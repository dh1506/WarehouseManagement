# Module Map

## Stock Count Module

### Pages (thin wrappers)

- `src/pages/operations/StockCountListPage.tsx` → renders `StockCountList`
- `src/pages/operations/StockCountDetailPage.tsx` → renders `StockCountDetail` (with id param)

### Feature Domain

- `src/features/stock-count/types/stockCountType.ts` — all TS interfaces + label maps
- `src/features/stock-count/schemas/stockCountSchemas.ts` — Zod schemas for create + confirm variance forms
- `src/features/stock-count/hooks/useStockCount.ts` — all React Query hooks
- `src/features/stock-count/components/StockCountList.tsx` — list page with KPI strip, filters, table
- `src/features/stock-count/components/StockCountDetail.tsx` — master-detail: header, action buttons, grid
- `src/features/stock-count/components/StockCountDetailGrid.tsx` — counting grid with inline inputs
- `src/features/stock-count/components/CreateStockCountSheet.tsx` — slide-over create form
- `src/features/stock-count/components/ConfirmVarianceDialog.tsx` — variance reason bulk/single dialog
- `src/features/stock-count/components/CancelStockCountDialog.tsx` — cancel confirmation dialog

### Service

- `src/services/stockCountService.ts` — all raw Axios calls to `/api/stock-counts`

### Routing

- `/stock-count` → `StockCountListPage`
- `/stock-count/:id` → `StockCountDetailPage`

### Modified Files

- `src/App.tsx` — added 2 routes
- `src/layouts/Sidebar.tsx` — added nav item `fact_check / Stock Count`
- `src/lib/pageAccess.ts` — added `stock-count` to both `PAGE_PERMISSION_MAP` and `SIDEBAR_PAGE_ACCESS_CONFIG`

### Reused from Inbound Feature

- `src/features/inbound/components/ProductSearchSelect.tsx`
- `src/features/inbound/components/WarehouseLocationSelect.tsx`

## Stock Disposal Module

### Pages (thin wrappers)

- `src/pages/operations/StockDisposalListPage.tsx` -> renders `StockDisposalList`
- `src/pages/operations/StockDisposalDetailPage.tsx` -> loads id param + renders `StockDisposalDetail`

### Feature Domain

- `src/features/stock-disposal/types/stockDisposalType.ts` - BE-aligned entity, status, list/query, analytics types
- `src/features/stock-disposal/schemas/stockDisposalSchemas.ts` - Zod create schema for header + detail lines
- `src/features/stock-disposal/hooks/useStockDisposal.ts` - query/mutation hooks + lot options + available quantity hooks
- `src/features/stock-disposal/components/StockDisposalList.tsx` - list, filter, KPI strip, pagination
- `src/features/stock-disposal/components/StockDisposalDetail.tsx` - detail, workflow timeline, status actions
- `src/features/stock-disposal/components/CreateStockDisposalSheet.tsx` - create form with reusable selectors and stock checks

### Service

- `src/services/stockDisposalService.ts` - stock disposal CRUD/status APIs + inventory helper calls for lot/availability

### Reused Building Blocks

- `src/features/inbound/components/ProductSearchSelect.tsx`
- `src/features/inbound/components/WarehouseLocationSelect.tsx`
- `src/components/PageHeader.tsx`
- `src/hooks/use-toast.ts`
