# Database Schema Specification (`schema-database.md`)
## Next-Gen Verified C2C & B2C Marketplace Platform (Bangladesh)

| Document Attribute | Specification |
| :--- | :--- |
| **Document Version** | 1.0.0 (Master Schema Specification) |
| **Database Engine** | MongoDB Atlas (Enterprise Managed Replica Set, 1 Primary + 2 Secondaries, M10+ Tier) |
| **ODM / Driver** | Mongoose v8+ with TypeScript / Native MongoDB Node.js Driver v6+ |
| **Encryption Standard** | Client-Side Field Level Encryption (CSFLE / In-Use Encryption with AWS/GCP KMS) |
| **Primary Reference Documents** | `PRD.md` (v1.1.0+), `architecture.md` (v2.0.0), `dfd.md` (v1.0.1), `database.md` (v2.0.0), `erd.md` (v1.0.0) |
| **Scope of Document** | Complete Compilation of all Domain Interfaces, Engine `$jsonSchema` Validators, and Production Mongoose Models |

---

## 1. Schema Architecture & Layering Strategy

This document provides a centralized, authoritative compilation of all schemas across the three critical layers of the platform's data tier:

```
+-------------------------------------------------------------------------------+
|  LAYER 1: DOMAIN ENTITY INTERFACES (TypeScript Type System)                   |
|  - Strictly typed DTOs & Domain Models used across Services & Controllers     |
+-------------------------------------------------------------------------------+
                                      │
                                      ▼
+-------------------------------------------------------------------------------+
|  LAYER 2: APPLICATION ODM SCHEMAS (Mongoose v8 Models)                        |
|  - TypeScript Mongoose Schemas, Compound Indexes, Hooks, TTL & Virtuals       |
+-------------------------------------------------------------------------------+
                                      │
                                      ▼
+-------------------------------------------------------------------------------+
|  LAYER 3: DATABASE ENGINE VALIDATION (MongoDB Atlas $jsonSchema)              |
|  - Native JSON Schema validation enforced at the storage engine level         |
+-------------------------------------------------------------------------------+
```

---

## 2. Master Collection Directory

| # | Collection Name | DFD Store | Domain / Module | Primary Key / Index | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `users` | `D1` | Identity, Auth & KYC | `_id` / `{ mobileNumber: 1 }` (UK) | User profiles, auth lockout, e-KYC NID, devices, 30 ads/24h quota. |
| **2** | `listings` | `D2` | Classifieds Catalog | `_id` / `{ division: 1, _id: 1 }` | 100% free ads, categories, specs, WebP images, boost states, 30d TTL. |
| **3** | `offers` | `D3` | Negotiation Engine | `_id` / `{ listingId: 1, buyerId: 1 }` | Formal binding price proposals, counter-bids, 24h expiration TTL. |
| **4** | `chats` | `D4` | Real-Time Messaging | `_id` / `{ roomId: 1 }` (UK) | Chat room metadata, unread counters, agreed price, proxy call logs. |
| **5** | `messages` | `D4` | Message Streams | `_id` / `{ chatId: 1, sentAt: -1 }` | Message packets, text/media, regex anti-scam flag, 180d retention TTL. |
| **6** | `reviews` | `D5` | Trust & Reputation | `_id` / `{ listingId: 1, buyerId: 1 }` (UK) | Verified buyer 1-5 star ratings, comments, seller 7-day reply window. |
| **7** | `storefronts` | `D6` | B2C Merchant Spaces | `_id` / `{ storeSlug: 1 }` (UK) | Commercial merchant branded portal, subscription tier, trade license. |
| **8** | `boosts_payments` | `D7` | Monetization & MFS | `_id` / `{ gatewayTransactionId: 1 }` (UK) | bKash/Nagad/SSLCommerz payments for Top Ad, Bump Up & Storefront tiers. |
| **9** | `audit_logs` | `D8` | WORM Compliance Trail | `_id` / `{ timestamp: 1, _id: 1 }` | Append-only, tamper-proof WORM audit trail with SHA-256 hash chaining. |
| **10** | `notifications` | `D9` | Push & In-App Alerts | `_id` / `{ recipientId: 1, isRead: 1 }`| Asynchronous alerts, FCM push, deep-link navigation, 60d TTL purge. |
| **11** | `reports` | `P-7.0` | Abuse & Fraud Queue | `_id` / `{ targetId: 1, status: 1 }` | User complaints, flagged scam ads, evidence chat logs, admin resolution. |

---


## 3. Domain Entity Interface Schemas (TypeScript Data Models)

### 3.1 Collection: `users` (`D1`)
Represents registered platform actors (Buyers, Sellers, Merchants, Admins, Moderators, and Legal Officers).

```typescript
interface IUserDevice {
  deviceId: string;          // Hardware client fingerprint SHA-256
  deviceName: string;        // e.g., "Samsung Galaxy S23", "Chrome on macOS"
  platform: 'web_desktop' | 'web_mobile' | 'android_native' | 'ios_native';
  fcmToken?: string;         // Firebase Cloud Messaging push token
  ipAddress: string;         // Client IP address
  lastActiveAt: Date;
}

interface IUserKYC {
  nidNumberEncrypted?: string;    // CSFLE Deterministic AES-256-CBC
  nidHashSha256?: string;         // Indexed blind-index hash for uniqueness check
  nidType?: 'SMART' | 'PLASTIC';  // Supports both Smart NID and Old Plastic Laminated NID
  dob?: Date;
  extractedLegalName?: string;
  livenessConfidenceScore?: number; // 0 to 100
  nidFrontImageUrl?: string;      // S3/R2 encrypted private bucket path
  nidBackImageUrl?: string;
  selfieVideoUrl?: string;
  verifiedAt?: Date;
  manualVerifiedBy?: ObjectId;    // Reference to Admin/Moderator if routed to manual queue
  rejectionReason?: string;       // Recorded if e-KYC is rejected
}

interface IUserQuota {
  dailyAdsPostedCount: number;    // Counter: Max 30 free ads per 24-hour rolling window
  quotaWindowStartsAt: Date;      // Timestamp when current 24-hour window commenced
}

interface IUserPrivacySettings {
  isPhoneVisible: boolean;        // Default: false (Privacy-first; masked calling preferred)
  allowProxyCalls: boolean;       // Default: true (Enables virtual telephony bridge)
}

interface IUser {
  _id: ObjectId;
  mobileNumber: string;           // Unique 11-digit Bangladesh MSISDN (^01[3-9]\d{8}$)
  passwordHash: string;           // Argon2id / bcrypt salted hash
  role: 'buyer' | 'seller' | 'merchant' | 'moderator' | 'admin' | 'legal_officer';
  accountStatus: 'UNVERIFIED' | 'VERIFIED' | 'SUSPENDED' | 'BANNED';
  isNidVerified: boolean;         // Gatekeeper for ad creation & buyer contact
  displayName: string;
  avatarUrl?: string;
  location?: {
    division: string;
    district: string;
    thana: string;
    addressLine?: string;
  };
  kyc: IUserKYC;
  devices: IUserDevice[];         // Max 3 concurrent device bindings
  authLockout: {
    failedOtpAttempts: number;    // Counter reset on success
    lockoutUntil?: Date;          // 30 min lockout triggered at 5 failed attempts
  };
  quota: IUserQuota;              // Enforces 30 free ads / 24h invariant
  privacySettings: IUserPrivacySettings;
  stats: {
    ratingAverage: number;        // Float 0.0 to 5.0
    ratingCount: number;          // Total verified buyer reviews
    totalListingsCreated: number;
    activeListingsCount: number;
    totalDealsCompleted: number;
    responseRatePercent: number;  // Chat response timeliness metric
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 Collection: `listings` (`D2`)
Represents 100% free ad classifieds and optional boosted promotions.

```typescript
interface IListingImage {
  originalUrl: string;
  watermarkedUrl: string;       // Anti-scraping branded WebP
  thumbnailUrl: string;         // 200x200 optimized card view
  pHash: string;                // Perceptual image hash to detect duplicate ad spam
  isNsfwSafe: boolean;
  moderationScore: number;
}

