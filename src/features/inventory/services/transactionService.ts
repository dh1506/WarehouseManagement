import axios from 'axios';
import apiClient from '@/services/apiClient';
import { useAuthStore } from '@/store/authStore';
import type { ApiResponse } from '@/types/api';
import type {
  InventoryTransaction,
  TransactionListResponse,
  TransactionQueryParams,
  CreateAdjustmentPayload,
} from '../types/transactionType';

// Raw axios instance that bypasses the apiClient response interceptor.
// Required for blob downloads — the shared interceptor unwraps ApiResponse<T>
// which corrupts binary streams.
const rawAxios = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 30000,
});

async function downloadBlobFromApi(url: string, params: Record<string, string | number>): Promise<Blob> {
  const token = useAuthStore.getState().token;
  const response = await rawAxios.get(url, {
    params,
    responseType: 'blob',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data as Blob;
}

function unwrap<T>(response: unknown): T {
  const res = response as ApiResponse<T>;
  return res.data;
}

// ── GET /api/inventory-transactions ─────────────────────────────────────────

export async function getTransactions(
  params: TransactionQueryParams,
): Promise<TransactionListResponse> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  };

  if (params.from_date) query.from_date = params.from_date;
  if (params.to_date) query.to_date = params.to_date;
  if (params.product_id) query.product_id = params.product_id;
  if (params.transaction_type) query.transaction_type = params.transaction_type;
  if (params.warehouse_id) query.warehouse_id = params.warehouse_id;
  if (params.warehouse_location_id) query.warehouse_location_id = params.warehouse_location_id;
  if (params.created_by) query.created_by = params.created_by;
  if (params.reference_type) query.reference_type = params.reference_type;
  if (params.reference_id) query.reference_id = params.reference_id;

  const response = await apiClient.get('/api/inventory-transactions', { params: query });
  return unwrap<TransactionListResponse>(response);
}

// ── GET /api/inventory-transactions/:id ─────────────────────────────────────

export async function getTransactionById(id: number): Promise<InventoryTransaction> {
  const response = await apiClient.get(`/api/inventory-transactions/${id}`);
  return unwrap<InventoryTransaction>(response);
}

// ── POST /api/inventory-transactions/adjustments ────────────────────────────

export async function createAdjustment(
  payload: CreateAdjustmentPayload,
): Promise<InventoryTransaction> {
  const response = await apiClient.post('/api/inventory-transactions/adjustments', payload);
  return unwrap<InventoryTransaction>(response);
}

// ── GET /api/inventory-transactions/export/excel ────────────────────────────

export async function exportTransactionsExcel(
  params: Omit<TransactionQueryParams, 'page' | 'limit'>,
): Promise<Blob> {
  const query: Record<string, string | number> = {};
  if (params.from_date) query.from_date = params.from_date;
  if (params.to_date) query.to_date = params.to_date;
  if (params.product_id) query.product_id = params.product_id;
  if (params.transaction_type) query.transaction_type = params.transaction_type;
  if (params.warehouse_id) query.warehouse_id = params.warehouse_id;
  if (params.reference_type) query.reference_type = params.reference_type;

  return downloadBlobFromApi('/api/inventory-transactions/export/excel', query);
}

// ── GET /api/inventory-transactions/export/pdf ──────────────────────────────

export async function exportTransactionsPdf(
  params: Omit<TransactionQueryParams, 'page' | 'limit'>,
): Promise<Blob> {
  const query: Record<string, string | number> = {};
  if (params.from_date) query.from_date = params.from_date;
  if (params.to_date) query.to_date = params.to_date;
  if (params.product_id) query.product_id = params.product_id;
  if (params.transaction_type) query.transaction_type = params.transaction_type;
  if (params.warehouse_id) query.warehouse_id = params.warehouse_id;
  if (params.reference_type) query.reference_type = params.reference_type;

  return downloadBlobFromApi('/api/inventory-transactions/export/pdf', query);
}
