import ExcelJS from 'exceljs';
import type { ProductCategory } from '../types/categoryType';

export const exportCategoriesToExcel = async (categories: ProductCategory[]) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Product Categories');

  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Category Name', key: 'name', width: 25 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Parent', key: 'parentName', width: 20 },
    { header: 'Total Products', key: 'totalProducts', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Created At', key: 'createdAt', width: 20 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }, // blue-900
    };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });
  headerRow.height = 30;

  categories.forEach((cat) => {
    const row = worksheet.addRow({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      parentName: cat.parentName || 'Root',
      totalProducts: cat.totalProducts,
      status: cat.status.toUpperCase(),
      createdAt: new Date(cat.createdAt).toLocaleDateString('vi-VN'),
    });

    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      cell.alignment = { vertical: 'middle' };

      if (colNumber === 6) { // status
        cell.font = {
          bold: true,
          color: { argb: cat.status === 'active' ? 'FF059669' : 'FF64748B' },
        };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Product_Categories_${new Date().getTime()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
