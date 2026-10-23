# Entity Relationship Diagram (ERD) Specification (`erd.md`)
## Next-Gen Verified C2C & B2C Marketplace Platform (Bangladesh)

| Document Attribute | Specification |
| :--- | :--- |
| **Document Version** | 1.0.0 (Master Relational & Schema Blueprint) |
| **Database Architecture** | MongoDB Atlas (Enterprise Document Store with Sharded Clusters & CSFLE) |
| **Notation Standard** | Crow's Foot Notation (Mermaid `erDiagram`) + Relational Cardinality Mapping |
| **Primary References** | `PRD.md` (v1.1.0+), `architecture.md` (v2.0.0), `dfd.md` (v1.0.1), `database.md` (v2.0.0) |
| **Target Data Model** | Hybrid Embedded/Referenced Document Paradigm optimized for sub-150ms drilldown reads |

---

## 1. Executive Summary & Modeling Principles

While MongoDB is a non-relational document database, enterprise systems operating at national scale (millions of classifieds, real-time negotiation streams, and legally binding transactions) require rigorous relational modeling to prevent data anomalies, avoid unbounded document growth (16MB BSON limit), and enforce multi-document consistency.

### Core Architectural Modeling Principles
1. **Bounded Growth ➔ Embed:** Subdocuments with strictly bounded array lengths (such as maximum 3 device bindings per user, maximum 10 images per listing, and current boost state) are embedded directly inside parent documents. This guarantees single-roundtrip $O(1)$ reads without relational `$lookup` overhead.
2. **Unbounded Streams ➔ Reference:** High-velocity, growing event streams (such as real-time chat messages, competitive buyer offers, and user reviews) are stored in dedicated collections with indexed foreign key references.
3. **Audit Immutability (WORM):** The `audit_logs` collection is modeled as an append-only, write-once ledger cryptographically chained using SHA-256 signatures. It references domain entity IDs (`actorId`, `entityId`) without hard cascade deletes.
4. **Data Isolation for Security (CSFLE):** Highly sensitive identity data (Bangladesh Smart/Plastic NID numbers) use Client-Side Field Level Encryption (CSFLE) with deterministic blind indexes for strict $1:1$ uniqueness checking.

---

## 2. Visual Entity Relationship Diagram (Mermaid)

The following diagram visualizes all 11 core collections, their cardinalities, primary keys (`PK`), foreign keys (`FK`), unique keys (`UK`), and relationship descriptors.

