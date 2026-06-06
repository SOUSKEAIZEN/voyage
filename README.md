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
│   ├── .gitignore
│   ├── README.md
│   ├── database
│   │   └── init.sql
│   ├── migrate.js
│   ├── package-lock.json
│   ├── package.json
│   ├── scripts
│   │   ├── printSchema.js
│   │   └── setupDb.js
│   └── src
│       ├── config
│       │   ├── cache.js
│       │   └── db.js
│       ├── controllers
│       │   ├── abyssController.js
│       │   ├── authController.js
│       │   ├── eventController.js
│       │   ├── guestController.js
│       │   └── tenantController.js
│       ├── middleware
│       │   ├── authMiddleware.js
│       │   └── socketAuth.js
│       ├── routes
│       │   ├── authRoutes.js
│       │   ├── eventRoutes.js
│       │   ├── guestRoutes.js
│       │   └── tenantRoutes.js
│       ├── server.js
│       ├── services
│       │   ├── emailService.js
│       │   ├── meshDissolver.js
│       │   └── vercelService.js
│       └── utils
│           ├── createAdmin.js
│           ├── logger.js
│           ├── migrateAbyss.js
│           └── migrateThemes.js
├── frontend
│   ├── .gitignore
│   ├── README.md
│   ├── components.json
│   ├── eslint.config.mjs
│   ├── jsconfig.json
│   ├── next.config.mjs
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── public
│   │   ├── file.svg
│   │   ├── globe.svg
│   │   ├── next.svg
│   │   ├── vercel.svg
│   │   └── window.svg
│   └── src
│       ├── app
│       │   ├── [eventSlug]
│       │   │   ├── layout.js
│       │   │   ├── page.js
│       │   │   ├── portal
│       │   │   │   ├── dashboard
│       │   │   │   │   └── page.js
│       │   │   │   └── page.js
│       │   │   └── register
│       │   │       └── page.js
│       │   ├── admin
│       │   │   ├── [eventSlug]
│       │   │   │   └── page.js
│       │   │   ├── events
│       │   │   │   ├── [eventSlug]
│       │   │   │   │   └── edit
│       │   │   │   │       └── page.js
│       │   │   │   └── new
│       │   │   │       └── page.js
│       │   │   ├── login
│       │   │   │   └── page.js
│       │   │   └── page.js
│       │   ├── favicon.ico
│       │   ├── globals.css
│       │   ├── layout.js
│       │   ├── ledger
│       │   │   └── page.js
│       │   ├── page.js
│       │   └── test-cursor
│       │       └── page.js
│       ├── components
│       │   ├── AbyssProvider.jsx
│       │   ├── GuestIntakeForm.jsx
│       │   ├── portal
│       │   │   ├── GlobalFeed.jsx
│       │   │   └── GuestDirectory.jsx
│       │   └── ui
│       │       ├── ambient-aurora.jsx
│       │       ├── custom-cursor.jsx
│       │       ├── encrypted-text.jsx
│       │       ├── interactive-aura.jsx
│       │       └── luma-dropdown.jsx
│       ├── lib
│       │   └── utils.js
│       ├── proxy.js
│       └── services
│           └── api.js
└── README.md
```

## Detailed File and Folder Definitions

### Root Folders and Files
- **`. ` (Root Folder):** The top-level workspace that houses the entire project, splitting the architecture into standalone `backend` and `frontend` applications.
- **`README.md`:** Master architecture overview documenting main principles, global milestones, architecture terminology, tech stack, file definitions, and database structure.

### Backend (`/backend`)
The backend is an Express.js Node application. It serves the REST API, manages PostgreSQL connectivity, encapsulates the Data Layer, provides real-time WebSocket infrastructure (The Abyss), and enforces strict telemetry.

- **`backend/.gitignore`:** Excludes untracked or sensitive backend files from version control.
- **`backend/README.md`:** Details the specific backend setup process, documents the folder structure, and mandates the rigorous "Telemetry Rule."
- **`backend/package.json`:** Defines Node.js dependencies for the backend (express, socket.io, ioredis, pg) and configures CLI scripts.
- **`backend/package-lock.json`:** Locks backend dependency versions to ensure deterministic installations.
- **`backend/migrate.js`:** Command-line script serving as an entry point to manually or automatically run database schema migrations.

#### Database (`backend/database`)
Contains SQL assets to bootstrap or mutate the database state.
- **`backend/database/init.sql`:** Master SQL script to initialize tables with precise constraints, unique indices, and foreign keys.

#### Scripts (`backend/scripts`)
Utilities to automate initial environment bootstrapping and maintenance.
- **`backend/scripts/printSchema.js`:** Utility script that prints the current PostgreSQL database schema out to the console.
- **`backend/scripts/setupDb.js`:** Programmatic script that connects to the Aiven PostgreSQL ledger and executes the `init.sql` blueprint.

#### Source Code (`backend/src`)
Houses all server-side application logic, separated by domain and architectural layers.

**`backend/src/config/`**
Contains core system connection configurations.
- **`backend/src/config/cache.js`:** Configures and connects to the Valkey/Redis cache layer using `ioredis`.
- **`backend/src/config/db.js`:** Configures the PostgreSQL connection pool setup using the `pg` library.

**`backend/src/controllers/`**
Express route handlers that separate core business logic from routing.
- **`backend/src/controllers/abyssController.js`:** Central control hub for The Abyss (WebSockets). Handles ephemeral mesh logic, echos, direct messaging, and presence.
- **`backend/src/controllers/authController.js`:** Manages administrative control plane authentication, admin login, and issuing JWT access tokens.
- **`backend/src/controllers/eventController.js`:** Handles full CRUD lifecycle for Event Tenants and dispatches Vercel Edge proxy routing updates.
- **`backend/src/controllers/guestController.js`:** Manages attendee onboarding, ticket registrations, guest profiles, and JWT token minting for attendees.
- **`backend/src/controllers/tenantController.js`:** Enforces RBAC logic for Organization and User provisioning.

**`backend/src/middleware/`**
Request interceptors that authenticate and authorize requests.
- **`backend/src/middleware/authMiddleware.js`:** Secures REST API endpoints by parsing JWT tokens and enforcing RBAC.
- **`backend/src/middleware/socketAuth.js`:** Validates JWT payloads attached to socket handshake headers to authorize users entering The Abyss.

**`backend/src/routes/`**
Registers HTTP API paths to corresponding controller actions.
- **`backend/src/routes/authRoutes.js`:** Binds endpoints for admin login and session creation (`/api/auth`).
- **`backend/src/routes/eventRoutes.js`:** Binds endpoints for retrieving, updating, creating, and deleting Event data (`/api/events`).
- **`backend/src/routes/guestRoutes.js`:** Binds endpoints for managing attendees within specific event nodes (`/api/guests`).
- **`backend/src/routes/tenantRoutes.js`:** Binds endpoints for admin management of platform organizations (`/api/tenants`).

**`backend/src/server.js`**
Master entrypoint and Control Plane boot sequence. Wraps the Express app, mounts APIs, initializes Sockets, and connects Database and Cache layers.

**`backend/src/services/`**
Encapsulates external API integrations and background orchestration.
- **`backend/src/services/emailService.js`:** Dispatches transactional emails utilizing a direct HTTPS REST API transport.
- **`backend/src/services/meshDissolver.js`:** Ephemeral CRON background worker that routiney queries for expired Nodes and dissolves the websocket mesh.
- **`backend/src/services/vercelService.js`:** Integrates with Vercel APIs for dynamic custom domain edge routing logic for MSaaS white-labeling.

**`backend/src/utils/`**
Shared helper functions and administrative scripts.
- **`backend/src/utils/createAdmin.js`:** CLI utility script to manually seed a root administrative superuser into the Ledger.
- **`backend/src/utils/logger.js`:** Implements standardized telemetry logging.
- **`backend/src/utils/migrateAbyss.js`:** Database schema mutation script adding `mesh_dissolved` boolean state.
- **`backend/src/utils/migrateThemes.js`:** Schema migration script expanding the MSaaS platform for Edge-Rendering configurations.

### Frontend (`/frontend`)
The presentation layer built on the Next.js 14+ App Router, utilizing React, Tailwind CSS v4, and Framer Motion. Engineered for GPU optimization.

- **`frontend/.gitignore`:** Excludes local build directories and node modules from version control.
- **`frontend/README.md`:** Details the frontend tech stack, setup process, and UI architecture philosophies.
- **`frontend/components.json`:** Configuration for Shadcn/UI integration.
- **`frontend/eslint.config.mjs`:** Custom ESLint configuration leveraging Next.js Core Web Vitals rules.
- **`frontend/jsconfig.json`:** Configures JavaScript path aliases.
- **`frontend/next.config.mjs`:** Core Next.js framework configuration exposing environment variables and whitelisting image sources.
- **`frontend/package.json`:** Declares frontend Node.js dependencies and project npm scripts.
- **`frontend/package-lock.json`:** Locks frontend dependency versions.
- **`frontend/postcss.config.mjs`:** Configures PostCSS loader toolchain for Tailwind CSS.

#### Public Assets (`frontend/public/`)
Static public assets served directly by the web server.
- **`frontend/public/file.svg`:** Standard placeholder file icon.
- **`frontend/public/globe.svg`:** Standard globe icon vector graphic.
- **`frontend/public/next.svg`:** Next.js brand logo vector.
- **`frontend/public/vercel.svg`:** Vercel brand logo vector.
- **`frontend/public/window.svg`:** Standard placeholder window icon graphic.

#### Source Code (`frontend/src/`)
Contains React components, layout templates, utility functions, and API wrappers.

**`frontend/src/app/`**
Next.js App Router root defining nested directory routing.
- **`frontend/src/app/favicon.ico`:** Default favicon.
- **`frontend/src/app/globals.css`:** Master CSS stylesheet injecting Tailwind utility layers and establishing the dark-mode aesthetic.
- **`frontend/src/app/layout.js`:** Root layout component enveloping the entire HTML structure, mounting CustomCursor.
- **`frontend/src/app/page.js`:** Global Public Directory index path showcasing public events.
- **`frontend/src/app/ledger/page.js`:** Administrative page designed for viewing global ledger data and guest metrics.
- **`frontend/src/app/test-cursor/page.js`:** Developer sandbox testing page for GPU-accelerated cursor animations.

**`frontend/src/app/[eventSlug]/`**
Dynamic route grouping serving as an isolated Tenant context.
- **`frontend/src/app/[eventSlug]/layout.js`:** Layout wrapper managing cinematic hero engine, background slides, textures, and applying tenant theme config variables.
- **`frontend/src/app/[eventSlug]/page.js`:** Public-facing Event Hub homepage detailing context for a specific event node.
- **`frontend/src/app/[eventSlug]/register/page.js`:** Guest onboarding page to collect user credentials.

**`frontend/src/app/[eventSlug]/portal/`**
Gated access area for approved attendees post-registration.
- **`frontend/src/app/[eventSlug]/portal/page.js`:** Portal login lobby screen for returning guests to verify entry via access codes.
- **`frontend/src/app/[eventSlug]/portal/dashboard/page.js`:** Interior interactive dashboard of an event portal, initialized with AbyssProvider for real-time mesh features.

**`frontend/src/app/admin/`**
Overarching Control Plane dashboard interfaces.
- **`frontend/src/app/admin/page.js`:** Main administrative dashboard overview listing deployed events and global metrics.
- **`frontend/src/app/admin/login/page.js`:** Secure authentication gateway page demanding admin credentials.

**`frontend/src/app/admin/events/`**
Control Plane sub-routes for event modification.
- **`frontend/src/app/admin/events/new/page.js`:** Admin form interface to configure and deploy a brand new Event node.
- **`frontend/src/app/admin/events/[eventSlug]/edit/page.js`:** Admin form interface to edit or teardown an existing deployed Event.

**`frontend/src/app/admin/[eventSlug]/`**
- **`frontend/src/app/admin/[eventSlug]/page.js`:** Admin-specific detailed ledger view of an individual Node's metrics.

**`frontend/src/components/`**
Reusable React component blocks.
- **`frontend/src/components/AbyssProvider.jsx`:** Global React Context linking socket.io-client with the backend Abyss engine for real-time presence broadcast.
- **`frontend/src/components/GuestIntakeForm.jsx`:** Client-side form securely collecting new guest registrations.

**`frontend/src/components/portal/`**
Rendered exclusively inside the gated portal environment.
- **`frontend/src/components/portal/GlobalFeed.jsx`:** Real-time chat timeline pulling live echos and broadcasting outgoing ones over the Abyss network.
- **`frontend/src/components/portal/GuestDirectory.jsx`:** Real-time interactive user list directory allowing discovery and direct messaging.

**`frontend/src/components/ui/`**
Low-level, atomic UI components engineered for high style and Framer Motion transitions.
- **`frontend/src/components/ui/ambient-aurora.jsx`:** Hardware-accelerated, zero-blur dynamic radial gradient backdrop.
- **`frontend/src/components/ui/custom-cursor.jsx`:** Animated alternative cursor with linear interpolation liquid ring trailing effects.
- **`frontend/src/components/ui/encrypted-text.jsx`:** Styled text component with visual scrambling "decoding" effect.
- **`frontend/src/components/ui/interactive-aura.jsx`:** Placeholder architectural component returning null to free GPU cycles.
- **`frontend/src/components/ui/luma-dropdown.jsx`:** Framer Motion-animated generic dropdown menu.

**`frontend/src/lib/`**
Generic framework-agnostic helper functions.
- **`frontend/src/lib/utils.js`:** Shared functions, notably a customized `cn` function for dynamic Tailwind CSS class merging.

**`frontend/src/proxy.js`**
Vercel Edge Middleware. Dynamically intercepts requests to custom whitelabel domains, resolves them internally to backend Tenant Nodes, injects theme data, and optimizes routing paths.

**`frontend/src/services/`**
Client-side network API wrapper modules.
- **`frontend/src/services/api.js`:** Centralized fetch function wrapper orchestrating network communication back to backend REST endpoints.
