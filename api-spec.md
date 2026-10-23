# REST & WebSocket API Specification (`api-spec.md`)
## Next-Gen Verified C2C & B2C Marketplace Platform (Bangladesh)

| Document Attribute | Specification |
| :--- | :--- |
| **Document Version** | 2.0.0 (Master Production API Blueprint) |
| **Protocol Standard** | RESTful HTTP/2 & HTTP/3 + Secure WebSockets (`wss://`) |
| **Base URL (Production)** | `https://api.marketplace.com.bd/v1` |
| **WebSocket Gateway** | `wss://api.marketplace.com.bd/ws` |
| **Data Format** | JSON (UTF-8) / `multipart/form-data` for media ingestion |
| **Primary References** | `PRD.md` (v1.1.0+), `architecture.md` (v2.0.0), `dfd.md` (v1.0.1), `database.md` (v2.0.0), `schema-database.md` (v1.0.0) |
| **Authentication Scheme** | Dual-Token Bearer: Short-lived JWT (15m) + HttpOnly SameSite Refresh Cookie (30d) |
| **Audit Compliance** | All mutating operations produce signed WORM audit events with `X-Trace-Id` correlation |

---

## 1. Global Architectural Conventions & Standard Envelopes

### 1.1 Request Headers

Every incoming HTTP request must adhere to standard security and tracing headers:

| Header Name | Type | Required | Description & Constraints |
| :--- | :--- | :--- | :--- |
| `Authorization` | String | Yes (Protected) | Format: `Bearer <JWT_ACCESS_TOKEN>`. Issued upon OTP verification. |
| `X-Device-Fingerprint` | String | Yes | SHA-256 hash of client hardware attributes (screen, platform, userAgent). |
| `X-Client-Platform` | Enum | Yes | One of: `web_desktop`, `web_mobile`, `android_native`, `ios_native`. |
| `X-Trace-Id` | UUIDv4 | Optional | Distributed request trace ID. If omitted, API Gateway generates one. |
| `X-Idempotency-Key` | UUIDv4 | Optional (Required for Payments) | Prevents duplicate charges or duplicate ad posts on network retries. |

---

### 1.2 Standardized JSON Response Envelopes

To maintain 100% deterministic contracts for Next.js web clients and mobile apps, all endpoints return a consistent JSON response envelope.

#### 1.2.1 Success Envelope (HTTP 200, 201)
```json
{
  "success": true,
  "statusCode": 200,
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "totalRecords": 1420,
    "totalPages": 71
  },
  "traceId": "c8a410f2-e5b1-4c91-b3b4-123456789abc"
}
```

#### 1.2.2 Error Envelope (HTTP 4xx, 5xx)
```json
{
  "success": false,
  "statusCode": 400,
  "error": {
    "code": "ERR_VALIDATION_FAILED",
    "message": "Title must be between 10 and 100 characters.",
    "details": [
      {
        "field": "title",
        "issue": "String must contain at least 10 character(s)"
      }
    ]
  },
  "traceId": "c8a410f2-e5b1-4c91-b3b4-123456789abc"
}
```

---

### 1.3 Master Error Code Catalog

| Error Code | HTTP Status | Description / Trigger Scenario |
| :--- | :--- | :--- |
| `ERR_AUTH_INVALID_TOKEN` | 401 | JWT access token expired, invalid signature, or revoked session. |
| `ERR_AUTH_UNAUTHORIZED` | 401 | Missing `Authorization: Bearer` header on protected route. |
| `ERR_FORBIDDEN_ROLE` | 403 | Authenticated user lacks required RBAC role permission. |
| `ERR_OTP_LOCKOUT` | 429 | 5 consecutive failed OTP attempts; account locked for 30 minutes. |
| `ERR_KYC_REQUIRED` | 403 | User must complete dual-sided NID verification before creating ads or chatting. |
| `ERR_DAILY_QUOTA_EXCEEDED` | 429 | Seller reached the max cap of 30 free ads per 24-hour rolling window. |
| `ERR_SCAM_PATTERN_DETECTED`| 422 | Message contains high-risk off-platform payment keywords (e.g., bKash courier fee advance). |
| `ERR_OFFER_ACTIVE_EXISTS` | 409 | Buyer already has an active pending offer on this listing. |
| `ERR_OFFER_EXPIRED` | 410 | Proposal exceeded the 24-hour lifespan or listing was marked Sold. |
| `ERR_OFFER_NOT_FOUND` | 404 | Offer document ID does not exist or user is unauthorized to access it. |
| `ERR_LISTING_NOT_FOUND` | 404 | Listing ID does not exist, or has been purged post-90d retention. |
| `ERR_REVIEW_WINDOW_CLOSED` | 403 | Review edit attempted after 48h, or seller reply attempted after 7 days. |
| `ERR_REVIEW_UNAUTHORIZED` | 403 | Buyer has not completed an accepted transaction for this item. |
| `ERR_DEVICE_LIMIT_REACHED` | 403 | User already has 3 active device sessions bound; must revoke one to proceed. |
| `ERR_PAYMENT_FAILED` | 402 | MFS payment rejected, cancelled, or insufficient balance. |
| `ERR_PAYMENT_SIGNATURE` | 403 | Invalid HMAC-SHA256 signature on payment callback webhook. |
| `ERR_WORM_IMMUTABLE` | 403 | Attempted mutation or deletion of audit logs (WORM protocol violation). |
| `ERR_INTERNAL_SERVER` | 500 | Unhandled system exception or database connection failure. |

---

## 2. Module 1: Authentication & Session Management APIs

Handles 11-digit Bangladesh MSISDN OTP registration, Argon2id credentials, JWT token pair issuance, refresh token rotation (RTR), and hardware device session binding (Max 3 devices).

### 2.1 Request OTP Challenge
* **HTTP Route:** `POST /api/v1/auth/request-otp`
* **Access & Permissions:** Public (No Auth Required)
* **Rate Limit Policy:** 5 requests / 15 minutes per IP and MSISDN (Redis token bucket)
* **DFD & Data Store:** `DF-01: Login_Request`, `P-1.0: Authentication & Session Management` (`D1: users`, `D8: audit_logs`)
* **Request Headers:**
  * `X-Device-Fingerprint`: String (SHA-256 client fingerprint)
  * `X-Client-Platform`: Enum (`web_desktop`, `web_mobile`, `android_native`, `ios_native`)
* **Request Body:**
```json
{
  "mobileNumber": "01712345678",
  "clientPlatform": "android_native",
  "deviceFingerprint": "c20ad4d76fe97759aa27a0c99bff6710ea49e0b4d4554eb85154ee42faef81e2"
}
```
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "mobileNumber": "01712345678",
    "otpExpirySeconds": 180,
    "resendCooldownSeconds": 60,
    "isExistingUser": true
  },
  "traceId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
}
```
* **Error Responses:**
  * `400 Bad Request` (`ERR_VALIDATION_FAILED`): Mobile number must match Bangladeshi regex `^01[3-9]\d{8}$`.
  * `429 Too Many Requests` (`ERR_OTP_LOCKOUT`): 5 failed attempts triggered a 30-minute lockout.

---

### 2.2 Verify OTP & Issue Token Pair
* **HTTP Route:** `POST /api/v1/auth/verify-otp`
* **Access & Permissions:** Public (No Auth Required)
* **Rate Limit Policy:** 5 attempts / 15 minutes per MSISDN
* **DFD & Data Store:** `DF-03: OTP_Submit`, `DF-04: Token_Issue`, `P-1.0` (`D1: users`, `D8: audit_logs`)
* **Request Headers:**
  * `X-Device-Fingerprint`: String
  * `X-Client-Platform`: Enum
* **Request Body:**
```json
{
  "mobileNumber": "01712345678",
  "otpCode": "489201",
  "deviceInfo": {
    "deviceId": "c20ad4d76fe97759aa27a0c99bff6710ea49e0b4d4554eb85154ee42faef81e2",
    "deviceName": "Xiaomi Redmi Note 12",
    "platform": "android_native",
    "fcmToken": "eK92_sA...fcmTokenString"
  }
}
```
* **Success Response (`200 OK`):**
  * **Set-Cookie Header:** `refreshToken=eyJhbG...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=2592000`
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NmM0ZjhhMTJiM2M0ZDVlNmY3YThiOTAiLCJyb2xlIjoic2VsbGVyIiwiaXNOaWRWZXJpZmllZCI6dHJ1ZX0...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "id": "66c4f8a12b3c4d5e6f7a8b90",
      "mobileNumber": "01712345678",
      "displayName": "Rafiqul Islam",
      "role": "seller",
      "accountStatus": "VERIFIED",
      "isNidVerified": true,
      "ratingAverage": 4.85
    }
  },
  "traceId": "8a32df19-4f3b-4654-9304-4054a83309a1"
}
```
* **Error Responses:**
  * `400 Bad Request` (`ERR_VALIDATION_FAILED`): OTP code must be exactly 6 digits.
  * `401 Unauthorized` (`ERR_AUTH_INVALID_TOKEN`): OTP code incorrect or expired.
  * `403 Forbidden` (`ERR_DEVICE_LIMIT_REACHED`): Account already bound to 3 devices.

---

### 2.3 Rotate Refresh Token
* **HTTP Route:** `POST /api/v1/auth/refresh`
* **Access & Permissions:** Protected via `refreshToken` HttpOnly Cookie (Auth Required: Yes)
* **Rate Limit Policy:** 30 requests / minute
* **DFD & Data Store:** `P-1.0: Authentication & Session Management` (`D1: users`)
* **Request Headers:**
  * `Cookie`: `refreshToken=<HTTP_ONLY_COOKIE>`
  * `X-Device-Fingerprint`: String
* **Request Body:** None (Handled via cookie)
* **Success Response (`200 OK`):**
  * **Set-Cookie Header:** `refreshToken=<NEW_ROTATED_COOKIE>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=2592000`
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.newAccessToken...",
    "expiresIn": 900
  },
  "traceId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"
}
```
* **Error Responses:**
  * `401 Unauthorized` (`ERR_AUTH_INVALID_TOKEN`): Refresh token missing, expired, or fingerprint mismatch.

---

### 2.4 Logout & Revoke Session
* **HTTP Route:** `POST /api/v1/auth/logout`
* **Access & Permissions:** Protected via Bearer Token (`role: buyer+`) (Auth Required: Yes)
* **Rate Limit Policy:** 30 requests / minute
* **DFD & Data Store:** `P-1.0: Session Management` (`D1: users`, `D8: audit_logs`)
* **Request Headers:**
  * `Authorization`: `Bearer <JWT_ACCESS_TOKEN>`
  * `X-Device-Fingerprint`: String
* **Request Body:**
```json
{
  "deviceId": "c20ad4d76fe97759aa27a0c99bff6710ea49e0b4d4554eb85154ee42faef81e2"
}
```
* **Success Response (`200 OK`):**
  * **Set-Cookie Header:** `refreshToken=; HttpOnly; Max-Age=0; Path=/api/v1/auth`
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "message": "Successfully logged out and device session revoked."
  },
  "traceId": "2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e"
}
```
* **Error Responses:**
  * `401 Unauthorized` (`ERR_AUTH_UNAUTHORIZED`): Missing or invalid access token.

