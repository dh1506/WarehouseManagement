import apiClient from '@/services/apiClient';
import type {
  InboundDetail,
  ReceiveItemsPayload,
  UploadAttachmentResponse,
} from '../types/inboundDetailType';

export async function getInboundDetail(id: string): Promise<InboundDetail> {
  const rootRes: any = await apiClient.get(`/api/stock-ins/${id}`);
  const res = rootRes.data || rootRes;
  
  return {
    id: String(res.id),
    documentId: res.code,
    supplierName: 'System Default', 
    receivedDate: res.status === 'COMPLETED' ? res.updated_at : '',
    workflow: [
       { step: 'created', label: 'Created', timestamp: res.created_at, status: 'completed' },
       { step: 'approving', label: 'Approved', timestamp: res.approver ? res.updated_at : null, status: res.approver ? 'completed' : 'pending' },
       { step: 'receiving', label: 'Receiving', timestamp: res.status === 'IN_PROGRESS' || res.status === 'COMPLETED' ? res.updated_at : null, status: res.status === 'COMPLETED' ? 'completed' : (res.status === 'IN_PROGRESS' ? 'current' : 'pending') },
       { step: 'stored', label: 'Stored', timestamp: res.status === 'COMPLETED' ? res.updated_at : null, status: res.status === 'COMPLETED' ? 'current' : 'pending' },
    ],
    items: res.details?.map((d: any) => ({
      id: String(d.id),
      productId: String(d.product_id),
      productName: d.product?.name || `Product #${d.product_id}`,
      sku: d.product?.code || `SKU-${d.product_id}`,
      orderedQty: Number(d.expected_quantity) || 0,
      receivedQty: Number(d.received_quantity) || 0,
      uom: d.product?.base_uom?.name || 'Unit',
      unitPrice: Number(d.unit_price) || 0
    })) || [],
    attachments: [],
    originDestination: {
      supplierSource: 'N/A',
      supplierDock: 'N/A',
      destinationWarehouse: res.location?.full_path || 'Main Warehouse',
      destinationZone: 'Receiving Zone'
    },
    orderSummary: {
      subtotal: res.details?.reduce((acc: number, d: any) => acc + (Number(d.expected_quantity || 0) * (Number(d.unit_price) || 0)), 0) || 0,
      estDuties: 0,
      totalValue: res.details?.reduce((acc: number, d: any) => acc + (Number(d.expected_quantity || 0) * (Number(d.unit_price) || 0)), 0) || 0
    },
    aiInsight: {
      message: res.description || 'No insights available currently',
      matchPercentage: 100
    }
  };
}

export async function uploadInboundAttachment(
  file: File,
): Promise<UploadAttachmentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function deleteInboundAttachment(
  attachmentId: string,
): Promise<{ success: boolean }> {
  return apiClient.delete(`/api/attachments/${attachmentId}`);
}

export async function receiveInboundItems(
  inboundId: string,
  payload: ReceiveItemsPayload,
): Promise<{ success: boolean; newStatus: string }> {
  const backendPayload = {
    details: payload.items.map(item => ({
      stock_in_detail_id: parseInt(item.id, 10),
      received_quantity: item.receivedQty,
    }))
  };
  const rootRes: any = await apiClient.patch(`/api/stock-ins/${inboundId}/record`, backendPayload);
  const data = rootRes.data || rootRes;
  return {
    success: true,
    newStatus: data?.status?.toLowerCase() === 'in_progress' ? 'receiving' : 'completed'
  };
}
