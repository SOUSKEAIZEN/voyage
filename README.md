# 🌌 Voyage - The Ultimate MICE Platform

## 🎯 The Problem We Solve
Organizing premium Meetings, Incentives, Conferences, and Exhibitions (MICE) often involves fragmented tools, uninspiring user interfaces, and poor performance under scale. Event organizers struggle to provide a cohesive, branded experience that wows high-end guests while simultaneously managing complex data, real-time networking, and role-based access securely.

Voyage solves this by delivering a **Multi-Software as a Service (MSaaS)** platform. It provides isolated, ultra-premium event nodes (Tenants) backed by a unified Global Ledger. It empowers organizers to spin up cinematic, high-performance event hubs with built-in real-time networking, graceful degradation, and hardware-accelerated visuals—all managed from a powerful centralized Control Plane.

## ✨ Key Features
- **Multi-Tenant Architecture:** Host isolated event "Nodes" securely within a single overarching MSaaS ecosystem.
- **Cinematic & Hardware-Accelerated UI:** An ultra-premium, dark-mode design inspired by Vercel and Apple TV, utilizing GPU-accelerated Framer Motion animations for buttery-smooth 60fps performance.
- **The Abyss (Real-Time Mesh):** A robust WebSocket and Redis-backed transport layer for instant presence broadcast, ephemeral direct messaging, and global feed echos.
- **Advanced Role-Based Access Control (RBAC):** Fine-grained permissions across Superadmins, Tenant Admins, and Event Staff with isolated organization nodes.
- **Global Directory & Edge Routing:** A public hub for discovering events, combined with Vercel Edge Middleware for dynamic custom domain resolution directly to event nodes.
- **Graceful UI Degradation:** Built to maintain core aesthetics and functionality regardless of user device capability or network speed.

## 💻 Technologies Used

### Frontend
- **Framework:** Next.js 14+ (App Router), React
- **Styling & UI:** Tailwind CSS v4, Shadcn/UI
- **Animations:** Framer Motion (GPU-optimized)
- **Routing:** Vercel Edge Middleware for custom domains

### Backend
- **Core:** Node.js, Express.js
- **Database:** PostgreSQL (hosted on Aiven) via `pg` pool
- **Real-Time Engine:** Socket.io paired with Valkey (Redis) via `ioredis`
- **Security:** JWT Authentication, strict UTC time enforcement

## 🚀 Getting Started

Follow these instructions to spin up the local development environment.

### 1. Start the Backend
Navigate to the backend directory, install dependencies, and start the server:
```bash
cd backend
npm install
npm run dev
```
*(Ensure your `.env` is configured with your PostgreSQL connection, Redis URL, and JWT secrets as per the backend setup).*

### 2. Start the Frontend
In a new terminal window, navigate to the frontend directory, install dependencies, and run the Next.js development server:
```bash
cd frontend
npm install
npm run dev
```
The platform should now be accessible at `http://localhost:3000`.

---

## System Terminology
To maintain consistency across the codebase, please adhere to the following terminology:
- **Tenants / Nodes:** Events. Each event operates as an isolated node within the MSaaS ecosystem.
- **Global Ledger:** The PostgreSQL database acting as the single source of truth for all data.
- **Control Plane:** The admin dashboard used for system-wide configuration and event management.

## Global Tech Stack
- **Frontend:** Next.js (App Router), React, Tailwind CSS, Framer Motion, `next/image`.
- **Backend:** Node.js, Express.js.
- **Database:** PostgreSQL (hosted on Aiven) accessed via `pg` pool.

## Database Architecture
The Global Ledger is built on PostgreSQL hosted on Aiven via `pg` pool, with all timezones strictly locked to UTC.

