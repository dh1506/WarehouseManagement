import apiClient from '@/services/apiClient';
import type {
  InboundDetail,
  ReceiveItemsPayload,
  UploadAttachmentResponse,
} from '../types/inboundDetailType';

export async function getInboundDetail(id: string): Promise<InboundDetail> {
  return apiClient.get(`/api/stock-ins/${id}`);
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
  return apiClient.patch(`/api/stock-ins/${inboundId}/record`, payload);
}
