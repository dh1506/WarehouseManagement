export type ProductStatus = 'active' | 'inactive' | 'draft';

export interface ProductItem {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryName: string;
  unitId: string;
  unitName: string;
  brandId: string;
  brandName: string;
  manufacturer: string;
  minStock: number;
  maxStock: number;
  trackedByLot: boolean;
  trackedByExpiry: boolean;
  status: ProductStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListParams {
  search?: string;
  status?: ProductStatus | 'all';
  categoryId?: string;
  brandId?: string;
  page?: number;
  pageSize?: number;
}

export interface ProductListResponse {
  data: ProductItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProductFormValues {
  sku: string;
  name: string;
  categoryId: string;
  unitId: string;
  brandId: string;
  manufacturer: string;
  minStock: number;
  maxStock: number;
  trackedByLot: boolean;
  trackedByExpiry: boolean;
  status: ProductStatus;
  description: string;
}