```mermaid
erDiagram
    USERS ||--o{ LISTINGS : "posts [1:N]"
    USERS ||--o{ OFFERS : "places/receives [1:N]"
    USERS ||--o{ CHATS : "participates [1:N]"
    USERS ||--o{ REVIEWS : "writes/receives [1:N]"
    USERS ||--o| STOREFRONTS : "operates [1:1]"
    USERS ||--o{ BOOSTS_PAYMENTS : "purchases [1:N]"
    USERS ||--o{ NOTIFICATIONS : "receives [1:N]"
    USERS ||--o{ REPORTS : "files [1:N]"

    LISTINGS ||--o{ OFFERS : "receives_bids [1:N]"
    LISTINGS ||--o{ CHATS : "discussed_in [1:N]"
    LISTINGS ||--o{ REVIEWS : "evaluated_in [1:N]"
    LISTINGS ||--o{ BOOSTS_PAYMENTS : "promoted_by [1:N]"
    STOREFRONTS ||--o{ LISTINGS : "showcases [1:N]"

    CHATS ||--|{ MESSAGES : "contains [1:N]"
    OFFERS ||--o| REVIEWS : "verified_deal_proof [1:1]"

    USERS {
        ObjectId _id PK "Unique User Identifier"
        string mobileNumber UK "11-digit Bangladesh MSISDN (^01[3-9]\d{8}$)"
        string passwordHash "Argon2id Salted Hash"
        string role "buyer, seller, merchant, moderator, admin"
        string accountStatus "UNVERIFIED, VERIFIED, SUSPENDED, BANNED"
        boolean isNidVerified "Gatekeeper for ad posting & chat"
        string displayName "Public Profile Handle"
        string nidNumberEncrypted "CSFLE Deterministic Ciphertext"
        string nidHashSha256 UK "Blind Index for Uniqueness"
        string nidType "SMART, PLASTIC"
        object devices "Embedded Array (Max 3 Active Devices)"
        object quota "dailyAdsPostedCount (Max 30/24h)"
        object privacySettings "isPhoneVisible, allowProxyCalls"
        float ratingAverage "Calculated 0.0 to 5.0"
        datetime createdAt "User Registration Date"
    }

    LISTINGS {
        ObjectId _id PK "Unique Ad Identifier"
        ObjectId sellerId FK "ref: USERS._id"
        ObjectId storefrontId FK "ref: STOREFRONTS._id (Optional B2C)"
        string title "10-100 characters sanitized title"
        string description "20-2000 characters description"
        string category "Electronics, Vehicles, Property..."
        string subCategory "Taxonomy leaf node"
        string condition "NEW, LIKE_NEW, GOOD, FAIR"
        decimal price "Currency in BDT"
        boolean isNegotiable "Price negotiable toggle"
        boolean isFreeAd "100% Free Ad model invariant (true)"
        object location "division, district, thana, geoPoint"
        object images "Embedded Array (1-10 WebP Images)"
        string status "ACTIVE, BOOSTED, SOLD, EXPIRED, SUSPENDED"
        object boost "isTopAd, isBumped, topAdExpiresAt"
        object softDelete "isDeleted, deletedAt, deletedBy"
        datetime publishedAt "Ad Publication Timestamp"
        datetime expiresAt "TTL: 30 Days Auto-Expiry"
    }

    OFFERS {
        ObjectId _id PK "Unique Offer Identifier"
        ObjectId listingId FK "ref: LISTINGS._id"
        ObjectId buyerId FK "ref: USERS._id"
        ObjectId sellerId FK "ref: USERS._id"
        ObjectId chatRoomId FK "ref: CHATS._id"
        decimal offeredPrice "BDT price proposal"
        decimal counterPrice "Optional seller counter proposal"
        string status "PENDING, ACCEPTED, DECLINED, VOIDED"
        string message "Optional buyer note (Max 200 chars)"
        datetime expiresAt "TTL: 24 Hours Expiration Window"
        datetime acceptedAt "Timestamp of Acceptance"
    }

    CHATS {
        ObjectId _id PK "Unique Chat Session ID"
        string roomId UK "Composite Key: listingId_buyerId"
        ObjectId listingId FK "ref: LISTINGS._id"
        ObjectId buyerId FK "ref: USERS._id"
        ObjectId sellerId FK "ref: USERS._id"
        decimal agreedPrice "Locked price post-offer acceptance"
        ObjectId activeOfferId FK "ref: OFFERS._id"
        object unreadCounts "Map of unread messages by userId"
        object telephonyLogs "Embedded Array of Proxy Call Bridges"
        boolean isBlocked "True if chat blocked by participant"
        datetime updatedAt "Last Message Activity Timestamp"
    }

    MESSAGES {
        ObjectId _id PK "Unique Message Identifier"
        ObjectId chatId FK "ref: CHATS._id"
        string roomId "Redundant Partition Key for O(1) Fetch"
        ObjectId senderId FK "ref: USERS._id"
        string senderRole "buyer, seller, system"
        string type "TEXT, IMAGE, OFFER_EVENT, WARNING"
        string content "Encrypted / Sanitized Message Body"
        boolean isFraudWarningTriggered "Regex Scam Alert Flag"
        datetime sentAt "TTL: 180 Days Rolling Storage"
    }

    REVIEWS {
        ObjectId _id PK "Unique Review Identifier"
        ObjectId listingId FK "ref: LISTINGS._id"
        ObjectId buyerId FK "ref: USERS._id"
        ObjectId sellerId FK "ref: USERS._id"
        ObjectId offerId FK "ref: OFFERS._id (Verifiable Proof)"
        int rating "1 to 5 Stars"
        string comment "10 to 500 characters feedback"
        object sellerReply "comment, repliedAt (Within 7 Days)"
        string moderationStatus "APPROVED, FLAGGED, REMOVED"
        datetime buyerEditableUntil "48 Hours Edit Window"
        datetime createdAt "Review Submission Timestamp"
    }

    STOREFRONTS {
        ObjectId _id PK "Unique Storefront Identifier"
        ObjectId merchantId FK "ref: USERS._id (1:1 Binding)"
        string storeSlug UK "Alphanumeric Vanity URL (/store/slug)"
        string brandName "Official Merchant Brand"
        string tradeLicenseNumber "Business Registration Credential"
        string tier "SILVER, GOLD, PLATINUM"
        object contact "officialPhone, officialEmail, address"
        object subscription "status, renewsAt, gracePeriodEndsAt"
        datetime createdAt "Storefront Inception Date"
    }

    BOOSTS_PAYMENTS {
        ObjectId _id PK "Unique Ledger Transaction ID"
        ObjectId userId FK "ref: USERS._id"
        string entityType "LISTING_BOOST, MERCHANT_SUBSCRIPTION"
        ObjectId listingId FK "ref: LISTINGS._id (Optional)"
        ObjectId storefrontId FK "ref: STOREFRONTS._id (Optional)"
        string boostType "TOP_AD_3D, TOP_AD_7D, BUMP_UP_7D"
        decimal amount "Transaction Amount in BDT"
        string paymentGateway "BKASH, NAGAD, SSLCOMMERZ"
        string gatewayTransactionId UK "MFS Gateway Reference Token"
        string paymentStatus "INITIATED, PAID, FAILED, REFUNDED"
        string signature "HMAC-SHA256 Integrity Verification"
        datetime paidAt "Gateway Confirmation Timestamp"
    }

    AUDIT_LOGS {
        ObjectId _id PK "Unique Audit Record ID"
        string logId UK "UUIDv4 Cryptographic ID"
        datetime timestamp "ISO-8601 UTC Event Time"
        string action "USER_VERIFIED, OFFER_ACCEPTED..."
        ObjectId actorId FK "ref: USERS._id or SYSTEM"
        string entityType "USER, LISTING, OFFER, PAYMENT"
        ObjectId entityId "Target Modified Entity ID"
        object metadata "Full State Mutation Snapshot"
        string prevHash "Chained SHA-256 of Preceding Entry"
        string sha256Signature "WORM Cryptographic Tamper Seal"
        boolean isLegalHold "Flagged under Judicial Warrant"
    }

    NOTIFICATIONS {
        ObjectId _id PK "Unique Notification ID"
        ObjectId recipientId FK "ref: USERS._id"
        string triggerType "OFFER_RECEIVED, BOOST_ACTIVATED..."
        string title "Push Alert Title Header"
        string body "Alert Text Body"
        string deepLinkUri "In-App Navigation Target Route"
        boolean isRead "Unread Status Indicator"
        datetime createdAt "TTL: 60 Days Purge Window"
    }

    REPORTS {
        ObjectId _id PK "Unique Abuse Ticket ID"
        ObjectId reporterId FK "ref: USERS._id"
        string targetType "LISTING, USER"
        ObjectId targetId "Target Entity ID Being Flagged"
        string reason "FRAUD_SCAM, HARASSMENT, COUNTERFEIT"
        string status "PENDING, UNDER_REVIEW, RESOLVED_BANNED"
        string evidenceRoomId "Associated Chat Room ID"
        datetime createdAt "Ticket Filing Timestamp"
    }
```

