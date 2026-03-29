import { getProductCategories } from '@/services/categoryService';
import { getProductReferenceOptions } from '@/services/productReferenceService';
import type { ProductFormValues, ProductItem, ProductListParams, ProductListResponse } from '@/features/products/types/productType';

let PRODUCTS: ProductItem[] = [
  {
    id: 'prd-1',
    sku: 'ELX-CPU-01',
    name: 'Industrial Edge CPU',
    categoryId: '2',
    categoryName: 'Chips & Semiconductors',
    unitId: 'unit-1',
    unitName: 'Piece',
    brandId: 'brand-2',
    brandName: 'Nova Tech',
    manufacturer: 'Nova Electronics Vietnam',
    minStock: 40,
    maxStock: 180,
    trackedByLot: true,
    trackedByExpiry: false,
    status: 'active',
    description: 'Bộ xử lý edge dành cho gateway theo dõi điều kiện kho.',
    createdAt: '2026-03-10T08:00:00Z',
    updatedAt: '2026-03-26T11:00:00Z',
  },
  {
    id: 'prd-2',
    sku: 'PKG-TAPE-24',
    name: 'Heavy Duty Packing Tape',
    categoryId: '6',
    categoryName: 'Packaging Materials',
    unitId: 'unit-2',
    unitName: 'Box',
    brandId: 'brand-1',
    brandName: 'ACME Industrial',
    manufacturer: 'ACME Packaging Ltd.',
    minStock: 20,
    maxStock: 120,
    trackedByLot: false,
    trackedByExpiry: false,
    status: 'active',
    description: 'Băng keo công nghiệp dùng cho đóng gói pallet và kiện hàng.',
    createdAt: '2026-03-12T08:00:00Z',
    updatedAt: '2026-03-25T14:00:00Z',
  },
  {
    id: 'prd-3',
    sku: 'SAFE-GLV-09',
    name: 'Warehouse Grip Gloves',
    categoryId: '7',
    categoryName: 'Safety Equipment',
    unitId: 'unit-1',
    unitName: 'Piece',
    brandId: 'brand-3',
    brandName: 'River Safety',
    manufacturer: 'River Safety Co.',
    minStock: 50,
    maxStock: 200,
    trackedByLot: true,
    trackedByExpiry: false,
    status: 'inactive',
    description: 'Găng tay chống trượt cho nhân sự bốc dỡ trong kho.',
    createdAt: '2026-03-15T08:00:00Z',
    updatedAt: '2026-03-19T14:00:00Z',
  },
];

let nextProductId = 500;

const delay = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function resolveReferenceNames(payload: ProductFormValues) {
  const categoriesResponse = await getProductCategories({ page: 1, pageSize: 100 });
  const units = await getProductReferenceOptions('unit');
  const brands = await getProductReferenceOptions('brand');

  const category = categoriesResponse.data.find((item) => item.id === payload.categoryId);
  const unit = units.find((item) => item.id === payload.unitId);
  const brand = brands.find((item) => item.id === payload.brandId);

  if (!category || !unit || !brand) {
    throw new Error('Dữ liệu danh mục, đơn vị tính hoặc thương hiệu không còn hợp lệ.');
  }

  return {
    categoryName: category.name,
    unitName: unit.name,
    brandName: brand.name,
  };
}

export async function getProducts(params: ProductListParams = {}): Promise<ProductListResponse> {
  await delay(250);

  let filtered = [...PRODUCTS];

  if (params.search) {
    const keyword = params.search.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.sku.toLowerCase().includes(keyword) ||
        item.name.toLowerCase().includes(keyword) ||
        item.manufacturer.toLowerCase().includes(keyword),
    );
  }

  if (params.status && params.status !== 'all') {
    filtered = filtered.filter((item) => item.status === params.status);
  }

  if (params.categoryId) {
    filtered = filtered.filter((item) => item.categoryId === params.categoryId);
  }

  if (params.brandId) {
    filtered = filtered.filter((item) => item.brandId === params.brandId);
  }

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const start = (page - 1) * pageSize;

  return {
    data: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
  };
}

export async function createProduct(payload: ProductFormValues): Promise<ProductItem> {
  await delay(300);
  const references = await resolveReferenceNames(payload);

  const product: ProductItem = {
    id: `prd-${nextProductId++}`,
    ...payload,
    ...references,
    manufacturer: payload.manufacturer.trim(),
    name: payload.name.trim(),
    sku: payload.sku.trim().toUpperCase(),
    description: payload.description.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  PRODUCTS = [product, ...PRODUCTS];
  return product;
}

export async function updateProduct(id: string, payload: ProductFormValues): Promise<ProductItem> {
  await delay(300);
  const index = PRODUCTS.findIndex((item) => item.id === id);

  if (index === -1) {
    throw new Error('Không tìm thấy sản phẩm cần cập nhật.');
  }

  const references = await resolveReferenceNames(payload);

  PRODUCTS[index] = {
    ...PRODUCTS[index],
    ...payload,
    ...references,
    manufacturer: payload.manufacturer.trim(),
    name: payload.name.trim(),
    sku: payload.sku.trim().toUpperCase(),
    description: payload.description.trim(),
    updatedAt: new Date().toISOString(),
  };

  return { ...PRODUCTS[index] };
}

export async function deleteProduct(id: string): Promise<void> {
  await delay(250);
  PRODUCTS = PRODUCTS.filter((item) => item.id !== id);
}
