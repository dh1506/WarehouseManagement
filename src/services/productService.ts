// @ts-nocheck
import { getProductCategories } from '@/services/categoryService';
import { getProductReferenceOptions } from '@/services/productReferenceService';
import type { ProductFormValues, ProductItem, ProductListParams, ProductListResponse } from '@/features/products/types/productType';

let PRODUCTS: ProductItem[] = [];

const delay = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function resolveReferenceNames(payload: ProductFormValues) {
  const categoriesResponse = await getProductCategories({ page: 1, pageSize: 100 });
  const units = await getProductReferenceOptions('unit');
  const brands = await getProductReferenceOptions('brand');

  const category = categoriesResponse.data.find((item) => item.id === payload.categoryId);
  const unit = units.find((item) => item.id === payload.unitId);
  const brand = brands.find((item) => item.id === payload.brandId);

  if (!category || !unit || !brand) {
    throw new Error('Legacy mock reference data is invalid.');
  }

  return {
    categoryName: category.name,
    unitName: unit.name,
    brandName: brand.name,
  };
}

export async function getProducts(params: ProductListParams = {}): Promise<ProductListResponse> {
  await delay(50);
  return { data: [], total: 0, page: params.page ?? 1, pageSize: params.pageSize ?? 10 };
}

export async function createProduct(payload: ProductFormValues): Promise<ProductItem> {
  await delay(50);
  const references = await resolveReferenceNames(payload);
  return {
    id: 'legacy',
    sku: payload.sku,
    name: payload.name,
    productType: payload.productType,
    categoryIds: [payload.categoryId],
    categoryName: references.categoryName,
    categoryNames: [references.categoryName],
    unitId: payload.unitId,
    unitName: references.unitName,
    brandId: payload.brandId,
    brandName: references.brandName,
    manufacturerId: payload.manufacturerId,
    manufacturerName: '',
    supplierName: '',
    minStock: payload.minStock,
    maxStock: payload.maxStock,
    trackedByLot: payload.trackedByLot,
    trackedByExpiry: payload.trackedByExpiry,
    expiryDate: payload.expiryDate || null,
    productionDate: payload.productionDate || null,
    status: payload.status,
    description: payload.description,
    storageConditions: payload.storageConditions,
    imageUrl: null,
    images: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function updateProduct(id: string, payload: ProductFormValues): Promise<ProductItem> {
  return createProduct(payload).then((item) => ({ ...item, id }));
}

export async function deleteProduct(id: string): Promise<void> {
  await delay(50);
}

export async function getProductById(id: string): Promise<ProductItem> {
  await delay(50);
  throw new Error(`Legacy mock product ${id} is no longer used.`);
}

export const productService = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getById: getProductById,
};