---

## 3. Relational Cardinality & Referential Integrity Matrix

The following table formally defines how entities interact across system boundaries, including foreign key paths, cardinality constraints, and on-delete lifecycle cascades:

| Source Entity | Target Entity | Cardinality | Foreign Key / Mapping Attribute | Relationship Semantics & Business Rules | On-Delete / State Cascade Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`users`** | **`listings`** | `1 : N` (Zero to Many) | `listings.sellerId ➔ users._id` | A user can post multiple free classified ads (max 30 per 24 hours). | When user is `BANNED`, all active listings cascade to `SUSPENDED`. |
| **`users`** | **`offers`** | `1 : N` (Zero to Many) | `offers.buyerId ➔ users._id`<br>`offers.sellerId ➔ users._id` | A user acts as buyer submitting proposals or seller receiving proposals. | If user banned, pending offers transition to `VOIDED`. |
| **`users`** | **`chats`** | `1 : N` (Zero to Many) | `chats.participants[] ➔ users._id` | Chat rooms have exactly 2 participant users (buyer and seller). | User soft-archive toggles `chats.isArchivedBy[]`. |
| **`users`** | **`reviews`** | `1 : N` (Zero to Many) | `reviews.buyerId ➔ users._id`<br>`reviews.sellerId ➔ users._id` | Dual-party feedback loop: verified buyer reviews seller; seller can reply once. | Reviews remain immutable; calculated into `users.stats.ratingAverage`. |
| **`users`** | **`storefronts`**| `1 : 1` (Zero or One) | `storefronts.merchantId ➔ users._id` | Strict $1:1$ binding; only verified merchants operate branded storefronts. | Storefront access suspended if merchant account is suspended. |
| **`users`** | **`boosts_payments`**| `1 : N` (Zero to Many) | `boosts_payments.userId ➔ users._id`| Audit log of voluntary boost purchases or merchant subscriptions. | Immutable financial records; retained 7 years for compliance. |
| **`users`** | **`notifications`**| `1 : N` (Zero to Many) | `notifications.recipientId ➔ users._id` | In-app alerts and push notifications delivered to specific account. | Auto-purged after 60 days via MongoDB TTL index. |
| **`users`** | **`reports`** | `1 : N` (Zero to Many) | `reports.reporterId ➔ users._id` | Formal fraud/abuse complaint filed by a registered user. | Preserved in moderation queue for staff resolution. |
| **`listings`**| **`offers`** | `1 : N` (Zero to Many) | `offers.listingId ➔ listings._id` | Multiple buyers can submit offers on an active listing. | When 1 offer is `ACCEPTED`, all competing offers cascade to `VOIDED`. |
| **`listings`**| **`chats`** | `1 : N` (Zero to Many) | `chats.listingId ➔ listings._id` | Each distinct buyer creates a separate chat room with the seller for an item. | Locked if listing is deleted or marked `SOLD`. |
| **`listings`**| **`reviews`** | `1 : N` (Zero or One) | `reviews.listingId ➔ listings._id` | Exactly 1 review permitted per sold listing transaction. | Unique index on `{ listingId: 1, buyerId: 1 }` prevents duplicates. |
| **`listings`**| **`boosts_payments`**| `1 : N` (Zero to Many) | `boosts_payments.listingId ➔ listings._id`| Promotes listing to Top Ad or Bump Up. | On confirmation, updates `listings.boost.isTopAd = true`. |
| **`storefronts`**| **`listings`**| `1 : N` (Zero to Many) | `listings.storefrontId ➔ storefronts._id` | Commercial merchants aggregate their inventory under their branded store. | If merchant subscription lapses, items revert to standard free ads. |
| **`chats`** | **`messages`** | `1 : N` (One to Many) | `messages.chatId ➔ chats._id` | Messages are partitioned by room for rapid chronological streaming. | 180-Day TTL rolling retention on messages collection. |
| **`offers`** | **`reviews`** | `1 : 1` (Zero or One) | `reviews.offerId ➔ offers._id` | A review requires a verified accepted offer as cryptographic proof of purchase. | Review form blocked unless target offer status is `ACCEPTED`. |

