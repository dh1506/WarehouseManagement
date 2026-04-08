export type ProductStatus = 'active' | 'inactive' | 'discontinued';
export type ProductType = 'goods' | 'material' | 'consumable';

export interface ProductOptionItem {
  id: string;
  code: string;
  name: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
}

export interface ProductItem {
  id: string;
  sku: string;
  name: string;
  productType: ProductType;
  categoryIds: string[];
  categoryName: string;
  categoryNames: string[];
  unitId: string;
  unitName: string;
  brandId: string;
  brandName: string;
  supplierName: string;
  minStock: number;
  maxStock: number;
  trackedByLot: boolean;
  trackedByExpiry: boolean;
  expiryDate: string | null;
  productionDate: string | null;
  status: ProductStatus;
  description: string;
  storageConditions: string;
  imageUrl: string | null;
  images: ProductImage[];
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
  productType: ProductType;
  categoryId: string;
  unitId: string;
  brandId: string;
  minStock: number;
  maxStock: number;
  trackedByLot: boolean;
  trackedByExpiry: boolean;
  expiryDate: string;
  productionDate: string;
  status: ProductStatus;
  description: string;
  storageConditions: string;
}
