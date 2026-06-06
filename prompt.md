# Master Architecture & Project Overview

## Main Goal
The core goal of this repository is to provide a high-end, multi-tenant MICE (Meetings, Incentives, Conferences, and Exhibitions) platform. It operates as a Multi-Software as a Service (MSaaS) and is engineered to deliver unparalleled performance and visual fidelity for premium events.

## What is done in the project & Capabilities
- **Multi-Tenant Architecture:** Capable of hosting isolated events (Tenants/Nodes) within a broader MSaaS ecosystem. Includes a comprehensive RBAC (Role-Based Access Control) system supporting Superadmins, Tenant Admins, and Event Staff with isolated Organization nodes.
- **Global Ledger:** Fully operational PostgreSQL database hosted on Aiven, enforcing strict UTC timezones for all timestamps.
- **Admin Control Plane:** Live management dashboard used for system-wide configuration, node deployment, event management, organization creation, and staff provisioning.
- **Advanced UI/UX Architecture:**
  - Ultra-premium, dark-mode, cinematic aesthetics.
  - Hardware Acceleration: Complex visual effects like moving CSS Gaussian blurs have been eliminated in favor of Framer Motion and GPU-accelerated concurrent z-index fading and ambient-aurora gradients.
  - Graceful UI Degradation across varying network and device capabilities.
  - Custom React Server Components and Next.js App Router for high-performance navigation and rendering.
- **Global Directory & Edge Routing:** Public-facing hub for discovering events, combined with Vercel Edge Middleware (`proxy.js`) for dynamic custom domain resolution directly mapped to specific event Nodes.
- **Telemetry Rule:** Comprehensive server-side logging at every step of the backend data pipeline.
- **The Abyss (Transport Layer):** WebSocket and Valkey (Redis) integration for real-time mesh connectivity. Supports ephemeral event meshes and direct messaging between guests with horizontal scaling capabilities. Includes background CRON jobs for node dissolution and email extraction pipelines.

## Complete Project Structure

```text
.
├── README.md
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
├── prompt.md
└── tree.txt

33 directories, 74 files
```

## Detailed File and Folder Definitions

### Root Folders and Files
- **`. ` (Root Folder):** The top-level workspace that houses the entire project, splitting the architecture into standalone `backend` and `frontend` applications.
- **`README.md`:** Master architecture overview documenting main principles, global milestones, architecture terminology, and tech stack.
- **`prompt.md`:** This document itself, which contains a generated comprehensive breakdown of the project status, capabilities, architecture, and database structure.

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

## Database Structure

