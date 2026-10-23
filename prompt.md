# BuySell BD — Master Implementation & Prompting Playbook (`prompt.md`)

> **Document Version:** 2.0.0 (Master Synchronized Edition)  
> **Status:** Production Master Blueprint & Execution Playbook  
> **Target Audience:** Lead Software Engineers, AI Pair-Programmers (Antigravity), Full-Stack Developers  
> **Underlying System:** Next-Gen Verified C2C & B2C Marketplace Platform for Bangladesh  
> **Core Codebases:**  
> - `backend/` (Express.js, TypeScript, MongoDB Atlas, Redis, Socket.io, BullMQ, Winston, Zod)  
> - `frontend/` (Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide Icons, TanStack Query)

---

## 1. Executive Blueprint & Engineering Philosophy

This document (`prompt.md`) is the single source of truth and master execution playbook for building the **BuySell BD** marketplace platform. Every prompt in this playbook is strictly derived from and cross-referenced with the 9,800+ lines of engineering specifications established across:
* **[PRD.md](file:///Volumes/Disk%20%28%20G%20%29/Buy%20Sell%20Software/PRD.md):** Functional Requirements (FR-1 to FR-11), Business Rules, Anti-Fraud Guardrails, 30-ad quota, 48h review edit window, 7d seller reply, 5d storefront grace period.
* **[architecture.md](file:///Volumes/Disk%20%28%20G%20%29/Buy%20Sell%20Software/architecture.md):** Layered Monolith Architecture, Clean Architecture boundaries, Redis caching & token blacklists, CSFLE encryption, BullMQ job queues, and WebSockets.
* **[dfd.md](file:///Volumes/Disk%20%28%20G%20%29/Buy%20Sell%20Software/dfd.md):** 30 directional data flows (`DF-01` to `DF-30`), 7 sub-processes (`P-1.0` to `P-7.1`), and 9 data stores (`D1` to `D9`).
* **[database.md](file:///Volumes/Disk%20%28%20G%20%29/Buy%20Sell%20Software/database.md)** & **[schema-database.md](file:///Volumes/Disk%20%28%20G%20%29/Buy%20Sell%20Software/schema-database.md):** 11 MongoDB Collections with `$jsonSchema` validators, TypeScript interfaces, Mongoose schemas, compound indexes, transactions, and aggregations.
* **[erd.md](file:///Volumes/Disk%20%28%20G%20%29/Buy%20Sell%20Software/erd.md):** Relational Mermaid ERD and foreign key constraints across all 11 collections.
* **[api-spec.md](file:///Volumes/Disk%20%28%20G%20%29/Buy%20Sell%20Software/api-spec.md):** 59 REST Endpoints + 1 WebSocket Gateway with explicit Request/Response envelopes, Auth guards, and Error codes.
* **[ui-ux.md](file:///Volumes/Disk%20%28%20G%20%29/Buy%20Sell%20Software/ui-ux.md):** 10 Screen Flow Diagrams, Design System Tokens, and ASCII UI Wireframes.

### Core Non-Negotiables for Implementation
1. **Zero Fake Accounts / Zero Fraud:** Mandatory e-KYC (NID OCR + 3D Liveness) before listing or negotiating. Device fingerprinting (`SHA-256`) and phone binding to prevent banned re-registrations.
2. **Anti-Scam Keyword Interception:** Real-time chat messages must be regex-scanned for advance fee scam phrases (e.g., `bKash advance`, `courier fee`, `advance taka`) and trigger immediate in-chat warnings.
3. **Atomic Financial & Offer Transitions:** MongoDB Multi-Document ACID Transactions (`session.startTransaction()`) must be used for offer acceptance (auto-voiding competing offers) and boost activations.
4. **Cryptographic WORM Audit Trails:** Every sensitive mutation (Auth, KYC, Moderation, Ban, Payment) must write to `audit_logs` with a SHA-256 cryptographic hash chain (`previousHash` -> `currentHash`).
5. **Production Quality:** Strict TypeScript typing (`noImplicitAny`), Zod schema validation on every controller, unified JSON response envelopes, custom error hierarchies, and defensive error handling.

---

## 2. Master Specification Traceability Matrix

| Feature Module | DFD Process & Flows | Database Collections | API Spec Endpoints (All 59 + WS) | UI-UX Screens | PRD Reference |
|---|---|---|---|---|---|
| **0. Core Foundation & CSFLE** | All Base Infra | All 11 Collections | Section 1 (Conventions, Envelopes, Errors) | System Tokens & Styles | System Quality Attributes |
| **1. Auth & Device Session** | `P-1.0`, `DF-01`, `DF-02` | `D1: users`, `D8: audit_logs`, `blacklisted_devices` | Endpoints 2.1 – 2.6 (`request-otp`, `verify-otp`, `refresh`, `logout`, `sessions`, `delete session`) | Screen Flow 1: Auth Modal | FR-1: Authentication & Identity |
| **2. e-KYC Identity Clearance** | `P-2.0`, `DF-03`, `DF-08`, `DF-09` | `D1: users`, `D8: audit_logs`, `D9: notifications` | Endpoints 3.1 – 3.4 (`upload-nid`, `verify-liveness`, `status`, `admin/review`) | Screen Flow 2: e-KYC Wizard | FR-2: Verified Identity & Blue Shield |
| **3. User Profile & Quotas** | `P-1.0`, `D1: users` | `D1: users`, `D2: listings` | Endpoints 4.1 – 4.6 (`me`, `patch me`, `quota`, `public-profile`, `save listing`, `saved-listings`) | User Dashboard & Bookmarks | FR-3: User Profile & Listing Limits |
| **4. Listings, Media & Catalog** | `P-3.0`, `P-4.0`, `DF-04`, `DF-10`–`DF-16` | `D2: listings`, `D8: audit_logs` | Endpoints 5.1 – 5.8 (`create`, `search`, `get`, `update`, `mark-sold`, `renew`, `delete`, `my-listings`) | Screen Flow 3, 4, 5, 6 | FR-4: Listing Lifecycle & Geo Search |
| **5. Negotiation & Binding Offers** | `P-5.0`, `DF-05`, `DF-19`, `DF-20` | `D3: offers`, `D2: listings`, `D4: chat_messages` | Endpoints 6.1 – 6.7 (`submit`, `accept`, `counter`, `decline`, `withdraw`, `received`, `sent`) | Screen Flow 7: Offer Card | FR-5: Negotiation & Price Lock |
| **6. Real-Time Chat & Telephony** | `P-5.0`, `DF-17`, `DF-18`, `DF-21`, `DF-22` | `D4: chat_messages`, `D1: users`, `D8: audit_logs` | Endpoints 7.1 – 7.6 + WS (`inbox`, `start`, `messages`, `post message`, `proxy-call`, `chat/ws`) | Screen Flow 7: Chat Room | FR-6: Anti-Fraud Chat & Masked Calling |
| **7. Trust, Reviews & Rating** | `P-7.1`, `D5: reviews` | `D5: reviews`, `D1: users`, `D3: offers` | Endpoints 8.1 – 8.5 (`submit`, `edit 48h`, `reply 7d`, `seller reviews`, `report`) | Screen Flow 5: Review Tab | FR-7: Transaction-Verified Reviews |
| **8. B2C Merchant Storefronts** | `P-6.0`, `D6: storefronts` | `D6: storefronts`, `D2: listings`, `D1: users` | Endpoints 9.1 – 9.4 (`register`, `get by slug`, `update me`, `analytics`) | Screen Flow 8: Storefront | FR-8: B2C Storefronts & Subscriptions |
| **9. Boosts & MFS Payments** | `P-6.0`, `DF-06`, `DF-23`–`DF-26` | `D7: payments`, `D2: listings`, `D6: storefronts` | Endpoints 10.1 – 10.4 (`checkout`, `mfs-callback`, `history`, `status`) | Screen Flow 9: Checkout | FR-9: Monetization & MFS Integration |
| **10. Trust, Moderation & Audit** | `P-7.0`, `DF-07`, `DF-27`–`DF-30` | `D8: audit_logs`, `D1: users`, `reports` | Endpoints 11.1 – 11.6 (`reports`, `queue`, `resolve`, `ban-user`, `export`, `verify-chain`) | Screen Flow 10: Admin Queue | FR-10: Trust, Moderation & Compliance |
| **11. Notification Center** | `P-7.0`, `D9: notifications` | `D9: notifications`, `D1: users` | Endpoints 12.1 – 12.4 (`list`, `mark read`, `read all`, `register fcm`) | Notification Dropdown | FR-11: Notification Infrastructure |
| **12. Background Workers** | Async Tasks | `D2: listings`, `D6: storefronts`, `D9` | BullMQ Cron Jobs: Expiry Sweepers & FCM Worker | Background Daemons | System SLAs & Expirations |
| **13. Frontend UI-UX** | Client Layer | Consumes all REST + WS APIs | All 59 Endpoints + WS Gateway | All 10 Screen Flows | ui-ux.md Design Specification |
| **14. Quality Assurance** | Integration & E2E | All 11 Collections | All 59 Endpoints | End-to-End Journeys | System Reliability & Security |

---

## 3. How to Use These Prompts

To construct the software without bugs or discrepancies, follow these rules:
1. **Execute Step-by-Step in Order:** Never skip a phase. Phase 0 configures the core container, Phase 1 establishes the database layer, and subsequent phases build upon verified models.
2. **One Feature at a Time:** Feed one prompt block at a time to Antigravity.
3. **Verify Before Progressing:** At the end of each prompt, run the provided **Verification Command**. Only move to the next phase when all tests pass.
4. **Preserve Exact Schemas:** Do not rename fields or modify types from `schema-database.md` and `api-spec.md`.
5. **Explicit Endpoint Contracts:** Every controller must implement the exact HTTP method, path, request schema, and response envelope defined in `api-spec.md`.

---

## 4. Phased Implementation Prompts

### PHASE 0: Foundations, Scaffolding, Core Infrastructure, Middlewares & CSFLE Vault

#### Prompt 0.1: Environment & Secrets Validation (`backend/src/config/env.ts`)
```text
Role: Principal Backend Architect
Task: Set up strict environment configuration and validation in `backend/` using Zod and dotenv.
Reference Specs:
- architecture.md: Section 3 (Tech Stack) & Section 4.5 (Security & CSFLE)
- api-spec.md: Section 1.1 (Conventions & Response Envelopes)

Instructions:
1. Create `backend/.env.example` containing:
   - PORT=5000
   - NODE_ENV=development
   - MONGO_URI=mongodb://localhost:27017/buysellbd
   - REDIS_URI=redis://localhost:6379
   - JWT_ACCESS_SECRET=your_ultra_secure_jwt_access_secret_key_minimum_32_characters
   - JWT_REFRESH_SECRET=your_ultra_secure_jwt_refresh_secret_key_minimum_32_characters
   - JWT_ACCESS_EXPIRY=15m
   - JWT_REFRESH_EXPIRY=7d
   - COOKIE_SECRET=your_cookie_encryption_secret_key_32_chars
   - MFS_WEBHOOK_SECRET=your_shared_hmac_webhook_secret_key
   - CSFLE_MASTER_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef (96-byte hex in prod / 32-byte in dev)
   - S3_BUCKET_NAME=buysell-media-prod
   - S3_REGION=ap-southeast-1
   - S3_ACCESS_KEY_ID=test_key
   - S3_SECRET_ACCESS_KEY=test_secret
   - FRONTEND_URL=http://localhost:3000
2. Create `backend/src/config/env.ts` with a strict Zod schema parsing and validating all process.env variables at boot. Throw a clear, detailed error if any required variable is missing or malformed.
3. Export a type-safe `env` object as default.
```

#### Prompt 0.2: Production Logging, Database Connection with Pooling & Redis Client
```text
Role: Senior Infrastructure Engineer
Task: Implement Winston logger, MongoDB Atlas connection with pooling, and Redis client in `backend/src/config/`.
Reference Specs:
- architecture.md: Section 4.1 (Clean Architecture & Layers) & Section 7.2 (Connection Pooling)

Instructions:
1. In `backend/src/config/logger.ts`, configure Winston logger with:
   - Formats: timestamp, colorize (for dev), json (for prod), custom console print format.
   - Transports: Console for development; file rotation for error and combined logs in production.
2. In `backend/src/config/database.ts`:
   - Connect to MongoDB using Mongoose with `autoIndex: true`, `maxPoolSize: 50`, `minPoolSize: 10`, `serverSelectionTimeoutMS: 5000`.
   - Implement graceful shutdown listeners for SIGINT and SIGTERM.
   - Log connection lifecycle events (`connected`, `error`, `disconnected`).
3. In `backend/src/config/redis.ts`:
   - Initialize an `ioredis` client with exponential backoff retry strategy.
   - Export helper functions: `getRedisClient()`, `redisGet()`, `redisSetWithExpiry()`, `redisDel()`.
```

#### Prompt 0.3: Standardized Envelopes, Error Hierarchy & Global Middlewares
```text
Role: Lead Backend Developer
Task: Implement application error hierarchy, unified response envelopes, and core Express middlewares.
Reference Specs:
- api-spec.md: Section 1.1, 1.2, 1.3 (Master Error Code Catalog & Standard JSON Envelopes)
- architecture.md: Section 4.5 (Security Architecture)

Instructions:
1. In `backend/src/core/errors/AppError.ts`:
   - Create `AppError extends Error` with `statusCode`, `errorCode`, `isOperational`, and optional `details`.
   - Subclass: `BadRequestError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` (409), `ValidationError` (422), `RateLimitError` (429), `InternalServerError` (500).
2. In `backend/src/core/utils/response.ts`:
   - Implement `sendSuccess<T>(res: Response, data: T, statusCode = 200, message?: string)`:
     ```json
     { "success": true, "statusCode": 200, "data": ..., "traceId": req.traceId }
     ```
   - Implement `sendError(res: Response, error: AppError)`:
     ```json
     { "success": false, "statusCode": 400, "error": { "code": "...", "message": "...", "details": [...] }, "traceId": req.traceId }
     ```
3. In `backend/src/core/middlewares/`:
   - `traceId.ts`: Extract `X-Trace-Id` from incoming request headers or generate UUIDv4. Attach to `req.traceId` and set response header `X-Trace-Id`.
   - `requestLogger.ts`: Log HTTP method, URL, status code, response time in ms, and IP using Winston.
   - `errorHandler.ts`: Catch unhandled errors, distinguish operational AppErrors from unexpected system exceptions, log stack traces appropriately, and return standardized JSON error envelopes.
   - `validateRequest.ts`: Higher-order middleware accepting Zod schemas for `{ body, query, params }`. On validation failure, throw `ValidationError` (422) with field-level details.
   - `rateLimiter.ts`: Redis-backed sliding window rate limiter middleware.
4. Mount all middlewares in `backend/src/app.ts` alongside `helmet()`, `cors()`, `cookieParser()`, `express.json({ limit: "10mb" })`, and `express.urlencoded()`. Add a health check route at `GET /health`.
```

#### Prompt 0.4: CSFLE Security Vault & Field Encryption Helper (`csfleVault.ts`)
```text
Role: Senior Cryptography & Security Engineer
Task: Implement Client-Side Field Level Encryption (CSFLE) helper for PII data (NID numbers, mobile numbers).
Reference Specs:
- architecture.md: Section 4.5 (Security Architecture & CSFLE)
- database.md: Section on Deterministic and Randomized Encryption

Instructions:
1. Create `backend/src/core/utils/cryptoVault.ts`:
   - Implement AES-256-GCM authenticated encryption/decryption routines using `env.CSFLE_MASTER_KEY`.
   - Implement deterministic SHA-256 hashing for searchable encrypted fields:
     `hashDeterministic(value: string): string` (normalized lowercase, trimmed).
   - Implement field encryptor: `encryptField(plainText: string): string` returning `iv:authTag:cipherText`.
   - Implement field decryptor: `decryptField(encryptedBundle: string): string`.
   - Provide fallback mock mode for local testing without KMS.
```

* **Verification Command:**
```bash
cd backend && npm run build && node -e "require('./dist/config/env'); require('./dist/core/utils/cryptoVault'); console.log('Phase 0 verified successfully');"
```

---

### PHASE 1: Database Layer & Mongoose Models Implementation (All 11 Collections)

#### Prompt 1.1: Core User & Trust Entities (Collections: `users`, `audit_logs`, `blacklisted_devices`)
```text
Role: Database Architect & Security Specialist
Task: Implement Mongoose models, TypeScript interfaces, and compound indexes for `users`, `audit_logs`, and `blacklisted_devices`.
Reference Specs:
- schema-database.md: Sections 2.1 (users), 2.8 (audit_logs), 2.11 (blacklisted_devices)
- database.md: Index definitions, CSFLE field requirements, and TTL indexes

Instructions:
1. Create `backend/src/modules/users/user.model.ts`:
   - Implement `IUserDocument` interface matching `schema-database.md`.
   - Fields: `mobileNumber` (unique), `passwordHash`, `role` (enum: buyer, seller, merchant, moderator, admin, legal_officer), `accountStatus` (enum: PENDING_VERIFICATION, ACTIVE, SUSPENDED, BANNED), `isNidVerified`, `nidData` (encrypted/hashed: `nidNumberEncrypted`, `nidHashSha256`, `fullNameBangla`, `fullNameEnglish`, `dateOfBirth`, `verifiedAt`), `profile` (`displayName`, `avatarUrl`, `bio`, `division`, `district`, `thana`), `boundDevices` (array: `deviceFingerprintHash`, `deviceModel`, `lastIpAddress`, `boundAt`), `ratingAverage`, `ratingCount`, `dailyAdCount`, `lastAdPostedAt`.
   - Compound Indexes: `{ mobileNumber: 1 }` (unique), `{ "nidData.nidHashSha256": 1 }` (sparse, unique), `{ "boundDevices.deviceFingerprintHash": 1 }`, `{ accountStatus: 1, role: 1 }`.
2. Create `backend/src/modules/moderation/auditLog.model.ts`:
   - Implement `IAuditLogDocument` interface matching `schema-database.md`.
   - Fields: `traceId`, `userId`, `actorRole`, `action`, `entityType`, `entityId`, `ipAddress`, `userAgent`, `previousHash`, `currentHash`, `metadata`, `createdAt`.
   - Pre-save hook / static method: `calculateHash(previousHash, payload)` using SHA-256 to maintain cryptographic chain integrity.
   - Indexes: `{ userId: 1, createdAt: -1 }`, `{ traceId: 1 }`, `{ entityType: 1, entityId: 1 }`, `{ currentHash: 1 }` (unique).
3. Create `backend/src/modules/moderation/blacklistedDevice.model.ts`:
   - Fields: `deviceFingerprintHash` (unique), `reason`, `blacklistedBy`, `linkedUserIds`, `createdAt`.
   - Index: `{ deviceFingerprintHash: 1 }` (unique).
```

#### Prompt 1.2: Marketplace Core Models (`listings`, `offers`, `chat_messages`, `reviews`)
```text
Role: Database Architect
Task: Implement Mongoose models, TypeScript interfaces, and compound indexes for marketplace transactions.
Reference Specs:
- schema-database.md: Sections 2.2 (listings), 2.3 (offers), 2.4 (chat_messages), 2.5 (reviews)
- erd.md: Foreign keys and relationships

Instructions:
1. Create `backend/src/modules/listings/listing.model.ts`:
   - Fields: `sellerId`, `title`, `description`, `category`, `subCategory`, `price`, `isNegotiable`, `condition` (enum: BRAND_NEW, LIKE_NEW, USED, FOR_PARTS), `location` (`division`, `district`, `thana`, `geoCoordinates`: 2dsphere point), `images` (array of objects: `url`, `thumbnailUrl`, `perceptualHash`, `isPrimary`), `status` (enum: ACTIVE, UNDER_REVIEW, SOLD, EXPIRED, SUSPENDED), `boost` (`isTopAd`, `topAdExpiresAt`, `isBumped`, `bumpedAt`), `metrics` (`viewsCount`, `chatLeadsCount`, `offerCount`), `expiresAt`, `createdAt`, `updatedAt`.
   - Indexes: `{ status: 1, category: 1, "location.district": 1, price: 1 }`, `{ "location.geoCoordinates": "2dsphere" }`, Text index: `{ title: "text", description: "text" }`, `{ sellerId: 1, createdAt: -1 }`, `{ expiresAt: 1 }` (TTL).
2. Create `backend/src/modules/offers/offer.model.ts`:
   - Fields: `listingId`, `buyerId`, `sellerId`, `offeredPrice`, `currency`, `counterPrice`, `status` (enum: PENDING, COUNTERED, ACCEPTED, DECLINED, EXPIRED, VOIDED), `history` (array of action logs), `expiresAt`, `createdAt`, `updatedAt`.
   - Indexes: `{ listingId: 1, buyerId: 1, status: 1 }`, `{ sellerId: 1, status: 1 }`, `{ expiresAt: 1 }`.
3. Create `backend/src/modules/chats/chatMessage.model.ts`:
   - Fields: `roomId`, `listingId`, `senderId`, `recipientId`, `messageType` (enum: TEXT, IMAGE, MEETUP_PIN, SYSTEM_WARNING), `content`, `attachmentUrl`, `isScamFlagged`, `scamKeywordTriggered`, `isRead`, `readAt`, `createdAt`.
   - Indexes: `{ roomId: 1, createdAt: 1 }`, `{ senderId: 1, recipientId: 1 }`, `{ isScamFlagged: 1 }`.
4. Create `backend/src/modules/reviews/review.model.ts`:
   - Fields: `offerId` (unique), `listingId`, `buyerId`, `sellerId`, `rating` (1-5), `comment`, `sellerReply` (`comment`, `repliedAt`), `isEdited`, `editExpiresAt`, `createdAt`, `updatedAt`.
   - Indexes: `{ sellerId: 1, createdAt: -1 }`, `{ offerId: 1 }` (unique), `{ buyerId: 1, sellerId: 1 }`.
```

#### Prompt 1.3: Monetization, Storefronts & System Models (`storefronts`, `payments`, `notifications`, `counters`)
```text
Role: Database Architect
Task: Implement Mongoose models for storefronts, payments, notifications, and auto-increment counters.
Reference Specs:
- schema-database.md: Sections 2.6 (storefronts), 2.7 (payments), 2.9 (notifications), 2.10 (counters)

Instructions:
1. Create `backend/src/modules/storefronts/storefront.model.ts`:
   - Fields: `merchantId` (unique), `storeName`, `storeSlug` (unique), `tagline`, `logoUrl`, `bannerUrl`, `businessCategory`, `tradeLicenseNumber`, `isLicenseVerified`, `tier` (enum: BASIC, PRO, ENTERPRISE), `quotaLimit`, `subscriptionExpiresAt`, `gracePeriodExpiresAt`, `status` (enum: ACTIVE, EXPIRED, SUSPENDED), `address` (`division`, `district`, `thana`, `streetAddress`).
   - Indexes: `{ storeSlug: 1 }` (unique), `{ merchantId: 1 }` (unique), `{ status: 1, tier: 1 }`.
2. Create `backend/src/modules/boosts/payment.model.ts`:
   - Fields: `userId`, `listingId`, `storefrontId`, `transactionRef` (unique), `gatewayTransactionId`, `gateway` (enum: BKASH, NAGAD, ROCKET, SSLCOMMERZ), `method`, `amount`, `currency`, `status` (enum: INITIATED, PAID, FAILED, CANCELLED), `boostType`, `durationDays`, `paymentMetadata`, `paidAt`, `failedAt`, `createdAt`, `updatedAt`.
   - Indexes: `{ transactionRef: 1 }` (unique), `{ gatewayTransactionId: 1 }`, `{ userId: 1, createdAt: -1 }`, `{ status: 1 }`.
3. Create `backend/src/modules/notifications/notification.model.ts`:
   - Fields: `recipientId`, `type` (enum: OFFER_RECEIVED, OFFER_ACCEPTED, NEW_MESSAGE, KYC_VERIFIED, BOOST_ACTIVATED, FRAUD_WARNING, SYSTEM_ALERT), `title`, `body`, `entityType`, `entityId`, `isRead`, `readAt`, `createdAt`.
   - Indexes: `{ recipientId: 1, isRead: 1, createdAt: -1 }`, `{ createdAt: 1 }` (TTL: 60 days).
4. Create `backend/src/modules/common/counter.model.ts`:
   - Fields: `_id` (string), `sequenceValue` (number). Helper: `getNextSequence(sequenceName: string): Promise<number>`.
```

* **Verification Command:**
```bash
cd backend && npm run build && node -e "
const models = [
  require('./dist/modules/users/user.model'),
  require('./dist/modules/listings/listing.model'),
  require('./dist/modules/offers/offer.model'),
  require('./dist/modules/chats/chatMessage.model'),
  require('./dist/modules/reviews/review.model'),
  require('./dist/modules/storefronts/storefront.model'),
  require('./dist/modules/boosts/payment.model'),
  require('./dist/modules/moderation/auditLog.model'),
  require('./dist/modules/notifications/notification.model')
];
console.log('All 11 Mongoose models loaded and validated successfully');
"
```

---

### PHASE 2: Authentication, Security & Session Management (P-1.0 / Module 1)

#### Prompt 2.1: Authentication Service & Business Logic (`backend/src/modules/auth/auth.service.ts`)
```text
Role: Senior Security Engineer
Task: Implement core authentication service managing cryptographic OTPs, Redis TTL sessions, Argon2 password hashing, and JWT tokens.
Reference Specs:
- PRD.md: FR-1 (Authentication, Sessions & Device Fingerprinting)
- api-spec.md: Section 2.1 to 2.6
- dfd.md: Process P-1.0 & DF-01, DF-02

Instructions:
1. In `backend/src/modules/auth/auth.service.ts`, implement:
   - `requestOtp(mobileNumber, clientIp)`:
     - Check Redis blacklist / lockout key `otp_lockout:{mobileNumber}`. If locked, throw `BadRequestError` ("Mobile locked due to excessive failed attempts. Try again in 15 minutes.").
     - Generate crypto-secure 6-digit OTP using `crypto.randomInt(100000, 999999)`.
     - In development/mock mode, allow OTP `123456` if enabled.
     - Store OTP in Redis key `otp:{mobileNumber}` with TTL = 180 seconds (3 minutes).
     - Track attempt counter in Redis key `otp_attempts:{mobileNumber}` with TTL = 900 seconds.
     - Write audit log entry (DF-07).
     - Return `{ success: true, expiresInSeconds: 180 }`.
   - `verifyOtp(mobileNumber, otp, deviceFingerprintHash, deviceModel, clientIp)`:
     - Fetch OTP from Redis. If null, throw `BadRequestError` ("OTP expired or not requested").
     - If OTP does not match, increment attempt counter. If attempts >= 5, set lockout key in Redis for 15 minutes, delete OTP, and throw `BadRequestError` ("Too many failed attempts. Locked for 15 minutes.").
     - Check if `deviceFingerprintHash` exists in `blacklisted_devices`. If blacklisted, throw `ForbiddenError` ("Device permanently blacklisted for fraud.").
     - Find or create user in `users` collection.
     - Upsert device binding into user's `boundDevices` array with `lastIpAddress` and timestamp.
     - Generate JWT Access Token (payload: `sub`, `mobile`, `role`, `isNidVerified`, expires: 15m).
     - Generate JWT Refresh Token (payload: `sub`, `tokenFamilyId`, expires: 7d). Store active refresh token hash in Redis.
     - Write immutable WORM audit log (DF-07/D8) with action `AUTH_LOGIN_SUCCESS`.
     - Return `{ accessToken, refreshToken, user: { userId, mobileNumber, role, isNidVerified, profile } }`.
   - `rotateRefreshToken(oldRefreshToken)`:
     - Verify JWT signature using `JWT_REFRESH_SECRET`.
     - Check Redis token family. If reused or revoked, trigger reuse detection: revoke entire token family and throw `UnauthorizedError` ("Token reuse detected. Session invalidated.").
     - Issue new Access and Refresh tokens (Refresh Token Rotation).
   - `logoutUser(userId, accessToken, refreshToken)`:
     - Add `accessToken` JTI to Redis blacklist with TTL equal to remaining token lifetime.
     - Invalidate refresh token in Redis.
   - `listDeviceSessions(userId)`:
     - Return all devices from `user.boundDevices`.
   - `revokeDeviceSession(userId, targetDeviceId)`:
     - Remove device from `boundDevices` and revoke associated refresh tokens in Redis.
```

#### Prompt 2.2: Auth Controller, Routes & RBAC Middlewares
```text
Role: Senior Backend Engineer
Task: Create Zod validation schemas, Express controllers, route definitions, and RBAC authentication middlewares implementing all 6 Module 1 endpoints.
Reference Specs:
- api-spec.md: Endpoints 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
- architecture.md: Section 4.5 (Security Architecture & RBAC)

Instructions:
1. In `backend/src/modules/auth/auth.validation.ts`:
   - `requestOtpSchema`: `mobileNumber` regex `^01[3-9]\d{8}$`.
   - `verifyOtpSchema`: `mobileNumber`, `otp` (length 6), `deviceFingerprintHash` (SHA-256 hex string, length 64), `deviceModel` (string).
   - `refreshSchema`: `refreshToken` (optional if in cookie).
2. In `backend/src/core/middlewares/authGuards.ts`:
   - `requireAuth`: Extract `Authorization: Bearer <token>` from header. Verify token with `JWT_ACCESS_SECRET`. Check Redis token blacklist. Attach `req.user = { userId, role, isNidVerified, mobileNumber }`.
   - `requireRole(allowedRoles: Role[])`: Guard endpoint ensuring `allowedRoles.includes(req.user.role)`. If not, throw `ForbiddenError` (403).
   - `requireNidVerified`: Check `req.user.isNidVerified === true`. If false, throw `ForbiddenError` (403, `NID_VERIFICATION_REQUIRED`).
3. In `backend/src/modules/auth/auth.controller.ts`:
   - Implement handlers:
     - `POST /api/v1/auth/request-otp` (2.1)
     - `POST /api/v1/auth/verify-otp` (2.2)
     - `POST /api/v1/auth/refresh` (2.3)
     - `POST /api/v1/auth/logout` (2.4)
     - `GET /api/v1/auth/sessions` (2.5)
     - `DELETE /api/v1/auth/sessions/:deviceId` (2.6)
   - Store `refreshToken` in HttpOnly, SameSite=Strict, Secure cookie (`__Host-buysell_refresh`).
4. Mount `auth.routes.ts` in `backend/src/app.ts`.
```

* **Verification Command:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/request-otp   -H "Content-Type: application/json"   -d '{"mobileNumber":"01712345678"}'
```

---

### PHASE 3: e-KYC Identity Engine & Biometric Verification (P-2.0 / Module 2)

#### Prompt 3.1: NID OCR Ingestion & Deterministic Hashing Service (`backend/src/modules/users/kyc/kyc.service.ts`)
```text
Role: Senior Identity & Security Architect
Task: Implement the e-KYC verification service, OCR ingestion, 3D liveness match, and deterministic NID deduplication.
Reference Specs:
- PRD.md: FR-2 (Verified Identity, e-KYC & Blue Shield)
- api-spec.md: Section 3.1 to 3.4
- dfd.md: Process P-2.0 & DF-03, DF-08, DF-09

Instructions:
1. In `backend/src/modules/users/kyc/kyc.service.ts`:
   - `submitNid(userId, nidFrontBuffer, nidBackBuffer, clientIp)`:
     - Execute OCR extraction (mockable interface for third-party EC / Porichoy API).
     - Extract `nidNumber`, `fullNameBangla`, `fullNameEnglish`, `dateOfBirth`.
     - Calculate deterministic SHA-256 hash: `nidHashSha256 = crypto.createHash("sha256").update(nidNumber.trim()).digest("hex")`.
     - Check if `nidHashSha256` already exists on another user in `D1: users`. If exists, throw `ConflictError` (409, `NID_ALREADY_REGISTERED`, "This NID is already registered to another account. Duplicate identity is strictly forbidden.").
     - Store provisional KYC data in user record.
     - Write audit log entry (DF-08).
     - Return `{ kycSessionId, extractedName: fullNameEnglish, dateOfBirth, status: "PENDING_LIVENESS" }`.
   - `submitLivenessCheck(userId, kycSessionId, selfieStreamBuffer)`:
     - Evaluate 3D liveness & face match against NID photo (return confidence score 0-100).
     - If `confidenceScore >= 95`:
       - Update user: `isNidVerified = true`, `accountStatus = ACTIVE`, `verifiedAt = new Date()`, save encrypted NID fields.
       - Send real-time notification to user via `D9: notifications` (KYC_VERIFIED).
       - Write immutable WORM audit log (DF-08).
       - Return `{ status: "VERIFIED", confidenceScore, badgeAssigned: true }`.
     - If `70 <= confidenceScore < 95`:
       - Set user status to `MANUAL_REVIEW`. Queue case for Tier-2 moderator.
       - Return `{ status: "MANUAL_REVIEW", confidenceScore, estimatedReviewHours: 2 }`.
     - If `confidenceScore < 70`:
       - Mark as `REJECTED`. Return policy reason.
   - `adminManualReview(moderatorId, targetUserId, decision, notes)`:
     - If `APPROVED`: activate user and assign Blue Shield badge.
     - If `REJECTED`: record rejection reason and notify user.
     - Write audit log entry.
```

#### Prompt 3.2: e-KYC Controllers & Routes (Endpoints 3.1 – 3.4)
```text
Role: Backend API Engineer
Task: Implement controllers and routes for all 4 e-KYC Module 2 endpoints with multer image parsing.
Reference Specs:
- api-spec.md: Endpoints 3.1, 3.2, 3.3, 3.4

Instructions:
1. In `backend/src/modules/users/kyc/kyc.controller.ts` & `kyc.routes.ts`:
   - `POST /api/v1/kyc/upload-nid` (3.1): Protected via Bearer token. Multer upload: `nidFront` and `nidBack` image files (JPEG/PNG, max 5MB).
   - `POST /api/v1/kyc/verify-liveness` (3.2): Protected via Bearer token. Multer upload: `selfie` image or base64 stream + `kycSessionId`.
   - `GET /api/v1/kyc/status` (3.3): Protected via Bearer token. Returns current verification state (`isNidVerified`, `kycStatus`, `rejectionReason`).
   - `POST /api/v1/kyc/admin/review/:userId` (3.4): Protected via Bearer token (`role: moderator` or `admin`). Accepts `{ decision: "APPROVED" | "REJECTED", reviewNotes }`.
```

* **Verification Command:**
```bash
curl -X GET http://localhost:5000/api/v1/kyc/status   -H "Authorization: Bearer <VALID_JWT>"
```

---

### PHASE 4: User Profile, Quota Engine & Saved Ads (P-1.0 / Module 3)

#### Prompt 4.1: Profile Service, 30-Ad Rolling Quota Engine & Bookmarking
```text
Role: Senior Backend Developer
Task: Implement User profile endpoints, Saved Listings (Bookmarking), and the 30-ad rolling 24-hour quota management engine.
Reference Specs:
- PRD.md: FR-3 (User Profile, Quotas & Saved Ads)
- api-spec.md: Endpoints 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
- database.md: User schema & Quota logic

Instructions:
1. In `backend/src/modules/users/user.service.ts`:
   - `getSelfProfile(userId)` (4.1): Return user profile, KYC badge status, bound device count, rating summary.
   - `updateProfile(userId, updateData)` (4.2): Allow updating `displayName`, `bio`, `division`, `district`, `thana`. Prevent modifying NID data or mobileNumber.
   - `checkAdQuota(userId)` (4.3):
     - Calculate listings posted in the last 24 hours.
     - Return `{ dailyQuotaLimit: 30, usedToday: count, remainingQuota: 30 - count, resetsInSeconds }`.
   - `getPublicProfile(targetUserId)` (4.4): Return public profile, member since date, verified badge, rating average, active listing count. Exclude sensitive PII (mobileNumber, NID, bound devices).
   - `toggleSavedListing(userId, listingId)` (4.5): Add or remove `listingId` from user's `savedListings` array.
   - `getSavedListings(userId, pagination)` (4.6): Return populated active saved listings.
2. In `backend/src/modules/users/user.controller.ts` & `user.routes.ts`:
   - Mount routes:
     - `GET /api/v1/users/me` (4.1)
     - `PATCH /api/v1/users/me` (4.2)
     - `GET /api/v1/users/me/quota` (4.3)
     - `GET /api/v1/users/:id/public-profile` (4.4)
     - `POST /api/v1/users/me/saved-listings/:listingId` (4.5)
     - `GET /api/v1/users/me/saved-listings` (4.6)
```

---

### PHASE 5: Listing Management, Media Processing & Catalog Engine (P-3.0, P-4.0 / Module 4)

#### Prompt 5.1: Media Upload, Watermarking & Image Hashing Service (`backend/src/core/utils/mediaProcessor.ts`)
```text
Role: Media Processing Specialist
Task: Implement image optimization, perceptual hashing (pHash), and BuySell BD dynamic watermark application using Sharp.
Reference Specs:
- PRD.md: FR-4 (Listing Lifecycle & Image Moderation)
- dfd.md: Process P-3.0 & DF-11, DF-12, DF-13

Instructions:
1. Create `backend/src/core/utils/mediaProcessor.ts`:
   - Accept input image buffers (JPEG/PNG/WebP, max 5MB each).
   - Convert to WebP format with 85% quality.
   - Generate 200x200px thumbnail.
   - Overlay subtle translucent "BuySell BD Verified" watermark on the lower-right corner.
   - Calculate perceptual hash (pHash / dHash) string to detect duplicate reposts across fraud rings.
   - Upload processed WebP image and thumbnail to S3 / Cloud Storage (or local storage in dev mode).
   - Return `{ url, thumbnailUrl, perceptualHash, width, height }`.
```

#### Prompt 5.2: Listing Lifecycle & Multi-Parametric Geo Search Engine (Endpoints 5.1 – 5.8)
```text
Role: Lead Backend Engineer & Search Architect
Task: Implement listing creation with NID check, lifecycle transitions (ACTIVE -> HOLD -> SOLD), and high-performance MongoDB compound geo-search.
Reference Specs:
- PRD.md: FR-4 (Listings & Search)
- api-spec.md: Endpoints 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
- database.md: Listings indexes & Aggregations
- dfd.md: Process P-4.0 & DF-15, DF-16

Instructions:
1. In `backend/src/modules/listings/listing.service.ts`:
   - `createListing(userId, data, images)` (5.1):
     - Verify `user.isNidVerified === true`.
     - Check 30-ad rolling 24h quota.
     - Process images with Sharp & watermarking.
     - Save listing document (`status: ACTIVE`, `expiresAt: now + 30 days`).
     - Write audit log entry (DF-14).
   - `searchListings(query, filters, pagination)` (5.2):
     - Support keyword search (`$text`), division, district, thana, category, subCategory, priceMin, priceMax, condition, verifiedOnly.
     - Sort: Boosted `TOP_AD` listings prioritized first, then bumped listings, then newest.
     - Return paginated results and facet counts.
   - `getListingDetails(listingId, clientIp)` (5.3):
     - Fetch active listing, populate seller profile (name, avatar, blue shield, rating).
     - Atomic increment `metrics.viewsCount` (rate-limited per IP per 10 minutes via Redis).
   - `updateListing(userId, listingId, updateData)` (5.4): Validate seller ownership and update details.
   - `markListingSold(userId, listingId)` (5.5): Transition status to `SOLD`, auto-void pending offers.
   - `renewListing(userId, listingId)` (5.6): Renew expired listing for another 30 days.
   - `deleteListing(userId, listingId)` (5.7): Soft-delete listing (`status: DELETED`).
   - `getMyListings(userId, statusFilter, pagination)` (5.8): Return seller's listings grouped by status.
2. In `backend/src/modules/listings/listing.controller.ts` & `listing.routes.ts`:
   - Mount routes:
     - `POST /api/v1/listings` (5.1)
     - `GET /api/v1/listings/search` (5.2)
     - `GET /api/v1/listings/:id` (5.3)
     - `PATCH /api/v1/listings/:id` (5.4)
     - `POST /api/v1/listings/:id/mark-sold` (5.5)
     - `POST /api/v1/listings/:id/renew` (5.6)
     - `DELETE /api/v1/listings/:id` (5.7)
     - `GET /api/v1/listings/my-listings` (5.8)
```

* **Verification Command:**
```bash
curl -X GET "http://localhost:5000/api/v1/listings/search?division=Dhaka&district=Dhaka&limit=5"
```

---

### PHASE 6: Negotiation & Binding Offers Engine (P-5.0 / Module 5)

#### Prompt 6.1: Multi-Document ACID Transactional Offer Engine (Endpoints 6.1 – 6.7)
```text
Role: Senior Backend Engineer & Database Specialist
Task: Implement atomic offer negotiation engine with multi-document ACID transactions for price locking and competing offer voiding.
Reference Specs:
- PRD.md: FR-5 (Negotiation Engine & Price Lock)
- api-spec.md: Endpoints 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
- dfd.md: Process P-5.0 & DF-05, DF-19, DF-20

Instructions:
1. In `backend/src/modules/offers/offer.service.ts`:
   - `submitOffer(buyerId, listingId, offeredPrice)` (6.1):
     - Verify `buyer.isNidVerified === true`.
     - Verify listing is `ACTIVE` and `buyerId !== listing.sellerId`.
     - Check if buyer already has an active `PENDING` or `COUNTERED` offer on this listing. If yes, throw `ConflictError` (409, `ACTIVE_OFFER_EXISTS`).
     - Create offer document with `status: PENDING`, `expiresAt: now + 24 hours`.
     - Create notification for seller via `D9: notifications`.
   - `acceptOffer(sellerId, offerId)` (6.2):
     - Execute inside a MongoDB ACID Transaction (`session = await mongoose.startSession(); session.startTransaction()`):
       1. Atomically lock offer: Find offer where `_id === offerId` and `status IN [PENDING, COUNTERED]` and update to `status: ACCEPTED`. If null, throw `ConflictError` ("Offer is no longer valid or already processed").
       2. Update listing status to `HOLD` and lock `agreedPrice = offer.counterPrice || offer.offeredPrice`.
       3. Atomically update all OTHER pending/countered offers on the same `listingId` to `status: VOIDED`.
       4. Post automated system badge message into chat room: "Offer of BDT [agreedPrice] accepted. Final price locked."
       5. Commit transaction.
     - Trigger push notifications to buyer and voided bidders.
   - `counterOffer(sellerId, offerId, counterPrice)` (6.3): Verify ownership, update offer status to `COUNTERED`, reset 24h expiry, notify buyer.
   - `declineOffer(sellerId, offerId, reason)` (6.4): Set `status = DECLINED`, notify buyer.
   - `withdrawOffer(buyerId, offerId)` (6.5): Verify ownership, set `status = WITHDRAWN`.
   - `getReceivedOffers(sellerId, pagination)` (6.6): Return offers received on seller's listings.
   - `getSentOffers(buyerId, pagination)` (6.7): Return offers submitted by buyer.
2. In `backend/src/modules/offers/offer.controller.ts` & `offer.routes.ts`:
   - Mount routes:
     - `POST /api/v1/offers/:listingId` (6.1)
     - `POST /api/v1/offers/:id/accept` (6.2)
     - `POST /api/v1/offers/:id/counter` (6.3)
     - `POST /api/v1/offers/:id/decline` (6.4)
     - `POST /api/v1/offers/:id/withdraw` (6.5)
     - `GET /api/v1/offers/received` (6.6)
     - `GET /api/v1/offers/sent` (6.7)
```

---

### PHASE 7: Real-Time Chat, Anti-Scam Shield & Telephony Masking (P-5.0 / Module 6)

#### Prompt 7.1: WebSocket Gateway, Room Management & Regex Anti-Scam Interception
```text
Role: Real-Time Systems Specialist & Anti-Fraud Engineer
Task: Implement Socket.io real-time chat gateway with JWT handshake auth and real-time regex scam keyword interception.
Reference Specs:
- PRD.md: FR-6 (Anti-Fraud Chat & Telephony Proxy)
- api-spec.md: Section 7.6 (WebSocket Gateway Specification)
- dfd.md: Process P-5.0 & DF-17, DF-18

Instructions:
1. In `backend/src/modules/chats/socket.service.ts`:
   - Initialize Socket.io attached to HTTP server. Path: `/api/v1/chat/ws`.
   - Implement JWT authentication handshake middleware: Extract token from `socket.handshake.auth.token`. Verify and attach `socket.user = { userId, mobileNumber, isNidVerified }`.
   - Join user to personal room `user:{userId}` for instant notification push.
   - Socket event: `join_room({ roomId })`: Validate user is either buyer or seller of the associated listing.
   - Socket event: `send_message({ roomId, content, type })`:
     - Run Anti-Scam Regex Filter:
       ```typescript
       const SCAM_REGEX = /(bkash|nagad|rocket)\s*(advance|agrim|charge|delivery\s*fee|courier|fee|pathan|taka\s*pathan)|(কুরিয়ার\s*চার্জ|অগ্রিম|বিকাশ\s*করুন)/i;
       ```
     - If regex matches:
       - Flag message `isScamFlagged = true`.
       - Inject high-risk system warning message into the room: "⚠️ সতর্কতা: কোনো পণ্য বা কুরিয়ার ফি বাবদ অগ্রিম বিকাশ বা নগদ-এ টাকা পাঠাবেন না। পণ্য সামনাসামনি দেখে যাচাই করে লেনদেন করুন।"
       - Create automated fraud flag ticket in `audit_logs` (DF-18/D8).
     - Persist message in `D4: chat_messages`.
     - Emit message to room participants.
     - If recipient is offline (check Redis presence), enqueue push notification in `D9: notifications`.
```

#### Prompt 7.2: Chat REST Endpoints & Virtual Masked Telephony Bridge (Endpoints 7.1 – 7.5)
```text
Role: Telecommunications & Backend Engineer
Task: Implement chat REST fallback endpoints, message history pagination, and the virtual masked telephony bridge.
Reference Specs:
- api-spec.md: Endpoints 7.1, 7.2, 7.3, 7.4, 7.5
- dfd.md: DF-21, DF-22

Instructions:
1. In `backend/src/modules/chats/chat.service.ts` & `telephony.service.ts`:
   - `getUserInbox(userId, pagination)` (7.1): Return list of active conversations with last message, unread badge, and counterpart info.
   - `startChatRoom(userId, listingId)` (7.2): Fetch or create chat room for `listingId` + `buyerId`.
   - `getMessageHistory(userId, roomId, pagination)` (7.3): Return paginated messages in reverse chronological order.
   - `sendMessageHttp(userId, roomId, content, type)` (7.4): HTTP POST fallback for environments where WebSocket is blocked.
   - `initiateMaskedCall(buyerId, sellerId, listingId)` (7.5):
     - Verify both parties are NID-verified (`isNidVerified === true`).
     - Decrypt phone numbers via CSFLE vault.
     - Assign temporary virtual bridge number (`+8809612345678`) with 10-minute TTL.
     - Log proxy session in `audit_logs` (DF-21/DF-22).
     - Return `{ bridgeNumber, sessionId, expiresAt, maxDurationSeconds: 600 }`.
2. In `backend/src/modules/chats/chat.controller.ts` & `chat.routes.ts`:
   - Mount routes:
     - `GET /api/v1/chats` (7.1)
     - `POST /api/v1/chats/start/:listingId` (7.2)
     - `GET /api/v1/chats/:id/messages` (7.3)
     - `POST /api/v1/chats/:id/messages` (7.4)
     - `POST /api/v1/chats/:id/proxy-call` (7.5)
```

---

### PHASE 8: Verified Reviews & Seller Rating Engine (P-7.1 / Module 7)

#### Prompt 8.1: Transaction-Verified Reviews & Atomic Rating Aggregation Engine (Endpoints 8.1 – 8.5)
```text
Role: Senior Backend Engineer
Task: Implement verified reviews engine enforcing the 1-review-per-accepted-transaction rule, 48-hour edit window, 7-day seller reply, and atomic seller score recalculation.
Reference Specs:
- PRD.md: FR-7 (Trust, Verified Reviews & Seller Ratings)
- api-spec.md: Endpoints 8.1, 8.2, 8.3, 8.4, 8.5
- dfd.md: Process P-7.1 & Section 4.4

Instructions:
1. In `backend/src/modules/reviews/review.service.ts`:
   - `submitReview(buyerId, listingId, rating, comment)` (8.1):
     - Find accepted offer: Verify `offer.buyerId.equals(buyerId)`, `offer.listingId.equals(listingId)`, and `offer.status === "ACCEPTED"`.
     - Check duplicate review: Ensure no review already exists for this transaction. If exists, throw `ConflictError` (409, `REVIEW_ALREADY_EXISTS`).
     - Verify review is submitted within 30 days of transaction completion.
     - Save review with `editExpiresAt = now + 48 hours`.
     - Atomic Recalculation of Seller Score:
       ```typescript
       const stats = await Review.aggregate([
         { $match: { sellerId: offer.sellerId } },
         { $group: { _id: "$sellerId", avgRating: { $avg: "$rating" }, totalReviews: { $sum: 1 } } }
       ]);
       await User.findByIdAndUpdate(offer.sellerId, {
         ratingAverage: Math.round(stats[0].avgRating * 10) / 10,
         ratingCount: stats[0].totalReviews
       });
       ```
     - Notify seller via `D9: notifications`.
   - `editReview(buyerId, reviewId, rating, comment)` (8.2):
     - Verify `review.buyerId.equals(buyerId)`.
     - Verify `new Date() <= review.editExpiresAt` (48-hour window). If expired, throw `ForbiddenError` (403, `EDIT_WINDOW_EXPIRED`).
     - Update review and recalculate seller score atomically.
   - `replyToReview(sellerId, reviewId, comment)` (8.3):
     - Verify `review.sellerId.equals(sellerId)`.
     - Verify within 7 days of review creation. If expired, throw `ForbiddenError` (403, `SELLER_REPLY_WINDOW_EXPIRED`).
     - Update `sellerReply = { comment, repliedAt: new Date() }`.
   - `getSellerReviews(sellerId, pagination)` (8.4): Return public verified reviews and aggregate distribution.
   - `reportReview(userId, reviewId, reason)` (8.5): Queue review for moderator review.
2. In `backend/src/modules/reviews/review.controller.ts` & `review.routes.ts`:
   - Mount routes:
     - `POST /api/v1/reviews/:listingId` (8.1)
     - `PATCH /api/v1/reviews/:id` (8.2)
     - `POST /api/v1/reviews/:id/reply` (8.3)
     - `GET /api/v1/reviews/seller/:sellerId` (8.4)
     - `POST /api/v1/reviews/:id/report` (8.5)
```

---

### PHASE 9: B2C Merchant Storefronts & Subscriptions (P-6.0 / Module 8)

#### Prompt 9.1: Commercial Storefronts, Verification & 5-Day Grace Period Engine (Endpoints 9.1 – 9.4)
```text
Role: Senior Enterprise Architect
Task: Implement B2C merchant storefront onboarding, unique slug reservation, trade license verification, tiered listing quotas, and 5-day grace period enforcement.
Reference Specs:
- PRD.md: FR-8 (B2C Merchant Storefronts)
- api-spec.md: Endpoints 9.1, 9.2, 9.3, 9.4
- database.md: Storefronts schema & indexes

Instructions:
1. In `backend/src/modules/storefronts/storefront.service.ts`:
   - `registerStorefront(merchantId, data)` (9.1):
     - Verify `merchant.isNidVerified === true`.
     - Verify merchant does not already have an active storefront.
     - Validate unique `storeSlug` (alphanumeric with hyphens, lowercase).
     - Save storefront with `status: ACTIVE`, `tier: BASIC`, `quotaLimit: 100`, `subscriptionExpiresAt: now + 30 days`, `gracePeriodExpiresAt: now + 35 days`.
     - Upgrade user role to `merchant`.
   - `getStorefrontBySlug(slug)` (9.2):
     - Fetch storefront by slug, populate merchant details, and return active storefront listings.
   - `updateStorefrontProfile(merchantId, updateData)` (9.3): Update logo, banner, tagline, address.
   - `getMerchantAnalytics(merchantId)` (9.4): Return total active listings, total views, total leads, conversion rate.
2. In `backend/src/modules/storefronts/storefront.controller.ts` & `storefront.routes.ts`:
   - Mount routes:
     - `POST /api/v1/storefronts` (9.1)
     - `GET /api/v1/storefronts/:slug` (9.2)
     - `PATCH /api/v1/storefronts/me` (9.3)
     - `GET /api/v1/storefronts/me/analytics` (9.4)
```

---

### PHASE 10: Monetization, Boosts & MFS Payment Gateway (P-6.0 / Module 9)

#### Prompt 10.1: bKash/Nagad Payment Checkout & Webhook Signature Verification (Endpoints 10.1 – 10.4)
```text
Role: Senior FinTech & Payment Gateway Architect
Task: Implement MFS checkout initialization, idempotent payment recording, HMAC-SHA256 signature verification, and atomic listing boost activation.
Reference Specs:
- PRD.md: FR-9 (Monetization & MFS Integration)
- api-spec.md: Endpoints 10.1, 10.2, 10.3, 10.4
- dfd.md: Process P-6.0 & DF-23, DF-24, DF-25, DF-26

Instructions:
1. In `backend/src/modules/boosts/payment.service.ts`:
   - `initiateCheckout(userId, targetType, targetId, boostType, gateway, customerMsisdn)` (10.1):
     - Validate `boostType` pricing:
       - `TOP_AD_3D`: 249 BDT, `TOP_AD_7D`: 499 BDT, `TOP_AD_15D`: 899 BDT, `BUMP_UP`: 99 BDT.
     - Verify target listing belongs to `userId`.
     - Generate unique `transactionRef = "TXN_" + gateway + "_" + Date.now() + "_" + crypto.randomInt(1000, 9999)`.
     - Save payment record in `D7: payments` with `status: INITIATED`.
     - Call upstream MFS Gateway API (bKash Tokenized Checkout / Nagad / SSLCommerz) to obtain payment gateway redirect URL.
     - Return `{ paymentId, transactionRef, amount, gatewayPaymentUrl }`.
   - `handleMfsWebhook(payload, signatureHeader)` (10.2):
     - Security Check: Verify `signatureHeader` matches `crypto.createHmac("sha256", env.MFS_WEBHOOK_SECRET).update(JSON.stringify(payload)).digest("hex")`. If mismatch, throw `UnauthorizedError` (401, `INVALID_WEBHOOK_SIGNATURE`).
     - Idempotency Check: Fetch payment record by `transactionRef`. If `payment.status === "PAID"`, return `{ acknowledged: true, alreadyProcessed: true }`.
     - Execute Atomic MongoDB Transaction:
       1. Update payment status to `PAID`, record `gatewayTransactionId` and `paidAt`.
       2. Update target listing:
          - If `boostType` is `TOP_AD_*`: Set `boost.isTopAd = true`, `boost.topAdExpiresAt = now + durationDays`.
          - If `boostType` is `BUMP_UP`: Set `boost.isBumped = true`, `boost.bumpedAt = new Date()`.
       3. Write immutable audit log record in `D8: audit_logs` (DF-07).
       4. Push success notification to seller via `D9: notifications`.
     - Return `{ success: true, boostActivated: true }`.
   - `getPaymentHistory(userId, filters, pagination)` (10.3): Return user's payment records.
   - `getPaymentStatus(userId, paymentId)` (10.4): Query specific payment status for checkout redirect polling.
2. In `backend/src/modules/boosts/payment.controller.ts` & `payment.routes.ts`:
   - Mount routes:
     - `POST /api/v1/boosts/checkout` (10.1)
     - `POST /api/v1/payments/mfs-callback` (10.2)
     - `GET /api/v1/payments/history` (10.3)
     - `GET /api/v1/payments/:id/status` (10.4)
```

---

### PHASE 11: Trust, Safety, Moderation & Cryptographic WORM Audit (P-7.0 / Module 10)

#### Prompt 11.1: Abuse Reporting, Moderator Queue & Permanent Ban Enforcement (Endpoints 11.1 – 11.4)
```text
Role: Senior Trust & Safety Architect
Task: Implement abuse reporting, moderator ticket management, and permanent user/device ban enforcement with fraud ring isolation.
Reference Specs:
- PRD.md: FR-10 (Trust, Safety, Moderation & Audit)
- api-spec.md: Endpoints 11.1, 11.2, 11.3, 11.4
- dfd.md: Process P-7.0 & DF-27, DF-28

Instructions:
1. In `backend/src/modules/moderation/moderation.service.ts`:
   - `submitReport(reporterId, targetType, targetId, reason, description, evidenceChatRoomId)` (11.1):
     - Validate reporter is not reporting themselves.
     - Rate-limit: Max 5 reports per 10 minutes per user.
     - Save report ticket, assign unique `ticketNumber`.
     - Return ticket confirmation.
   - `getModerationQueue(filters, pagination)` (11.2): Allow moderators to filter reports by status (`SUBMITTED`, `UNDER_REVIEW`, `RESOLVED`), target type, and urgency.
   - `resolveReport(moderatorId, reportId, verdict, action, resolutionNotes)` (11.3):
     - Update report record with verdict and moderator notes.
     - Apply action (`SUSPEND_LISTING`, `DELETE_REVIEW`, `BAN_USER`).
     - Write audit log entry.
   - `banUserAndDevices(adminId, targetUserId, reason, blacklistDevices, blacklistNid)` (11.4):
     - Atomically update user: `accountStatus = BANNED`, revoke all active refresh tokens in Redis.
     - If `suspendAllListings`: Mark all listings of `targetUserId` as `SUSPENDED`.
     - If `blacklistDevices`: Extract all `deviceFingerprintHash` from user's `boundDevices` and insert into `blacklisted_devices`.
     - If `blacklistNid`: Flag user's `nidHashSha256` in permanent blacklist registry.
     - Write immutable WORM audit log (DF-28).
2. In `backend/src/modules/moderation/moderation.controller.ts` & `moderation.routes.ts`:
   - Mount routes:
     - `POST /api/v1/reports` (11.1)
     - `GET /api/v1/admin/moderation/queue` (11.2)
     - `POST /api/v1/admin/moderation/resolve-report/:reportId` (11.3)
     - `POST /api/v1/admin/moderation/ban-user` (11.4)
```

#### Prompt 11.2: Cryptographic WORM Audit Hash Chain & Judicial Warrant Export (Endpoints 11.5 – 11.6)
```text
Role: Cryptography & Legal Compliance Engineer
Task: Implement cryptographic SHA-256 hash chaining on audit logs, warrant-based data export, and chain integrity verification algorithm.
Reference Specs:
- PRD.md: FR-10 (WORM Audit Trail & Legal Export)
- api-spec.md: Endpoints 11.5, 11.6
- dfd.md: DF-29, DF-30

Instructions:
1. In `backend/src/modules/moderation/wormAudit.service.ts`:
   - `writeAuditLog(actorUserId, actorRole, action, entityType, entityId, payload, req)`:
     - Fetch the latest audit log entry to get its `currentHash`. (If genesis block, use SHA-256 of "BUYSELL_BD_GENESIS_BLOCK").
     - Compute new SHA-256 hash:
       ```typescript
       const hashPayload = previousHash + traceId + actorUserId + action + entityType + entityId + JSON.stringify(payload) + timestamp;
       const currentHash = crypto.createHash("sha256").update(hashPayload).digest("hex");
       ```
     - Insert document with `previousHash` and `currentHash`.
   - `exportJudicialWarrantData(legalOfficerId, warrantId, issuingAuthority, targetMobileNumber, dateRange)` (11.5):
     - Verify legal officer permissions (`role: legal_officer` or `role: admin`).
     - Decrypt user's CSFLE NID data.
     - Gather all transactions, offers, chats, and audit logs matching target user within date range.
     - Compute SHA-256 signature of export bundle.
     - Write audit record for legal warrant query.
     - Return encrypted export bundle download metadata.
   - `verifyAuditChainIntegrity(fromBlockDate, toBlockDate)` (11.6):
     - Iterate sequentially through audit logs ordered by `createdAt: 1`.
     - Recompute hash of each block and verify `entry.previousHash === previousEntry.currentHash`.
     - Return `{ isChainValid: boolean, totalRecordsScanned, brokenLinkAt: string | null }`.
2. In `backend/src/modules/moderation/legal.controller.ts` & `legal.routes.ts`:
   - Mount routes:
     - `POST /api/v1/legal/audit/export` (11.5)
     - `POST /api/v1/legal/audit/verify-chain` (11.6)
```

---

### PHASE 12: Notification Center & Push Service (Module 11)

#### Prompt 12.1: In-App Notifications & Firebase Cloud Messaging (FCM) Push Service (Endpoints 12.1 – 12.4)
```text
Role: Senior Mobile & Web Push Engineer
Task: Implement notification persistence, unread tracking, batch read operations, and FCM push integration.
Reference Specs:
- PRD.md: FR-11 (Notification System)
- api-spec.md: Endpoints 12.1, 12.2, 12.3, 12.4
- database.md: Notifications schema & TTL

Instructions:
1. In `backend/src/modules/notifications/notification.service.ts`:
   - `createAndDispatchNotification(recipientId, type, title, body, entityType, entityId)`:
     - Save notification in `D9: notifications`.
     - Dispatch real-time event to connected user via Socket.io `user:{recipientId}` room.
     - If user has registered FCM push token, send mobile push notification via Firebase Admin SDK.
   - `getNotifications(userId, isReadFilter, pagination)` (12.1): Return user's notifications and current `unreadCount`.
   - `markAsRead(userId, notificationId)` (12.2): Mark single notification as read.
   - `markAllAsRead(userId)` (12.3): Atomically mark all unread notifications for `userId` as read.
   - `registerFcmToken(userId, fcmToken, devicePlatform)` (12.4): Store or update user's FCM push token in user document.
2. In `backend/src/modules/notifications/notification.controller.ts` & `notification.routes.ts`:
   - Mount routes:
     - `GET /api/v1/notifications` (12.1)
     - `PATCH /api/v1/notifications/:id/read` (12.2)
     - `POST /api/v1/notifications/read-all` (12.3)
     - `POST /api/v1/notifications/register-fcm` (12.4)
```

---

### PHASE 13: Background Schedulers & BullMQ Workers (Async Jobs)

#### Prompt 13.1: BullMQ Queues, Cron Schedulers & Expiry Cleanup Workers
```text
Role: Systems & Infrastructure Engineer
Task: Implement BullMQ queues and recurring background workers for automated listing expirations, boost resets, and storefront grace periods.
Reference Specs:
- architecture.md: Section 4.3 (Event-Driven & Background Workers) & BullMQ integration
- PRD.md: System SLAs & Expiration Policies

Instructions:
1. In `backend/src/core/queues/queue.service.ts`:
   - Initialize Redis-backed BullMQ queues: `mediaProcessingQueue`, `notificationQueue`, `scheduledCleanupQueue`.
2. In `backend/src/workers/`:
   - `listingExpiryWorker.ts`: Run daily cron at midnight:
     - Find listings where `status === "ACTIVE"` and `expiresAt < now`.
     - Transition to `status: "EXPIRED"`.
     - Push notification to seller reminding them to renew.
   - `boostExpiryWorker.ts`: Run hourly cron:
     - Find listings where `boost.isTopAd === true` and `boost.topAdExpiresAt < now`.
     - Reset `boost.isTopAd = false`.
   - `storefrontGracePeriodWorker.ts`: Run daily cron:
     - Check storefronts where `subscriptionExpiresAt < now` and `now < gracePeriodExpiresAt`: Dispatch renewal warning notification.
     - Check storefronts where `gracePeriodExpiresAt < now`: Transition to `status: "EXPIRED"`.
   - `quotaResetWorker.ts`: Run daily at 00:00 UTC: Reset `dailyAdCount = 0` on `users` collection.
```

---

### PHASE 14: Next.js 14 Frontend Implementation (App Router + Tailwind CSS)

#### Prompt 14.1: Design Tokens, Global Layout & Auth Context (Screen Flow 1 & Layout)
```text
Role: Principal Frontend Architect
Task: Set up Next.js 14 App Router layout, Tailwind CSS design system tokens, TanStack Query, and Auth Context.
Reference Specs:
- ui-ux.md: Section 2 (Design System & Color Tokens), Section 3 (Global Layout Wireframe), Screen Flow 1 (Auth)
- PRD.md: Non-Functional UI Requirements

Instructions:
1. In `frontend/tailwind.config.ts`:
   - Configure colors:
     - `brand-primary`: `#006A4E` (Bangladesh Bottle Green)
     - `brand-red`: `#F42A41` (National Crimson Red)
     - `brand-accent`: `#FFB800` (Gold / Top Ad Badge)
     - `verified-blue`: `#1DA1F2` (Blue Shield KYC Badge)
     - `dark-slate`: `#1E293B`, `bg-light`: `#F8FAFC`
2. In `frontend/src/`:
   - Create `components/layout/Header.tsx`: Responsive navigation bar, logo, Location Selector Modal, Search Bar, "Post Ad" button, and User Profile / Auth trigger.
   - Create `components/layout/Footer.tsx`: Trust & safety tips, category links, legal links, copyright notice.
   - Create `components/ui/VerifiedBadge.tsx`: Displays the verified blue shield badge with tooltip ("NID Verified Seller").
   - Create `context/AuthContext.tsx`: Manages user state, access token refresh, login modal state, and device fingerprint generation.
   - Create `components/auth/LoginModal.tsx` (Screen Flow 1):
     - Step 1: 11-digit Bangladeshi mobile number input (`017...`) with carrier validation.
     - Step 2: 6-digit OTP input boxes with 3-minute countdown timer and resend button.
     - On verification: Store JWT, close modal, update AuthContext.
```

#### Prompt 14.2: e-KYC Verification Flow (Screen Flow 2)
```text
Role: Senior Frontend Engineer
Task: Implement interactive step-by-step e-KYC upload wizard with NID camera capture and 3D liveness match.
Reference Specs:
- ui-ux.md: Screen Flow 2 (e-KYC Verification Wizard)
- api-spec.md: Module 2 (Endpoints 3.1, 3.2, 3.3)

Instructions:
1. In `frontend/src/app/kyc/page.tsx` & `components/kyc/`:
   - Step 1: Front and back NID photo capture/upload with client-side image compression.
   - Step 2: Real-time camera selfie capture with liveness indicator.
   - Step 3: Submission & instant verification status animation (Blue Shield unlocked).
   - Display pending manual review notification if confidence score is between 70% and 94%.
```

#### Prompt 14.3: Home Catalog, Division Grid & Multi-Parametric Search (Screen Flows 3 & 4)
```text
Role: Frontend Lead
Task: Implement the Home Page catalog, Category Browser, and Multi-Parametric Search with Geo Filtering.
Reference Specs:
- ui-ux.md: Screen Flow 3 (Home & Geo Discovery), Screen Flow 4 (Search)
- api-spec.md: Module 4 (Endpoint 5.2)

Instructions:
1. In `frontend/src/app/page.tsx` (Screen Flow 3):
   - Hero banner with quick division selector (Dhaka, Chittagong, Sylhet, Rajshahi, Khulna, Barishal, Rangpur, Mymensingh).
   - Grid of 12 top categories with custom icons.
   - "Featured Top Ads" carousel showcasing boosted listings with gold badges.
   - Recent verified listings grid with price, location, condition, and blue shield seller badge.
2. In `frontend/src/app/search/page.tsx` (Screen Flow 4):
   - Left sidebar filters: Category accordion, Division -> District -> Thana hierarchy dropdowns, Price slider, Condition checkboxes (Brand New, Used, etc.), Verified Sellers Only toggle.
   - Main content: Sorting dropdown (Price Low-High, High-Low, Most Recent), Paginated listing cards, Active filter chips.
```

#### Prompt 14.4: Listing Detail Page & Multi-Step Post Ad Wizard (Screen Flows 5 & 6)
```text
Role: Senior Frontend Engineer
Task: Implement the Listing Detail page with image gallery, seller safety card, offer button, and the Multi-Step "Post Ad" wizard.
Reference Specs:
- ui-ux.md: Screen Flow 5 (Listing Details), Screen Flow 6 (Post Ad)
- api-spec.md: Module 4 & 5 (Endpoints 5.1, 5.3)

Instructions:
1. In `frontend/src/app/listings/[id]/page.tsx` (Screen Flow 5):
   - Multi-image zoomable carousel with watermark overlay.
   - Price tag, negotiable badge, title, detailed description, specification table.
   - Seller Profile Card: Avatar, Name, NID Verified Blue Shield, Rating stars, Member duration, Safety tip warning banner.
   - Action Buttons: "Chat with Seller", "Make an Offer", "Call Seller (Masked)".
2. In `frontend/src/app/post-ad/page.tsx` (Screen Flow 6):
   - Step 1: Category selection.
   - Step 2: Details (Title, Description, Condition, Price, Negotiable toggle).
   - Step 3: Location selector (Division, District, Thana).
   - Step 4: Multi-image uploader (drag & drop up to 10 images, set primary image).
   - Step 5: Optional boost promotion selector (`TOP_AD_7D`, `BUMP_UP`).
   - Quota check guard: Warn if user has reached daily 30-ad limit.
```

#### Prompt 14.5: Real-Time Chat & Binding Offer Widget (Screen Flow 7)
```text
Role: Real-Time Frontend Engineer
Task: Implement WebSocket-connected chat interface with scam alert banners and interactive offer cards.
Reference Specs:
- ui-ux.md: Screen Flow 7 (Chat & Negotiation)
- api-spec.md: Modules 5 & 6 (Endpoints 6.1 – 6.5, 7.1 – 7.6 + WS)

Instructions:
1. In `frontend/src/app/chat/[roomId]/page.tsx` & `components/chat/`:
   - Top bar: Listing thumbnail, title, price, seller name, call button.
   - Active Offer Card Pin: Displays current offer status (`PENDING`, `ACCEPTED`), agreed price, and accept/counter buttons for seller.
   - Chat Message List: Real-time scrolling message feed with sent/received bubbles.
   - High-Risk Scam Alert Banner: Renders flashing warning if anti-scam regex triggered ("Do not send advance bKash money!").
   - Bottom input: Text input, image attachment button, "Make an Offer" modal trigger.
```

#### Prompt 14.6: Merchant Storefront, Boost Checkout & Moderator Dashboard (Screen Flows 8, 9, 10)
```text
Role: Full-Stack Engineer
Task: Implement the Merchant Storefront landing page, bKash checkout redirect screen, and Admin Moderation portal.
Reference Specs:
- ui-ux.md: Screen Flow 8 (Storefront), Screen Flow 9 (Boosts), Screen Flow 10 (Moderation)
- api-spec.md: Modules 8, 9, 10

Instructions:
1. In `frontend/src/app/shop/[slug]/page.tsx` (Screen Flow 8): Merchant banner, verified badge, catalog grid, business info.
2. In `frontend/src/app/checkout/[paymentId]/page.tsx` (Screen Flow 9): MFS payment selection (bKash/Nagad), summary, redirect handler.
3. In `frontend/src/app/admin/moderation/page.tsx` (Screen Flow 10): Moderation ticket queue, report review modal, suspend listing, and ban user actions.
```

---

### PHASE 15: Quality Assurance, Integration Testing & Security Audit

#### Prompt 15.1: Automated Supertest Integration Suite (All 11 Modules)
```text
Role: Lead QA & Automation Engineer
Task: Write Jest/Supertest integration tests covering the complete transactional journey of the BuySell BD platform.
Reference Specs:
- All 11 Modules in api-spec.md (All 59 Endpoints)

Instructions:
1. Create `backend/tests/integration/`:
   - `auth_kyc.test.ts`: Test OTP request -> OTP verify -> NID submission -> Liveness clearance -> Blue Shield badge.
   - `listing_quota.test.ts`: Test posting ad, verify 30-ad rolling limit rejection on 31st post.
   - `offer_atomic.test.ts`: Create 2 competing offers, accept one, verify competing offer is atomically `VOIDED` and listing status is `HOLD`.
   - `chat_scam_filter.test.ts`: Send message containing "bKash advance delivery fee", verify `isScamFlagged: true` and warning injected.
   - `payment_mfs_ipn.test.ts`: Send mock MFS webhook with valid HMAC-SHA256 signature, verify boost activation. Test invalid signature rejection.
   - `worm_audit_chain.test.ts`: Verify SHA-256 hash continuity across consecutive mutations.
```

#### Prompt 15.2: Security Hardening & Zero-Defect Production Checklist
```text
Role: DevSecOps Engineer
Task: Execute security hardening and verify production checklist.
Instructions:
1. Run `npm audit` and resolve all high/critical vulnerabilities.
2. Confirm all CORS rules restrict origins to `FRONTEND_URL`.
3. Confirm rate limiting is enforced on Auth, Listings, Reports, and Payments.
4. Verify all database queries use indexes and no unindexed collection scans occur.
```

---

## 5. Execution Protocol for Zero-Defect Code Generation

When prompting Antigravity or any AI assistant with these prompts:
1. **Never combine multiple phases into a single prompt.** Run Phase 0 first, test it, then proceed to Phase 1.
2. **Always include the referenced specs in the prompt** so the assistant retains full context of schemas and endpoints.
3. **Require full, non-truncated code files.** Reject placeholders like `// TODO: implement remaining methods`.
4. **Run the Verification Command** immediately after each step to guarantee 100% operational success before moving forward.
