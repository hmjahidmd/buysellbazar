# UI/UX & Wireframe Specification (`ui-ux.md`)
## Next-Gen Verified C2C & B2C Marketplace Platform (Bangladesh)

| Document Attribute | Specification |
| :--- | :--- |
| **Document Version** | 1.0.0 (Master UI/UX Design System & Screen Blueprint) |
| **Target Frontend Framework** | Next.js 14+ (App Router, React Server Components, Tailwind CSS, Lucide Icons) |
| **Mobile Strategy** | Mobile-First Responsive PWA + Native App Parity (Desktop / Tablet / Mobile) |
| **Localization & Locale** | Dual-Language: Bengali (বাংলা - Default) & English (EN) |
| **Primary References** | `PRD.md` (v1.1.0+), `architecture.md` (v2.0.0), `dfd.md` (v1.0.1), `database.md` (v2.0.0), `api-spec.md` (v1.0.0) |
| **Core Design Goal** | Ultra-high trust, friction-free 100% free ad creation, intuitive geo-drilldown, transparent negotiation |

---

## 1. Design System & Global Design Tokens

The visual language establishes immediate credibility and trust in a classifieds market historically plagued by scams.

### 1.1 Color Palette & Semantics

| Token Name | Hex Code | Tailwind Class | Semantic Purpose |
| :--- | :--- | :--- | :--- |
| **Primary Brand (Emerald)** | `#059669` | `bg-emerald-600` | Primary action buttons ("Post Free Ad", "Make an Offer", "Accept Offer"). Represents financial safety. |
| **Secondary Brand (Deep Navy)** | `#0F172A` | `bg-slate-900` | Navigation headers, dark backgrounds, high-contrast typography. Represents enterprise authority. |
| **Verified Badge (Sky Blue)** | `#0284C7` | `text-sky-600` | Certified e-KYC NID verification checkmark and official merchant seals. |
| **Boost Gold (Amber)** | `#D97706` | `bg-amber-500` | Top Ad highlight ribbons, golden listing cards, bumped indicators. |
| **Scam Alert (Crimson)** | `#DC2626` | `bg-red-600` | Real-time chat anti-fraud warning banners, account ban notices, policy error alerts. |
| **Surface Neutral (Slate Light)** | `#F8FAFC` | `bg-slate-50` | Background canvas for product cards, input fields, and modal containers. |
| **Border Neutral** | `#E2E8F0` | `border-slate-200` | Card borders, table dividers, input boundaries. |

---

### 1.2 Typography & Dual-Language Font Pairing
* **English Primary:** `Inter`, system sans-serif (`font-sans`). Clean, modern numerals for BDT pricing and technical specs.
* **Bengali Primary:** `Hind Siliguri` / `Noto Sans Bengali`. Legible Bengali typography rendered with balanced line-height (`leading-relaxed`) for mobile screens.

---

### 1.3 Trust Badges & Verification Visual Language
* 🛡️ **Verified NID Seal:** Blue badge with white checkmark `[✓ Verified NID]`. Pinned adjacent to seller usernames.
* ⚡ **Top Ad Ribbon:** Amber badge `[★ TOP AD]`. Displays on pinned cards with a subtle golden glow border (`ring-2 ring-amber-400`).
* 🏬 **Merchant Storefront Shield:** Purple badge `[🏬 Official Store]`. Rendered on commercial B2C seller profile cards.
* 🔒 **Escrow / Safe Deal Badge:** Green badge `[🤝 Hand-to-Hand Deal in Mirpur]`. Safe public exchange meetup pin.

---

## 2. Global Information Architecture & Navigation

The platform provides seamless responsive navigation across desktop (sticky header with search & geo-filter) and mobile (bottom navigation bar for one-thumb reachability).

### 2.1 Desktop Header Wireframe Layout

```
+-------------------------------------------------------------------------------------------------------+
|  [LOGO: BuySellBD]  |  [📍 Location: Dhaka ▾]  |  [🔍 Search in 2,400+ Ads...         ] [Search Btn]  |
|                                                                                                       |
|  [Electronics] [Vehicles] [Property] [Home & Living] [Fashion] [Jobs] | [🌐 বাংলা] [Chat (3)] [👤] [ + POST FREE AD ] |
+-------------------------------------------------------------------------------------------------------+
```

