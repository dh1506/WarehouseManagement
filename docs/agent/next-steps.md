# Next Steps

## Recommended Next Task

**Review remaining warehouse dashboards for the same occupancy threshold model**

## Why this is next

- The new low/partial split should stay consistent everywhere the warehouse occupancy state is rendered.
- Any remaining summary cards or charts still using the old threshold ranges can now show inconsistent colors to users.
- A quick consistency pass is lower risk than adding new functionality immediately.

## Priority Tasks

### NEXT-001 - Audit remaining occupancy visuals

- Target files:
  - `src/features/warehouses/components/SpatialLayoutMap.tsx`
  - `src/features/warehouses/components/WarehouseHub.tsx`
  - `src/features/warehouses/components/ZoneDetail.tsx`
  - `src/services/warehouseService.ts`
- Verify any other occupancy badge, legend, or progress bar still uses the new 1-20 / 21-60 split.

### NEXT-002 - Decide whether the low tier needs a dedicated icon or tooltip

- If the low tier should be even more visible, add a consistent icon or tooltip pattern instead of more color-only cues.

### NEXT-003 - Keep audit notes aligned with the same rule set

- Document any future threshold changes in the agent logs before extending new warehouse visualizations.

### NEXT-004 - Optional follow-up if requested

- If the user wants, add a small legend or helper text explaining why low is separated from partial.

### NEXT-005 - Contract review checkpoint

- Re-check whether any backend dashboard or reporting contract already uses a different occupancy definition before extending the new thresholds further.

## Assumptions to verify next

- Hub page should remain zone-centric for quick operations view.
- Users need an optional row-level view in the same page for data auditing.
- Inactive warehouse/location filters should remain consistent across hub summary and detail blocks.