---

### 2.5 List Bound Device Sessions
* **HTTP Route:** `GET /api/v1/auth/sessions`
* **Access & Permissions:** Protected via Bearer Token (`role: buyer+`) (Auth Required: Yes)
* **Rate Limit Policy:** 60 requests / minute
* **DFD & Data Store:** `P-1.0: Session Management` (`D1: users`)
* **Request Headers:**
  * `Authorization`: `Bearer <JWT_ACCESS_TOKEN>`
* **Request Body:** None
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "activeDevices": [
      {
        "deviceId": "c20ad4d76fe97759aa27a0c99bff6710ea49e0b4d4554eb85154ee42faef81e2",
        "deviceName": "Xiaomi Redmi Note 12",
        "platform": "android_native",
        "ipAddress": "103.25.244.12",
        "lastActiveAt": "2026-10-22T09:45:00.000Z",
        "isCurrentDevice": true
      },
      {
        "deviceId": "a1b2c3d4e5f677889900aabbccddeeff112233445566778899aabbccddeeff00",
        "deviceName": "Chrome on macOS (Sonoma)",
        "platform": "web_desktop",
        "ipAddress": "103.25.244.14",
        "lastActiveAt": "2026-10-21T18:20:00.000Z",
        "isCurrentDevice": false
      }
    ],
    "totalActiveDevices": 2,
    "maxAllowedDevices": 3
  },
  "traceId": "3b4c5d6e-7f8a-9b0c-1d2e-3f4a5b6c7d8e"
}
```
* **Error Responses:**
  * `401 Unauthorized` (`ERR_AUTH_UNAUTHORIZED`): Missing or invalid authorization token.

---

### 2.6 Revoke Remote Device Session
* **HTTP Route:** `DELETE /api/v1/auth/sessions/:deviceId`
* **Access & Permissions:** Protected via Bearer Token (`role: buyer+`) (Auth Required: Yes)
* **Rate Limit Policy:** 10 requests / minute
* **DFD & Data Store:** `P-1.0: Session Management` (`D1: users`, `D8: audit_logs`)
* **Request Headers:**
  * `Authorization`: `Bearer <JWT_ACCESS_TOKEN>`
* **Path Parameters:**
  * `deviceId`: String (SHA-256 hash of device to disconnect)
* **Request Body:** None
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "revokedDeviceId": "a1b2c3d4e5f677889900aabbccddeeff112233445566778899aabbccddeeff00",
    "message": "Remote device session terminated successfully."
  },
  "traceId": "4c5d6e7f-8a9b-0c1d-2e3f-4a5b6c7d8e9f"
}
```
* **Error Responses:**
  * `404 Not Found` (`ERR_NOT_FOUND`): Target device session not found under user's bound devices.

---

## 3. Module 2: e-KYC Identity Clearance & Binding APIs

Handles Bangladesh Smart NID and Plastic NID OCR extraction, 3D facial liveness video stream evaluation, deterministic CSFLE encryption, and manual moderator queue routing.

### 3.1 Upload Dual-Sided NID Documents
* **HTTP Route:** `POST /api/v1/kyc/upload-nid`
* **Access & Permissions:** Protected via Bearer Token (`accountStatus: UNVERIFIED`) (Auth Required: Yes)
* **Content-Type:** `multipart/form-data`
* **Rate Limit Policy:** 3 attempts / 24 hours per user
* **DFD & Data Store:** `DF-05: KYC_Upload`, `P-2.0: e-KYC Engine` (`D1: users`, `D8: audit_logs`)
* **Request Headers:**
  * `Authorization`: `Bearer <JWT_ACCESS_TOKEN>`
* **Multipart Form Fields:**
  * `nidFront`: Image File (JPEG/PNG/WebP, Max 5MB, Mandatory)
  * `nidBack`: Image File (JPEG/PNG/WebP, Max 5MB, Mandatory)
  * `nidType`: Enum (`SMART`, `PLASTIC`, Mandatory)
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "kycTrackingId": "kyc_7f8a9b0c-1d2e",
    "extractedLegalName": "Md. Rafiqul Islam",
    "extractedNidMasked": "1994269250000****",
    "extractedDob": "1994-05-12",
    "nidType": "SMART",
    "ocrConfidencePercent": 96.8,
    "nextStep": "BIOMETRIC_LIVENESS_CHECK"
  },
  "traceId": "7b8a9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d"
}
```
* **Error Responses:**
  * `400 Bad Request` (`ERR_VALIDATION_FAILED`): Blurred image, unreadable OCR text, or invalid document boundaries.
  * `409 Conflict` (`ERR_NID_ALREADY_REGISTERED`): This NID number is already bound to another registered account.

---

### 3.2 Verify Biometric 3D Liveness
* **HTTP Route:** `POST /api/v1/kyc/verify-liveness`
* **Access & Permissions:** Protected via Bearer Token (`accountStatus: UNVERIFIED`) (Auth Required: Yes)
* **Content-Type:** `multipart/form-data`
* **Rate Limit Policy:** 3 attempts / 24 hours
* **DFD & Data Store:** `DF-06: Biometric_Verify`, `DF-07: KYC_Result`, `P-2.0` (`D1: users`, `D8: audit_logs`, `D9: notifications`)
* **Request Headers:**
  * `Authorization`: `Bearer <JWT_ACCESS_TOKEN>`
* **Multipart Form Fields:**
  * `kycTrackingId`: String (Mandatory, returned from Step 3.1)
  * `livenessVideo`: Video Stream (MP4/WebM, Duration: 3-5 seconds, Max 10MB)
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "kycTrackingId": "kyc_7f8a9b0c-1d2e",
    "verificationStatus": "VERIFIED",
    "confidenceScore": 98.4,
    "verifiedBadgeIssued": true,
    "verifiedAt": "2026-10-22T10:30:00.000Z",
    "message": "Congratulations! Your account is 100% verified. You can now post free ads and trade safely."
  },
  "traceId": "8c9d0e1f-2a3b-4c5d-6e7f-8a9b0c1d2e3f"
}
```
* **Error Responses:**
  * `422 Unprocessable Entity` (`ERR_LIVENESS_FAILED`): Micro-expressions not detected, static photo detected, or face mismatch (< 70%).

---

### 3.3 Get KYC Verification Status
* **HTTP Route:** `GET /api/v1/kyc/status`
* **Access & Permissions:** Protected via Bearer Token (Auth Required: Yes)
* **Rate Limit Policy:** 60 requests / minute
* **DFD & Data Store:** `P-2.0: e-KYC Engine` (`D1: users`)
* **Request Headers:**
  * `Authorization`: `Bearer <JWT_ACCESS_TOKEN>`
* **Request Body:** None
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "accountStatus": "VERIFIED",
    "isNidVerified": true,
    "verifiedAt": "2026-10-22T10:30:00.000Z",
    "extractedLegalName": "Md. Rafiqul Islam",
    "livenessScore": 98.4,
    "attemptsRemainingToday": 3
  },
  "traceId": "9d0e1f2a-3b4c-5d6e-7f8a-9b0c1d2e3f4a"
}
```

---

### 3.4 Moderator Manual KYC Review
* **HTTP Route:** `POST /api/v1/kyc/admin/review/:userId`
* **Access & Permissions:** Protected via Bearer Token (`role: moderator | admin`) (Auth Required: Yes)
* **Rate Limit Policy:** 60 requests / minute
* **DFD & Data Store:** `P-2.4: Exception Management` (`D1: users`, `D8: audit_logs`, `D9: notifications`)
* **Path Parameters:**
  * `userId`: String (ObjectId of target user in manual review queue)
* **Request Body:**
```json
{
  "decision": "APPROVED",
  "reason": "Clear manual match confirmed between plastic NID and selfie stream.",
  "moderatorNotes": "Plastic card laminated photo was slightly faded but features match."
}
```
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "userId": "66c4f8a12b3c4d5e6f7a8b90",
    "accountStatus": "VERIFIED",
    "decision": "APPROVED",
    "reviewedAt": "2026-10-22T11:00:00.000Z"
  },
  "traceId": "0e1f2a3b-4c5d-6e7f-8a9b-0c1d2e3f4a5b"
}
```

---

## 4. Module 3: User Profile, Reputation & Quota APIs

### 4.1 Get Authenticated User Profile
* **HTTP Route:** `GET /api/v1/users/me`
* **Access & Permissions:** Protected via Bearer Token (`role: buyer+`) (Auth Required: Yes)
* **Rate Limit Policy:** 120 requests / minute
* **DFD & Data Store:** `P-3.0 / D1: users`
* **Request Headers:**
  * `Authorization`: `Bearer <JWT_ACCESS_TOKEN>`
* **Request Body:** None
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "66c4f8a12b3c4d5e6f7a8b90",
    "mobileNumber": "01712345678",
    "displayName": "Rafiqul Islam",
    "avatarUrl": "https://cdn.marketplace.com.bd/avatars/rafiqul_90.webp",
    "role": "seller",
    "accountStatus": "VERIFIED",
    "isNidVerified": true,
    "location": {
      "division": "Dhaka",
      "district": "Dhaka",
      "thana": "Mirpur",
      "addressLine": "Section 10, Block C, Road 4"
    },
    "quota": {
      "dailyAdsPostedCount": 3,
      "dailyAdsLimit": 30,
      "remainingFreeAdsToday": 27,
      "quotaResetsAt": "2026-10-23T00:00:00.000Z"
    },
    "privacySettings": {
      "isPhoneVisible": false,
      "allowProxyCalls": true
    },
    "stats": {
      "ratingAverage": 4.85,
      "ratingCount": 14,
      "totalListingsCreated": 6,
      "activeListingsCount": 2,
      "totalDealsCompleted": 12,
      "responseRatePercent": 96
    }
  },
  "traceId": "1f2a3b4c-5d6e-7f8a-9b0c-1d2e3f4a5b6c"
}
```

---

### 4.2 Update User Profile & Privacy Settings
* **HTTP Route:** `PATCH /api/v1/users/me`
* **Access & Permissions:** Protected via Bearer Token (Auth Required: Yes)
* **Rate Limit Policy:** 30 requests / minute
* **DFD & Data Store:** `D1: users`, `D8: audit_logs`
* **Request Body:**
```json
{
  "displayName": "Rafiqul Islam (Tech Deals)",
  "avatarUrl": "https://cdn.marketplace.com.bd/avatars/new_avatar.webp",
  "location": {
    "division": "Dhaka",
    "district": "Dhaka",
    "thana": "Mirpur",
    "addressLine": "Section 10, Road 4"
  },
  "privacySettings": {
    "isPhoneVisible": false,
    "allowProxyCalls": true
  }
}
```
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "updatedAt": "2026-10-22T12:00:00.000Z",
    "message": "Profile and privacy preferences updated successfully."
  },
  "traceId": "2a3b4c5d-6e7f-8a9b-0c1d-2e3f4a5b6c7d"
}
```

