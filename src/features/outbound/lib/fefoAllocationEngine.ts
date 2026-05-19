// ─── Engine Phân Bổ FEFO ──────────────────────────────────────────────────────
// TypeScript thuần — không phụ thuộc React, không có side-effect.
// Thực hiện FEFO thông minh với lọc SLA khách hàng theo nhóm yêu cầu 1-2.

export interface CustomerSLA {
  min_days_before_expiry: number;
}

export interface InventoryLotRow {
  warehouse_location_id: number;
  lot_id: number;
  lot_no: string;
  expired_date: string | null;
  available_quantity: number;
  location_code?: string;
}

export interface AllocationLine {
  lot_id: number;
  lot_no: string;
  expired_date: string | null;
  warehouse_location_id: number;
  location_code?: string;
  available_quantity: number;
  suggested_quantity: number;
  allocated_quantity: number;
  is_manual_override: boolean;
}

export interface AllocationResult {
  product_id: number;
  requested_quantity: number;
  lines: AllocationLine[];
  is_fully_allocated: boolean;
  total_allocated: number;
  has_sla_warning: boolean;
  sla_rejected_qty: number;
}

// ─── Hàm tiện ích ngày tháng ──────────────────────────────────────────────────

export function daysUntilExpiry(expiredDate: string | null): number {
  if (!expiredDate) return Infinity;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiredDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function passesCustomerSLA(expiredDate: string | null, sla: CustomerSLA): boolean {
  if (!expiredDate) return true; // Không có HSD → luôn đạt SLA
  const days = daysUntilExpiry(expiredDate);
  if (days < 0) return false; // Đã hết hạn → không đạt SLA
  return days >= sla.min_days_before_expiry;
}

// ─── Bộ so sánh FEFO ─────────────────────────────────────────────────────────
// Sắp xếp tăng dần theo HSD: gần hết hạn nhất lên đầu; null (không có HSD) xuống cuối.

function fefoComparator(a: InventoryLotRow, b: InventoryLotRow): number {
  if (a.expired_date === null && b.expired_date === null) return 0;
  if (a.expired_date === null) return 1;
  if (b.expired_date === null) return -1;
  return new Date(a.expired_date).getTime() - new Date(b.expired_date).getTime();
}

// ─── Phân bổ tham lam (greedy) ────────────────────────────────────────────────

function greedyAllocate(
  rows: InventoryLotRow[],
  remaining: number,
): { lines: AllocationLine[]; totalAllocated: number } {
  const lines: AllocationLine[] = [];
  let totalAllocated = 0;

  for (const row of rows) {
    if (remaining <= 0) break;
    if (row.available_quantity <= 0) continue;

    // Bỏ qua lô đã hết hạn
    if (row.expired_date !== null && daysUntilExpiry(row.expired_date) < 0) continue;

    const qty = Math.min(row.available_quantity, remaining);
    lines.push({
      lot_id: row.lot_id,
      lot_no: row.lot_no,
      expired_date: row.expired_date,
      warehouse_location_id: row.warehouse_location_id,
      location_code: row.location_code,
      available_quantity: row.available_quantity,
      suggested_quantity: qty,
      allocated_quantity: qty,
      is_manual_override: false,
    });
    remaining -= qty;
    totalAllocated += qty;
  }

  return { lines, totalAllocated };
}

// ─── Hàm phân bổ chính ───────────────────────────────────────────────────────

/**
 * Tính toán phân bổ FEFO cho một sản phẩm.
 *
 * Thuật toán:
 *  1. Loại bỏ lô đã hết hạn (days < 0).
 *  2. Khi có SLA, chia thành pool đạt SLA và pool không đạt SLA.
 *  3. Sắp xếp mỗi pool theo HSD tăng dần (null xuống cuối) — FEFO.
 *  4. Phân bổ từ pool đạt SLA trước; nếu thiếu, dùng pool không đạt.
 *  5. Đặt has_sla_warning = true khi phải dùng pool dự phòng.
 */
export function computeFEFOAllocation(
  rows: InventoryLotRow[],
  requestedQty: number,
  productId: number,
  sla?: CustomerSLA,
): AllocationResult {
  // 1. Lọc bỏ lô đã hết hạn
  const active = rows.filter(
    (r) => r.expired_date === null || daysUntilExpiry(r.expired_date) >= 0,
  );

  let lines: AllocationLine[] = [];
  let totalAllocated = 0;
  let hasSlaWarning = false;
  let slaRejectedQty = 0;

  if (!sla) {
    const sorted = [...active].sort(fefoComparator);
    const result = greedyAllocate(sorted, requestedQty);
    lines = result.lines;
    totalAllocated = result.totalAllocated;
  } else {
    const slaValid = active.filter((r) => passesCustomerSLA(r.expired_date, sla));
    const slaFailed = active.filter((r) => !passesCustomerSLA(r.expired_date, sla));

    const sortedValid = [...slaValid].sort(fefoComparator);
    const sortedFailed = [...slaFailed].sort(fefoComparator);

    const firstPass = greedyAllocate(sortedValid, requestedQty);
    lines = firstPass.lines;
    totalAllocated = firstPass.totalAllocated;

    const stillNeeded = requestedQty - totalAllocated;
    if (stillNeeded > 0 && sortedFailed.length > 0) {
      hasSlaWarning = true;
      const fallback = greedyAllocate(sortedFailed, stillNeeded);
      lines.push(...fallback.lines);
      slaRejectedQty = fallback.totalAllocated;
      totalAllocated += fallback.totalAllocated;
    }
  }

  return {
    product_id: productId,
    requested_quantity: requestedQty,
    lines,
    is_fully_allocated: totalAllocated >= requestedQty,
    total_allocated: totalAllocated,
    has_sla_warning: hasSlaWarning,
    sla_rejected_qty: slaRejectedQty,
  };
}