- **`events`:** `id`, `slug`, `name`, `start_date`, `end_date`, `description`, `location`, `is_public`, `created_at`, `mesh_dissolved`, `custom_domain`, `theme_config`, `organization_id`.
- **`event_images`:** `id`, `event_id` (FK CASCADE), `image_url`, `display_order`, `created_at`.
- **`guests` (The Global Identity Vault):** `id` (UUID), `full_name`, `email` (UNIQUE), `phone`, `created_at`, `updated_at`.
- **`event_registrations` (The Event Junction):** `id` (UUID), `guest_id` (FK CASCADE), `event_id` (FK CASCADE), `access_code`, `id_number`, `id_document_url`, `dietary_restrictions`, `current_state`, `error_log`, `registered_at`. (Unique constraint on `guest_id` + `event_id` to prevent duplicate registrations).
- **`event_schedules` (The Itinerary Engine):** `id` (UUID), `event_id` (FK CASCADE), `title`, `description`, `speaker_name`, `location`, `start_time`, `end_time`, `created_at`, `updated_at`.
- **`admins`:** `id`, `email`, `password_hash`, `role`, `organization_id`, `created_at`.
- **`organizations`:** `id`, `name`, `created_at`.
- **`event_staff_assignments`:** `admin_id`, `event_id`, `created_at`.
- **`global_echos`:** `id`, `event_id`, `guest_id`, `content`, `created_at`.
- **`finalized_echos`:** `id`, `event_id`, `initiator_id`, `receiver_id`, `created_at`.
- **`direct_messages`:** `id`, `event_id`, `sender_id`, `receiver_id`, `content`, `created_at`.

## Role-Based Access Control (RBAC)
The platform supports RBAC with isolated Organization nodes, specifically defined as:
- **Superadmins**
- **Tenant Admins**
- **Event Staff**

## Architectural Subsystems
- **Abyss Core:** An ephemeral state engine subsystem handling real-time features. It utilizes WebSockets (Socket.io) and Redis.

## Complete Project Structure

```text
.
├── backend
│   ├── .gitignore
│   ├── README.md
│   ├── database
│   │   └── init.sql
│   ├── migrate.js
│   ├── package-lock.json
│   ├── package.json
│   ├── scripts
│   │   ├── printSchema.js
│   │   └── setupDb.js
│   └── src
│       ├── config
│       │   ├── cache.js
│       │   └── db.js
│       ├── controllers
│       │   ├── abyssController.js
│       │   ├── authController.js
│       │   ├── eventController.js
│       │   ├── guestController.js
│       │   └── tenantController.js
│       ├── middleware
│       │   ├── authMiddleware.js
│       │   └── socketAuth.js
│       ├── routes
│       │   ├── authRoutes.js
│       │   ├── eventRoutes.js
│       │   ├── guestRoutes.js
│       │   └── tenantRoutes.js
│       ├── server.js
│       ├── services
│       │   ├── emailService.js
│       │   ├── meshDissolver.js
│       │   └── vercelService.js
│       └── utils
│           ├── createAdmin.js
│           ├── logger.js
│           ├── migrateAbyss.js
│           └── migrateThemes.js
├── frontend
│   ├── .gitignore
│   ├── README.md
│   ├── components.json
│   ├── eslint.config.mjs
│   ├── jsconfig.json
│   ├── next.config.mjs
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── public
│   │   ├── file.svg
│   │   ├── globe.svg
│   │   ├── next.svg
│   │   ├── vercel.svg
│   │   └── window.svg
│   └── src
│       ├── app
│       │   ├── [eventSlug]
│       │   │   ├── layout.js
│       │   │   ├── page.js
│       │   │   ├── portal
│       │   │   │   ├── dashboard
│       │   │   │   │   └── page.js
│       │   │   │   └── page.js
│       │   │   └── register
│       │   │       └── page.js
│       │   ├── admin
│       │   │   ├── [eventSlug]
│       │   │   │   └── page.js
│       │   │   ├── events
│       │   │   │   ├── [eventSlug]
│       │   │   │   │   └── edit
│       │   │   │   │       └── page.js
│       │   │   │   └── new
│       │   │   │       └── page.js
│       │   │   ├── login
│       │   │   │   └── page.js
│       │   │   └── page.js
│       │   ├── favicon.ico
│       │   ├── globals.css
│       │   ├── layout.js
│       │   ├── ledger
│       │   │   └── page.js
│       │   ├── page.js
│       │   └── test-cursor
│       │       └── page.js
│       ├── components
│       │   ├── AbyssProvider.jsx
│       │   ├── GuestIntakeForm.jsx
│       │   ├── portal
│       │   │   ├── GlobalFeed.jsx
│       │   │   └── GuestDirectory.jsx
│       │   └── ui
│       │       ├── ambient-aurora.jsx
│       │       ├── custom-cursor.jsx
│       │       ├── encrypted-text.jsx
│       │       ├── interactive-aura.jsx
│       │       └── luma-dropdown.jsx
│       ├── lib
│       │   └── utils.js
│       ├── proxy.js
│       └── services
│           └── api.js
```