---

### 4.3 Check Daily Free Ad Quota Status
* **HTTP Route:** `GET /api/v1/users/me/quota`
* **Access & Permissions:** Protected via Bearer Token (Auth Required: Yes)
* **Rate Limit Policy:** 120 requests / minute
* **DFD & Data Store:** `D1: users`
* **Request Body:** None
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "dailyAdsLimit": 30,
    "dailyAdsPostedCount": 3,
    "remainingFreeAdsToday": 27,
    "quotaWindowStartsAt": "2026-10-22T00:00:00.000Z",
    "resetsAt": "2026-10-23T00:00:00.000Z",
    "canPostFreeAd": true
  },
  "traceId": "3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d"
}
```

---

### 4.4 Get Public Seller Profile & Feedback
* **HTTP Route:** `GET /api/v1/users/:id/public-profile`
* **Access & Permissions:** Public (No Auth Required)
* **Rate Limit Policy:** 200 requests / minute
* **DFD & Data Store:** `D1: users`, `D2: listings`, `D5: reviews`
* **Path Parameters:**
  * `id`: String (ObjectId of target seller)
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "66c4f8a12b3c4d5e6f7a8b90",
    "displayName": "Rafiqul Islam",
    "avatarUrl": "https://cdn.marketplace.com.bd/avatars/rafiqul_90.webp",
    "isNidVerified": true,
    "ratingAverage": 4.85,
    "ratingCount": 14,
    "totalDealsCompleted": 12,
    "memberSince": "2026-08-15T09:00:00.000Z",
    "responseRatePercent": 96,
    "location": {
      "division": "Dhaka",
      "district": "Dhaka",
      "thana": "Mirpur"
    },
    "activeListings": [
      {
        "id": "66c4f8a12b3c4d5e6f7a8b99",
        "title": "Sony PlayStation 5 Disc Edition",
        "price": 58000,
        "isNegotiable": true,
        "condition": "LIKE_NEW",
        "thumbnailUrl": "https://cdn.marketplace.com.bd/listings/ps5_thumb_01.webp",
        "isTopAd": true,
        "publishedAt": "2026-10-18T14:00:00.000Z"
      }
    ]
  },
  "traceId": "4a5b6c7d-8e9f-0a1b-2c3d-4e5f6a7b8c9d"
}
```

---

### 4.5 Save / Bookmark a Listing
* **HTTP Route:** `POST /api/v1/users/me/saved-listings/:listingId`
* **Access & Permissions:** Protected via Bearer Token (Auth Required: Yes)
* **Rate Limit Policy:** 60 requests / minute
* **Path Parameters:**
  * `listingId`: String (ObjectId of listing to favorite/bookmark)
* **Request Body:** None
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "listingId": "66c4f8a12b3c4d5e6f7a8b99",
    "isSaved": true,
    "message": "Listing added to saved bookmarks."
  },
  "traceId": "5a6b7c8d-9e0f-1a2b-3c4d-5e6f7a8b9c0d"
}
```

---

### 4.6 List User's Saved Bookmarks
* **HTTP Route:** `GET /api/v1/users/me/saved-listings`
* **Access & Permissions:** Protected via Bearer Token (Auth Required: Yes)
* **Rate Limit Policy:** 60 requests / minute
* **Query Parameters:** `page=1&limit=20`
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "savedListings": [
      {
        "id": "66c4f8a12b3c4d5e6f7a8b99",
        "title": "Sony PlayStation 5 Disc Edition",
        "price": 58000,
        "condition": "LIKE_NEW",
        "thumbnailUrl": "https://cdn.marketplace.com.bd/listings/ps5_thumb_01.webp",
        "status": "ACTIVE"
      }
    ]
  },
  "meta": { "page": 1, "limit": 20, "totalRecords": 1, "totalPages": 1 },
  "traceId": "6a7b8c9d-0e1f-2a3b-4c5d-6e7f8a9b0c1d"
}
```

## 5. Module 4: Listing & Catalog Management APIs (100% Free Ad Model)

Enforces zero-fee ad posting, daily 30-ad quota validation, pHash perceptual image duplicate scanning, AI NSFW/weapon/drug screening, dynamic watermarking, geo-hierarchy drilldowns, and lifecycle transitions.

### 5.1 Create Free Ad Listing
* **HTTP Route:** `POST /api/v1/listings`
* **Access & Permissions:** Protected via Bearer Token (`isNidVerified: true`) (Auth Required: Yes)
* **Content-Type:** `multipart/form-data`
* **Rate Limit Policy:** 30 ads / 24-hour rolling window per verified user
* **DFD & Data Store:** `DF-10: Free_Ad_Submit`, `DF-11: Image_Screen_Req`, `DF-12: Image_Verdict`, `DF-13: Store_Media_Req`, `DF-14: Listing_Persist`, `P-3.0` (`D1: users`, `D2: listings`, `D8: audit_logs`)
* **Request Headers:**
  * `Authorization`: `Bearer <JWT_ACCESS_TOKEN>`
  * `X-Idempotency-Key`: UUIDv4
* **Multipart Form Fields:**
  * `title`: String (10 to 100 characters, Sanitized, Mandatory)
  * `description`: String (20 to 2000 characters, Mandatory)
  * `category`: Enum (`Electronics`, `Vehicles`, `Property`, `Home_Living`, `Jobs_Services`, `Fashion_Hobby`, Mandatory)
  * `subCategory`: String (Valid leaf category, Mandatory)
  * `condition`: Enum (`NEW`, `LIKE_NEW`, `GOOD`, `FAIR`, Mandatory)
  * `price`: Number (BDT, >= 0, Mandatory)
  * `isNegotiable`: Boolean (Default: false, Mandatory)
  * `division`: String (Mandatory)
  * `district`: String (Mandatory)
  * `thana`: String (Mandatory)
  * `latitude`: Number (Optional, Float)
  * `longitude`: Number (Optional, Float)
  * `attributes`: JSON String (e.g. `{"brand":"Sony","storage":"825GB"}`)
  * `images`: Array of Image Files (Min: 1, Max: 10, JPEG/PNG/WebP, Max 5MB each)
* **Success Response (`201 Created`):**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "listingId": "66c4f8a12b3c4d5e6f7a8b99",
    "title": "Sony PlayStation 5 Disc Edition (with 2 DualSense Controllers)",
    "status": "ACTIVE",
    "price": 58000,
    "isFreeAd": true,
    "publishedAt": "2026-10-22T14:00:00.000Z",
    "expiresAt": "2026-11-21T14:00:00.000Z",
    "watermarkedImages": [
      "https://cdn.marketplace.com.bd/listings/ps5_wm_01.webp",
      "https://cdn.marketplace.com.bd/listings/ps5_wm_02.webp"
    ],
    "quota": {
      "dailyAdsPostedCount": 4,
      "remainingFreeAdsToday": 26
    },
    "upsell": {
      "canBoost": true,
      "message": "Want 10x more buyers? Boost this ad to Top Ad starting from 199 BDT."
    }
  },
  "traceId": "4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a"
}
```
* **Error Responses:**
  * `403 Forbidden` (`ERR_KYC_REQUIRED`): User must complete NID verification before posting ads.
  * `422 Unprocessable Entity` (`ERR_IMAGE_MODERATION_FAILED`): AI detected prohibited content (firearms, NSFW) or OCR phone number embedded in photo.
  * `429 Too Many Requests` (`ERR_DAILY_QUOTA_EXCEEDED`): Reached 30 free ads per 24 hours.

---

### 5.2 Multi-Parametric Geo & Faceted Search
* **HTTP Route:** `GET /api/v1/listings/search`
* **Access & Permissions:** Public (No Auth Required)
* **Rate Limit Policy:** 120 requests / minute
* **DFD & Data Store:** `DF-15: Search_Query`, `DF-16: Search_Results`, `P-4.0` (`D2: listings`)
* **Query Parameters:**
  * `q`: String (Keyword, Optional)
  * `division`, `district`, `thana`: String (Geographic drilldown, Optional)
  * `category`, `subCategory`: String (Optional)
  * `priceMin`, `priceMax`: Number (BDT, Optional)
  * `condition`: String (CSV list: `LIKE_NEW,GOOD`, Optional)
  * `sortBy`: Enum (`boost_first`, `price_low`, `price_high`, `newest`, Default: `boost_first`)
  * `page`: Integer (Default: 1), `limit`: Integer (Default: 20, Max: 50)
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "listings": [
      {
        "id": "66c4f8a12b3c4d5e6f7a8b99",
        "title": "Sony PlayStation 5 Disc Edition",
        "price": 58000,
        "isNegotiable": true,
        "condition": "LIKE_NEW",
        "location": { "division": "Dhaka", "district": "Dhaka", "thana": "Mirpur" },
        "thumbnailUrl": "https://cdn.marketplace.com.bd/listings/ps5_thumb_01.webp",
        "isTopAd": true,
        "isBumped": true,
        "seller": {
          "id": "66c4f8a12b3c4d5e6f7a8b90",
          "displayName": "Rafiqul Islam",
          "ratingAverage": 4.85,
          "isNidVerified": true
        },
        "publishedAt": "2026-10-18T14:00:00.000Z"
      }
    ],
    "facets": {
      "categories": [ { "category": "Gaming Consoles", "count": 48 } ],
      "priceRange": { "min": 35000, "max": 75000, "avg": 54200 }
    }
  },
  "meta": { "page": 1, "limit": 20, "totalRecords": 48, "totalPages": 3 },
  "traceId": "5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b"
}
```

---