interface IListingBoost {
  isTopAd: boolean;
  topAdExpiresAt?: Date;
  isBumped: boolean;
  lastBumpedAt?: Date;
  isFeatured: boolean;
  featuredExpiresAt?: Date;
  activeBoostId?: ObjectId;     // Reference to boosts_payments
}

interface IListingSoftDelete {
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: ObjectId;
  deletionReason?: string;
}

interface IListing {
  _id: ObjectId;
  sellerId: ObjectId;           // Reference to users._id
  storefrontId?: ObjectId;      // Optional reference to storefronts._id (B2C)
  title: string;                // 10 to 100 characters sanitized text
  description: string;          // 20 to 2000 characters
  category: 'Electronics' | 'Vehicles' | 'Property' | 'Home_Living' | 'Jobs_Services' | 'Fashion_Hobby';
  subCategory: string;
  attributes: Map<string, any>; // Dynamic specs (e.g. ram: "8GB", mileage: "25000km")
  condition: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR';
  price: number;                // Currency: BDT, positive decimal
  isNegotiable: boolean;
  isFreeAd: boolean;            // Invariant: true by default (100% free ad model)
  location: {
    division: string;
    district: string;
    thana: string;
    geoPoint?: {
      type: 'Point';
      coordinates: [number, number]; // [longitude, latitude]
    };
  };
  images: IListingImage[];      // Min 1, Max 10 images
  status: 'ACTIVE' | 'BOOSTED' | 'SOLD' | 'EXPIRED' | 'ARCHIVED' | 'SUSPENDED';
  viewCount: number;
  favoriteCount: number;
  chatInitiationCount: number;
  boost: IListingBoost;
  softDelete: IListingSoftDelete; // 90-day retention prior to permanent purge
  publishedAt: Date;
  expiresAt: Date;              // TTL Auto-expiry (publishedAt + 30 days)
  soldAt?: Date;
  renewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.3 Collection: `offers` (`D3`)
Represents formal, binding purchase bids placed by buyers inside the negotiation channel.

```typescript
interface IOffer {
  _id: ObjectId;
  listingId: ObjectId;          // Reference to listings._id
  buyerId: ObjectId;            // Reference to users._id
  sellerId: ObjectId;           // Reference to users._id
  chatRoomId: ObjectId;         // Reference to chats._id
  offeredPrice: number;         // BDT price proposal <= listing price
  counterPrice?: number;        // Counter-bid price proposed by seller
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COUNTERED' | 'EXPIRED' | 'VOIDED' | 'WITHDRAWN';
  message?: string;             // Optional buyer note (max 200 chars)
  expiresAt: Date;              // 24-hour expiration window
  acceptedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.4 Collection: `chats` & `messages` (`D4`)
Separated into room aggregates (`chats`) and high-volume message packets (`messages`).

```typescript
interface ITelephonyBridgeLog {
  callSessionId: string;
  initiatedBy: ObjectId;
  startedAt: Date;
  durationSeconds: number;
  callStatus: 'COMPLETED' | 'MISSED' | 'FAILED';
}

interface IChat {
  _id: ObjectId;
  roomId: string;               // Unique composite: `${listingId}_${buyerId}`
  listingId: ObjectId;          // Reference to listings._id
  sellerId: ObjectId;           // Reference to users._id
  buyerId: ObjectId;            // Reference to users._id
  participants: ObjectId[];     // [buyerId, sellerId]
  lastMessage?: {
    senderId: ObjectId;
    content: string;
    type: 'TEXT' | 'IMAGE' | 'OFFER' | 'MEETUP_PIN' | 'SYSTEM';
    sentAt: Date;
  };
  unreadCounts: {
    [userId: string]: number;   // Keyed by ObjectId string
  };
  activeOfferId?: ObjectId;     // Current pending or accepted offer reference
  agreedPrice?: number;         // Set when offer accepted
  telephonyLogs: ITelephonyBridgeLog[]; // Masked proxy call history
  isArchivedBy: ObjectId[];     // Soft archive toggles
  isBlocked: boolean;
  blockedBy?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface IMessage {
  _id: ObjectId;
  chatId: ObjectId;             // Reference to chats._id
  roomId: string;               // Redundant partition key for fast lookup
  senderId: ObjectId;           // Reference to users._id
  senderRole: 'buyer' | 'seller' | 'system';
  type: 'TEXT' | 'IMAGE' | 'OFFER_EVENT' | 'MEETUP_PIN' | 'SYSTEM_WARNING';
  content: string;              // Text payload or system notice
  mediaUrl?: string;            // Cloudflare R2 media path
  geoPin?: {
    title: string;
    coordinates: [number, number]; // Proposed safe public exchange point
  };
  isFraudWarningTriggered: boolean; // Triggered by regex (e.g. bKash advance scam)
  readAt?: Date;
  sentAt: Date;
}
```

### 3.5 Collection: `reviews` (`D5`)
Represents post-transaction ratings enforcing a dual-party feedback loop.

```typescript
interface IReview {
  _id: ObjectId;
  listingId: ObjectId;          // Reference to listings._id
  buyerId: ObjectId;            // Reference to users._id (Reviewer)
  sellerId: ObjectId;           // Reference to users._id (Reviewee)
  offerId: ObjectId;            // Verifiable proof of deal completion (Reference to offers._id)
  rating: number;               // Integer 1 to 5
  comment: string;              // 10 to 500 characters
  sellerReply?: {
    comment: string;
    repliedAt: Date;            // Allowed only within 7 days of review creation
  };
  isReported: boolean;
  moderationStatus: 'APPROVED' | 'FLAGGED' | 'REMOVED';
  buyerEditableUntil: Date;     // 48-hour post-creation edit window
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.6 Collection: `storefronts` (`D6`)
Represents verified commercial B2C merchant profiles.

```typescript
interface IStorefront {
  _id: ObjectId;
  merchantId: ObjectId;         // Unique 1:1 reference to users._id
  storeSlug: string;            // Unique alphanumeric URL handle (e.g., "gadget-bd")
  brandName: string;
  tagline?: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  tradeLicenseNumber?: string;  // Commercial business compliance field
  tier: 'SILVER' | 'GOLD' | 'PLATINUM';
  contact: {
    officialPhone: string;
    officialEmail: string;
    physicalStoreAddress: string;
    websiteUrl?: string;
  };
  subscription: {
    status: 'TRIAL' | 'ACTIVE' | 'GRACE_PERIOD' | 'SUSPENDED' | 'CANCELLED';
    planId: string;
    renewsAt: Date;
    gracePeriodEndsAt?: Date;   // 5 days grace period on payment failure
    lastPaidInvoiceId?: ObjectId;
  };
  metrics: {
    totalListings: number;
    totalStorefrontViews: number;
    followerCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.7 Collection: `boosts_payments` (`D7`)
Financial transactions collection tracking ad promotions and merchant subscriptions via MFS.

```typescript
interface IBoostPayment {
  _id: ObjectId;
  userId: ObjectId;             // Buyer/Seller/Merchant making payment
  entityType: 'LISTING_BOOST' | 'MERCHANT_SUBSCRIPTION';
  listingId?: ObjectId;         // Populated if entityType === 'LISTING_BOOST'
  storefrontId?: ObjectId;      // Populated if entityType === 'MERCHANT_SUBSCRIPTION'
  boostType?: 'TOP_AD_3D' | 'TOP_AD_7D' | 'TOP_AD_15D' | 'BUMP_UP_7D' | 'FEATURED_30D';
  amount: number;               // In BDT decimal
  currency: 'BDT';
  paymentGateway: 'BKASH' | 'NAGAD' | 'ROCKET' | 'SSLCOMMERZ';
  gatewayTransactionId?: string; // MFS reference (e.g., "9K38DF781A")
  clientIp: string;
  paymentStatus: 'INITIATED' | 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  gatewayPayload?: Record<string, any>; // Raw webhook verification response
  signature: string;            // HMAC-SHA256 callback integrity signature
  paidAt?: Date;
  refundMetadata?: {
    refundedAt: Date;
    refundReason: string;
    proRataAmount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.8 Collection: `audit_logs` (`D8` - WORM Storage)
Cryptographically signed compliance audit logs. Write-Once, Read-Many (WORM).

```typescript
interface IAuditLog {
  _id: ObjectId;
  logId: string;                // UUIDv4
  timestamp: Date;              // ISO-8601 UTC
  action: 'USER_REGISTERED' | 'USER_VERIFIED' | 'USER_BANNED' | 'LISTING_CREATED' | 
          'LISTING_BANNED' | 'OFFER_ACCEPTED' | 'BOOST_PURCHASED' | 
          'LEGAL_HOLD_APPLIED' | 'WARRANT_DATA_EXPORTED';
  actorId: ObjectId;            // Reference to users._id or SYSTEM ObjectId
  actorRole: string;
  actorIp: string;
  entityType: 'USER' | 'LISTING' | 'OFFER' | 'PAYMENT' | 'KYC_RECORD';
  entityId: ObjectId;
  metadata: Record<string, any>;// Full snapshot of modified attributes
  prevHash: string;             // SHA-256 of preceding log entry
  sha256Signature: string;      // SHA-256(prevHash + logId + timestamp + action + metadata)
  isLegalHold: boolean;         // Prevents purging under legal warrant
}
```

### 3.9 Collection: `notifications` (`D9`)
Asynchronous multi-channel user alerts queue.

```typescript
interface INotification {
  _id: ObjectId;
  recipientId: ObjectId;        // Reference to users._id
  triggerType: 'OFFER_RECEIVED' | 'OFFER_ACCEPTED' | 'OFFER_DECLINED' | 
               'KYC_APPROVED' | 'KYC_REJECTED' | 'BOOST_ACTIVATED' | 
               'AD_EXPIRING_SOON' | 'AD_EXPIRED' | 'NEW_REVIEW' | 'SCAM_WARNING';
  title: string;
  body: string;
  deepLinkUri: string;          // e.g. "/listings/66c4f8a.../offers"
  isRead: boolean;
  readAt?: Date;
  channelDispatched: {
    inApp: boolean;
    fcmPush: boolean;
    smsFallback: boolean;
  };
  createdAt: Date;              // TTL Index 60 days
}
```

### 3.10 Collection: `reports`
Abuse tickets filed by users against listings or accounts.

```typescript
interface IReport {
  _id: ObjectId;
  reporterId: ObjectId;         // Reference to users._id
  targetType: 'LISTING' | 'USER';
  targetId: ObjectId;
  reason: 'FRAUD_SCAM' | 'OFFENSIVE_CONTENT' | 'DUPLICATE_SPAM' | 'PROHIBITED_GOODS' | 'HARASSMENT';
  description?: string;
  evidenceRoomId?: string;      // Reference to chat room if scam occurred in chat
  status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED_BANNED' | 'DISMISSED';
  resolvedBy?: ObjectId;        // Moderator ID
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

---

## 4. MongoDB Database Engine Validation Schemas (`$jsonSchema` Enforcement)

MongoDB Atlas enforces schema invariants at the database engine level via JSON Schema validation. This prevents malformed documents even if an application bug bypasses API DTO validations.

### 4.1 JSON Schema Validator: `listings` Collection

```javascript
db.createCollection("listings", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["sellerId", "title", "description", "category", "condition", "price", "location", "status", "publishedAt", "expiresAt"],
      properties: {
        sellerId: {
          bsonType: "objectId",
          description: "Must reference an existing user ObjectId"
        },
        title: {
          bsonType: "string",
          minLength: 10,
          maxLength: 100,
          description: "Listing title must be 10-100 characters"
        },
        description: {
          bsonType: "string",
          minLength: 20,
          maxLength: 2000,
          description: "Description must be 20-2000 characters"
        },
        category: {
          enum: ["Electronics", "Vehicles", "Property", "Home_Living", "Jobs_Services", "Fashion_Hobby"],
          description: "Must be a valid platform category"
        },
        condition: {
          enum: ["NEW", "LIKE_NEW", "GOOD", "FAIR"],
          description: "Must be a predefined item condition"
        },
        price: {
          bsonType: ["double", "int", "long", "decimal"],
          minimum: 0,
          description: "Price must be non-negative BDT amount"
        },
        isNegotiable: {
          bsonType: "bool"
        },
        isFreeAd: {
          bsonType: "bool",
          description: "Default true under 100% free ad model"
        },
        location: {
          bsonType: "object",
          required: ["division", "district", "thana"],
          properties: {
            division: { bsonType: "string" },
            district: { bsonType: "string" },
            thana: { bsonType: "string" },
            geoPoint: {
              bsonType: "object",
              required: ["type", "coordinates"],
              properties: {
                type: { enum: ["Point"] },
                coordinates: {
                  bsonType: "array",
                  minItems: 2,
                  maxItems: 2,
                  items: { bsonType: "double" }
                }
              }
            }
          }
        },
        status: {
          enum: ["ACTIVE", "BOOSTED", "SOLD", "EXPIRED", "ARCHIVED", "SUSPENDED"],
          description: "Valid listing lifecycle states"
        },
        images: {
          bsonType: "array",
          minItems: 1,
          maxItems: 10,
          description: "Listings must have 1 to 10 images"
        },
        publishedAt: { bsonType: "date" },
        expiresAt: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

### 4.2 JSON Schema Validator: `offers` Collection

```javascript
db.createCollection("offers", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["listingId", "buyerId", "sellerId", "chatRoomId", "offeredPrice", "status", "expiresAt"],
      properties: {
        listingId: { bsonType: "objectId" },
        buyerId: { bsonType: "objectId" },
        sellerId: { bsonType: "objectId" },
        chatRoomId: { bsonType: "objectId" },
        offeredPrice: {
          bsonType: ["double", "int", "long", "decimal"],
          minimum: 1,
          description: "Offered price must be a positive integer/decimal"
        },
        counterPrice: {
          bsonType: ["double", "int", "long", "decimal"],
          minimum: 1
        },
        status: {
          enum: ["PENDING", "ACCEPTED", "DECLINED", "COUNTERED", "EXPIRED", "VOIDED", "WITHDRAWN"]
        },
        expiresAt: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

### 4.3 JSON Schema Validator: `users` Collection

```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["mobileNumber", "passwordHash", "displayName", "role", "accountStatus", "isNidVerified"],
      properties: {
        mobileNumber: {
          bsonType: "string",
          pattern: "^01[3-9]\d{8}$",
          description: "Must be a valid 11-digit Bangladeshi mobile number starting with 013-019"
        },
        passwordHash: { bsonType: "string" },
        displayName: { bsonType: "string", minLength: 2, maxLength: 60 },
        role: {
          enum: ["buyer", "seller", "merchant", "moderator", "admin", "legal_officer"],
          description: "Must be an authorized system role"
        },
        accountStatus: {
          enum: ["UNVERIFIED", "VERIFIED", "SUSPENDED", "BANNED"],
          description: "Valid account lifecycle state"
        },
        isNidVerified: { bsonType: "bool" },
        devices: {
          bsonType: "array",
          maxItems: 3,
          description: "Maximum 3 concurrent device bindings allowed per user"
        }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

### 4.4 JSON Schema Validator: `reviews` Collection

```javascript
db.createCollection("reviews", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["listingId", "buyerId", "sellerId", "offerId", "rating", "comment", "buyerEditableUntil"],
      properties: {
        listingId: { bsonType: "objectId" },
        buyerId: { bsonType: "objectId" },
        sellerId: { bsonType: "objectId" },
        offerId: { bsonType: "objectId", description: "Verifiable accepted offer proof" },
        rating: {
          bsonType: ["int", "long"],
          minimum: 1,
          maximum: 5,
          description: "Rating must be integer between 1 and 5"
        },
        comment: { bsonType: "string", minLength: 10, maxLength: 500 },
        moderationStatus: {
          enum: ["APPROVED", "FLAGGED", "REMOVED"]
        },
        buyerEditableUntil: { bsonType: "date", description: "48 hours from creation" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

### 4.5 JSON Schema Validator: `boosts_payments` Collection

```javascript
db.createCollection("boosts_payments", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "entityType", "amount", "currency", "paymentGateway", "paymentStatus", "signature"],
      properties: {
        userId: { bsonType: "objectId" },
        entityType: { enum: ["LISTING_BOOST", "MERCHANT_SUBSCRIPTION"] },
        amount: { bsonType: ["double", "int", "decimal"], minimum: 0 },
        currency: { enum: ["BDT"] },
        paymentGateway: { enum: ["BKASH", "NAGAD", "ROCKET", "SSLCOMMERZ"] },
        paymentStatus: {
          enum: ["INITIATED", "PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED"]
        },
        signature: { bsonType: "string", description: "HMAC-SHA256 signature" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

### 4.6 JSON Schema Validator: `audit_logs` Collection (WORM Enforcement)

```javascript
db.createCollection("audit_logs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["logId", "timestamp", "action", "actorId", "entityType", "entityId", "prevHash", "sha256Signature", "isLegalHold"],
      properties: {
        logId: { bsonType: "string" },
        timestamp: { bsonType: "date" },
        action: {
          enum: [
            "USER_REGISTERED", "USER_VERIFIED", "USER_BANNED",
            "LISTING_CREATED", "LISTING_BANNED", "OFFER_ACCEPTED",
            "BOOST_PURCHASED", "LEGAL_HOLD_APPLIED", "WARRANT_DATA_EXPORTED"
          ]
        },
        actorId: { bsonType: "objectId" },
        entityType: { enum: ["USER", "LISTING", "OFFER", "PAYMENT", "KYC_RECORD"] },
        entityId: { bsonType: "objectId" },
        prevHash: { bsonType: "string" },
        sha256Signature: { bsonType: "string" },
        isLegalHold: { bsonType: "bool" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

---

### 4.7 JSON Schema Validator: `chats` Collection

```javascript
db.createCollection("chats", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["roomId", "listingId", "sellerId", "buyerId", "participants", "isBlocked"],
      properties: {
        roomId: { bsonType: "string", description: "Unique composite: listingId_buyerId" },
        listingId: { bsonType: "objectId" },
        sellerId: { bsonType: "objectId" },
        buyerId: { bsonType: "objectId" },
        participants: {
          bsonType: "array",
          minItems: 2,
          maxItems: 2,
          items: { bsonType: "objectId" },
          description: "Must contain exactly buyer and seller ObjectIds"
        },
        agreedPrice: { bsonType: ["double", "int", "decimal"], minimum: 1 },
        activeOfferId: { bsonType: "objectId" },
        isBlocked: { bsonType: "bool" },
        blockedBy: { bsonType: "objectId" },
        telephonyLogs: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["callSessionId", "initiatedBy", "startedAt", "durationSeconds", "callStatus"],
            properties: {
              callSessionId: { bsonType: "string" },
              initiatedBy: { bsonType: "objectId" },
              startedAt: { bsonType: "date" },
              durationSeconds: { bsonType: "int", minimum: 0 },
              callStatus: { enum: ["COMPLETED", "MISSED", "FAILED"] }
            }
          }
        }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

### 4.8 JSON Schema Validator: `messages` Collection

```javascript
db.createCollection("messages", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["chatId", "roomId", "senderId", "senderRole", "type", "content", "isFraudWarningTriggered", "sentAt"],
      properties: {
        chatId: { bsonType: "objectId" },
        roomId: { bsonType: "string" },
        senderId: { bsonType: "objectId" },
        senderRole: { enum: ["buyer", "seller", "system"] },
        type: { enum: ["TEXT", "IMAGE", "OFFER_EVENT", "MEETUP_PIN", "SYSTEM_WARNING"] },
        content: { bsonType: "string", minLength: 1, maxLength: 1000 },
        mediaUrl: { bsonType: "string" },
        geoPin: {
          bsonType: "object",
          required: ["title", "coordinates"],
          properties: {
            title: { bsonType: "string" },
            coordinates: {
              bsonType: "array",
              minItems: 2,
              maxItems: 2,
              items: { bsonType: "double" }
            }
          }
        },
        isFraudWarningTriggered: { bsonType: "bool" },
        sentAt: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

### 4.9 JSON Schema Validator: `storefronts` Collection

```javascript
db.createCollection("storefronts", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["merchantId", "storeSlug", "brandName", "description", "logoUrl", "bannerUrl", "tier", "contact", "subscription"],
      properties: {
        merchantId: { bsonType: "objectId", description: "1:1 unique binding with merchant user" },
        storeSlug: { bsonType: "string", pattern: "^[a-z0-9-]+$", description: "URL-friendly vanity slug" },
        brandName: { bsonType: "string", minLength: 2, maxLength: 100 },
        description: { bsonType: "string", minLength: 10, maxLength: 2000 },
        logoUrl: { bsonType: "string" },
        bannerUrl: { bsonType: "string" },
        tradeLicenseNumber: { bsonType: "string" },
        tier: { enum: ["SILVER", "GOLD", "PLATINUM"] },
        contact: {
          bsonType: "object",
          required: ["officialPhone", "officialEmail", "physicalStoreAddress"],
          properties: {
            officialPhone: { bsonType: "string", pattern: "^01[3-9]\\d{8}$" },
            officialEmail: { bsonType: "string" },
            physicalStoreAddress: { bsonType: "string" },
            websiteUrl: { bsonType: "string" }
          }
        },
        subscription: {
          bsonType: "object",
          required: ["status", "planId", "renewsAt"],
          properties: {
            status: { enum: ["TRIAL", "ACTIVE", "GRACE_PERIOD", "SUSPENDED", "CANCELLED"] },
            planId: { bsonType: "string" },
            renewsAt: { bsonType: "date" },
            gracePeriodEndsAt: { bsonType: "date" }
          }
        }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

### 4.10 JSON Schema Validator: `notifications` Collection

```javascript
db.createCollection("notifications", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["recipientId", "triggerType", "title", "body", "deepLinkUri", "isRead", "channelDispatched", "createdAt"],
      properties: {
        recipientId: { bsonType: "objectId" },
        triggerType: {
          enum: [
            "OFFER_RECEIVED", "OFFER_ACCEPTED", "OFFER_DECLINED",
            "KYC_APPROVED", "KYC_REJECTED", "BOOST_ACTIVATED",
            "AD_EXPIRING_SOON", "AD_EXPIRED", "NEW_REVIEW", "SCAM_WARNING"
          ]
        },
        title: { bsonType: "string", minLength: 2, maxLength: 120 },
        body: { bsonType: "string", minLength: 5, maxLength: 500 },
        deepLinkUri: { bsonType: "string" },
        isRead: { bsonType: "bool" },
        channelDispatched: {
          bsonType: "object",
          required: ["inApp", "fcmPush", "smsFallback"],
          properties: {
            inApp: { bsonType: "bool" },
            fcmPush: { bsonType: "bool" },
            smsFallback: { bsonType: "bool" }
          }
        },
        createdAt: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

### 4.11 JSON Schema Validator: `reports` Collection

```javascript
db.createCollection("reports", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["reporterId", "targetType", "targetId", "reason", "status"],
      properties: {
        reporterId: { bsonType: "objectId" },
        targetType: { enum: ["LISTING", "USER"] },
        targetId: { bsonType: "objectId" },
        reason: { enum: ["FRAUD_SCAM", "OFFENSIVE_CONTENT", "DUPLICATE_SPAM", "PROHIBITED_GOODS", "HARASSMENT"] },
        description: { bsonType: "string", maxLength: 500 },
        evidenceRoomId: { bsonType: "string" },
        status: { enum: ["PENDING", "UNDER_REVIEW", "RESOLVED_BANNED", "DISMISSED"] },
        resolvedBy: { bsonType: "objectId" },
        resolutionNotes: { bsonType: "string" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```


---

## 5. Production Mongoose Schemas & Models (TypeScript Implementation)

### 5.1 `User.model.ts`

```typescript
import { Schema, model, Document, Types } from 'mongoose';

export interface IUserDocument extends Document {
  mobileNumber: string;
  passwordHash: string;
  role: 'buyer' | 'seller' | 'merchant' | 'moderator' | 'admin' | 'legal_officer';
  accountStatus: 'UNVERIFIED' | 'VERIFIED' | 'SUSPENDED' | 'BANNED';
  isNidVerified: boolean;
  displayName: string;
  avatarUrl?: string;
  location?: {
    division: string;
    district: string;
    thana: string;
    addressLine?: string;
  };
  kyc: {
    nidNumberEncrypted?: string;
    nidHashSha256?: string;
    nidType?: 'SMART' | 'PLASTIC';
    dob?: Date;
    extractedLegalName?: string;
    livenessConfidenceScore?: number;
    verifiedAt?: Date;
  };
  devices: Types.DocumentArray<{
    deviceId: string;
    deviceName: string;
    platform: string;
    fcmToken?: string;
    ipAddress: string;
    lastActiveAt: Date;
  }>;
  authLockout: {
    failedOtpAttempts: number;
    lockoutUntil?: Date;
  };
  quota: {
    dailyAdsPostedCount: number;
    quotaWindowStartsAt: Date;
  };
  privacySettings: {
    isPhoneVisible: boolean;
    allowProxyCalls: boolean;
  };
  stats: {
    ratingAverage: number;
    ratingCount: number;
    totalListingsCreated: number;
    activeListingsCount: number;
    totalDealsCompleted: number;
    responseRatePercent: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    mobileNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^01[3-9]\d{8}$/, 'Must be a valid 11-digit Bangladeshi mobile number']
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['buyer', 'seller', 'merchant', 'moderator', 'admin', 'legal_officer'],
      default: 'buyer'
    },
    accountStatus: {
      type: String,
      enum: ['UNVERIFIED', 'VERIFIED', 'SUSPENDED', 'BANNED'],
      default: 'UNVERIFIED',
      index: true
    },
    isNidVerified: { type: Boolean, default: false, index: true },
    displayName: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    avatarUrl: { type: String },
    location: {
      division: { type: String, required: true },
      district: { type: String, required: true },
      thana: { type: String, required: true },
      addressLine: { type: String }
    },
    kyc: {
      nidNumberEncrypted: { type: String },
      nidHashSha256: { type: String, sparse: true, unique: true },
      nidType: { type: String, enum: ['SMART', 'PLASTIC'] },
      dob: { type: Date },
      extractedLegalName: { type: String },
      livenessConfidenceScore: { type: Number, min: 0, max: 100 },
      verifiedAt: { type: Date }
    },
    devices: [
      {
        deviceId: { type: String, required: true },
        deviceName: { type: String, required: true },
        platform: { type: String, enum: ['web_desktop', 'web_mobile', 'android_native', 'ios_native'] },
        fcmToken: { type: String },
        ipAddress: { type: String, required: true },
        lastActiveAt: { type: Date, default: Date.now }
      }
    ],
    authLockout: {
      failedOtpAttempts: { type: Number, default: 0 },
      lockoutUntil: { type: Date }
    },
    quota: {
      dailyAdsPostedCount: { type: Number, default: 0 },
      quotaWindowStartsAt: { type: Date, default: Date.now }
    },
    privacySettings: {
      isPhoneVisible: { type: Boolean, default: false },
      allowProxyCalls: { type: Boolean, default: true }
    },
    stats: {
      ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
      ratingCount: { type: Number, default: 0 },
      totalListingsCreated: { type: Number, default: 0 },
      activeListingsCount: { type: Number, default: 0 },
      totalDealsCompleted: { type: Number, default: 0 },
      responseRatePercent: { type: Number, default: 100, min: 0, max: 100 }
    }
  },
  { timestamps: true }
);

// Indexes
UserSchema.index({ 'devices.deviceId': 1 });
UserSchema.index({ accountStatus: 1, isNidVerified: 1 });

export const UserModel = model<IUserDocument>('User', UserSchema);
```

### 5.2 `Listing.model.ts`

```typescript
import { Schema, model, Document, Types } from 'mongoose';

export interface IListingDocument extends Document {
  sellerId: Types.ObjectId;
  storefrontId?: Types.ObjectId;
  title: string;
  description: string;
  category: string;
  subCategory: string;
  attributes: Map<string, any>;
  condition: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR';
  price: number;
  isNegotiable: boolean;
  isFreeAd: boolean;
  location: {
    division: string;
    district: string;
    thana: string;
    geoPoint?: {
      type: 'Point';
      coordinates: [number, number];
    };
  };
  images: Array<{
    originalUrl: string;
    watermarkedUrl: string;
    thumbnailUrl: string;
    pHash: string;
    isNsfwSafe: boolean;
  }>;
  status: 'ACTIVE' | 'BOOSTED' | 'SOLD' | 'EXPIRED' | 'ARCHIVED' | 'SUSPENDED';
  viewCount: number;
  favoriteCount: number;
  chatInitiationCount: number;
  boost: {
    isTopAd: boolean;
    topAdExpiresAt?: Date;
    isBumped: boolean;
    lastBumpedAt?: Date;
    isFeatured: boolean;
  };
  softDelete: {
    isDeleted: boolean;
    deletedAt?: Date;
    deletedBy?: Types.ObjectId;
  };
  publishedAt: Date;
  expiresAt: Date;
  soldAt?: Date;
  renewedAt?: Date;
}

const ListingSchema = new Schema<IListingDocument>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    storefrontId: { type: Schema.Types.ObjectId, ref: 'Storefront' },
    title: { type: String, required: true, trim: true, minlength: 10, maxlength: 100 },
    description: { type: String, required: true, minlength: 20, maxlength: 2000 },
    category: {
      type: String,
      required: true,
      enum: ['Electronics', 'Vehicles', 'Property', 'Home_Living', 'Jobs_Services', 'Fashion_Hobby']
    },
    subCategory: { type: String, required: true },
    attributes: { type: Map, of: Schema.Types.Mixed },
    condition: { type: String, required: true, enum: ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR'] },
    price: { type: Number, required: true, min: 0 },
    isNegotiable: { type: Boolean, default: false },
    isFreeAd: { type: Boolean, default: true },
    location: {
      division: { type: String, required: true },
      district: { type: String, required: true },
      thana: { type: String, required: true },
      geoPoint: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number] } // [longitude, latitude]
      }
    },
    images: [
      {
        originalUrl: { type: String, required: true },
        watermarkedUrl: { type: String, required: true },
        thumbnailUrl: { type: String, required: true },
        pHash: { type: String, required: true },
        isNsfwSafe: { type: Boolean, default: true }
      }
    ],
    status: {
      type: String,
      enum: ['ACTIVE', 'BOOSTED', 'SOLD', 'EXPIRED', 'ARCHIVED', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true
    },
    viewCount: { type: Number, default: 0 },
    favoriteCount: { type: Number, default: 0 },
    chatInitiationCount: { type: Number, default: 0 },
    boost: {
      isTopAd: { type: Boolean, default: false },
      topAdExpiresAt: { type: Date },
      isBumped: { type: Boolean, default: false },
      lastBumpedAt: { type: Date },
      isFeatured: { type: Boolean, default: false }
    },
    softDelete: {
      isDeleted: { type: Boolean, default: false },
      deletedAt: { type: Date },
      deletedBy: { type: Schema.Types.ObjectId, ref: 'User' }
    },
    publishedAt: { type: Date, default: Date.now },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    soldAt: { type: Date },
    renewedAt: { type: Date }
  },
  { timestamps: true }
);

// Indexes
ListingSchema.index({ 'location.geoPoint': '2dsphere' });
ListingSchema.index({ division: 1, district: 1, thana: 1, category: 1, status: 1 });
ListingSchema.index({ 'boost.isTopAd': -1, 'boost.isBumped': -1, publishedAt: -1 });
ListingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL Auto-Expire Index
ListingSchema.index({ title: 'text', description: 'text' }, { weights: { title: 10, description: 1 }, name: 'ListingTextSearch' });
ListingSchema.index({ sellerId: 1, createdAt: -1 });

export const ListingModel = model<IListingDocument>('Listing', ListingSchema);
```

### 5.3 `Offer.model.ts`

```typescript
import { Schema, model, Document, Types } from 'mongoose';

export interface IOfferDocument extends Document {
  listingId: Types.ObjectId;
  buyerId: Types.ObjectId;
  sellerId: Types.ObjectId;
  chatRoomId: Types.ObjectId;
  offeredPrice: number;
  counterPrice?: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COUNTERED' | 'EXPIRED' | 'VOIDED' | 'WITHDRAWN';
  message?: string;
  expiresAt: Date;
  acceptedAt?: Date;
  closedAt?: Date;
}

const OfferSchema = new Schema<IOfferDocument>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    chatRoomId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
    offeredPrice: { type: Number, required: true, min: 1 },
    counterPrice: { type: Number, min: 1 },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'COUNTERED', 'EXPIRED', 'VOIDED', 'WITHDRAWN'],
      default: 'PENDING',
      index: true
    },
    message: { type: String, maxlength: 200 },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
    },
    acceptedAt: { type: Date },
    closedAt: { type: Date }
  },
  { timestamps: true }
);

// Indexes
OfferSchema.index({ listingId: 1, buyerId: 1, status: 1 });
OfferSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL Index

export const OfferModel = model<IOfferDocument>('Offer', OfferSchema);
```

### 5.4 `Chat.model.ts` & `Message.model.ts`

```typescript
import { Schema, model, Document, Types } from 'mongoose';

// ----------------- Chat Room Model -----------------
export interface IChatDocument extends Document {
  roomId: string;
  listingId: Types.ObjectId;
  sellerId: Types.ObjectId;
  buyerId: Types.ObjectId;
  participants: Types.ObjectId[];
  lastMessage?: {
    senderId: Types.ObjectId;
    content: string;
    type: string;
    sentAt: Date;
  };
  unreadCounts: Map<string, number>;
  activeOfferId?: Types.ObjectId;
  agreedPrice?: number;
  telephonyLogs: Types.DocumentArray<{
    callSessionId: string;
    initiatedBy: Types.ObjectId;
    startedAt: Date;
    durationSeconds: number;
    callStatus: string;
  }>;
  isArchivedBy: Types.ObjectId[];
  isBlocked: boolean;
  blockedBy?: Types.ObjectId;
}

const ChatSchema = new Schema<IChatDocument>(
  {
    roomId: { type: String, required: true, unique: true },
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    lastMessage: {
      senderId: { type: Schema.Types.ObjectId, ref: 'User' },
      content: { type: String },
      type: { type: String, default: 'TEXT' },
      sentAt: { type: Date }
    },
    unreadCounts: { type: Map, of: Number, default: {} },
    activeOfferId: { type: Schema.Types.ObjectId, ref: 'Offer' },
    agreedPrice: { type: Number },
    telephonyLogs: [
      {
        callSessionId: { type: String, required: true },
        initiatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        startedAt: { type: Date, default: Date.now },
        durationSeconds: { type: Number, default: 0 },
        callStatus: { type: String, enum: ['COMPLETED', 'MISSED', 'FAILED'], default: 'COMPLETED' }
      }
    ],
    isArchivedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isBlocked: { type: Boolean, default: false },
    blockedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

ChatSchema.index({ participants: 1, updatedAt: -1 });
export const ChatModel = model<IChatDocument>('Chat', ChatSchema);

// ----------------- Message Model -----------------
export interface IMessageDocument extends Document {
  chatId: Types.ObjectId;
  roomId: string;
  senderId: Types.ObjectId;
  senderRole: 'buyer' | 'seller' | 'system';
  type: 'TEXT' | 'IMAGE' | 'OFFER_EVENT' | 'MEETUP_PIN' | 'SYSTEM_WARNING';
  content: string;
  mediaUrl?: string;
  geoPin?: {
    title: string;
    coordinates: [number, number];
  };
  isFraudWarningTriggered: boolean;
  readAt?: Date;
  sentAt: Date;
}

const MessageSchema = new Schema<IMessageDocument>(
  {
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    roomId: { type: String, required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['buyer', 'seller', 'system'], default: 'buyer' },
    type: {
      type: String,
      enum: ['TEXT', 'IMAGE', 'OFFER_EVENT', 'MEETUP_PIN', 'SYSTEM_WARNING'],
      default: 'TEXT'
    },
    content: { type: String, required: true, maxlength: 1000 },
    mediaUrl: { type: String },
    geoPin: {
      title: { type: String },
      coordinates: { type: [Number] }
    },
    isFraudWarningTriggered: { type: Boolean, default: false },
    readAt: { type: Date },
    sentAt: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

MessageSchema.index({ chatId: 1, sentAt: -1 });
MessageSchema.index({ sentAt: 1 }, { expireAfterSeconds: 15552000 }); // TTL 180 Days

export const MessageModel = model<IMessageDocument>('Message', MessageSchema);
```

### 5.5 `Review.model.ts`

```typescript
import { Schema, model, Document, Types } from 'mongoose';

export interface IReviewDocument extends Document {
  listingId: Types.ObjectId;
  buyerId: Types.ObjectId;
  sellerId: Types.ObjectId;
  offerId: Types.ObjectId;
  rating: number;
  comment: string;
  sellerReply?: {
    comment: string;
    repliedAt: Date;
  };
  isReported: boolean;
  moderationStatus: 'APPROVED' | 'FLAGGED' | 'REMOVED';
  buyerEditableUntil: Date;
}

const ReviewSchema = new Schema<IReviewDocument>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    offerId: { type: Schema.Types.ObjectId, ref: 'Offer', required: true, unique: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, minlength: 10, maxlength: 500 },
    sellerReply: {
      comment: { type: String, maxlength: 500 },
      repliedAt: { type: Date }
    },
    isReported: { type: Boolean, default: false },
    moderationStatus: {
      type: String,
      enum: ['APPROVED', 'FLAGGED', 'REMOVED'],
      default: 'APPROVED',
      index: true
    },
    buyerEditableUntil: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 48 * 60 * 60 * 1000)
    }
  },
  { timestamps: true }
);

ReviewSchema.index({ sellerId: 1, createdAt: -1 });
ReviewSchema.index({ listingId: 1, buyerId: 1 }, { unique: true });

export const ReviewModel = model<IReviewDocument>('Review', ReviewSchema);
```

### 5.6 `Storefront.model.ts`

```typescript
import { Schema, model, Document, Types } from 'mongoose';

export interface IStorefrontDocument extends Document {
  merchantId: Types.ObjectId;
  storeSlug: string;
  brandName: string;
  tagline?: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  tradeLicenseNumber?: string;
  tier: 'SILVER' | 'GOLD' | 'PLATINUM';
  contact: {
    officialPhone: string;
    officialEmail: string;
    physicalStoreAddress: string;
    websiteUrl?: string;
  };
  subscription: {
    status: 'TRIAL' | 'ACTIVE' | 'GRACE_PERIOD' | 'SUSPENDED' | 'CANCELLED';
    planId: string;
    renewsAt: Date;
    gracePeriodEndsAt?: Date;
    lastPaidInvoiceId?: Types.ObjectId;
  };
  metrics: {
    totalListings: number;
    totalStorefrontViews: number;
    followerCount: number;
  };
}

const StorefrontSchema = new Schema<IStorefrontDocument>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    storeSlug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    brandName: { type: String, required: true, trim: true },
    tagline: { type: String },
    description: { type: String, required: true },
    logoUrl: { type: String, required: true },
    bannerUrl: { type: String, required: true },
    tradeLicenseNumber: { type: String },
    tier: { type: String, enum: ['SILVER', 'GOLD', 'PLATINUM'], default: 'SILVER' },
    contact: {
      officialPhone: { type: String, required: true },
      officialEmail: { type: String, required: true },
      physicalStoreAddress: { type: String, required: true },
      websiteUrl: { type: String }
    },
    subscription: {
      status: {
        type: String,
        enum: ['TRIAL', 'ACTIVE', 'GRACE_PERIOD', 'SUSPENDED', 'CANCELLED'],
        default: 'TRIAL'
      },
      planId: { type: String, required: true },
      renewsAt: { type: Date, required: true },
      gracePeriodEndsAt: { type: Date },
      lastPaidInvoiceId: { type: Schema.Types.ObjectId }
    },
    metrics: {
      totalListings: { type: Number, default: 0 },
      totalStorefrontViews: { type: Number, default: 0 },
      followerCount: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

export const StorefrontModel = model<IStorefrontDocument>('Storefront', StorefrontSchema);
```

### 5.7 `BoostPayment.model.ts`

```typescript
import { Schema, model, Document, Types } from 'mongoose';

export interface IBoostPaymentDocument extends Document {
  userId: Types.ObjectId;
  entityType: 'LISTING_BOOST' | 'MERCHANT_SUBSCRIPTION';
  listingId?: Types.ObjectId;
  storefrontId?: Types.ObjectId;
  boostType?: 'TOP_AD_3D' | 'TOP_AD_7D' | 'TOP_AD_15D' | 'BUMP_UP_7D' | 'FEATURED_30D';
  amount: number;
  currency: 'BDT';
  paymentGateway: 'BKASH' | 'NAGAD' | 'ROCKET' | 'SSLCOMMERZ';
  gatewayTransactionId?: string;
  clientIp: string;
  paymentStatus: 'INITIATED' | 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  gatewayPayload?: Record<string, any>;
  signature: string;
  paidAt?: Date;
  refundMetadata?: {
    refundedAt: Date;
    refundReason: string;
    proRataAmount: number;
  };
}

const BoostPaymentSchema = new Schema<IBoostPaymentDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    entityType: { type: String, enum: ['LISTING_BOOST', 'MERCHANT_SUBSCRIPTION'], required: true },
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing' },
    storefrontId: { type: Schema.Types.ObjectId, ref: 'Storefront' },
    boostType: { type: String, enum: ['TOP_AD_3D', 'TOP_AD_7D', 'TOP_AD_15D', 'BUMP_UP_7D', 'FEATURED_30D'] },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'BDT' },
    paymentGateway: { type: String, enum: ['BKASH', 'NAGAD', 'ROCKET', 'SSLCOMMERZ'], required: true },
    gatewayTransactionId: { type: String, sparse: true, unique: true },
    clientIp: { type: String, required: true },
    paymentStatus: {
      type: String,
      enum: ['INITIATED', 'PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED'],
      default: 'INITIATED',
      index: true
    },
    gatewayPayload: { type: Schema.Types.Mixed },
    signature: { type: String, required: true },
    paidAt: { type: Date },
    refundMetadata: {
      refundedAt: { type: Date },
      refundReason: { type: String },
      proRataAmount: { type: Number }
    }
  },
  { timestamps: true }
);

export const BoostPaymentModel = model<IBoostPaymentDocument>('BoostPayment', BoostPaymentSchema);
```

### 5.8 `AuditLog.model.ts` (WORM Immutability Guard)

```typescript
import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLogDocument extends Document {
  logId: string;
  timestamp: Date;
  action: string;
  actorId: Types.ObjectId;
  actorRole: string;
  actorIp: string;
  entityType: string;
  entityId: Types.ObjectId;
  metadata: Record<string, any>;
  prevHash: string;
  sha256Signature: string;
  isLegalHold: boolean;
}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    logId: { type: String, required: true, unique: true },
    timestamp: { type: Date, required: true, default: Date.now, index: true },
    action: {
      type: String,
      required: true,
      enum: [
        'USER_REGISTERED', 'USER_VERIFIED', 'USER_BANNED',
        'LISTING_CREATED', 'LISTING_BANNED', 'OFFER_ACCEPTED',
        'BOOST_PURCHASED', 'LEGAL_HOLD_APPLIED', 'WARRANT_DATA_EXPORTED'
      ],
      index: true
    },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorRole: { type: String, required: true },
    actorIp: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    metadata: { type: Schema.Types.Mixed, required: true },
    prevHash: { type: String, required: true },
    sha256Signature: { type: String, required: true },
    isLegalHold: { type: Boolean, default: false, index: true }
  },
  { timestamps: false }
);

// Strict WORM enforcement: block update and delete operations on audit logs
AuditLogSchema.pre('updateOne', function () {
  throw new Error('WORM Violation: Audit log records cannot be modified.');
});
AuditLogSchema.pre('deleteOne', function () {
  throw new Error('WORM Violation: Audit log records cannot be deleted.');
});

export const AuditLogModel = model<IAuditLogDocument>('AuditLog', AuditLogSchema);
```

### 5.9 `Notification.model.ts`

```typescript
import { Schema, model, Document, Types } from 'mongoose';

export interface INotificationDocument extends Document {
  recipientId: Types.ObjectId;
  triggerType: string;
  title: string;
  body: string;
  deepLinkUri: string;
  isRead: boolean;
  readAt?: Date;
  channelDispatched: {
    inApp: boolean;
    fcmPush: boolean;
    smsFallback: boolean;
  };
  createdAt: Date;
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    triggerType: {
      type: String,
      required: true,
      enum: [
        'OFFER_RECEIVED', 'OFFER_ACCEPTED', 'OFFER_DECLINED',
        'KYC_APPROVED', 'KYC_REJECTED', 'BOOST_ACTIVATED',
        'AD_EXPIRING_SOON', 'AD_EXPIRED', 'NEW_REVIEW', 'SCAM_WARNING'
      ]
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    deepLinkUri: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
    channelDispatched: {
      inApp: { type: Boolean, default: true },
      fcmPush: { type: Boolean, default: false },
      smsFallback: { type: Boolean, default: false }
    },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 5184000 }); // TTL 60 Days

export const NotificationModel = model<INotificationDocument>('Notification', NotificationSchema);
```

### 5.10 `Report.model.ts`

```typescript
import { Schema, model, Document, Types } from 'mongoose';

export interface IReportDocument extends Document {
  reporterId: Types.ObjectId;
  targetType: 'LISTING' | 'USER';
  targetId: Types.ObjectId;
  reason: 'FRAUD_SCAM' | 'OFFENSIVE_CONTENT' | 'DUPLICATE_SPAM' | 'PROHIBITED_GOODS' | 'HARASSMENT';
  description?: string;
  evidenceRoomId?: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED_BANNED' | 'DISMISSED';
  resolvedBy?: Types.ObjectId;
  resolutionNotes?: string;
}

const ReportSchema = new Schema<IReportDocument>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: { type: String, enum: ['LISTING', 'USER'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    reason: {
      type: String,
      enum: ['FRAUD_SCAM', 'OFFENSIVE_CONTENT', 'DUPLICATE_SPAM', 'PROHIBITED_GOODS', 'HARASSMENT'],
      required: true
    },
    description: { type: String, maxlength: 500 },
    evidenceRoomId: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'UNDER_REVIEW', 'RESOLVED_BANNED', 'DISMISSED'],
      default: 'PENDING',
      index: true
    },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolutionNotes: { type: String }
  },
  { timestamps: true }
);

ReportSchema.index({ targetId: 1, status: 1 });
export const ReportModel = model<IReportDocument>('Report', ReportSchema);
```

---

---

*This document serves as the dedicated Master Schema Specification for the Next-Gen Verified C2C & B2C Marketplace. All schemas, field constraints, Mongoose models, and engine-level JSON validators are synchronized with [PRD.md](file:///Volumes/Disk%20(%20G%20)/Buy%20Sell%20Software/PRD.md), [architecture.md](file:///Volumes/Disk%20(%20G%20)/Buy%20Sell%20Software/architecture.md), [dfd.md](file:///Volumes/Disk%20(%20G%20)/Buy%20Sell%20Software/dfd.md), [database.md](file:///Volumes/Disk%20(%20G%20)/Buy%20Sell%20Software/database.md), and [erd.md](file:///Volumes/Disk%20(%20G%20)/Buy%20Sell%20Software/erd.md).*
