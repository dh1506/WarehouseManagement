# Decision Log

## 2026-04-22 — Stock Count Module

### D1: Reuse inbound ProductSearchSelect + WarehouseLocationSelect
Imported directly from `features/inbound/components/`. These are general enough to reuse.
These should be migrated to `components/shared/` in a future cleanup sprint.

### D2: Client-side variance calculation
Per NFR-2: variance (counted - system_quantity) is computed in the FE without server round-trip.
Implemented via local `draftQty` state in `StockCountDetailGrid`. Save triggers only on blur or explicit "Save" button.

### D3: Cancel dialog has no reason body to BE
BE `cancelStockCountSchema` only accepts params (no body). Cancel dialog is a confirmation-only UI.
Audit log entry is created server-side on status change.

### D4: Status flow aligned to BE (not kiemke.md spec)
`kiemke.md` describes a `PENDING_REVIEW` status. BE only has: `DRAFT → COUNTING → COMPLETED → APPROVED | CANCELLED`.
FE uses BE statuses only. `PENDING_REVIEW` mapped to `COMPLETED`.

### D5: Export downloads via window.open
BE export endpoints require auth. Token-based download via `window.open` to new tab.
If BE adds cookie auth, this will work seamlessly. For token-based, BE needs to support token as query param.

### D6: Progress tracking — client-side
`progressPct = counted / total * 100` — no dedicated BE field.
`counted` = `details.filter(d => d.counted_quantity !== null).length`.

### D7: `PENDING_CEO` status not present
`kiemke.md` mentions `PENDING_CEO` if variance > threshold. This does not exist in current BE schema. Not implemented.