### 5.3 Get Single Listing Details
* **HTTP Route:** `GET /api/v1/listings/:id`
* **Access & Permissions:** Public (No Auth Required)
* **Rate Limit Policy:** 200 requests / minute
* **DFD & Data Store:** `P-4.0 / D2: listings, D1: users`
* **Path Parameters:**
  * `id`: String (ObjectId of target listing)
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "66c4f8a12b3c4d5e6f7a8b99",
    "title": "Sony PlayStation 5 Disc Edition (with 2 DualSense Controllers)",
    "description": "Used PlayStation 5 Disc Edition in pristine condition. Bought 8 months ago. Test before buying in Mirpur 10.",
    "category": "Electronics",
    "subCategory": "Gaming Consoles",
    "attributes": {
      "brand": "Sony",
      "model": "PlayStation 5",
      "storage": "825GB SSD",
      "edition": "Disc Version"
    },
    "condition": "LIKE_NEW",
    "price": 58000,
    "isNegotiable": true,
    "status": "BOOSTED",
    "location": {
      "division": "Dhaka",
      "district": "Dhaka",
      "thana": "Mirpur",
      "coordinates": [90.3686, 23.8071]
    },
    "images": [
      {
        "watermarkedUrl": "https://cdn.marketplace.com.bd/listings/ps5_wm_01.webp",
        "thumbnailUrl": "https://cdn.marketplace.com.bd/listings/ps5_thumb_01.webp"
      }
    ],
    "boost": {
      "isTopAd": true,
      "isBumped": true
    },
    "viewCount": 343,
    "favoriteCount": 19,
    "seller": {
      "id": "66c4f8a12b3c4d5e6f7a8b90",
      "displayName": "Rafiqul Islam",
      "avatarUrl": "https://cdn.marketplace.com.bd/avatars/rafiqul_90.webp",
      "isNidVerified": true,
      "ratingAverage": 4.85,
      "ratingCount": 14,
      "memberSince": "2026-08-15T09:00:00.000Z",
      "responseRatePercent": 96
    },
    "publishedAt": "2026-10-18T14:00:00.000Z",
    "expiresAt": "2026-11-17T14:00:00.000Z"
  },
  "traceId": "6e7f8a9b-0c1d-2e3f-4a5b-6c7d8e9f0a1b"
}
```
* **Error Responses:**
  * `404 Not Found` (`ERR_LISTING_NOT_FOUND`): Listing does not exist or was suspended/archived.

---

### 5.4 Update Listing Details
* **HTTP Route:** `PATCH /api/v1/listings/:id`
* **Access & Permissions:** Protected via Bearer Token (Listing Owner Only) (Auth Required: Yes)
* **Rate Limit Policy:** 20 requests / minute
* **DFD & Data Store:** `D2: listings`, `D3: offers`, `D8: audit_logs`
* **Path Parameters:**
  * `id`: String (ObjectId)
* **Request Body:**
```json
{
  "title": "Sony PlayStation 5 Disc Edition (Latest Firmware)",
  "price": 56000,
  "isNegotiable": false,
  "description": "Updated price: 56,000 BDT fixed. Includes God of War disk."
}
```
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "listingId": "66c4f8a12b3c4d5e6f7a8b99",
    "updatedAt": "2026-10-22T15:00:00.000Z",
    "voidedOffersCount": 2,
    "message": "Listing updated. Note: Price modification automatically voided 2 open pending offers."
  },
  "traceId": "7f8a9b0c-1d2e-3f4a-5b6c-7d8e9f0a1b2c"
}
```

---

### 5.5 Mark Listing as Sold
* **HTTP Route:** `POST /api/v1/listings/:id/mark-sold`
* **Access & Permissions:** Protected via Bearer Token (Listing Owner Only) (Auth Required: Yes)
* **Rate Limit Policy:** 20 requests / minute
* **DFD & Data Store:** `P-3.5: Lifecycle Management` (`D2: listings`, `D3: offers`, `D8: audit_logs`, `D9: notifications`)
* **Path Parameters:**
  * `id`: String (ObjectId)
* **Request Body:**
```json
{
  "buyerId": "66c4f8a12b3c4d5e6f7a8b91",
  "finalSoldPrice": 55000
}
```
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "listingId": "66c4f8a12b3c4d5e6f7a8b99",
    "status": "SOLD",
    "soldAt": "2026-10-22T15:30:00.000Z",
    "message": "Listing marked as SOLD. Review invitation dispatched to verified buyer."
  },
  "traceId": "8a9b0c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d"
}
```

---

### 5.6 Renew Expired Listing
* **HTTP Route:** `POST /api/v1/listings/:id/renew`
* **Access & Permissions:** Protected via Bearer Token (Listing Owner Only) (Auth Required: Yes)
* **Rate Limit Policy:** 10 requests / minute
* **DFD & Data Store:** `P-3.5` (`D2: listings`, `D8: audit_logs`)
* **Request Body:** None
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "listingId": "66c4f8a12b3c4d5e6f7a8b99",
    "status": "ACTIVE",
    "renewedAt": "2026-10-22T16:00:00.000Z",
    "expiresAt": "2026-11-21T16:00:00.000Z",
    "message": "Listing renewed successfully for another 30 days."
  },
  "traceId": "9b0c1d2e-3f4a-5b6c-7d8e-9f0a1b2c3d4e"
}
```

---

### 5.7 Soft-Delete Listing
* **HTTP Route:** `DELETE /api/v1/listings/:id`
* **Access & Permissions:** Protected via Bearer Token (Listing Owner or Admin) (Auth Required: Yes)
* **Rate Limit Policy:** 20 requests / minute
* **DFD & Data Store:** `D2: listings`, `D8: audit_logs`
* **Request Body:**
```json
{
  "deletionReason": "Item already sold outside platform."
}
```
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "listingId": "66c4f8a12b3c4d5e6f7a8b99",
    "isDeleted": true,
    "purgeScheduledAt": "2027-01-20T16:00:00.000Z",
    "message": "Listing soft-deleted. Record retained in archive for 90 days."
  },
  "traceId": "0c1d2e3f-4a5b-6c7d-8e9f-0a1b2c3d4e5f"
}
```

---

### 5.8 Get Seller's My Listings Dashboard
* **HTTP Route:** `GET /api/v1/listings/my-listings`
* **Access & Permissions:** Protected via Bearer Token (Auth Required: Yes)
* **Rate Limit Policy:** 60 requests / minute
* **Query Parameters:** `status=ACTIVE&page=1&limit=20`
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "myListings": [
      {
        "id": "66c4f8a12b3c4d5e6f7a8b99",
        "title": "Sony PlayStation 5 Disc Edition",
        "price": 58000,
        "status": "BOOSTED",
        "isTopAd": true,
        "viewCount": 343,
        "chatInitiationCount": 8,
        "expiresAt": "2026-11-17T14:00:00.000Z"
      }
    ]
  },
  "meta": { "page": 1, "limit": 20, "totalRecords": 1, "totalPages": 1 },
  "traceId": "1d2e3f4a-5b6c-7d8e-9f0a-1b2c3d4e5f6a"
}
```

---

## 6. Module 5: Negotiation & Offer State Machine APIs

### 6.1 Submit Binding Price Offer
* **HTTP Route:** `POST /api/v1/offers/:listingId`
* **Access & Permissions:** Protected via Bearer Token (`isNidVerified: true`) (Auth Required: Yes)
* **Rate Limit Policy:** 10 offers / hour per buyer
* **DFD & Data Store:** `DF-19: Make_Offer_Req`, `P-5.3: Offer State Machine` (`D3: offers`, `D4: chats`, `D9: notifications`)
* **Path Parameters:**
  * `listingId`: String (ObjectId of target listing)
* **Request Body:**
```json
{
  "offeredPrice": 55000,
  "message": "Bhai, 55000 BDT hole ajkei Mirpur 10 theke pick korbo."
}
```
* **Success Response (`201 Created`):**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "offerId": "66c4f8a12b3c4d5e6f7a8b88",
    "listingId": "66c4f8a12b3c4d5e6f7a8b99",
    "offeredPrice": 55000,
    "status": "PENDING",
    "expiresAt": "2026-10-23T11:00:00.000Z"
  },
  "traceId": "2e3f4a5b-6c7d-8e9f-0a1b-2c3d4e5f6a7b"
}
```
* **Error Responses:**
  * `409 Conflict` (`ERR_OFFER_ACTIVE_EXISTS`): You already have an active pending offer on this listing.
  * `422 Unprocessable Entity` (`ERR_VALIDATION_FAILED`): Offered price must be <= original listing price.

---

### 6.2 Accept Offer (Multi-Document ACID Transaction)
* **HTTP Route:** `POST /api/v1/offers/:id/accept`
* **Access & Permissions:** Protected via Bearer Token (Seller / Listing Owner Only) (Auth Required: Yes)
* **Rate Limit Policy:** 20 requests / minute
* **DFD & Data Store:** `DF-20: Offer_Accept_Ack`, `P-5.3` (`D3: offers`, `D4: chats`, `D8: audit_logs`, `D9: notifications`)
* **Path Parameters:**
  * `id`: String (ObjectId of target offer)
* **Request Body:** None
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "offerId": "66c4f8a12b3c4d5e6f7a8b88",
    "status": "ACCEPTED",
    "agreedPrice": 55000,
    "acceptedAt": "2026-10-22T11:25:00.000Z",
    "voidedCompetingOffersCount": 2,
    "message": "Offer accepted! Competing bids voided and agreed price locked in chat room."
  },
  "traceId": "3f4a5b6c-7d8e-9f0a-1b2c-3d4e5f6a7b8c"
}
```

---

### 6.3 Propose Counter-Offer
* **HTTP Route:** `POST /api/v1/offers/:id/counter`
* **Access & Permissions:** Protected via Bearer Token (Seller Only) (Auth Required: Yes)
* **Rate Limit Policy:** 20 requests / minute
* **Request Body:**
```json
{
  "counterPrice": 56500,
  "message": "55k possible na bhai, 56.5k hole deal final."
}
```
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "offerId": "66c4f8a12b3c4d5e6f7a8b88",
    "status": "COUNTERED",
    "counterPrice": 56500,
    "message": "Counter-offer sent to buyer."
  },
  "traceId": "4a5b6c7d-8e9f-0a1b-2c3d-4e5f6a7b8c9d"
}
```

---

### 6.4 Decline Offer
* **HTTP Route:** `POST /api/v1/offers/:id/decline`
* **Access & Permissions:** Protected via Bearer Token (Seller Only) (Auth Required: Yes)
* **Rate Limit Policy:** 20 requests / minute
* **Request Body:** None
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "offerId": "66c4f8a12b3c4d5e6f7a8b88",
    "status": "DECLINED"
  },
  "traceId": "5b6c7d8e-9f0a-1b2c-3d4e-5f6a7b8c9d0e"
}
```

---