---

## 4. Embedding vs. Referencing Rationale Matrix

MongoDB schemas must balance performance (avoiding expensive `$lookup` joins) against document size constraints (16MB BSON ceiling).

| Schema Element | Target Placement | Strategy | Justification & Architectural Trade-off |
| :--- | :--- | :--- | :--- |
| `devices[]` | `users.devices` | **Embedded** | **Strictly Bounded (Max 3 Devices):** Device array contains 1 to 3 objects ($O(1)$ size). Embedding eliminates an extra database roundtrip on every authenticated API request. |
| `quota` | `users.quota` | **Embedded** | **High-Frequency Read/Write:** Daily free ad counter (max 30) is updated synchronously during ad posting. Embedding ensures atomic `$inc` updates without multi-table locks. |
| `images[]` | `listings.images`| **Embedded** | **Strictly Bounded (1 to 10 Images):** Ad images are always rendered together on product cards and details views. Maximum 10 image URLs/hashes consume less than 2KB of storage. |
| `boost` | `listings.boost` | **Embedded** | **Compound Index Optimization:** Querying Top Ads requires sorting by `{ "boost.isTopAd": -1, publishedAt: -1 }`. Embedding boost status allows single-index query coverage. |
| `messages` | `messages` (Collection) | **Referenced** | **Unbounded Volume:** An active buyer-seller negotiation can exchange hundreds of messages. Embedding in `chats` would risk hitting the 16MB document cap and bloat inbox fetches. |
| `offers` | `offers` (Collection) | **Referenced** | **ACID Transaction Isolation:** Multiple buyers can bid simultaneously. Isolated offer documents prevent document-level write contention during high-concurrency negotiations. |
| `reviews` | `reviews` (Collection) | **Referenced** | **Independent Moderation:** Reviews have distinct moderation states (`APPROVED`, `FLAGGED`), 48-hour buyer edit windows, and 7-day seller reply windows. |
| `audit_logs` | `audit_logs` (Collection) | **Referenced** | **WORM Compliance & Partitioning:** Compliance logs grow to tens of millions of records and must be append-only with SHA-256 chaining, partitioned independently from operational users. |

---

