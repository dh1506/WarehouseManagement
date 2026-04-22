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