### 6.5 Withdraw Offer
* **HTTP Route:** `POST /api/v1/offers/:id/withdraw`
* **Access & Permissions:** Protected via Bearer Token (Buyer Only) (Auth Required: Yes)
* **Rate Limit Policy:** 20 requests / minute
* **Request Body:** None
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "offerId": "66c4f8a12b3c4d5e6f7a8b88",
    "status": "WITHDRAWN"
  },
  "traceId": "6c7d8e9f-0a1b-2c3d-4e5f-6a7b8c9d0e1f"
}
```

---

### 6.6 List Received Offers
* **HTTP Route:** `GET /api/v1/offers/received`
* **Access & Permissions:** Protected via Bearer Token (Auth Required: Yes)
* **Rate Limit Policy:** 60 requests / minute
* **Query Parameters:** `status=PENDING&page=1&limit=20`
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "receivedOffers": [
      {
        "id": "66c4f8a12b3c4d5e6f7a8b88",
        "listing": {
          "id": "66c4f8a12b3c4d5e6f7a8b99",
          "title": "Sony PlayStation 5 Disc Edition",
          "price": 58000
        },
        "buyer": {
          "id": "66c4f8a12b3c4d5e6f7a8b91",
          "displayName": "Tanvir Ahmed",
          "ratingAverage": 5.0
        },
        "offeredPrice": 55000,
        "status": "PENDING",
        "expiresAt": "2026-10-23T11:00:00.000Z"
      }
    ]
  },
  "meta": { "page": 1, "limit": 20, "totalRecords": 1, "totalPages": 1 },
  "traceId": "7d8e9f0a-1b2c-3d4e-5f6a-7b8c9d0e1f2a"
}
```

---

### 6.7 List Sent Offers
* **HTTP Route:** `GET /api/v1/offers/sent`
* **Access & Permissions:** Protected via Bearer Token (Auth Required: Yes)
* **Rate Limit Policy:** 60 requests / minute
* **Query Parameters:** `page=1&limit=20`
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "sentOffers": [
      {
        "id": "66c4f8a12b3c4d5e6f7a8b88",
        "listingId": "66c4f8a12b3c4d5e6f7a8b99",
        "offeredPrice": 55000,
        "status": "ACCEPTED",
        "agreedPrice": 55000
      }
    ]
  },
  "meta": { "page": 1, "limit": 20, "totalRecords": 1, "totalPages": 1 },
  "traceId": "8e9f0a1b-2c3d-4e5f-6a7b-8c9d0e1f2a3b"
}
```

## 7. Module 6: Real-Time Chat, Anti-Fraud & Masked Telephony APIs

Powers in-app real-time messaging, heuristic regex anti-scam scanning, virtual proxy phone bridges, and full-duplex WebSocket event streams.

### 7.1 Get User Chat Inbox
* **HTTP Route:** `GET /api/v1/chats`
* **Access & Permissions:** Protected via Bearer Token (`role: buyer+`) (Auth Required: Yes)
* **Rate Limit Policy:** 60 requests / minute
* **DFD & Data Store:** `D4: chats & messages`, `D2: listings`
* **Request Headers:**
  * `Authorization`: `Bearer <JWT_ACCESS_TOKEN>`
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "inbox": [
      {
        "roomId": "66c4f8a12b3c4d5e6f7a8b99_66c4f8a12b3c4d5e6f7a8b91",
        "listing": {
          "id": "66c4f8a12b3c4d5e6f7a8b99",
          "title": "Sony PlayStation 5 Disc Edition",
          "price": 58000,
          "status": "ACTIVE",
          "thumbnailUrl": "https://cdn.marketplace.com.bd/listings/ps5_thumb_01.webp"
        },
        "counterParty": {
          "id": "66c4f8a12b3c4d5e6f7a8b91",
          "displayName": "Tanvir Ahmed",
          "avatarUrl": "https://cdn.marketplace.com.bd/avatars/tanvir.webp",
          "isNidVerified": true
        },
        "lastMessage": {
          "senderId": "66c4f8a12b3c4d5e6f7a8b90",
          "content": "Thik ache bhai, offer accept korlam.",
          "type": "TEXT",
          "sentAt": "2026-10-22T11:26:00.000Z"
        },
        "unreadCount": 0,
        "agreedPrice": 55000,
        "updatedAt": "2026-10-22T11:26:00.000Z"
      }
    ]
  },
  "meta": { "page": 1, "limit": 20, "totalRecords": 1, "totalPages": 1 },
  "traceId": "9f0a1b2c-3d4e-5f6a-7b8c-9d0e1f2a3b4c"
}
```

---

### 7.2 Initiate or Fetch Chat Room for Listing
* **HTTP Route:** `POST /api/v1/chats/start/:listingId`
* **Access & Permissions:** Protected via Bearer Token (`isNidVerified: true`) (Auth Required: Yes)
* **Rate Limit Policy:** 30 requests / minute
* **Path Parameters:**
  * `listingId`: String (ObjectId of target ad)
* **Request Body:** None
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "chatId": "66c4f8a12b3c4d5e6f7a8b77",
    "roomId": "66c4f8a12b3c4d5e6f7a8b99_66c4f8a12b3c4d5e6f7a8b91",
    "isNewRoom": false,
    "agreedPrice": 55000
  },
  "traceId": "0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d"
}
```

---

### 7.3 Get Message History
* **HTTP Route:** `GET /api/v1/chats/:id/messages`
* **Access & Permissions:** Protected via Bearer Token (Chat Participant Only) (Auth Required: Yes)
* **Rate Limit Policy:** 120 requests / minute
* **Query Parameters:** `cursor=2026-10-22T11:15:00.000Z&limit=50`
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "messages": [
      {
        "id": "66c4f8a12b3c4d5e6f7a8b66",
        "senderId": "66c4f8a12b3c4d5e6f7a8b91",
        "senderRole": "buyer",
        "type": "TEXT",
        "content": "Ami ki 1000 taka advance courier fee pathabo?",
        "isFraudWarningTriggered": true,
        "sentAt": "2026-10-22T11:15:00.000Z"
      }
    ],
    "hasMore": false
  },
  "traceId": "1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e"
}
```

---

### 7.4 Send In-Chat Message (HTTP Fallback)
* **HTTP Route:** `POST /api/v1/chats/:id/messages`
* **Access & Permissions:** Protected via Bearer Token (Chat Participant Only) (Auth Required: Yes)
* **Rate Limit Policy:** 30 messages / minute
* **DFD & Data Store:** `DF-17: Chat_Message`, `DF-18: Scam_Warning_Flag`, `P-5.0` (`D4: chats & messages`)
* **Request Body:**
```json
{
  "content": "Ami ki 1000 taka bKash advance kore rakhbo?",
  "type": "TEXT",
  "geoPin": {
    "title": "Mirpur 10 Metro Station Exit 2",
    "coordinates": [90.3686, 23.8071]
  }
}
```
* **Success Response (`201 Created`):**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "messageId": "66c4f8a12b3c4d5e6f7a8b66",
    "content": "Ami ki 1000 taka bKash advance kore rakhbo?",
    "isFraudWarningTriggered": true,
    "warningBannerInjected": "High-Risk Alert: Never send advance money via bKash/Nagad before inspecting item in person.",
    "sentAt": "2026-10-22T11:15:00.000Z"
  },
  "traceId": "2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e"
}
```

---

### 7.5 Initiate Privacy-Preserving Masked Audio Call
* **HTTP Route:** `POST /api/v1/chats/:id/proxy-call`
* **Access & Permissions:** Protected via Bearer Token (Chat Participant Only) (Auth Required: Yes)
* **Rate Limit Policy:** 5 calls / hour
* **DFD & Data Store:** `DF-21: Masked_Call_Req`, `DF-22: Call_Connect`, `P-5.4` (`E-11: Telephony Bridge`)
* **Request Body:** None
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "callSessionId": "call_9f8a7b6c-1234",
    "virtualBridgeNumber": "+8809612345678",
    "maxDurationSeconds": 600,
    "instructions": "Call the virtual bridge number displayed above. Your real mobile number is 100% hidden from the other party."
  },
  "traceId": "3b4c5d6e-7f8a-9b0c-1d2e-3f4a5b6c7d8e"
}
```

---

### 7.6 Real-Time WebSocket Gateway Specification
* **WebSocket Endpoint:** `wss://api.marketplace.com.bd/ws`
* **Handshake Authentication:** `GET /ws?token=<JWT_ACCESS_TOKEN>`

#### Client-to-Server Events
| Event Name | Payload Structure | Description |
| :--- | :--- | :--- |
| `client:send_message` | `{ roomId: string, content: string, type: "TEXT" \| "IMAGE" \| "MEETUP_PIN" }` | Emits message packet into chat room. |
| `client:typing` | `{ roomId: string, isTyping: boolean }` | Emits real-time typing indicators. |
| `client:mark_read` | `{ roomId: string, lastMessageId: string }` | Updates unread counters. |

#### Server-to-Client Events
| Event Name | Payload Structure | Description |
| :--- | :--- | :--- |
| `server:new_message` | `{ messageId, roomId, senderId, content, sentAt }` | Dispatched instantly to room participants. |
| `server:scam_warning`| `{ roomId, warningBanner, triggeredPattern }` | Injected instantly when regex detects payment scam. |
| `server:offer_status`| `{ offerId, status: "ACCEPTED" \| "VOIDED", price }` | Real-time negotiation state badge. |
| `server:unread_count`| `{ unreadTotal: number }` | In-app notification bell counter badge. |

---

## 8. Module 7: Review & Rating APIs

Enforces post-transaction verified buyer reviews, 48-hour edit window, 7-day seller reply window, and automatic aggregate seller score recalculation.

### 8.1 Submit Verified Review
* **HTTP Route:** `POST /api/v1/reviews/:listingId`
* **Access & Permissions:** Protected via Bearer Token (Verified Buyer with completed transaction) (Auth Required: Yes)
* **Rate Limit Policy:** 1 review per accepted offer
* **DFD & Data Store:** `P-7.1: Review & Rating Engine` (`D1: users`, `D3: offers`, `D5: reviews`, `D8: audit_logs`)
* **Path Parameters:**
  * `listingId`: String (ObjectId of purchased listing)