### 2.2 Mobile Navigation Layout (Bottom App Bar)

```
+---------------------------------------------------------------------------+
|   [🏠 Home]     [📂 Categories]     [➕ Post Ad]     [💬 Chat (2)]     [👤 Account]  |
+---------------------------------------------------------------------------+
```

---

## 3. Screen Flow 1: Authentication & Device Onboarding

### 3.1 Flow Overview
1. User enters 11-digit mobile number (`013`-`019`).
2. Gateway generates and dispatches 6-digit SMS OTP via Telco SMS Gateway.
3. 60-second resend cooldown timer with 3-minute OTP expiration countdown.
4. Auto-detects SMS code on mobile; binds hardware device fingerprint (Max 3 devices limit).
5. 5 failed attempts trigger a 30-minute lockout modal with countdown.

### 3.2 Wireframe: Screen 1.1 — Mobile Login & OTP Challenge

```
+---------------------------------------------------------+
|                    BuySell Bangladesh                   |
|                  Verify Your Mobile Number              |
+---------------------------------------------------------+
|                                                         |
|   Enter your 11-digit mobile number to log in or        |
|   create a 100% free trading account.                   |
|                                                         |
|   Mobile Number:                                        |
|   +880  [ 01712345678                                 ] |
|                                                         |
|   [  SEND 6-DIGIT OTP CODE  (Primary Emerald CTA)     ] |
|                                                         |
|   ------------------------- OR ------------------------ |
|                                                         |
|   [  Enter 6-Digit OTP:  [ 4 ] [ 8 ] [ 9 ] [ 2 ] [ 0 ] [ 1 ]  ]
|                                                         |
|   Resend OTP in: 00:48 seconds                          |
|                                                         |
|   🔒 Your device (Xiaomi Redmi Note 12) will be         |
|      securely registered (1 of 3 active devices).       |
|                                                         |
|   [  VERIFY & PROCEED  ]                                |
+---------------------------------------------------------+
```

---

## 4. Screen Flow 2: e-KYC Identity Clearance & Binding

### 4.1 Flow Overview
1. **Intro:** Explains why verification is required (Buyer safety, fraud elimination, instant ad publishing unlock).
2. **Step 1 — Document Ingestion:** User selects Smart Card or Plastic NID. Live camera frame guides alignment. Extracts OCR data instantly.
3. **Step 2 — 3D Biometric Liveness:** Real-time oval frame. User blinks and turns head slightly (3-second anti-spoof test).
4. **Step 3 — Verdict:** Score >= 95% triggers instant celebratory screen with Verified NID Badge unlock.

### 4.2 Wireframe: Screen 2.2 — Dual-Sided NID & Selfie Capture

```
+---------------------------------------------------------+
|  <- Back              e-KYC Verification                |
+---------------------------------------------------------+
|   [ Step 1: NID Scan ]  ➔  [ Step 2: 3D Selfie ]  ➔  [ Complete ]
|                                                         |
|   +-------------------------------------------------+   |
|   |                 CAMERA VIEWFINDER               |   |
|   |   .-----------------------------------------.   |   |
|   |   |  Fit Front Side of NID Card in Box      |   |   |
|   |   |                                         |   |   |
|   |   |  [ 👤 Photo ]      NAME: MD. RAFIQUL    |   |   |
|   |   |                    NID: 19942692500...  |   |   |
|   |   '-----------------------------------------'   |   |
|   +-------------------------------------------------+   |
|                                                         |
|   Status: ✓ Edges Detected | ✓ Good Lighting            |
|                                                         |
|   [ 📸 CAPTURE FRONT SIDE ]                             |
|                                                         |
|   🔒 Protected by Bank-Grade Client-Side Encryption    |
|      Your NID number is never stored in plain text.     |
+---------------------------------------------------------+
```

---

## 5. Screen Flow 3: 100% Free Ad Creation Wizard

### 5.1 Flow Overview
* **Zero Cost Invariant:** The user is never prompted for payment during the ad creation journey.
* **Step 1: Category Selection:** Interactive icons for Electronics, Vehicles, Property, etc.
* **Step 2: Details & Pricing:** Title (10-100 chars), Dynamic Category Attributes, Condition, Price (BDT), Negotiable toggle.
* **Step 3: Geographic Drilldown & Photos:** Division ➔ District ➔ Thana selector. Multi-file uploader with real-time WebP compression, watermarking preview, and duplicate pHash check.
* **Step 4: Confirmation & Voluntary Boost:** Listing goes live instantly. Voluntary modal offers optional Top Ad / Bump Up boosts.

