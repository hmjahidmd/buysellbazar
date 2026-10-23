import { Router } from 'express';
import { ChatController } from './chat.controller';
import {
  startChatSchema,
  roomIdParamSchema,
  sendMessageSchema,
  messagesQuerySchema,
} from './chat.validation';
import { requireAuth, requireNidVerified } from '../../core/middlewares/authGuards';
import { validateRequest } from '../../core/middlewares/validateRequest';
import { createRateLimiter } from '../../core/middlewares/rateLimiter';

const router = Router();

const chatRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  keyPrefix: 'rl_chats',
});

// 7.1 Get User Chat Inbox
router.get(
  '/',
  requireAuth,
  ChatController.getInbox
);

// 7.2 Initiate or Fetch Chat Room for Listing (Protected + NID Verified)
router.post(
  '/start/:listingId',
  requireAuth,
  requireNidVerified,
  validateRequest(startChatSchema),
  ChatController.startRoom
);

// 7.3 Get Message History
router.get(
  '/:id/messages',
  requireAuth,
  validateRequest(roomIdParamSchema),
  validateRequest(messagesQuerySchema),
  ChatController.getMessages
);

// 7.4 Send In-Chat Message (HTTP Fallback)
router.post(
  '/:id/messages',
  requireAuth,
  chatRateLimiter,
  validateRequest(sendMessageSchema),
  ChatController.sendMessage
);

// 7.5 Initiate Privacy-Preserving Masked Audio Call Bridge (Protected + NID Verified)
router.post(
  '/:id/proxy-call',
  requireAuth,
  requireNidVerified,
  validateRequest(roomIdParamSchema),
  ChatController.proxyCall
);

export default router;