* **Request Body:**
```json
{
  "offerId": "66c4f8a12b3c4d5e6f7a8b88",
  "rating": 5,
  "comment": "Genuine product and 100% genuine seller. Tested PS5 at his home, flawless condition. Highly recommended!"
}
```
* **Success Response (`201 Created`):**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "reviewId": "66c4f8a12b3c4d5e6f7a8b50",
    "rating": 5,
    "sellerNewAverageScore": 4.85,
    "buyerEditableUntil": "2026-10-24T19:00:00.000Z",
    "message": "Review submitted successfully! You may edit this feedback within 48 hours."
  },
  "traceId": "4c5d6e7f-8a9b-0c1d-2e3f-4a5b6c7d8e9f"
}
```
* **Error Responses:**
  * `403 Forbidden` (`ERR_REVIEW_UNAUTHORIZED`): Transaction not marked as accepted, or user is not the verified buyer.
  * `409 Conflict` (`ERR_REVIEW_ALREADY_EXISTS`): Review already submitted for this transaction.

---

### 8.2 Edit Review within 48-Hour Window
* **HTTP Route:** `PATCH /api/v1/reviews/:id`
* **Access & Permissions:** Protected via Bearer Token (Review Author Only) (Auth Required: Yes)
* **Rate Limit Policy:** 5 edits / review
* **DFD & Data Store:** `D5: reviews`, `D1: users`
* **Request Body:**
```json
{
  "rating": 4,
  "comment": "Updated review: Console is great, but seller was 20 minutes late to the meetup."
}
```
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "reviewId": "66c4f8a12b3c4d5e6f7a8b50",
    "rating": 4,
    "updatedAt": "2026-10-23T10:00:00.000Z",
    "message": "Review updated within 48-hour edit window."
  },
  "traceId": "5c6d7e8f-9a0b-1c2d-3e4f-5a6b7c8d9e0f"
}
```
* **Error Responses:**
  * `403 Forbidden` (`ERR_REVIEW_WINDOW_CLOSED`): 48-hour editing window has elapsed.

---

### 8.3 Seller Public Reply within 7-Day Window
* **HTTP Route:** `POST /api/v1/reviews/:id/reply`
* **Access & Permissions:** Protected via Bearer Token (Reviewed Seller Only) (Auth Required: Yes)
* **Rate Limit Policy:** 1 reply per review
* **Request Body:**
```json
{
  "comment": "Dhonnobad Tanvir bhai! Apnar moto genuine buyer peye valo laglo."
}
```
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "reviewId": "66c4f8a12b3c4d5e6f7a8b50",
    "sellerReply": {
      "comment": "Dhonnobad Tanvir bhai! Apnar moto genuine buyer peye valo laglo.",
      "repliedAt": "2026-10-23T14:10:00.000Z"
    }
  },
  "traceId": "6c7d8e9f-0a1b-2c3d-4e5f-6a7b8c9d0e1f"
}
```

---

### 8.4 Get Public Seller Reviews
* **HTTP Route:** `GET /api/v1/reviews/seller/:sellerId`
* **Access & Permissions:** Public (No Auth Required)
* **Rate Limit Policy:** 120 requests / minute
* **Query Parameters:** `page=1&limit=20`
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "ratingAverage": 4.85,
    "totalReviews": 14,
    "distribution": { "5_star": 12, "4_star": 2, "3_star": 0, "2_star": 0, "1_star": 0 },
    "reviews": [
      {
        "id": "66c4f8a12b3c4d5e6f7a8b50",
        "buyerName": "Tanvir Ahmed",
        "rating": 5,
        "comment": "Genuine product and 100% genuine seller.",
        "sellerReply": { "comment": "Dhonnobad Tanvir bhai!" },
        "createdAt": "2026-10-22T19:00:00.000Z"
      }
    ]
  },
  "meta": { "page": 1, "limit": 20, "totalRecords": 14, "totalPages": 1 },
  "traceId": "7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f"
}
```

---

### 8.5 Report Abusive Review
* **HTTP Route:** `POST /api/v1/reviews/:id/report`
* **Access & Permissions:** Protected via Bearer Token (Auth Required: Yes)
* **Rate Limit Policy:** 10 requests / minute
* **Request Body:**
```json
{
  "reason": "HARASSMENT",
  "details": "Reviewer is using abusive profanity in the comment."
}
```
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "reviewId": "66c4f8a12b3c4d5e6f7a8b50",
    "moderationStatus": "FLAGGED",
    "message": "Review flagged and forwarded to moderation queue."
  },
  "traceId": "8c9d0e1f-2a3b-4c5d-6e7f-8a9b0c1d2e3f"
}
```

---

## 9. Module 8: Commercial B2C Storefront Subscription APIs

### 9.1 Register Commercial Storefront
* **HTTP Route:** `POST /api/v1/storefronts`
* **Access & Permissions:** Protected via Bearer Token (`role: merchant`) (Auth Required: Yes)
* **Rate Limit Policy:** 5 attempts / day
* **DFD & Data Store:** `D6: storefronts`, `D8: audit_logs`
* **Request Body:**
```json
{
  "storeSlug": "gadget-master-bd",
  "brandName": "Gadget Master BD",
  "tagline": "Official Importer of Flagship Gaming & Audio",
  "description": "Authorized retailer for PlayStation and Nintendo in Dhaka.",
  "logoUrl": "https://cdn.marketplace.com.bd/storefronts/gadgetmaster_logo.webp",
  "bannerUrl": "https://cdn.marketplace.com.bd/storefronts/gadgetmaster_banner.webp",
  "tradeLicenseNumber": "TRAD/DSCC/019283/2025",
  "tier": "PLATINUM",
  "contact": {
    "officialPhone": "01812345678",
    "officialEmail": "support@gadgetmasterbd.com",
    "physicalStoreAddress": "Shop 42, Level 4, IDB Bhaban, Dhaka",
    "websiteUrl": "https://gadgetmasterbd.com"
  }
}
```
* **Success Response (`201 Created`):**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "storefrontId": "66c4f8a12b3c4d5e6f7a8b55",
    "storeSlug": "gadget-master-bd",
    "vanityUrl": "https://marketplace.com.bd/store/gadget-master-bd",
    "status": "ACTIVE",
    "tier": "PLATINUM"
  },
  "traceId": "9c0d1e2f-3a4b-5c6d-7e8f-9a0b1c2d3e4f"
}
```
* **Error Responses:**
  * `409 Conflict` (`ERR_SLUG_TAKEN`): Store slug is already claimed by another merchant.

---

### 9.2 Get Storefront by Vanity Slug
* **HTTP Route:** `GET /api/v1/storefronts/:slug`
* **Access & Permissions:** Public (No Auth Required)
* **Rate Limit Policy:** 200 requests / minute
* **Path Parameters:**
  * `slug`: String (e.g. `gadget-master-bd`)
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "brandName": "Gadget Master BD",
    "storeSlug": "gadget-master-bd",
    "tier": "PLATINUM",
    "tradeLicenseVerified": true,
    "metrics": { "totalListings": 48, "followerCount": 850 },
    "contact": {
      "officialPhone": "01812345678",
      "physicalStoreAddress": "Shop 42, Level 4, IDB Bhaban, Dhaka"
    }
  },
  "traceId": "0d1e2f3a-4b5c-6d7e-8f9a-0b1c2d3e4f5a"
}
```

---

### 9.3 Update Merchant Storefront Profile
* **HTTP Route:** `PATCH /api/v1/storefronts/me`
* **Access & Permissions:** Protected via Bearer Token (`role: merchant`) (Auth Required: Yes)
* **Rate Limit Policy:** 30 requests / minute
* **Request Body:**
```json
{
  "tagline": "Updated: Official Nintendo & PlayStation Importer",
  "contact": {
    "officialPhone": "01812345678",
    "officialEmail": "sales@gadgetmasterbd.com",
    "physicalStoreAddress": "Shop 42-44, Level 4, IDB Bhaban, Dhaka"
  }
}
```
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "updatedAt": "2026-10-22T17:00:00.000Z",
    "message": "Storefront details updated successfully."
  },
  "traceId": "1e2f3a4b-5c6d-7e8f-9a0b-1c2d3e4f5a6b"
}
```

---

### 9.4 Get Merchant Performance Analytics Dashboard
* **HTTP Route:** `GET /api/v1/storefronts/me/analytics`
* **Access & Permissions:** Protected via Bearer Token (`role: merchant`) (Auth Required: Yes)
* **Rate Limit Policy:** 30 requests / minute
* **DFD & Data Store:** `P-6.0 / D6: storefronts, D2: listings`
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "storeSlug": "gadget-master-bd",
    "totalActiveListings": 48,
    "totalSoldListings": 124,
    "totalViews": 14200,
    "totalChatLeads": 384,
    "leadConversionRatePercent": 8.4,
    "topPerformingItems": [
      {
        "title": "Sony PlayStation 5 Disc Edition",
        "views": 342,
        "chatLeads": 8
      }
    ]
  },
  "traceId": "2e3f4a5b-6c7d-8e9f-0a1b-2c3d4e5f6a7b"
}
```

---

## 10. Module 9: Boost & Monetization Payment APIs

### 10.1 Initiate Boost Checkout Order
* **HTTP Route:** `POST /api/v1/boosts/checkout`
* **Access & Permissions:** Protected via Bearer Token (`role: user` or `role: merchant`) (Auth Required: Yes)
* **Rate Limit Policy:** 10 requests / minute
* **DFD & Data Store:** `P-6.0 / DF-23, DF-24 / D7: payments, D2: listings, D6: storefronts`
* **Request Headers:**
  * `Authorization: Bearer <JWT_ACCESS_TOKEN>`
  * `Content-Type: application/json`
* **Request Body Schema (`application/json`):**
```json
{
  "targetType": "LISTING",
  "targetId": "65f2a1b9c9e77a001f3b2001",
  "boostType": "TOP_AD_7D",
  "gateway": "BKASH",
  "customerMsisdn": "01712345678",
  "redirectUrls": {
    "successUrl": "https://buysell.bd/payment/callback/success",
    "failUrl": "https://buysell.bd/payment/callback/fail",
    "cancelUrl": "https://buysell.bd/payment/callback/cancel"
  }
}
```
* **Validation Rules:**
  * `targetType`: Enum (`LISTING`, `STOREFRONT_SUBSCRIPTION`).
  * `targetId`: Valid 24-character hexadecimal MongoDB ObjectId. Must belong to the authenticated user.
  * `boostType`: Enum (`TOP_AD_3D`, `TOP_AD_7D`, `TOP_AD_15D`, `BUMP_UP`, `STOREFRONT_TIER_BASIC`, `STOREFRONT_TIER_PRO`).
  * `gateway`: Enum (`BKASH`, `NAGAD`, `ROCKET`, `SSLCOMMERZ`).
  * `customerMsisdn`: Valid BD MSISDN format (`^01[3-9]\d{8}$`).
* **Success Response (`201 Created`):**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "paymentId": "65f2a1b9c9e77a001f3b2901",
    "transactionRef": "TXN_BK_99214710182",
    "amount": 499.00,
    "currency": "BDT",
    "gateway": "BKASH",
    "status": "INITIATED",
    "gatewayPaymentUrl": "https://checkout.sandbox.bKash.com/v1.2.0-beta/checkout/payment/tokenized/execute/TXN_BK_99214710182?token=mock_jwt_token",
    "expiresAt": "2026-10-23T00:45:00.000Z"
  },
  "traceId": "9b1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e"
}
```
* **Error Responses:**
  * `400 Bad Request`: `INVALID_TARGET` - Listing already has an active TOP_AD boost.
  * `403 Forbidden`: `NOT_OWNER` - Authenticated user does not own target listing.
  * `422 Unprocessable Entity`: `PAYMENT_GATEWAY_UNAVAILABLE` - Upstream MFS gateway timed out.

