/**
 * Chuyển đổi chuỗi (VD: tên danh mục) thành chuỗi chữ HOA không dấu
 * Các khoảng trắng hoặc ký tự đặc biệt được thay thế bằng '_'
 */
export const normalizeNameToCode = (name: string): string => {
  return name
    .normalize('NFD') // Phân tách các ký tự có dấu
    .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu
    .toUpperCase() // Chữ in hoa
    .replace(/[^A-Z0-9]/g, '_') // Thay các ký tự lạ thành '_'
    .replace(/_+/g, '_') // Xóa '_' trùng lặp
    .replace(/^_|_$/g, ''); // Bỏ '_' ở đầu và cuối
};

/**
 * Sinh mã SKU sản phẩm theo cấu trúc chuẩn
 * Công thức: [Tiền tố Loại SP] - [ID Thương hiệu] - [ID Tự tăng]
 * Vd: GDS-001-00001
 * @param productType Loại sản phẩm (GOODS, MATERIAL, CONSUMABLE)
 * @param brandId ID thương hiệu (lấy ID đầu tiên hoặc 0 nếu không có)
 * @param sequenceId Tổng số sản phẩm thuộc loại này + 1 để padding
 */
export const generateProductSku = (
  productType: string,
  brandId: number,
  sequenceId: number
): string => {
  const prefixMap: Record<string, string> = {
    GOODS: 'GDS',
    MATERIAL: 'MTR',
    CONSUMABLE: 'CSM',
  };
  const prefix = prefixMap[productType] || 'PRO';
  
  const brandPart = brandId.toString().padStart(3, '0');
  const seqPart = sequenceId.toString().padStart(5, '0');
  
  return `${prefix}-${brandPart}-${seqPart}`;
};

/**
 * Tạo Location Code đầy đủ cho một Bin/Rack cụ thể trong Warehouse
 */
export const generateLocationCode = (
  warehouseCode: string,
  zone: string = '',
  rack: string = '',
  level: string = '',
  bin: string = ''
): string => {
  const parts = [warehouseCode, zone, rack, level, bin].filter((part) => part.trim() !== '');
  return parts.join('-');
};

/**
 * Sinh mã code cho phiếu nhập (Ví dụ: IN-20231015-0001)
 */
export const generateStockInCode = (sequenceId: number): string => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seqPart = sequenceId.toString().padStart(4, '0');
  return `IN-${dateStr}-${seqPart}`;
};

/**
 * Sinh mã code cho phiếu điều chỉnh tồn kho (Ví dụ: ADJ-20260408-0001)
 */
export const generateAdjustmentCode = (sequenceId: number): string => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seqPart = sequenceId.toString().padStart(4, '0');
  return `ADJ-${dateStr}-${seqPart}`;
};

/**
 * Sinh mã code cho phiếu xuất kho (Ví dụ: OUT-20260408-0001)
 */
export const generateStockOutCode = (sequenceId: number): string => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seqPart = sequenceId.toString().padStart(4, '0');
  return `OUT-${dateStr}-${seqPart}`;
};