### 5.2 Wireframe: Free Ad Creation Wizard

```
+------------------------------------------------------------------------------------+
|  Post a Free Ad (100% Free - No Hidden Fees)                    Step 2 of 3        |
+------------------------------------------------------------------------------------+
|                                                                                    |
|  Category: Electronics > Gaming Consoles [ Change ]                                |
|                                                                                    |
|  Ad Title: (10 to 100 characters)                                                  |
|  [ Sony PlayStation 5 Disc Edition (with 2 DualSense Controllers)              ]   |
|                                                                                    |
|  Condition:  (•) Like New   ( ) Brand New   ( ) Good   ( ) Fair                    |
|                                                                                    |
|  Price (BDT):                                                                      |
|  [ 58,000                   ]  [✓] Price is Negotiable                             |
|                                                                                    |
|  Product Photos (Upload 1 to 10 Photos):                                           |
|  +--------------+  +--------------+  +--------------+  +------------------------+  |
|  | [Img 1: Front] |  | [Img 2: Back] |  | [Img 3: Box] |  | [ + Add Photo ]         |  |
|  | Watermarked ✓|  | Watermarked ✓|  | Watermarked ✓|  | Drag & Drop WebP / JPG |  |
|  +--------------+  +--------------+  +--------------+  +------------------------+  |
|                                                                                    |
|  Location:                                                                         |
|  Division: [ Dhaka ▾ ]  District: [ Dhaka ▾ ]  Thana: [ Mirpur ▾ ]                 |
|                                                                                    |
|  Daily Free Ad Quota: 3 of 30 used today (27 free ads remaining).                  |
|                                                                                    |
|  [  PUBLISH FREE AD NOW (Instant Live)  ]                                          |
+------------------------------------------------------------------------------------+
```

---

## 6. Screen Flow 4: Search, Geolocation & Discovery Feed

### 6.1 Multi-Parametric Geographic Drilldown Drawer
Allows the user to drill down: **Dhaka Division ➔ Dhaka District ➔ Mirpur Thana ➔ Section 10**.

### 6.2 Search Feed Layout with Pinned Top Ads

```
+------------------------------------------------------------------------------------+
| Filters: [Dhaka > Mirpur ✖] [Electronics > Consoles ✖] [Price: 30k-70k ✖] [Reset]  |
| Sort By: [ Top Ads First ▾ ]                        Showing 1-20 of 48 verified ads|
+------------------------------------------------------------------------------------+
|                                                                                    |
|  ⭐ TOP AD - HIGHEST VISIBILITY (Pinned Priority Card)                             |
|  +--------------------+---------------------------------------------------------+  |
|  |                    |  Sony PlayStation 5 Disc Edition (Like New)             |  |
|  |  [ THUMBNAIL PHOTO |  Tk 58,000 (Negotiable)                                 |  |
|  |    WITH WATERMARK  |  📍 Mirpur, Dhaka • 2 hours ago                         |  |
|  |   "BuySellBD.com"  |  Seller: Rafiqul Islam [✓ Verified NID] ⭐ 4.85 (14)    |  |
|  |                    |  [★ TOP AD BADGE]                          [♡ Save Ad]  |  |
|  +--------------------+---------------------------------------------------------+  |
|                                                                                    |
|  REGULAR CHRONOLOGICAL FREE AD                                                     |
|  +--------------------+---------------------------------------------------------+  |
|  |  [ THUMBNAIL PHOTO |  Xbox Series X 1TB Console (Complete Box)               |  |
|  |                    |  Tk 52,000 (Fixed)                                      |  |
|  |                    |  📍 Uttara, Dhaka • 5 hours ago                         |  |
|  |                    |  Seller: Tanvir Ahmed [✓ Verified NID] ⭐ 5.0 (6)       |  |
|  +--------------------+---------------------------------------------------------+  |
+------------------------------------------------------------------------------------+
```

---

## 7. Screen Flow 5: Listing Details & Seller Trust Card