---

### 10.2 Payment Gateway IPN / Webhook Callback
* **HTTP Route:** `POST /api/v1/payments/mfs-callback`
* **Access & Permissions:** Public endpoint secured by HMAC-SHA256 Gateway Webhook Signature (Auth Required: No / Signature Verified)
* **Rate Limit Policy:** 120 requests / minute
* **DFD & Data Store:** `P-6.0 / DF-25, DF-26 / D7: payments, D2: listings, D6: storefronts, D8: audit_logs, D9: notifications`
* **Request Headers:**
  * `X-Gateway-Signature: 8b067d16d6...5a86b9f1d0` (HMAC-SHA256 signature generated with shared secret)
  * `Content-Type: application/json`
* **Request Body Schema (`application/json`):**
```json
{
  "transactionRef": "TXN_BK_99214710182",
  "gatewayTransactionId": "TRX9932014812",
  "gateway": "BKASH",
  "status": "PAID",
  "amount": 499.00,
  "currency": "BDT",
  "payerMsisdn": "01712345678",
  "paidAt": "2026-10-23T00:32:15.000Z",
  "signature": "8b067d16d6...5a86b9f1d0"
}
```
* **Validation & Security Execution:**
  * Verifies `X-Gateway-Signature` against `HMAC_SHA256(rawBody, MFS_WEBHOOK_SECRET)`.
  * Idempotency guarantee: Re-delivery of same `transactionRef` returns cached acknowledgment without double-boosting.
  * Atomic MongoDB transaction executes:
    1. Updates `payments` record status to `PAID`.
    2. Modifies `listings` or `storefronts` record with active boost timestamps.
    3. Writes immutable entry to `audit_logs` (DF-07/D8).
    4. Triggers instant push notification via `D9: notifications` to seller.
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "acknowledged": true,
    "transactionRef": "TXN_BK_99214710182",
    "boostActivated": true,
    "expiresAt": "2026-10-30T00:32:15.000Z"
  },
  "traceId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
}
```
* **Error Responses:**
  * `401 Unauthorized`: `INVALID_WEBHOOK_SIGNATURE` - HMAC signature mismatch.
  * `404 Not Found`: `TRANSACTION_NOT_FOUND` - Unknown transaction reference.
  * `409 Conflict`: `TRANSACTION_ALREADY_SETTLED` - Duplicate callback for finalized transaction.

---

### 10.3 Get User Payment & Transaction History
* **HTTP Route:** `GET /api/v1/payments/history`
* **Access & Permissions:** Protected via Bearer Token (`role: user` or `role: merchant`) (Auth Required: Yes)
* **Rate Limit Policy:** 30 requests / minute
* **DFD & Data Store:** `P-6.0 / D7: payments`
* **Request Headers:**
  * `Authorization: Bearer <JWT_ACCESS_TOKEN>`
* **Query Parameters:**
  * `status`: Enum filter (`INITIATED`, `PAID`, `FAILED`, `CANCELLED`). Optional.
  * `page`: Integer (default: 1).
  * `limit`: Integer (default: 15, max: 50).
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "total": 3,
    "page": 1,
    "limit": 15,
    "payments": [
      {
        "paymentId": "65f2a1b9c9e77a001f3b2901",
        "transactionRef": "TXN_BK_99214710182",
        "gatewayTransactionId": "TRX9932014812",
        "gateway": "BKASH",
        "amount": 499.00,
        "currency": "BDT",
        "status": "PAID",
        "boostType": "TOP_AD_7D",
        "targetListing": {
          "listingId": "65f2a1b9c9e77a001f3b2001",
          "title": "Yamaha FZS V3 Dual Channel ABS 2023"
        },
        "paidAt": "2026-10-23T00:32:15.000Z",
        "createdAt": "2026-10-23T00:30:00.000Z"
      }
    ]
  },
  "traceId": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e"
}
```
* **Error Responses:**
  * `401 Unauthorized`: `AUTH_REQUIRED` - Missing or invalid token.

---

### 10.4 Query Specific Payment Status
* **HTTP Route:** `GET /api/v1/payments/:id/status`
* **Access & Permissions:** Protected via Bearer Token (Auth Required: Yes)
* **Rate Limit Policy:** 60 requests / minute (used for polling post-checkout)
* **DFD & Data Store:** `P-6.0 / D7: payments`
* **Path Parameters:**
  * `id`: 24-character hex MongoDB ObjectId or `transactionRef`
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "paymentId": "65f2a1b9c9e77a001f3b2901",
    "transactionRef": "TXN_BK_99214710182",
    "status": "PAID",
    "amount": 499.00,
    "currency": "BDT",
    "paidAt": "2026-10-23T00:32:15.000Z"
  },
  "traceId": "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f"
}
```

---

## 11. Module 10: Trust, Safety, Moderation & Legal Compliance APIs

### 11.1 Submit Abuse or Fraud Report
* **HTTP Route:** `POST /api/v1/reports`
* **Access & Permissions:** Protected via Bearer Token (Auth Required: Yes)
* **Rate Limit Policy:** 5 reports / 10 minutes (Anti-Spam Throttling)
* **DFD & Data Store:** `P-7.0 / DF-27 / D8: audit_logs, D9: notifications, reports collection`
* **Request Headers:**
  * `Authorization: Bearer <JWT_ACCESS_TOKEN>`
  * `Content-Type: application/json`
* **Request Body Schema (`application/json`):**
```json
{
  "targetType": "LISTING",
  "targetId": "65f2a1b9c9e77a001f3b2001",
  "reason": "SCAM",
  "description": "Seller asked for bKash 2,000 BDT advance courier charge before shipping the bike.",
  "evidenceChatRoomId": "room_65f2a1b9c9e77a001f3b2001_65f2a1b9c9e77a001f3b1002"
}
```
* **Validation Rules:**
  * `targetType`: Enum (`USER`, `LISTING`, `REVIEW`).
  * `targetId`: Valid 24-character hexadecimal MongoDB ObjectId.
  * `reason`: Enum (`FRAUD`, `SCAM`, `OFFENSIVE_CONTENT`, `FAKE_LISTING`, `ABUSE`, `COUNTERFEIT_ITEM`).
  * `description`: Max 500 characters string.
  * `evidenceChatRoomId`: Optional composite room ID string.
* **Success Response (`201 Created`):**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "reportId": "65f2a1b9c9e77a001f3b3001",
    "status": "SUBMITTED",
    "ticketNumber": "REP-202610-8912",
    "message": "Report logged securely. Trust & Safety moderators will investigate within 2 hours."
  },
  "traceId": "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a"
}
```
* **Error Responses:**
  * `400 Bad Request`: `CANNOT_REPORT_SELF` - Reporter and target user are identical.
  * `429 Too Many Requests`: `REPORT_LIMIT_EXCEEDED` - Maximum 5 reports per 10 minutes.

---

### 11.2 Admin / Moderator Get Moderation Queue
* **HTTP Route:** `GET /api/v1/admin/moderation/queue`
* **Access & Permissions:** Protected via Bearer Token (`role: moderator` or `role: admin`) (Auth Required: Yes)
* **Rate Limit Policy:** 60 requests / minute
* **DFD & Data Store:** `P-7.0 / reports collection, D2: listings, D1: users`
* **Query Parameters:**
  * `targetType`: Enum (`USER`, `LISTING`, `REVIEW`). Optional.
  * `reason`: Enum. Optional.
  * `status`: Enum (`SUBMITTED`, `UNDER_REVIEW`, `RESOLVED`, `DISMISSED`). Default: `SUBMITTED`.
  * `page`: Integer (default: 1).
  * `limit`: Integer (default: 20).
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "total": 14,
    "page": 1,
    "limit": 20,
    "queue": [
      {
        "reportId": "65f2a1b9c9e77a001f3b3001",
        "ticketNumber": "REP-202610-8912",
        "targetType": "LISTING",
        "targetId": "65f2a1b9c9e77a001f3b2001",
        "targetDetails": {
          "title": "Yamaha FZS V3 Dual Channel ABS 2023",
          "price": 285000,
          "sellerMobile": "01712345678"
        },
        "reason": "SCAM",
        "description": "Seller asked for bKash 2,000 BDT advance courier charge before shipping the bike.",
        "reporterId": "65f2a1b9c9e77a001f3b1002",
        "createdAt": "2026-10-23T00:35:00.000Z"
      }
    ]
  },
  "traceId": "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b"
}
```
* **Error Responses:**
  * `403 Forbidden`: `ADMIN_ROLE_REQUIRED` - Requester is neither moderator nor admin.

---

### 11.3 Admin Resolve Moderation Ticket
* **HTTP Route:** `POST /api/v1/admin/moderation/resolve-report/:reportId`
* **Access & Permissions:** Protected via Bearer Token (`role: moderator` or `role: admin`) (Auth Required: Yes)
* **Rate Limit Policy:** 60 requests / minute
* **DFD & Data Store:** `P-7.0 / DF-28 / reports collection, D2: listings, D1: users, D8: audit_logs`
* **Path Parameters:**
  * `reportId`: Valid 24-character hex MongoDB ObjectId
* **Request Body Schema (`application/json`):**
```json
{
  "verdict": "ACTION_TAKEN",
  "action": "SUSPEND_LISTING",
  "resolutionNotes": "Confirmed fraudulent behavior attempting unverified advance payments.",
  "notifyReporter": true
}
```
* **Validation Rules:**
  * `verdict`: Enum (`ACTION_TAKEN`, `DISMISSED`, `FALSE_REPORT`).
  * `action`: Enum (`SUSPEND_LISTING`, `DELETE_REVIEW`, `WARN_USER`, `BAN_USER`, `NO_ACTION`).
  * `resolutionNotes`: Required string, min 10 chars, max 1000 chars.
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "reportId": "65f2a1b9c9e77a001f3b3001",
    "status": "RESOLVED",
    "verdict": "ACTION_TAKEN",
    "actionApplied": "SUSPEND_LISTING",
    "resolvedBy": "65f2a1b9c9e77a001f3b0001",
    "resolvedAt": "2026-10-23T00:40:00.000Z"
  },
  "traceId": "f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c"
}
```

