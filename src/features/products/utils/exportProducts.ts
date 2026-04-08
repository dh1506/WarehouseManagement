import ExcelJS from 'exceljs';
import type { ProductItem } from '../types/productType';

const HEADER_BG = '1E3A8A';
const HEADER_FG = 'FFFFFF';

const PRODUCT_TYPE_LABEL: Record<ProductItem['productType'], string> = {
  goods: 'Goods',
  material: 'Material',
  consumable: 'Consumable',
};

const STATUS_LABEL: Record<ProductItem['status'], string> = {
  active: 'Active',
  inactive: 'Inactive',
  discontinued: 'Discontinued',
};

const STATUS_STYLE: Record<ProductItem['status'], { fontColor: string; bgColor: string }> = {
  active: { fontColor: '065F46', bgColor: 'D1FAE5' },
  inactive: { fontColor: '92400E', bgColor: 'FEF3C7' },
  discontinued: { fontColor: '991B1B', bgColor: 'FEE2E2' },
};

function applyBorder(cell: ExcelJS.Cell) {
  const border: ExcelJS.Border = { style: 'thin', color: { argb: 'D1D5DB' } };
  cell.border = { top: border, left: border, bottom: border, right: border };
}

function formatDateTime(value: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTrackingLabel(item: ProductItem) {
  return [item.trackedByLot ? 'Lot' : 'No lot', item.trackedByExpiry ? 'Expiry' : 'No expiry'].join(' / ');
}

export async function exportProductsToExcel(products: ProductItem[], filename = 'product-catalog') {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Warehouse Management System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Products', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  worksheet.columns = [
    { header: 'No.', key: 'index', width: 8 },
    { header: 'SKU', key: 'sku', width: 18 },
    { header: 'Product Name', key: 'name', width: 28 },
    { header: 'Type', key: 'productType', width: 16 },
    { header: 'Categories', key: 'categories', width: 28 },
    { header: 'Unit', key: 'unitName', width: 16 },
    { header: 'Brand', key: 'brandName', width: 18 },
    { header: 'Stock Policy', key: 'stockPolicy', width: 18 },
    { header: 'Tracking', key: 'tracking', width: 18 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Created At', key: 'createdAt', width: 20 },
    { header: 'Updated At', key: 'updatedAt', width: 20 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.height = 32;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HEADER_BG },
    };
    cell.font = {
      bold: true,
      color: { argb: HEADER_FG },
      size: 11,
      name: 'Calibri',
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    applyBorder(cell);
  });

  products.forEach((item, index) => {
    const row = worksheet.addRow({
      index: index + 1,
      sku: item.sku,
      name: item.name,
      productType: PRODUCT_TYPE_LABEL[item.productType],
      categories: item.categoryNames.length > 0 ? item.categoryNames.join(', ') : item.categoryName,
      unitName: item.unitName,
      brandName: item.brandName,
      stockPolicy: `Min ${item.minStock} / Max ${item.maxStock}`,
      tracking: formatTrackingLabel(item),
      status: STATUS_LABEL[item.status],
      createdAt: formatDateTime(item.createdAt),
      updatedAt: formatDateTime(item.updatedAt),
    });

    row.height = 24;

    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      cell.font = { name: 'Calibri', size: 10 };

      if (index % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
      }

      if (columnNumber === 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Calibri', size: 10, color: { argb: '64748B' } };
      }

      if (columnNumber === 10) {
        const style = STATUS_STYLE[item.status];
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.bgColor } };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: style.fontColor } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }

      applyBorder(cell);
    });
  });

  const date = new Date();
  const dateStamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${filename}_${dateStamp}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}
