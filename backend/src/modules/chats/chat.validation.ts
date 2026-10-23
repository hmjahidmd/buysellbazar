import { z } from 'zod';

export const startChatSchema = {
  params: z.object({
    listingId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid listing ID format'),
  }),
};

export const roomIdParamSchema = {
  params: z.object({
    id: z.string().trim().min(3, 'Invalid room ID format'),
  }),
};

export const sendMessageSchema = {
  params: z.object({
    id: z.string().trim().min(3, 'Invalid room ID format'),
  }),
  body: z.object({
    content: z.string().trim().min(1, 'Message content cannot be empty').max(1000),
    messageType: z.enum(['TEXT', 'IMAGE', 'MEETUP_PIN']).default('TEXT'),
    attachmentUrl: z.string().url('Invalid attachment URL').optional(),
  }),
};

export const messagesQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
};

export default {
  startChatSchema,
  roomIdParamSchema,
  sendMessageSchema,
  messagesQuerySchema,
};