---

### 11.4 Admin Enforce Permanent User / Device Ban
* **HTTP Route:** `POST /api/v1/admin/moderation/ban-user`
* **Access & Permissions:** Protected via Bearer Token (`role: admin`) (Auth Required: Yes)
* **Rate Limit Policy:** 20 requests / minute
* **DFD & Data Store:** `P-7.0 / DF-28 / D1: users, D2: listings, D8: audit_logs`
* **Request Body Schema (`application/json`):**
```json
{
  "userId": "65f2a1b9c9e77a001f3b1001",
  "reason": "Organized fraud ring activity - requesting off-platform advance payments across multiple listings.",
  "blacklistDevices": true,
  "blacklistNid": true,
  "suspendAllListings": true
}
```
* **Validation Rules:**
  * `userId`: Valid 24-character hex MongoDB ObjectId. Cannot be another admin account.
  * `reason`: Minimum 10 characters string.
  * `blacklistDevices`: Boolean. Adds user bound device fingerprint hashes to `blacklisted_devices`.
  * `blacklistNid`: Boolean. Marks deterministic NID hash in `users` collection as permanently blacklisted.
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "userId": "65f2a1b9c9e77a001f3b1001",
    "status": "BANNED",
    "listingsSuspendedCount": 4,
    "blacklistedDeviceFingerprintsCount": 1,
    "nidBlacklisted": true,
    "bannedAt": "2026-10-23T00:42:00.000Z"
  },
  "traceId": "0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d"
}
```

---

### 11.5 Judicial Warrant Audit Export
* **HTTP Route:** `POST /api/v1/legal/audit/export`
* **Access & Permissions:** Protected via Bearer Token (`role: legal_officer` or `role: admin`) (Auth Required: Yes)
* **Rate Limit Policy:** 5 requests / hour (Strict Audit Constraint)
* **DFD & Data Store:** `P-7.0 / DF-29, DF-30 / D8: audit_logs, D1: users`
* **Request Headers:**
  * `Authorization: Bearer <JWT_ACCESS_TOKEN>`
  * `Content-Type: application/json`
* **Request Body Schema (`application/json`):**
```json
{
  "warrantId": "WAR-DHAKA-2026-08129",
  "issuingAuthority": "Chief Metropolitan Magistrate Court Dhaka",
  "targetMobileNumber": "01712345678",
  "startDate": "2026-09-01T00:00:00.000Z",
  "endDate": "2026-10-23T23:59:59.000Z",
  "exportFormat": "JSON"
}
```
* **Validation Rules:**
  * `warrantId`: Required non-empty string.
  * `issuingAuthority`: Required string.
  * Either `targetUserId` or `targetMobileNumber` must be provided.
  * `exportFormat`: Enum (`JSON`, `CSV`).
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "exportId": "EXP-20261023-7721",
    "warrantId": "WAR-DHAKA-2026-08129",
    "generatedAt": "2026-10-23T00:45:00.000Z",
    "targetUser": {
      "userId": "65f2a1b9c9e77a001f3b1001",
      "mobileNumber": "01712345678",
      "legalName": "Tanvir Ahmed",
      "nidNumberDecrypted": "19942691234567890",
      "dateOfBirth": "1994-05-12",
      "isNidVerified": true
    },
    "totalAuditRecords": 18,
    "chainIntegrityVerified": true,
    "exportSignatureSha256": "4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b",
    "downloadUrl": "https://s3.ap-southeast-1.amazonaws.com/buysell-legal-exports/EXP-20261023-7721.enc?sig=secure_expiring_url"
  },
  "traceId": "1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e"
}
```
* **Error Responses:**
  * `403 Forbidden`: `LEGAL_OFFICER_ROLE_REQUIRED` - User lacking legal officer clearance.

---

### 11.6 Verify Cryptographic WORM Chain Integrity
* **HTTP Route:** `POST /api/v1/legal/audit/verify-chain`
* **Access & Permissions:** Protected via Bearer Token (`role: legal_officer` or `role: admin`) (Auth Required: Yes)
* **Rate Limit Policy:** 10 requests / hour
* **DFD & Data Store:** `P-7.0 / DF-30 / D8: audit_logs`
* **Request Body Schema (`application/json`):**
```json
{
  "fromBlockDate": "2026-10-01T00:00:00.000Z",
  "toBlockDate": "2026-10-23T23:59:59.000Z"
}
```
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "totalRecordsScanned": 14250,
    "isChainValid": true,
    "brokenLinkAt": null,
    "merkleRootHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "verifiedAt": "2026-10-23T00:46:12.000Z"
  },
  "traceId": "2c3d4e5f-6a7b-8c9d-0e1f-2a3b4c5d6e7f"
}
```

---

## 12. Module 11: Notification Center APIs

### 12.1 Get In-App User Notifications
* **HTTP Route:** `GET /api/v1/notifications`
* **Access & Permissions:** Protected via Bearer Token (Auth Required: Yes)
* **Rate Limit Policy:** 60 requests / minute
* **DFD & Data Store:** `P-7.0 / D9: notifications`
* **Request Headers:**
  * `Authorization: Bearer <JWT_ACCESS_TOKEN>`
* **Query Parameters:**
  * `isRead`: Boolean filter (`true` or `false`). Optional.
  * `page`: Integer (default: 1).
  * `limit`: Integer (default: 20, max: 50).
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "unreadCount": 2,
    "total": 5,
    "page": 1,
    "limit": 20,
    "notifications": [
      {
        "notificationId": "65f2a1b9c9e77a001f3b4001",
        "type": "OFFER_RECEIVED",
        "title": "New Offer Received!",
        "body": "A buyer made an offer of 275,000 BDT on Yamaha FZS V3.",
        "entityType": "OFFER",
        "entityId": "65f2a1b9c9e77a001f3b2005",
        "isRead": false,
        "createdAt": "2026-10-23T00:20:00.000Z"
      },
      {
        "notificationId": "65f2a1b9c9e77a001f3b4002",
        "type": "KYC_VERIFIED",
        "title": "NID Verification Successful",
        "body": "Your identity has been verified. The Verified Blue Shield badge is now active on your profile.",
        "entityType": "USER",
        "entityId": "65f2a1b9c9e77a001f3b1001",
        "isRead": true,
        "readAt": "2026-10-23T00:22:00.000Z",
        "createdAt": "2026-10-23T00:15:00.000Z"
      }
    ]
  },
  "traceId": "3d4e5f6a-7b8c-9d0e-1f2a-3b4c5d6e7f8a"
}
```

---

### 12.2 Mark Single Notification As Read
* **HTTP Route:** `PATCH /api/v1/notifications/:id/read`
* **Access & Permissions:** Protected via Bearer Token (Auth Required: Yes)
* **Rate Limit Policy:** 60 requests / minute
* **DFD & Data Store:** `P-7.0 / D9: notifications`
* **Path Parameters:**
  * `id`: 24-character hexadecimal MongoDB ObjectId
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "notificationId": "65f2a1b9c9e77a001f3b4001",
    "isRead": true,
    "readAt": "2026-10-23T00:48:00.000Z"
  },
  "traceId": "4e5f6a7b-8c9d-0e1f-2a3b-4c5d6e7f8a9b"
}
```

---

### 12.3 Mark All Notifications As Read
* **HTTP Route:** `POST /api/v1/notifications/read-all`
* **Access & Permissions:** Protected via Bearer Token (Auth Required: Yes)
* **Rate Limit Policy:** 20 requests / minute
* **DFD & Data Store:** `P-7.0 / D9: notifications`
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "markedReadCount": 2,
    "readAt": "2026-10-23T00:48:30.000Z"
  },
  "traceId": "5f6a7b8c-9d0e-1f2a-3b4c-5d6e7f8a9b0c"
}
```

---

### 12.4 Register FCM Device Push Token
* **HTTP Route:** `POST /api/v1/notifications/register-fcm`
* **Access & Permissions:** Protected via Bearer Token (Auth Required: Yes)
* **Rate Limit Policy:** 30 requests / minute
* **DFD & Data Store:** `P-1.0, P-7.0 / D1: users, D9: notifications`
* **Request Body Schema (`application/json`):**
```json
{
  "fcmToken": "cE3f8lK9qZs:APA91bH7x...",
  "devicePlatform": "ANDROID",
  "appVersion": "1.0.0"
}
```
* **Validation Rules:**
  * `fcmToken`: Valid non-empty FCM device registration token string.
  * `devicePlatform`: Enum (`ANDROID`, `IOS`, `WEB`).
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "registered": true,
    "devicePlatform": "ANDROID",
    "updatedAt": "2026-10-23T00:49:00.000Z"
  },
  "traceId": "6a7b8c9d-0e1f-2a3b-4c5d-6e7f8a9b0c1d"
}
```

---

## 13. System Consistency & Master Document Synchronization

This API Specification (v2.0.0) is 100% synchronized with the complete engineering documentation suite:
* **[PRD.md](file:///Volumes/Disk%20%28%20G%20%29/Buy%20Sell%20Software/PRD.md):** Implements all Functional Requirements (FR-1 through FR-11) including OTP lockouts, 30 ads/24h quota, 48h review edit window, 7d seller replies, and 5-day storefront grace periods.
* **[architecture.md](file:///Volumes/Disk%20%28%20G%20%29/Buy%20Sell%20Software/architecture.md):** Aligns with Layered Monolith architecture, Express routing layer, Redis caching & token blacklists, and CSFLE encryption standards.
* **[dfd.md](file:///Volumes/Disk%20%28%20G%20%29/Buy%20Sell%20Software/dfd.md):** Fully maps all 30 directional data flows (`DF-01` through `DF-30`), 7 sub-processes (`P-1.0` through `P-7.1`), and 9 data stores (`D1` through `D9`).
* **[database.md](file:///Volumes/Disk%20%28%20G%20%29/Buy%20Sell%20Software/database.md) & [schema-database.md](file:///Volumes/Disk%20%28%20G%20%29/Buy%20Sell%20Software/schema-database.md):** Adheres strictly to all 11 MongoDB collection schemas (`users`, `listings`, `offers`, `chat_messages`, `reviews`, `storefronts`, `payments`, `audit_logs`, `notifications`, `counters`, `blacklisted_devices`).
* **[erd.md](file:///Volumes/Disk%20%28%20G%20%29/Buy%20Sell%20Software/erd.md):** Preserves relational integrity, composite foreign keys, and 1-to-N relationships across all endpoints.
