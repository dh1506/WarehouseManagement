import { z } from 'zod';

export const receiveItemSchema = z.object({
  receivedQty: z.coerce.number().int().min(0, 'Quantity must be 0 or greater'),
});

export type ReceiveItemSchema = z.infer<typeof receiveItemSchema>;

export const attachmentFileSchema = z.object({
  name: z.string(),
  size: z.number().max(10_485_760, 'File size must be less than 10MB'),
  type: z.enum(['application/pdf', 'image/jpeg', 'image/png'], {
    message: 'Only PDF, JPG, and PNG files are allowed',
  }),
});

export type AttachmentFileSchema = z.infer<typeof attachmentFileSchema>;
