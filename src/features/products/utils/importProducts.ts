import * as XLSX from 'xlsx';
import { productFormSchema, type ProductFormData } from '../schemas/productSchemas';
import type { ProductItem, ProductOptionItem } from '../types/productType';

const REQUIRED_HEADERS = [
  'SKU',
  'Product Name',
  'Type',
  'Categories',
  'Unit',
  'Brand',
  'Stock Policy',
  'Tracking',
  'Status',
] as const;

type RequiredHeader = (typeof REQUIRED_HEADERS)[number];

type ProductImportRow = Record<string, string | number | boolean | null | undefined>;

interface ProductReferenceOption {
  id: string;
  name: string;
}

export interface ProductImportError {
  rowNumber: number;
  message: string;
}

export interface ProductImportParseResult {
  products: Array<{ rowNumber: number; payload: ProductFormData }>;
  errors: ProductImportError[];
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function getStringCell(row: ProductImportRow, header: RequiredHeader) {
  const value = row[header];
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }

  return '';
}

function findOptionByName<T extends ProductReferenceOption>(options: T[], label: string, fieldName: string, rowNumber: number) {
  const normalizedLabel = normalizeText(label);
  const matched = options.find((option) => normalizeText(option.name) === normalizedLabel);

  if (!matched) {
    throw new Error(`Row ${rowNumber}: ${fieldName} "${label}" does not exist in current master data.`);
  }

  return matched.id;
}

function parseProductType(value: string, rowNumber: number): ProductItem['productType'] {
  const normalized = normalizeText(value);
  switch (normalized) {
    case 'goods':
      return 'goods';
    case 'material':
      return 'material';
    case 'consumable':
      return 'consumable';
    default:
      throw new Error(`Row ${rowNumber}: unsupported product type "${value}".`);
  }
}

function parseStatus(value: string, rowNumber: number): ProductItem['status'] {
  const normalized = normalizeText(value);
  switch (normalized) {
    case 'active':
      return 'active';
    case 'inactive':
      return 'inactive';
    case 'discontinued':
      return 'discontinued';
    default:
      throw new Error(`Row ${rowNumber}: unsupported status "${value}".`);
  }
}

function parseTracking(value: string, rowNumber: number) {
  const normalized = normalizeText(value);
  if (!normalized) {
    throw new Error(`Row ${rowNumber}: tracking value is required.`);
  }

  return {
    trackedByLot: normalized.includes('lot') && !normalized.includes('no lot'),
    trackedByExpiry: normalized.includes('expiry') && !normalized.includes('no expiry'),
  };
}

function parseStockPolicy(value: string, rowNumber: number) {
  const match = value.match(/min\s*(\d+(?:\.\d+)?)\s*\/\s*max\s*(\d+(?:\.\d+)?)/i);
  if (!match) {
    throw new Error(`Row ${rowNumber}: stock policy must follow "Min x / Max y".`);
  }

  return {
    minStock: Number(match[1]),
    maxStock: Number(match[2]),
  };
}

function ensureHeaders(headers: string[]) {
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`Invalid file format. Missing columns: ${missingHeaders.join(', ')}.`);
  }
}

export async function parseProductsFromExcel(
  file: File,
  refs: {
    categories: ProductReferenceOption[];
    units: ProductOptionItem[];
    brands: ProductOptionItem[];
  },
): Promise<ProductImportParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error('The selected file does not contain any worksheet.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<ProductImportRow>(worksheet, {
    defval: '',
    raw: false,
  });

  const headerRow = XLSX.utils.sheet_to_json<string[]>(worksheet, {
    header: 1,
    range: 0,
    blankrows: false,
  })[0] ?? [];

  ensureHeaders(headerRow.map((item) => String(item).trim()));

  const products: Array<{ rowNumber: number; payload: ProductFormData }> = [];
  const errors: ProductImportError[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    try {
      const sku = getStringCell(row, 'SKU');
      const name = getStringCell(row, 'Product Name');
      const productType = parseProductType(getStringCell(row, 'Type'), rowNumber);
      const categoryLabel = getStringCell(row, 'Categories').split(',')[0]?.trim() ?? '';
      const unitLabel = getStringCell(row, 'Unit');
      const brandLabel = getStringCell(row, 'Brand');
      const stockPolicy = parseStockPolicy(getStringCell(row, 'Stock Policy'), rowNumber);
      const tracking = parseTracking(getStringCell(row, 'Tracking'), rowNumber);
      const status = parseStatus(getStringCell(row, 'Status'), rowNumber);

      const payload = productFormSchema.parse({
        sku,
        name,
        productType,
        categoryId: findOptionByName(refs.categories, categoryLabel, 'Category', rowNumber),
        unitId: findOptionByName(refs.units, unitLabel, 'Unit', rowNumber),
        brandId: findOptionByName(refs.brands, brandLabel, 'Brand', rowNumber),
        minStock: stockPolicy.minStock,
        maxStock: stockPolicy.maxStock,
        trackedByLot: tracking.trackedByLot,
        trackedByExpiry: tracking.trackedByExpiry,
        expiryDate: '',
        productionDate: '',
        status,
        description: '',
        storageConditions: '',
      });

      products.push({ rowNumber, payload });
    } catch (error) {
      errors.push({
        rowNumber,
        message: error instanceof Error ? error.message : 'Invalid row data.',
      });
    }
  });

  return { products, errors };
}
