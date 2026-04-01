export type SupplierStatus = 'active' | 'inactive';

export interface SupplierProductSummary {
  id: string;
  code: string;
  name: string;
  productType: string;
  productStatus: string;
  supplierSku: string;
  purchasePrice: number | null;
  isPrimary: boolean;
}

export interface SupplierItem {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  status: SupplierStatus;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierDetail extends SupplierItem {
  products: SupplierProductSummary[];
}

export interface SupplierListParams {
  search?: string;
  status?: SupplierStatus | 'all';
  page?: number;
  pageSize?: number;
}

export interface SupplierListResponse {
  data: SupplierItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SupplierFormValues {
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  status: SupplierStatus;
}
