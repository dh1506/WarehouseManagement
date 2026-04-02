# Current Context

## Sprint / Task hien tai

**Warehouse occupancy warning and color threshold update**

## Trang thai

- Warehouse, zone, rack, and bin views now surface occupancy warnings when capacity is low or overloaded.
- Occupancy thresholds were updated to:
  - empty = 0%
  - low = 1-20% (amber/orange)
  - partial = 21-60%
  - full = 61-100%
  - overloaded = >100%
- FE build verification passed after the UI and service updates.

## What was done in latest implementation

- Updated shared occupancy classification in warehouse service and bin type definitions.
- Changed Warehouse Hub cards to show warning badges and color-coded capacity bars for low/overloaded warehouses.
- Added zone occupancy display and warnings in the hub zone cards.
- Updated Zone Detail legend, rack buttons, zone header, and selected bin inspector to highlight low occupancy.
- Updated Spatial Layout Map legend and thresholds to match the new scheme.

## Files touched (latest delta)

- `src/features/warehouses/types/warehouseType.ts`
- `src/services/warehouseService.ts`
- `src/features/warehouses/components/WarehouseHub.tsx`
- `src/features/warehouses/components/ZoneDetail.tsx`
- `src/features/warehouses/components/SpatialLayoutMap.tsx`
- `docs/agent/current-context.md`
- `docs/agent/progress-log.md`
- `docs/agent/decision-log.md`
- `docs/agent/next-steps.md`

## Assumptions dang ap dung

- Low occupancy is treated as a warning state rather than a normal neutral state.
- The 1-20 and 21-60 split should be reused consistently across all warehouse occupancy visuals.
- Overloaded remains any value above 100%.
