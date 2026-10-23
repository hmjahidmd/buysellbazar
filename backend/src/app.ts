import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import env from './config/env';
import traceIdMiddleware from './core/middlewares/traceId';
import requestLogger from './core/middlewares/requestLogger';
import errorHandler from './core/middlewares/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import kycRoutes from './modules/users/kyc/kyc.routes';
import userRoutes from './modules/users/user.routes';
import listingRoutes from './modules/listings/listing.routes';
import offerRoutes from './modules/offers/offer.routes';
import chatRoutes from './modules/chats/chat.routes';
import reviewRoutes from './modules/reviews/review.routes';
import storefrontRoutes from './modules/storefronts/storefront.routes';
import boostRoutes from './modules/boosts/boost.routes';
import paymentRoutes from './modules/boosts/payment.routes';
import reportRoutes from './modules/moderation/report.routes';
import moderationRoutes from './modules/moderation/moderation.routes';
import legalRoutes from './modules/moderation/legal.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import { NotFoundError } from './core/errors/AppError';
import { sendSuccess } from './core/utils/response';

export const createApp = (): Application => {
  const app: Application = express();

  // Security Headers
  app.use(helmet());

  // CORS Configuration
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Trace-Id', 'X-Gateway-Signature'],
      exposedHeaders: ['X-Trace-Id'],
    })
  );

  // Response Compression
  app.use(compression());

  // Body & Cookie Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser(env.COOKIE_SECRET));

  // Global Context & Observability Middlewares
  app.use(traceIdMiddleware);
  app.use(requestLogger);

  // Health Check Endpoint
  app.get('/health', (_req: Request, res: Response) => {
    return sendSuccess(res, {
      status: 'UP',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  });

  // Base API Welcome Endpoint
  app.get('/api/v1', (_req: Request, res: Response) => {
    return sendSuccess(res, {
      platform: 'BuySell BD Enterprise Marketplace API',
      version: 'v1.0.0',
      docs: '/api/v1/docs',
    });
  });

  // Module 1: Authentication & Session Routes
  app.use('/api/v1/auth', authRoutes);

  // Module 2: e-KYC Identity Clearance & Biometric Routes
  app.use('/api/v1/kyc', kycRoutes);

  // Module 3: User Profile, Quota Engine & Saved Ads
  app.use('/api/v1/users', userRoutes);

  // Module 4: Listings, Media Processing & Catalog Engine
  app.use('/api/v1/listings', listingRoutes);

  // Module 5: Negotiation & Binding Offers Engine
  app.use('/api/v1/offers', offerRoutes);

  // Module 6: Real-Time Chat & Telephony Masking
  app.use('/api/v1/chats', chatRoutes);

  // Module 7: Review & Rating Engine
  app.use('/api/v1/reviews', reviewRoutes);

  // Module 8: Commercial B2C Storefronts & Subscriptions
  app.use('/api/v1/storefronts', storefrontRoutes);

  // Module 9: Boost & Monetization Payment Engine
  app.use('/api/v1/boosts', boostRoutes);
  app.use('/api/v1/payments', paymentRoutes);

  // Module 10: Trust, Safety, Moderation & Legal Compliance
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/admin/moderation', moderationRoutes);
  app.use('/api/v1/legal', legalRoutes);

  // Module 11: Notification Center & Push Service
  app.use('/api/v1/notifications', notificationRoutes);

  // Catch-all 404 Handler
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};

export const app = createApp();
export default app;