### 7.1 Key Screen Components
* **Media Gallery:** Swipable high-res WebP gallery with zoom, anti-scraping watermarks, and photo indicators.
* **Price & Badges:** Prominent BDT price tag, negotiable badge, condition pill.
* **Safe Meetup Advisor:** Highlights verified safe public exchange points (e.g. Police Plaza, Metro Rail Stations).
* **Seller Trust Card:** NID verification date, star rating breakdown, deals completed counter.
* **Action CTAs:** "Make an Offer" (Emerald), "Chat with Seller" (Navy), "Call via Masked Proxy" (Phone Icon).

### 7.2 Wireframe: Product Details & Seller Trust Card

```
+------------------------------------------------------------------------------------+
|  <- Back to Search Results                                  [Share] [♡ Save Item]  |
+------------------------------------------------------------------------------------+
|  +-------------------------------------+   Sony PlayStation 5 Disc Edition         |
|  |                                     |   Tk 58,000  [Negotiable] [Like New]      |
|  |                                     |                                           |
|  |     ACTIVE IMAGE IN CAROUSEL        |   📍 Location: Mirpur Section 10, Dhaka   |
|  |      (Embedded Watermark)           |   📅 Posted: Today at 2:15 PM (Ad ID: 8b99)|
|  |                                     |                                           |
|  |                                     |   +-------------------------------------+ |
|  +-------------------------------------+   |         SELLER TRUST PROFILE        | |
|    [Thumb 1] [Thumb 2] [Thumb 3] [Thumb 4] | Rafiqul Islam  [✓ Verified NID]     | |
|                                            | ⭐⭐⭐⭐⭐ 4.85 (14 verified reviews)| |
|  Description:                              | Member since: August 2026           | |
|  Used PS5 Disc Edition in pristine         | ⚡ Usually replies within 10 minutes | |
|  condition. Comes with 2 controllers,      | Deals Completed: 12 hand-to-hand    | |
|  original box and cables. Test in Mirpur.  +-------------------------------------+ |
|                                                                                    |
|  🛡️ Safe Trading Tip: Meet in public places (e.g. Mirpur 10 Metro Station). Never |
|     send bKash/Nagad advance courier fees before inspecting item in person.        |
|                                                                                    |
|  +-------------------------------------------------------------------------------+ |
|  | [ 🤝 MAKE AN OFFER (BDT) ]   [ 💬 CHAT WITH SELLER ]   [ 📞 MASKED CALL ]     | |
|  +-------------------------------------------------------------------------------+ |
+------------------------------------------------------------------------------------+
```

---

## 8. Screen Flow 6: Real-Time Chat & In-App Negotiation

### 8.1 Flow Overview
1. Split chat layout with sticky product header card.
2. Buyer taps "Make an Offer": slider/modal allows proposed price (must be <= listing price).
3. In-chat offer card shows state: `PENDING`, `ACCEPTED`, `DECLINED`.
4. If regex detects scam keywords ("bKash advance", "courier fee"), an unmistakable Crimson Warning Banner appears in the message thread.
5. "Call Seller" button establishes a private audio bridge through virtual telephony without revealing raw phone numbers.

### 8.2 Wireframe: Negotiation Chat with Anti-Scam Banner & Offer Badge

```
+------------------------------------------------------------------------------------+
|  <- Chats   Rafiqul Islam [✓ Verified NID]                     [ 📞 Safe Call ]    |
+------------------------------------------------------------------------------------+
|  [Item Preview: Sony PS5 Disc Edition | Listed: Tk 58,000 | Mirpur, Dhaka]         |
+------------------------------------------------------------------------------------+
|                                                                                    |
|  [Buyer]: Bhai, assalamu alaikum. Console ta ki available ache?        (11:02 AM)  |
|                                                                                    |
|  [Seller]: Wa alaikum assalam. Ha bhai, available ache.                (11:04 AM)  |
|                                                                                    |
|  +------------------------------------------------------------------------------+  |
|  | 🤝 BINDING OFFER SUBMITTED BY BUYER                                          |  |
|  | Offered Price: Tk 55,000 (Expires in 23h 40m)                                |  |
|  | Note: "Ajkei Mirpur 10 theke cash payment diye pick korbo."                  |  |
|  | Status: [ ✓ ACCEPT OFFER ]   [ 🔄 COUNTER-OFFER ]   [ ✖ DECLINE ]             |  |
|  +------------------------------------------------------------------------------+  |
|                                                                                    |
|  [Buyer]: Ami ki 1000 taka advance courier fee pathabo?                (11:15 AM)  |
|                                                                                    |
|  +------------------------------------------------------------------------------+  |
|  | ⚠️ HIGH-RISK SCAM WARNING TRIGGERED!                                         |  |
|  | Warning: Never send advance money via bKash/Nagad for courier delivery.     |  |
|  | Our platform requires in-person inspection and hand-to-hand cash exchange.   |  |
|  +------------------------------------------------------------------------------+  |
|                                                                                    |
|  [Seller]: Na bhai, advance lagbe na. Direct ashen, dekhe cash payment diben.      |
|                                                                                    |
|  +------------------------------------------------------------------------------+  |
|  | [Type message...]                             [📍 Send Pin] [📎] [ ➤ Send ]   |  |
|  +------------------------------------------------------------------------------+  |
+------------------------------------------------------------------------------------+
```

