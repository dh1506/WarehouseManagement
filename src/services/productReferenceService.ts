import type {
  ProductReferenceFormValues,
  ProductReferenceItem,
  ProductReferenceListParams,
  ProductReferenceListResponse,
  ProductReferenceType,
} from '@/features/productSettings/types/referenceType';

let PRODUCT_REFERENCES: ProductReferenceItem[] = [
  {
    id: 'unit-1',
    code: 'PCS',
    name: 'Piece',
    description: 'Đơn vị chiếc cho sản phẩm đóng gói riêng lẻ.',
    type: 'unit',
    status: 'active',
    usageCount: 128,
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-03-26T08:00:00Z',
  },
  {
    id: 'unit-2',
    code: 'BOX',
    name: 'Box',
    description: 'Đơn vị thùng cho các SKU lưu kho theo kiện.',
    type: 'unit',
    status: 'active',
    usageCount: 64,
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-03-26T08:00:00Z',
  },
  {
    id: 'unit-3',
    code: 'PALLET',
    name: 'Pallet',
    description: 'Đơn vị pallet cho hàng cồng kềnh và nhập container.',
    type: 'unit',
    status: 'inactive',
    usageCount: 12,
    createdAt: '2026-03-03T08:00:00Z',
    updatedAt: '2026-03-22T09:00:00Z',
  },
  {
    id: 'brand-1',
    code: 'ACME',
    name: 'ACME Industrial',
    description: 'Nhà cung cấp thiết bị lưu kho công nghiệp.',
    type: 'brand',
    status: 'active',
    usageCount: 38,
    createdAt: '2026-03-02T08:00:00Z',
    updatedAt: '2026-03-25T10:00:00Z',
  },
  {
    id: 'brand-2',
    code: 'NOVA',
    name: 'Nova Tech',
    description: 'Thương hiệu điện tử và cảm biến theo dõi kho.',
    type: 'brand',
    status: 'active',
    usageCount: 52,
    createdAt: '2026-03-02T08:00:00Z',
    updatedAt: '2026-03-27T11:00:00Z',
  },
  {
    id: 'brand-3',
    code: 'RIVER',
    name: 'River Safety',
    description: 'Nhà sản xuất đồ bảo hộ và vật tư an toàn kho.',
    type: 'brand',
    status: 'inactive',
    usageCount: 9,
    createdAt: '2026-03-05T08:00:00Z',
    updatedAt: '2026-03-19T07:00:00Z',
  },
];

let nextReferenceId = 100;

const delay = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getProductReferences(
  params: ProductReferenceListParams,
): Promise<ProductReferenceListResponse> {
  await delay(250);

  let filtered = PRODUCT_REFERENCES.filter((item) => item.type === params.type);

  if (params.search) {
    const keyword = params.search.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.name.toLowerCase().includes(keyword) ||
        item.code.toLowerCase().includes(keyword) ||
        item.description.toLowerCase().includes(keyword),
    );
  }

  if (params.status && params.status !== 'all') {
    filtered = filtered.filter((item) => item.status === params.status);
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

export async function getProductReferenceOptions(type: ProductReferenceType) {
  const response = await getProductReferences({ type, page: 1, pageSize: 100, status: 'active' });
  return response.data;
}

export async function createProductReference(
  type: ProductReferenceType,
  payload: ProductReferenceFormValues,
): Promise<ProductReferenceItem> {
  await delay(300);

  const newItem: ProductReferenceItem = {
    id: `${type}-${nextReferenceId++}`,
    type,
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    description: payload.description.trim(),
    status: payload.status,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  PRODUCT_REFERENCES = [newItem, ...PRODUCT_REFERENCES];
  return newItem;
}

export async function updateProductReference(
  id: string,
  payload: ProductReferenceFormValues,
): Promise<ProductReferenceItem> {
  await delay(300);

  const index = PRODUCT_REFERENCES.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error('Không tìm thấy danh mục tham chiếu cần cập nhật.');
  }

  PRODUCT_REFERENCES[index] = {
    ...PRODUCT_REFERENCES[index],
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    description: payload.description.trim(),
    status: payload.status,
    updatedAt: new Date().toISOString(),
  };

  return { ...PRODUCT_REFERENCES[index] };
}

export async function deleteProductReference(id: string): Promise<void> {
  await delay(250);
  PRODUCT_REFERENCES = PRODUCT_REFERENCES.filter((item) => item.id !== id);
}
