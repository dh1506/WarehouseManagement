import * as XLSX from 'xlsx';
import type { SalesImportError } from '../types/salesType';

export interface PreValidationResult {
  errors: SalesImportError[];
  validCount: number;
  missingColumns: string[];
}

const REQUIRED_COLS = [
  'transaction_code',
  'transaction_type',
  'transaction_date',
  'product_id',
  'warehouse_location_id',
  'quantity',
  'unit_price',
] as const;

const COL_LABEL: Record<string, string> = {
  transaction_code: 'Mã giao dịch',
  transaction_type: 'Loại giao dịch',
  transaction_date: 'Ngày giao dịch',
  product_id: 'ID sản phẩm',
  warehouse_location_id: 'ID điểm bán',
  quantity: 'Số lượng',
  unit_price: 'Đơn giá',
  promo_discount_amount: 'Khuyến mãi',
};

// Mirror BE column detection logic from sales.service.ts
function detectColKey(h: string): string | null {
  const lower = h.toLowerCase();
  if (lower.includes('transaction_code') || lower.includes('hóa đơn') || lower.includes('mã giao dịch')) return 'transaction_code';
  if (lower.includes('transaction_type') || lower.includes('loại')) return 'transaction_type';
  if (lower.includes('date') || lower.includes('ngày')) return 'transaction_date';
  if (lower.includes('product_id') || lower.includes('mã sản phẩm')) return 'product_id';
  if (lower.includes('location_id') || lower.includes('điểm bán') || lower.includes('kho')) return 'warehouse_location_id';
  if (lower.includes('quantity') || lower.includes('số lượng')) return 'quantity';
  if (lower.includes('price') || lower.includes('đơn giá')) return 'unit_price';
  if (lower.includes('promo') || lower.includes('khuyến mãi')) return 'promo_discount_amount';
  return null;
}

function toStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function isValidDate(v: unknown): boolean {
  if (v instanceof Date) return !isNaN(v.getTime());
  if (typeof v === 'number') return v > 0; // Excel serial number
  if (typeof v === 'string') return v.length > 0 && !isNaN(Date.parse(v));
  return false;
}

function validateRow(
  rowData: Record<string, unknown>,
  excelRowNumber: number,
  originalHeaders: Record<string, string>,
): SalesImportError[] {
  const errors: SalesImportError[] = [];
  const colName = (key: string) => originalHeaders[key] ?? COL_LABEL[key] ?? key;
  const cellVal = (key: string) => toStr(rowData[key]);

  const tc = toStr(rowData.transaction_code);
  if (!tc) {
    errors.push({ row: excelRowNumber, column: colName('transaction_code'), value: cellVal('transaction_code'), reason: 'Mã giao dịch không được để trống' });
  }

  const tt = toStr(rowData.transaction_type).toUpperCase();
  if (tt !== 'SALE' && tt !== 'RETURN') {
    errors.push({ row: excelRowNumber, column: colName('transaction_type'), value: cellVal('transaction_type'), reason: "Loại giao dịch phải là 'SALE' hoặc 'RETURN'" });
  }

  if (!isValidDate(rowData.transaction_date)) {
    errors.push({ row: excelRowNumber, column: colName('transaction_date'), value: cellVal('transaction_date'), reason: 'Ngày giao dịch không hợp lệ hoặc để trống' });
  }

  const pid = toNum(rowData.product_id);
  if (pid === null || !Number.isInteger(pid) || pid <= 0) {
    errors.push({ row: excelRowNumber, column: colName('product_id'), value: cellVal('product_id'), reason: 'ID sản phẩm phải là số nguyên dương' });
  }

  const wlid = toNum(rowData.warehouse_location_id);
  if (wlid === null || !Number.isInteger(wlid) || wlid <= 0) {
    errors.push({ row: excelRowNumber, column: colName('warehouse_location_id'), value: cellVal('warehouse_location_id'), reason: 'ID điểm bán phải là số nguyên dương' });
  }

  const qty = toNum(rowData.quantity);
  if (qty === null || qty <= 0) {
    errors.push({ row: excelRowNumber, column: colName('quantity'), value: cellVal('quantity'), reason: 'Số lượng phải là số dương' });
  }

  const price = toNum(rowData.unit_price);
  if (price === null || price < 0) {
    errors.push({ row: excelRowNumber, column: colName('unit_price'), value: cellVal('unit_price'), reason: 'Đơn giá không được âm' });
  }

  const promoRaw = rowData.promo_discount_amount;
  if (promoRaw !== null && promoRaw !== undefined && toStr(promoRaw) !== '') {
    const promo = toNum(promoRaw);
    if (promo === null || promo < 0) {
      errors.push({ row: excelRowNumber, column: colName('promo_discount_amount'), value: cellVal('promo_discount_amount'), reason: 'Khuyến mãi không được âm' });
    }
  }

  return errors;
}

export async function validateImportRows(file: File): Promise<PreValidationResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { errors: [], validCount: 0, missingColumns: REQUIRED_COLS.map(c => COL_LABEL[c] ?? c) };
  }

  const ws = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });

  if (rows.length === 0) {
    return { errors: [], validCount: 0, missingColumns: REQUIRED_COLS.map(c => COL_LABEL[c] ?? c) };
  }

  // Mirror BE header detection: scan first 5 rows for known header identifiers
  let headerRowIdx = -1;
  let rawHeaders: string[] = [];

  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const strs = (rows[i] as unknown[]).map(v => (v ? String(v).trim() : ''));
    if (strs.some(h => ['transaction_code', 'Mã hóa đơn', 'Mã giao dịch'].includes(h))) {
      headerRowIdx = i;
      rawHeaders = strs;
      break;
    }
  }

  if (headerRowIdx === -1) {
    headerRowIdx = 0;
    rawHeaders = (rows[0] as unknown[]).map(v => (v ? String(v).trim() : ''));
  }

  // Build column index map (0-based) and record original header text
  const colMap: Record<string, number> = {};
  const originalHeaders: Record<string, string> = {};

  rawHeaders.forEach((h, idx) => {
    if (!h) return;
    const key = detectColKey(h);
    if (key && !(key in colMap)) {
      colMap[key] = idx;
      originalHeaders[key] = h;
    }
  });

  const missingCols = REQUIRED_COLS.filter(c => !(c in colMap));
  if (missingCols.length > 0) {
    return { errors: [], validCount: 0, missingColumns: missingCols.map(c => COL_LABEL[c] ?? c) };
  }

  const allErrors: SalesImportError[] = [];
  let validCount = 0;

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (!row || row.every(v => v === null || v === undefined || v === '')) continue;

    const excelRowNumber = i + 1; // 1-indexed to match what the user sees in Excel
    const getCell = (key: string): unknown =>
      colMap[key] !== undefined ? row[colMap[key]] : undefined;

    const rowData: Record<string, unknown> = {
      transaction_code: getCell('transaction_code'),
      transaction_type: getCell('transaction_type'),
      transaction_date: getCell('transaction_date'),
      product_id: getCell('product_id'),
      warehouse_location_id: getCell('warehouse_location_id'),
      quantity: getCell('quantity'),
      unit_price: getCell('unit_price'),
      promo_discount_amount: getCell('promo_discount_amount'),
    };

    const rowErrors = validateRow(rowData, excelRowNumber, originalHeaders);
    if (rowErrors.length === 0) {
      validCount++;
    } else {
      allErrors.push(...rowErrors);
    }
  }

  return { errors: allErrors, validCount, missingColumns: [] };
}