---

## 9. Screen Flow 7: Post-Transaction Verified Review & Rating

### 9.1 Flow Overview
* Seller marks item as `SOLD` and confirms buyer.
* Buyer receives in-app alert: "Rate your deal with Rafiqul Islam".
* 1 to 5 star rating + text feedback.
* 48-hour edit window allows buyer to adjust rating if post-purchase issues arise.
* Seller receives notification and can write a single public reply within 7 days.

### 9.2 Wireframe: Verified Review Modal

```
+---------------------------------------------------------+
|                  Rate Your Transaction                  |
+---------------------------------------------------------+
|   Item: Sony PlayStation 5 Disc Edition                 |
|   Seller: Rafiqul Islam [✓ Verified NID]                |
|                                                         |
|   How was your trading experience?                      |
|   [ ★ ] [ ★ ] [ ★ ] [ ★ ] [ ★ ]  (5.0 / 5.0 - Excellent)|
|                                                         |
|   Write your feedback (10 to 500 characters):           |
|   +-------------------------------------------------+   |
|   | Genuine product and 100% genuine seller. Tested |   |
|   | PS5 at his home, flawless condition. Highly     |   |
|   | recommended for anyone buying electronics!      |   |
|   +-------------------------------------------------+   |
|                                                         |
|   ⏱️ You can edit this review within 48 hours.          |
|                                                         |
|   [ SUBMIT VERIFIED REVIEW ]                            |
+---------------------------------------------------------+
```

---

## 10. Screen Flow 8: Commercial B2C Merchant Storefront Portal

### 10.1 Flow Overview
* Vanity URL: `/store/gadget-master-bd`
* Branded banner, verified business badge, trade license verification ribbon.
* Tabs: "All Products (48)", "Best Sellers", "About Store", "Merchant Reviews".
* Merchant Dashboard: Real-time analytics showing views, chat leads, and deal conversion rate.

### 10.2 Wireframe: Storefront Page & Merchant Analytics

```
+------------------------------------------------------------------------------------+
|  [ BRAND BANNER: GADGET MASTER BANGLADESH - Flagship Gaming & Audio Gear ]         |
+------------------------------------------------------------------------------------+
|  [ LOGO ]  Gadget Master BD [🏬 PLATINUM MERCHANT] [✓ Trade License Verified]     |
|            Official Importer | IDB Bhaban, Agargaon, Dhaka | 📞 01812345678       |
|            ⭐ 4.95 (182 reviews) • 850 Followers • 48 Active Items                 |
|                                                                                    |
|  [ Follow Store ]   [ Contact Merchant ]   [ Share Storefront ]                    |
+------------------------------------------------------------------------------------+
|  Merchant KPI Dashboard (Visible to Store Owner):                                  |
|  +-------------------+  +-------------------+  +-------------------+  +----------+ |
|  | Total Store Views |  | Chat Leads (30d)  |  | Deal Conversion   |  | Plan     | |
|  | 14,200 (+18%)     |  | 384 Inquiries     |  | 8.4% Lead-to-Deal |  | Platinum | |
|  +-------------------+  +-------------------+  +-------------------+  +----------+ |
+------------------------------------------------------------------------------------+
```

---

## 11. Screen Flow 9: Voluntary Boosts & MFS Payment Checkout