```
================================================================
   [Architecture] DATABASE SCHEMA MAPPER Engaged
================================================================


 TABLE: ADMINS
------------------------------------------------------------------------------------------
COLUMN NAME               | DATA TYPE                 | NULLABLE   | DEFAULT
------------------------------------------------------------------------------------------
id                        | uuid                      | NO         | uuid_generate_v4()
email                     | varchar(255)              | NO         | NULL
password_hash             | varchar(255)              | NO         | NULL
created_at                | timestamp with time zone  | YES        | CURRENT_TIMESTAMP
role                      | varchar(50)               | YES        | 'superadmin'::character varying
organization_id           | integer                   | YES        | NULL
------------------------------------------------------------------------------------------

 TABLE: DIRECT_MESSAGES
------------------------------------------------------------------------------------------
COLUMN NAME               | DATA TYPE                 | NULLABLE   | DEFAULT
------------------------------------------------------------------------------------------
id                        | uuid                      | NO         | uuid_generate_v4()
event_id                  | integer                   | YES        | NULL
sender_id                 | uuid                      | YES        | NULL
receiver_id               | uuid                      | YES        | NULL
content                   | text                      | NO         | NULL
created_at                | timestamp with time zone  | YES        | CURRENT_TIMESTAMP
------------------------------------------------------------------------------------------

 TABLE: EVENT_IMAGES
------------------------------------------------------------------------------------------
COLUMN NAME               | DATA TYPE                 | NULLABLE   | DEFAULT
------------------------------------------------------------------------------------------
id                        | uuid                      | NO         | uuid_generate_v4()
event_id                  | integer                   | NO         | NULL
image_url                 | text                      | NO         | NULL
display_order             | integer                   | YES        | 0
created_at                | timestamp with time zone  | YES        | CURRENT_TIMESTAMP
------------------------------------------------------------------------------------------

 TABLE: EVENT_REGISTRATIONS
------------------------------------------------------------------------------------------
COLUMN NAME               | DATA TYPE                 | NULLABLE   | DEFAULT
------------------------------------------------------------------------------------------
id                        | uuid                      | NO         | uuid_generate_v4()
guest_id                  | uuid                      | YES        | NULL
event_id                  | integer                   | YES        | NULL
access_code               | varchar(255)              | NO         | NULL
id_number                 | varchar(100)              | NO         | NULL
id_document_url           | text                      | NO         | NULL
dietary_restrictions      | text                      | YES        | NULL
current_state             | integer                   | YES        | 0
error_log                 | text                      | YES        | NULL
registered_at             | timestamp with time zone  | YES        | CURRENT_TIMESTAMP
------------------------------------------------------------------------------------------

 TABLE: EVENT_SCHEDULES
------------------------------------------------------------------------------------------
COLUMN NAME               | DATA TYPE                 | NULLABLE   | DEFAULT
------------------------------------------------------------------------------------------
id                        | uuid                      | NO         | uuid_generate_v4()
event_id                  | integer                   | YES        | NULL
title                     | varchar(255)              | NO         | NULL
description               | text                      | YES        | NULL
speaker_name              | varchar(255)              | YES        | NULL
location                  | varchar(255)              | YES        | NULL
start_time                | timestamp with time zone  | NO         | NULL
end_time                  | timestamp with time zone  | NO         | NULL
created_at                | timestamp with time zone  | YES        | CURRENT_TIMESTAMP
updated_at                | timestamp with time zone  | YES        | CURRENT_TIMESTAMP
------------------------------------------------------------------------------------------

 TABLE: EVENT_STAFF_ASSIGNMENTS
------------------------------------------------------------------------------------------
COLUMN NAME               | DATA TYPE                 | NULLABLE   | DEFAULT
------------------------------------------------------------------------------------------
admin_id                  | uuid                      | NO         | NULL
event_id                  | integer                   | NO         | NULL
created_at                | timestamp with time zone  | YES        | CURRENT_TIMESTAMP
------------------------------------------------------------------------------------------

 TABLE: EVENTS
------------------------------------------------------------------------------------------
COLUMN NAME               | DATA TYPE                 | NULLABLE   | DEFAULT
------------------------------------------------------------------------------------------
id                        | integer                   | NO         | nextval('events_id_seq'::regclass)
slug                      | varchar(255)              | NO         | NULL
name                      | varchar(255)              | NO         | NULL
created_at                | timestamp without time zone | YES        | CURRENT_TIMESTAMP
is_public                 | boolean                   | YES        | true
description               | text                      | YES        | NULL
location                  | varchar(255)              | YES        | NULL
start_date                | timestamp with time zone  | YES        | NULL
end_date                  | timestamp with time zone  | YES        | NULL
mesh_dissolved            | boolean                   | YES        | false
custom_domain             | varchar(255)              | YES        | NULL
theme_config              | jsonb                     | YES        | '{}'::jsonb
organization_id           | integer                   | YES        | NULL
------------------------------------------------------------------------------------------

 TABLE: FINALIZED_ECHOS
------------------------------------------------------------------------------------------
COLUMN NAME               | DATA TYPE                 | NULLABLE   | DEFAULT
------------------------------------------------------------------------------------------
id                        | uuid                      | NO         | uuid_generate_v4()
event_id                  | integer                   | NO         | NULL
initiator_id              | uuid                      | NO         | NULL
receiver_id               | uuid                      | NO         | NULL
created_at                | timestamp with time zone  | YES        | CURRENT_TIMESTAMP
------------------------------------------------------------------------------------------

 TABLE: GLOBAL_ECHOS
------------------------------------------------------------------------------------------
COLUMN NAME               | DATA TYPE                 | NULLABLE   | DEFAULT
------------------------------------------------------------------------------------------
id                        | uuid                      | NO         | uuid_generate_v4()
event_id                  | integer                   | YES        | NULL
guest_id                  | uuid                      | YES        | NULL
content                   | varchar(500)              | NO         | NULL
created_at                | timestamp with time zone  | YES        | CURRENT_TIMESTAMP
------------------------------------------------------------------------------------------

 TABLE: GUESTS
------------------------------------------------------------------------------------------
COLUMN NAME               | DATA TYPE                 | NULLABLE   | DEFAULT
------------------------------------------------------------------------------------------
id                        | uuid                      | NO         | uuid_generate_v4()
full_name                 | varchar(255)              | NO         | NULL
email                     | varchar(255)              | NO         | NULL
phone                     | varchar(50)               | YES        | NULL
created_at                | timestamp with time zone  | YES        | CURRENT_TIMESTAMP
updated_at                | timestamp with time zone  | YES        | CURRENT_TIMESTAMP
------------------------------------------------------------------------------------------

 TABLE: ORGANIZATIONS
------------------------------------------------------------------------------------------
COLUMN NAME               | DATA TYPE                 | NULLABLE   | DEFAULT
------------------------------------------------------------------------------------------
id                        | integer                   | NO         | nextval('organizations_id_seq'::regclass)
name                      | varchar(255)              | NO         | NULL
created_at                | timestamp with time zone  | YES        | CURRENT_TIMESTAMP
------------------------------------------------------------------------------------------

✅ System Architecture Mapping Complete.

```


update prompt.md file in root folder containing everything, our main goal, complete project structure in detail including every file and folder (except node_modules), what is done in the project and what can it do, its capabilities and first read every file then define each file in detail about what it does and define each folder about what it does and database structure  and in the end of the file copy this prompt and do not copy anything beyond this line.
current database
