export type ProductReferenceType = 'unit' | 'brand' | 'supplier';
export type ProductReferenceStatus = 'active' | 'inactive';

export interface ProductReferenceItem {
  id: string;
  code: string;
  name: string;
  description: string;
  type: ProductReferenceType;
  status: ProductReferenceStatus;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface ProductReferenceListParams {
  type: ProductReferenceType;
  search?: string;
  status?: ProductReferenceStatus | 'all';
  page?: number;
  pageSize?: number;
}

export interface ProductReferenceListResponse {
  data: ProductReferenceItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProductReferenceFormValues {
  code: string;
  name: string;
  description: string;
  status: ProductReferenceStatus;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
}