## 5. Domain Invariants & Referential Integrity Constraints

1. **Strict 1-to-1 NID Binding Invariant:**
   * A single verified Bangladesh NID cannot be linked to more than one active or banned account.
   * *Enforcement:* Unique sparse index on `users.kyc.nidHashSha256` (computed as `SHA-256(salt + rawNid)`).
2. **Single Active Offer Invariant:**
   * A buyer may only have at most one `PENDING` offer on a specific listing at any given moment.
   * *Enforcement:* Compound unique index on `{ listingId: 1, buyerId: 1, status: 1 }` where status equals `PENDING`.
3. **Atomic Offer Acceptance Invariant:**
   * When a seller accepts an offer, the listing's agreed price is locked, and all competing pending offers are atomically voided.
   * *Enforcement:* Multi-document ACID transaction using MongoDB `ClientSession` (`session.startTransaction()`).
4. **100% Free Ad Posting Model Invariant:**
   * Ad posting has no mandatory fee barrier. `listings.isFreeAd` is `true` by default. Boosts (`isTopAd`, `isBumped`) are strictly voluntary upsells.
   * *Enforcement:* Quota check `quota.dailyAdsPostedCount < 30` per 24 hours.
5. **Verified Transaction Review Proof Invariant:**
   * A buyer cannot submit a seller rating unless there exists a corresponding offer record with `status == "ACCEPTED"`.
   * *Enforcement:* Foreign key reference `reviews.offerId ➔ offers._id` with unique constraint `{ listingId: 1, buyerId: 1 }`.
6. **WORM Immutability Guard Invariant:**
   * Records inside `audit_logs` can never be edited or deleted by any user or administrator.
   * *Enforcement:* Database user permissions restricted to `insert` and `find` only; Mongoose middleware throws error on `updateOne` or `deleteOne`.

---

## 6. Primary & Foreign Key Indexing Summary

To guarantee sub-150ms drilldown and traversal across referenced entities, the following foreign key index definitions are deployed:

```javascript
// listings foreign keys
db.listings.createIndex({ sellerId: 1, createdAt: -1 });
db.listings.createIndex({ storefrontId: 1 }, { sparse: true });

// offers foreign keys
db.offers.createIndex({ listingId: 1, buyerId: 1, status: 1 });
db.offers.createIndex({ sellerId: 1, status: 1 });

// chats foreign keys
db.chats.createIndex({ roomId: 1 }, { unique: true });
db.chats.createIndex({ participants: 1, updatedAt: -1 });
db.chats.createIndex({ listingId: 1 });

// messages foreign keys
db.messages.createIndex({ chatId: 1, sentAt: -1 });
db.messages.createIndex({ roomId: 1, sentAt: -1 });

// reviews foreign keys
db.reviews.createIndex({ sellerId: 1, createdAt: -1 });
db.reviews.createIndex({ listingId: 1, buyerId: 1 }, { unique: true });
db.reviews.createIndex({ offerId: 1 }, { unique: true });

// storefronts foreign keys
db.storefronts.createIndex({ merchantId: 1 }, { unique: true });
db.storefronts.createIndex({ storeSlug: 1 }, { unique: true });

// boosts_payments foreign keys
db.boosts_payments.createIndex({ userId: 1, createdAt: -1 });
db.boosts_payments.createIndex({ listingId: 1, paymentStatus: 1 });
db.boosts_payments.createIndex({ gatewayTransactionId: 1 }, { unique: true, sparse: true });

// notifications foreign keys
db.notifications.createIndex({ recipientId: 1, isRead: 1, createdAt: -1 });

// reports foreign keys
db.reports.createIndex({ targetId: 1, status: 1 });
db.reports.createIndex({ reporterId: 1 });
```

---

*This document serves as the formal Entity Relationship Diagram specification for the Next-Gen Verified C2C & B2C Marketplace. All relationships, foreign keys, and invariants are synchronized with [PRD.md](file:///Volumes/Disk%20(%20G%20)/Buy%20Sell%20Software/PRD.md), [architecture.md](file:///Volumes/Disk%20(%20G%20)/Buy%20Sell%20Software/architecture.md), [dfd.md](file:///Volumes/Disk%20(%20G%20)/Buy%20Sell%20Software/dfd.md), [database.md](file:///Volumes/Disk%20(%20G%20)/Buy%20Sell%20Software/database.md), and [api-spec.md](file:///Volumes/Disk%20(%20G%20)/Buy%20Sell%20Software/api-spec.md).*
