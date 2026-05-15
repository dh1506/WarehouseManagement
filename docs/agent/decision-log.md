# Decision Log

## 2026-05-14 — AI Forecast: Bulk Actual Qty UX

### D-AF-8: Per-product actual qty inputs (not a single broadcast value)

`BulkActualDialog` renders one `<Input>` per selected product. Empty rows are skipped silently — only filled rows are submitted to `POST /bulk-actual`. A single shared value would be wrong because each product has different actual sales numbers.

### D-AF-9: Do NOT auto-clear selection after bulk actual submit

After `BulkActualDialog` succeeds, `localActuals` updates but `selected` stays intact. The user may immediately want to approve/reject the same rows — forcing re-selection would break that workflow.

### D-AF-10: Remove debug console.log from aiForecastService

`console.log('Bulk review response:', response)` was a leftover debug artifact on line 66 of `aiForecastService.ts`. Removed.

---

## 2026-05-13 — Inbound Create Flow

### D-IN-1: Chọn kho + tự gán vị trí đại diện

Form tạo phiếu nhập kho chuyển từ chọn zone sang chọn kho. FE tự chọn một vị trí đại diện hợp lệ trong kho (ưu tiên `AVAILABLE`, fallback theo allowed category) để gửi `warehouse_location_id` đúng contract BE. Phân bổ vị trí chi tiết vẫn thực hiện ở bước nhận hàng.

## 2026-05-05 — AI Forecast Module

### D-AF-1: Replace static Ant Design mocks entirely

Both page components were 100% hardcoded Ant Design demos. Replaced completely — their architecture (Ant Table, inline styles, static data) was incompatible with the project's shadcn/Tailwind conventions.

### D-AF-2: `ai_raw_response` cross-reference for Gemini confidence/notes

Gemini returns `confidence` (0–1) and `note` per product. BE stores this in `AiForecast.ai_raw_response`, not in individual `AiForecastResult` rows. `AiInsightsPanel` builds a `Map<product_id, GeminiResultItem>` from `ai_raw_response` and matches by `product_id`.

### D-AF-3: Route param renamed `:sku` → `:id`

Old detail route used `:sku` (demo artifact). Real BE uses numeric IDs. Updated `App.tsx`; page parses as `parseInt` with NaN guard + redirect.

### D-AF-4: KPI strip shows page-level counts

No dedicated stats endpoint. KPI counts derived from current page items. Cards labeled "page" for clarity. A BE `GET /api/ai-forecasts/stats` endpoint would improve this.

### D-AF-5: 120s timeout on trigger endpoint

Gemini call can take 30–90 s with retries. Custom `timeout: 120_000` overrides the default 10s axios timeout on `triggerForecast`.

### D-AF-6: Manual state + Zod (not react-hook-form)

Forms use `useState` + Zod `safeParse` on submit — consistent with existing `CreateStockCountSheet` pattern.

### D-AF-7: `PAGE_PERMISSION_MAP` entry added; sidebar stays open

Added `ai-forecast` to `PAGE_PERMISSION_MAP` for future role-gating. `SIDEBAR_PAGE_ACCESS_CONFIG` keeps `modules: []` (all authenticated users) — matching BE which only requires `authenticate` middleware.

---

## 2026-04-28 — Sales Data Management Module

### D-S1: Tab state synced to URL via ?tab= param

Used `useSearchParams` at page level to persist active tab across refreshes and enable shareable deep links. Filter params (startDate, endDate, locationId) are also URL-synced via `useTableParams` within each tab.

### D-S2: SalesFilterBar uses native <input type="date">

No date-picker library in the project. Native date inputs styled with Tailwind to match the design language. Start/end validation is done inline (startDate > endDate → error highlight + disabled apply button).

### D-S3: Location combobox reuses getWarehouseLocations from warehouseService

Rather than adding a new endpoint, the filter combobox queries `/api/warehouses/locations/search` with pageSize=50. This matches the existing pattern used by other create-form selects in the project.

### D-S4: multipart/form-data upload overrides apiClient default Content-Type

The import API requires file upload. salesService.ts passes `{ 'Content-Type': 'multipart/form-data' }` as a per-request header override. The 60s timeout is set at request level (not globally) to avoid affecting other calls.

### D-S5: Import error parsing reads apiErr.data.errors from intercepted error body

apiClient interceptor returns `error.response.data` (the ApiResponse envelope) on 4xx. ImportCenterTab casts caught errors to `SalesImportApiError` and reads `.data.errors`. If the array is empty, falls back to generic toast.

### D-S6: AnimatePresence mode="wait" on tab panel

Prevents old and new panel from overlapping during transition. Combined with `forceMount + hidden` to keep React Query subscriptions alive across tab switches (avoids refetch cost on tab re-visit).

### D-S7: useReducedMotion guard on all animations

All spring/stagger/fade animations check `useReducedMotion()`. When true, `initial={false}` is passed to skip entry animations entirely.

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

## 2026-04-22 — Stock Disposal Module

### D8: Stock disposal state machine follows BE exactly

`huy.md` describes manager/CEO split states, but BE contract only supports `DRAFT -> PENDING -> APPROVED -> COMPLETED | CANCELLED`.
FE keeps this exact state machine and does not introduce pseudo statuses.

### D9: Create form uses reusable selectors, not raw ID entry

`CreateStockDisposalSheet` now reuses `ProductSearchSelect` and `WarehouseLocationSelect` to avoid fragile numeric ID input.
Payload remains unchanged and matches BE schema exactly.

### D10: Submit-time stock guard on FE

Before create mutation, FE calls inventory availability helper and blocks lines where `quantity > available_quantity`.
This is a UX guard only; BE remains final source of validation.

### D11: Lot selection sourced from /api/inventories

Lot options are derived from inventory rows filtered by `product_id`, deduplicated and sorted.
`lot_id` remains optional and is reset when product changes.

### D12: Motion optimization with reduced-motion support

List/detail views now honor `prefers-reduced-motion` and reduce animation intensity automatically.
