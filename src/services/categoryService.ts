// import apiClient from './apiClient';
import type {
  ProductCategory,
  CategoriesResponse,
  CategoryFormData,
} from '@/features/categories/types/categoryType';

// ---------------------------------------------------------------------------
// Mock data — thay bằng API thật khi BE sẵn sàng
// ---------------------------------------------------------------------------

let MOCK_CATEGORIES: ProductCategory[] = [
  {
    id: '1',
    name: 'Electronics',
    description: 'Consumer electronics, gadgets, and computing hardware.',
    parentId: null,
    parentName: null,
    icon: 'devices',
    totalProducts: 1248,
    status: 'active',
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-03-20T10:30:00Z',
  },
  {
    id: '2',
    name: 'Chips & Semiconductors',
    description: 'High-precision microcontrollers, CPUs, and semiconductor modules.',
    parentId: '1',
    parentName: 'Electronics',
    icon: 'memory',
    totalProducts: 142,
    status: 'active',
    createdAt: '2026-01-20T09:00:00Z',
    updatedAt: '2026-03-18T14:00:00Z',
  },
  {
    id: '3',
    name: 'Storage & Pallets',
    description: 'Industrial shelving, storage bins, and standard wood/plastic pallets.',
    parentId: null,
    parentName: null,
    icon: 'inventory_2',
    totalProducts: 892,
    status: 'inactive',
    createdAt: '2026-02-01T07:30:00Z',
    updatedAt: '2026-03-10T11:00:00Z',
  },
  {
    id: '4',
    name: 'Office Supplies',
    description: 'Stationaries, paper products, and general office furniture.',
    parentId: null,
    parentName: null,
    icon: 'content_paste',
    totalProducts: 3110,
    status: 'active',
    createdAt: '2026-01-05T06:00:00Z',
    updatedAt: '2026-03-25T09:45:00Z',
  },
  {
    id: '5',
    name: 'Mobile Devices',
    description: 'Smartphones, tablets, and mobile accessories.',
    parentId: '1',
    parentName: 'Electronics',
    icon: 'devices',
    totalProducts: 567,
    status: 'active',
    createdAt: '2026-02-10T10:00:00Z',
    updatedAt: '2026-03-22T08:00:00Z',
  },
  {
    id: '6',
    name: 'Packaging Materials',
    description: 'Boxes, bubble wrap, tape, and shipping supplies.',
    parentId: null,
    parentName: null,
    icon: 'package_2',
    totalProducts: 445,
    status: 'active',
    createdAt: '2026-02-15T12:00:00Z',
    updatedAt: '2026-03-21T16:00:00Z',
  },
  {
    id: '7',
    name: 'Safety Equipment',
    description: 'Helmets, gloves, goggles, and warehouse safety gear.',
    parentId: null,
    parentName: null,
    icon: 'build',
    totalProducts: 218,
    status: 'active',
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-03-26T10:00:00Z',
  },
  {
    id: '8',
    name: 'Cleaning Supplies',
    description: 'Industrial cleaning products and janitorial equipment.',
    parentId: null,
    parentName: null,
    icon: 'category',
    totalProducts: 156,
    status: 'inactive',
    createdAt: '2026-03-05T09:00:00Z',
    updatedAt: '2026-03-27T07:00:00Z',
  },
];

let nextId = 9;

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * GET /api/product-categories
 * Lấy danh sách danh mục sản phẩm (có phân trang)
 */
export const getProductCategories = (
  params: { page?: number; pageSize?: number; search?: string; status?: string } = {},
): Promise<CategoriesResponse> =>
  new Promise((resolve) => {
    setTimeout(() => {
      let filtered = [...MOCK_CATEGORIES];

      if (params.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q),
        );
      }

      if (params.status && params.status !== 'all') {
        filtered = filtered.filter((c) => c.status === params.status);
      }

      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 10;
      const start = (page - 1) * pageSize;
      const paged = filtered.slice(start, start + pageSize);

      resolve({
        data: paged,
        total: filtered.length,
        page,
        pageSize,
      });
    }, 300);
  });
// return apiClient.get<CategoriesResponse>('/api/product-categories', { params }).then((r) => r.data);

/**
 * POST /api/product-categories
 * Tạo danh mục sản phẩm mới
 */
export const createProductCategory = (data: CategoryFormData): Promise<ProductCategory> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const parent = data.parentId ? MOCK_CATEGORIES.find((c) => c.id === data.parentId) : null;
      const newCat: ProductCategory = {
        id: String(nextId++),
        name: data.name,
        description: data.description,
        parentId: data.parentId,
        parentName: parent?.name ?? null,
        icon: data.icon,
        totalProducts: 0,
        status: data.status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      MOCK_CATEGORIES.push(newCat);
      resolve(newCat);
    }, 400);
  });
// return apiClient.post<ProductCategory>('/api/product-categories', data).then((r) => r.data);

/**
 * PUT /api/product-categories/:id
 * Cập nhật danh mục sản phẩm
 */
export const updateProductCategory = (
  id: string,
  data: CategoryFormData,
): Promise<ProductCategory> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      const idx = MOCK_CATEGORIES.findIndex((c) => c.id === id);
      if (idx === -1) { reject(new Error('Không tìm thấy danh mục.')); return; }
      const parent = data.parentId ? MOCK_CATEGORIES.find((c) => c.id === data.parentId) : null;
      MOCK_CATEGORIES[idx] = {
        ...MOCK_CATEGORIES[idx],
        name: data.name,
        description: data.description,
        parentId: data.parentId,
        parentName: parent?.name ?? null,
        icon: data.icon,
        status: data.status,
        updatedAt: new Date().toISOString(),
      };
      resolve({ ...MOCK_CATEGORIES[idx] });
    }, 400);
  });
// return apiClient.put<ProductCategory>(`/api/product-categories/${id}`, data).then((r) => r.data);

/**
 * DELETE /api/product-categories/:id
 * Xoá danh mục sản phẩm (thiết kế thêm vì BE chưa có)
 */
export const deleteProductCategory = (id: string): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(() => {
      MOCK_CATEGORIES = MOCK_CATEGORIES.filter((c) => c.id !== id);
      resolve();
    }, 400);
  });
// return apiClient.delete(`/api/product-categories/${id}`).then(() => undefined);
