# Next Steps

## Recommended Next Task

**Add raw warehouse location drill-down on Warehouse Hub**

## Why this is next

- Current update already clarifies `Locations` vs `Total Zones`, but users still need easy row-level verification in the same Hub screen.
- Adding a compact location table/filter per selected warehouse will make QA faster when cross-checking DB (for example, 9 rows).
- This change is FE-only and does not require BE schema changes.

## Priority Tasks

### NEXT-001 - Add location drill-down panel in Warehouse Hub

- Target files:
  - `src/services/warehouseService.ts`
  - `src/features/warehouses/components/WarehouseHub.tsx`
  - `src/features/warehouses/types/warehouseType.ts` (if extra UI-only fields are needed)
- Viec can lam:
  - show top N location rows for selected warehouse (code, zone, aisle, rack, level, bin, status)
  - add quick filter by `zone_code`
  - keep existing zone cards unchanged

### NEXT-002 - Add explicit count consistency indicators

- Hien thi `Locations in warehouse` va `Locations rendered in selected zone` de debug nhanh.
- Show empty-state hint when locations are filtered out by inactive status.

### NEXT-003 - Add QA helper notes in UI copy

- Explain in helper text that zone cards are grouped by `zone_code`.
- Keep wording consistent between Hub card labels and zone section.

### NEXT-004 - Optional FE optimization

- Cache location rows per warehouse in memory for smoother tab/warehouse switching.
- Keep current contract-safe source of truth from `/api/warehouses/locations/search`.

### NEXT-005 - Contract review checkpoint

- Re-check BE support for bulk zone operations (rename `zone_code`, bulk status update) before extending zone edit UX.

## Assumptions to verify next

- Hub page should remain zone-centric for quick operations view.
- Users need an optional row-level view in the same page for data auditing.
- Inactive warehouse/location filters should remain consistent across hub summary and detail blocks.
