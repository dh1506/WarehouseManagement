import apiClient from '@/services/apiClient';
import type {
  InboundDetail,
  ReceiveItemsPayload,
  UploadAttachmentResponse,
} from '../types/inboundDetailType';

const USE_MOCK = true;

async function getMockModule() {
  return import('../data/mockInboundDetailData');
}

export async function getInboundDetail(
  id: string,
): Promise<InboundDetail> {
  if (USE_MOCK) {
    const mock = await getMockModule();
    return mock.fetchInboundDetail(id);
  }

  return apiClient.get(`/api/inbounds/${id}`);
}

export async function uploadInboundAttachment(
  file: File,
): Promise<UploadAttachmentResponse> {
  if (USE_MOCK) {
    const mock = await getMockModule();
    return mock.uploadAttachment(file);
  }

  const formData = new FormData();
  formData.append('file', file);

  return apiClient.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function deleteInboundAttachment(
  attachmentId: string,
): Promise<{ success: boolean }> {
  if (USE_MOCK) {
    const mock = await getMockModule();
    return mock.deleteAttachment(attachmentId);
  }

  return apiClient.delete(`/api/attachments/${attachmentId}`);
}

export async function receiveInboundItems(
  inboundId: string,
  payload: ReceiveItemsPayload,
): Promise<{ success: boolean; newStatus: string }> {
  if (USE_MOCK) {
    const mock = await getMockModule();
    return mock.receiveItems(inboundId, payload);
  }

  return apiClient.put(`/api/inbounds/${inboundId}/receive`, payload);
}