### 11.1 Flow Overview
* Voluntary upsell after ad publication or from "My Ads" dashboard.
* Options: Top Ad (3 Days: 199 BDT, 7 Days: 399 BDT, 15 Days: 699 BDT), Daily Bump Up (149 BDT).
* One-click checkout redirects to SSLCommerz / bKash / Nagad payment sheet.
* Instant return to listing with Top Ad golden badge active.

### 11.2 Wireframe: Boost Promotion Modal

```
+---------------------------------------------------------+
|                  Boost Your Listing 🚀                  |
+---------------------------------------------------------+
|   Get up to 10x more buyer responses on your PS5 Ad!   |
|                                                         |
|   Select Promotion Tier:                                |
|   (•) ⭐ TOP AD - 7 DAYS                           Tk 399|
|       Pinned to the very top of category & search       |
|       Golden badge + highlighted border                 |
|                                                         |
|   ( ) ⚡ DAILY BUMP UP - 7 DAYS                    Tk 149|
|       Refreshes your ad to the top once every 24 hours  |
|                                                         |
|   ( ) 👑 FEATURED - 30 DAYS                        Tk 899|
|       Homepage banner showcase + Top Ad priority        |
|                                                         |
|   Select Payment Method:                                |
|   [ (•) bKash ]   [ ( ) Nagad ]   [ ( ) Card / Cards ]  |
|                                                         |
|   Total Amount: 399 BDT (Inclusive of all taxes)        |
|                                                         |
|   [  PAY 399 BDT VIA BKASH (Instant Activation)  ]      |
+---------------------------------------------------------+
```

---

## 12. Screen Flow 10: Platform Moderator & Trust Admin Portal

### 12.1 Key Admin Views
* **Flagged Content Queue:** Listings auto-flagged by regex (phone numbers inside images, firearms, drugs) or with 3+ user reports.
* **Low-Confidence KYC Review (70%–94%):** Side-by-side view comparing NID portrait against 3D selfie video with zoom and 1-click Approve/Reject buttons.
* **Cascade Ban Action Modal:** 1-click button to Ban user, suspend all active listings, blacklist hardware devices, and write WORM audit log.

### 12.2 Wireframe: Moderator KYC & Ad Resolution Console

```
+------------------------------------------------------------------------------------+
|  Admin Trust & Safety Console                           Moderator: Fahim [Tier 2]  |
+------------------------------------------------------------------------------------+
|  [ KYC Queue (12) ]  |  [ Flagged Ads (8) ]  |  [ User Reports (5) ]  |  [ WORM Logs]|
+------------------------------------------------------------------------------------+
|                                                                                    |
|  Reviewing KYC Exception: User #66c4f8a (Confidence: 84.2%)                        |
|                                                                                    |
|  +-------------------------------+   +-------------------------------+             |
|  |   EXTRACTED NID PORTRAIT      |   |   LIVE 3D SELFIE CAPTURE      |             |
|  |                               |   |                               |             |
|  |   [ NID Photo: Md. Rafiqul ]  |   |   [ Liveness Video Stream ]   |             |
|  |                               |   |                               |             |
|  +-------------------------------+   +-------------------------------+             |
|  Extracted Name: Md. Rafiqul Islam   | Liveness Micro-blink: Confirmed (98%)       |
|  NID Number: 19942692500003412       | Face Similarity Match: 84.2%                |
|  DOB: 12 May 1994                    | Device: Xiaomi Redmi Note 12                |
|                                                                                    |
|  [ ✓ APPROVE & ISSUE BADGE ]     [ ✖ REJECT (Enter Reason) ]     [ ⚠️ ESCALATE ]   |
+------------------------------------------------------------------------------------+
```

---

*This document serves as the formal UI/UX & Wireframe specification for the Next-Gen Verified C2C & B2C Marketplace. All component hierarchies, responsive grids, and interaction flows are synchronized with [PRD.md](file:///Volumes/Disk%20(%20G%20)/Buy%20Sell%20Software/PRD.md), [architecture.md](file:///Volumes/Disk%20(%20G%20)/Buy%20Sell%20Software/architecture.md), [dfd.md](file:///Volumes/Disk%20(%20G%20)/Buy%20Sell%20Software/dfd.md), [database.md](file:///Volumes/Disk%20(%20G%20)/Buy%20Sell%20Software/database.md), and [api-spec.md](file:///Volumes/Disk%20(%20G%20)/Buy%20Sell%20Software/api-spec.md).*
