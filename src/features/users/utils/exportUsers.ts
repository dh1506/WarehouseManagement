import ExcelJS from 'exceljs';
import type { UserItem } from '@/services/userService';

// ---------------------------------------------------------------------------
// Màu sắc khớp với design system của UI
// ---------------------------------------------------------------------------

// Role colors
const ROLE_STYLE: Record<string, { fontColor: string; bgColor: string }> = {
  Admin: { fontColor: 'FFFFFF', bgColor: '3B50CE' }, // xanh dương đậm
  Manager: { fontColor: 'FFFFFF', bgColor: '7C3AED' }, // tím
  Staff: { fontColor: '374151', bgColor: 'E5E7EB' }, // xám nhạt
};

// Status colors
const STATUS_STYLE: Record<string, { fontColor: string; bgColor: string }> = {
  Active: { fontColor: '065F46', bgColor: 'D1FAE5' }, // xanh lá nhạt
  Inactive: { fontColor: '991B1B', bgColor: 'FEE2E2' }, // đỏ nhạt
};

// Header: xanh dương nhạt — primary color
const HEADER_BG = '1E3A8A'; // xanh dương đậm như primary
const HEADER_FG = 'FFFFFF'; // chữ trắng

// ---------------------------------------------------------------------------
// Utility: áp dụng border đầy đủ 4 cạnh cho một cell
// ---------------------------------------------------------------------------
function applyBorder(cell: ExcelJS.Cell) {
  const border: ExcelJS.Border = { style: 'thin', color: { argb: 'D1D5DB' } };
  cell.border = { top: border, left: border, bottom: border, right: border };
}

// ---------------------------------------------------------------------------
// Export danh sách user ra file .xlsx có đầy đủ styling
// ---------------------------------------------------------------------------
export async function exportUsersToExcel(users: UserItem[], filename = 'danh-sach-nguoi-dung') {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Warehouse Management System';
  wb.created = new Date();

  const ws = wb.addWorksheet('Người dùng', {
    views: [{ state: 'frozen', ySplit: 1 }],  // Freeze hàng header
  });

  // ── Định nghĩa cột ──────────────────────────────────────────────────────
  ws.columns = [
    { header: 'STT', key: 'stt', width: 6 },
    { header: 'Họ và tên', key: 'name', width: 26 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Số điện thoại', key: 'phone', width: 18 },
    { header: 'Vai trò', key: 'role', width: 14 },
    { header: 'Trạng thái', key: 'status', width: 14 },
    { header: 'Đăng nhập lần cuối', key: 'lastLogin', width: 22 },
  ];

  // ── Style hàng header ────────────────────────────────────────────────────
  const headerRow = ws.getRow(1);
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
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
    applyBorder(cell);
  });

  // ── Thêm dữ liệu ────────────────────────────────────────────────────────
  users.forEach((u, idx) => {
    const lastLoginDisplay = new Date(u.lastLogin).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const row = ws.addRow({
      stt: idx + 1,
      name: u.name,
      email: u.email ?? '',
      phone: u.phone ?? '',
      role: u.role,
      status: u.status === 'Active' ? 'Hoạt động' : 'Đã khoá',
      lastLogin: lastLoginDisplay,
    });

    row.height = 24;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      // Căn lề chung
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
      cell.font = { name: 'Calibri', size: 10 };

      // Màu nền luân phiên (zebra stripe)
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };
      }

      // Màu cột STT & căn giữa
      if (colNumber === 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Calibri', size: 10, color: { argb: '6B7280' } };
      }

      // Màu vai trò (cột 5)
      if (colNumber === 5) {
        const style = ROLE_STYLE[u.role];
        if (style) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.bgColor } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: style.fontColor } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      }

      // Màu trạng thái (cột 6)
      if (colNumber === 6) {
        const style = STATUS_STYLE[u.status];
        if (style) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.bgColor } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: style.fontColor } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      }

      applyBorder(cell);
    });
  });

  // ── Tải file ─────────────────────────────────────────────────────────────
  const date = new Date();
  const dateStr = [
    date.getDate().toString().padStart(2, '0'),
    (date.getMonth() + 1).toString().padStart(2, '0'),
    date.getFullYear(),
  ].join('');

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${dateStr}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
