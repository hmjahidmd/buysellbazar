# Next-Gen Verified C2C & B2C Marketplace Platform (Bangladesh)

## Overview & Architecture

This repository contains the complete production-grade source code and architectural documentation for Bangladesh's first 100% verified classifieds marketplace.

### Tech Stack
* **Frontend:** Next.js 14+ (App Router, React Server Components, Tailwind CSS, Lucide Icons, TypeScript)
* **Backend:** Node.js, Express.js, TypeScript, Socket.io (WebSocket), Winston, Zod
* **Database:** MongoDB Atlas (M10+ Replica Set), Mongoose v8, CSFLE, Hashed Sharding
* **Caching & Queue:** Redis v7, BullMQ
* **Cloud Storage:** Cloudflare R2 / AWS S3
* **Identity & Moderation:** Govt Smart NID OCR, 3D Facial Liveness, AI Image Screening

---

## Directory Organization

```
/
├── PRD.md              # Complete Product Requirements Document (v1.1.0+)
├── architecture.md     # Production Layered Monolith Architecture Specification (v2.0.0)
├── dfd.md              # Formal Data Flow Diagram Specification (v1.0.1)
├── database.md         # Database Architecture, Indexes, Aggregations & Transactions (v2.0.0)
├── schema-database.md  # Master Database Schemas: Interfaces, $jsonSchema & Mongoose Models (v1.0.0)
├── api-spec.md         # REST & WebSocket API Blueprint & Request/Response Contracts (v1.0.0)
├── erd.md              # Standalone Entity Relationship Diagram (v1.0.0)
├── ui-ux.md            # Screen Flows, ASCII Wireframes & Design System (v1.0.0)
│
├── backend/            # Express.js + TypeScript Layered Monolith API & WebSocket Server
│   ├── src/
│   │   ├── config/     # Database, Logger, Environment Configuration
│   │   ├── core/       # Error Handlers, Middlewares, Utilities, Constants
│   │   ├── modules/    # Auth, Users, Listings, Offers, Chats, Reviews, Boosts
│   │   ├── app.ts      # Express Factory with Helmet, CORS, Compression
│   │   └── server.ts   # HTTP & WebSocket Server Bootstrap with Graceful Shutdown
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
└── frontend/           # Next.js 14+ App Router Client Application
    ├── src/
    │   └── app/        # App Router Pages, Layouts, Globals CSS
    ├── package.json
    ├── tailwind.config.ts
    ├── postcss.config.js
    └── tsconfig.json
```

---

## Getting Started

### 1. Backend Setup
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```
* API Gateway runs on `http://localhost:5000/api/v1`
* WebSocket Gateway runs on `ws://localhost:5000/ws`
* Health Check: `http://localhost:5000/health`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
* Web application runs on `http://localhost:3000`
