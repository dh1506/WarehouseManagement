export type CategoryStatus = 'active' | 'inactive';

export interface ProductCategory {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  parentName: string | null;
  icon: string;
  totalProducts: number;
  status: CategoryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryFormData {
  name: string;
  description: string;
  parentId: string | null;
  icon: string;
  status: CategoryStatus;
}

export interface CategoriesResponse {
  data: ProductCategory[];
  total: number;
  page: number;
  pageSize: number;
}

// Icon options cho form chọn icon
export const CATEGORY_ICONS = [
  { value: 'devices', label: 'Electronics' },
  { value: 'memory', label: 'Chips' },
  { value: 'inventory_2', label: 'Storage' },
  { value: 'content_paste', label: 'Documents' },
  { value: 'shopping_cart', label: 'Shopping' },
  { value: 'local_shipping', label: 'Shipping' },
  { value: 'build', label: 'Tools' },
  { value: 'settings', label: 'Settings' },
  { value: 'category', label: 'General' },
  { value: 'package_2', label: 'Package' },
  { value: 'checkroom', label: 'Apparel' },
  { value: 'restaurant', label: 'Food' },
] as const;
