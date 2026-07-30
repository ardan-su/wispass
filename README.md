# 🎫 WisataPass

Online tourist attraction ticketing system — built with Node.js, Express, MariaDB, Socket.IO, and Vanilla JavaScript (ES6 Modules).

---

## Tech Stack

| Layer       | Technology                                                   |
|-------------|--------------------------------------------------------------|
| Backend     | Node.js 18+, Express 4, mysql2 (MariaDB)                    |
| Frontend    | Vanilla JS (ES6 Modules), HTML5, CSS3                        |
| Database    | MariaDB 10.6+ / MySQL 8+                                     |
| Auth        | JWT (access + refresh tokens), bcrypt                        |
| Realtime    | Socket.IO 4                                                  |
| QR Codes    | AES-256-GCM encrypted payload, HMAC-SHA256 signed            |
| Payments    | Midtrans QRIS (sandbox + production)                         |
| File Upload | Multer                                                       |
| Security    | Helmet, CORS, express-rate-limit, express-validator          |
| Logging     | Winston (console + daily file rotation)                      |

---

## Project Structure

```
wisatapass/
├── backend/
│   ├── server.js                   ← Entry point: HTTP + Socket.IO + scheduled jobs
│   ├── src/
│   │   ├── app.js                  ← Express app, middleware chain, route mounts
│   │   ├── config/
│   │   │   ├── database.js         ← mysql2 connection pool
│   │   │   ├── jwt.js              ← sign / verify helpers
│   │   │   └── multer.js           ← file upload config
│   │   ├── database/
│   │   │   ├── migrate.js          ← npm run migrate
│   │   │   └── seed.js             ← npm run seed
│   │   ├── middleware/
│   │   │   ├── auth.js             ← authenticate, authorize, requirePermission
│   │   │   ├── errorHandler.js     ← centralized error response
│   │   │   ├── validate.js         ← express-validator runner
│   │   │   └── auditLog.js         ← audit trail middleware
│   │   ├── modules/
│   │   │   ├── auth/               ← login, register, refresh, profile
│   │   │   ├── admin/              ← sites, promotions, reviews, notifications,
│   │   │   │                           customers, branches
│   │   │   ├── tickets/            ← orders, order details, tickets
│   │   │   ├── qr/                 ← QR generation, scanning, validation
│   │   │   ├── payment/            ← QRIS, proof upload, confirm/reject
│   │   │   ├── dashboard/          ← admin + customer stats
│   │   │   ├── reports/            ← revenue, visitors, ticket sales, QR scans
│   │   │   ├── users/              ← admin user management
│   │   │   └── settings/           ← app key/value settings
│   │   ├── sockets/
│   │   │   └── socketService.js    ← all Socket.IO event emitters
│   │   └── utils/
│   │       ├── helpers.js          ← pagination, response, code generators
│   │       └── logger.js           ← Winston logger
│   ├── uploads/                    ← served at /uploads/*
│   ├── logs/                       ← Winston log files (auto-created)
│   ├── .env                        ← local config (not committed)
│   ├── .env.example                ← template for all env vars
│   └── package.json
│
├── frontend/
│   └── public/
│       ├── index.html              ← SPA shell
│       ├── css/
│       │   ├── main.css            ← design system, dark/light mode
│       │   ├── animations.css
│       │   ├── mobile.css
│       │   └── fixes.css
│       └── js/
│           ├── app.js              ← entry: init router + socket
│           ├── components/         ← api, auth, router, layout, modal,
│           │                           toast, helpers, socket, skeleton
│           ├── pages/              ← login.js, register.js
│           ├── customer/           ← home, browse, attractionDetail,
│           │                           bookNow, bookingDetail, myBookings,
│           │                           myTickets, notifications, profile
│           └── admin/              ← dashboard, attractions, attractionForm,
│                                       bookings, bookingDetail, customers,
│                                       customerDetail, promotions, reports,
│                                       tickets, validateTicket, qrManagement,
│                                       qrDetail, gateScanner
│
└── README.md
```

---

## Quick Start

### Prerequisites

- Node.js ≥ 18
- MariaDB 10.6+ or MySQL 8+ running locally

### 1. Clone / open the project

```bash
cd /Users/ardanau/bizpro/wispass/backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=wisatapass
DB_USER=root
DB_PASSWORD=yourpassword
```

### 4. Create the database and run migrations

```bash
npm run migrate
```

### 5. Seed sample data

```bash
npm run seed
```

Inserts:
- Admin, Gate Officer, and Customer accounts
- 9 tourist attractions across Indonesia
- Ticket types for every attraction
- 3 promo voucher codes
- All roles, permissions, and role-permission mappings

### 6. Start the server

```bash
npm run dev      # development (nodemon auto-reload)
npm start        # production
```

Open **http://localhost:3000**

---

## Demo Accounts

| Role         | Email                      | Password      |
|--------------|----------------------------|---------------|
| Admin        | admin@wisatapass.local     | admin123      |
| Gate Officer | gate@wisatapass.local      | gate123       |
| Customer     | john@example.com           | customer123   |

---

## npm Scripts

| Script              | Description                                      |
|---------------------|--------------------------------------------------|
| `npm run dev`       | Start with nodemon (auto-reload on file change)  |
| `npm start`         | Start in production mode                         |
| `npm run migrate`   | Create / update all database tables              |
| `npm run seed`      | Insert roles, users, sites, ticket types, promos |
| `npm run migrate:fresh` | Drop all tables, re-migrate, re-seed         |
| `npm test`          | Run property-based tests (Jest + fast-check)     |

---

## API Reference

### Auth
| Method | Endpoint                   | Auth     | Description                  |
|--------|----------------------------|----------|------------------------------|
| POST   | /api/auth/register         | –        | Customer registration        |
| POST   | /api/auth/login            | –        | Login (any role)             |
| POST   | /api/auth/refresh          | –        | Refresh access token         |
| GET    | /api/auth/me               | JWT      | Get own profile              |
| PUT    | /api/auth/profile          | JWT      | Update profile + avatar      |
| PUT    | /api/auth/change-password  | JWT      | Change password              |

### Dashboard
| Method | Endpoint                   | Auth     | Description                  |
|--------|----------------------------|----------|------------------------------|
| GET    | /api/dashboard/admin       | Admin    | Stats + charts data          |
| GET    | /api/dashboard/customer    | Customer | Upcoming tickets + bookings  |

### Attractions
| Method | Endpoint                         | Auth  | Description              |
|--------|----------------------------------|-------|--------------------------|
| GET    | /api/attractions                 | –     | List (public, paginated) |
| GET    | /api/attractions/admin           | Admin | List all (admin view)    |
| GET    | /api/attractions/categories      | –     | Category list            |
| GET    | /api/attractions/cities          | –     | City list                |
| GET    | /api/attractions/:id             | –     | Detail + ticket types    |
| POST   | /api/attractions                 | Admin | Create                   |
| PUT    | /api/attractions/:id             | Admin | Update                   |
| DELETE | /api/attractions/:id             | Admin | Soft delete              |
| POST   | /api/attractions/:id/images      | Admin | Add gallery image        |
| DELETE | /api/attractions/images/:imageId | Admin | Remove gallery image     |

### Bookings
| Method | Endpoint                      | Auth     | Description              |
|--------|-------------------------------|----------|--------------------------|
| GET    | /api/bookings                 | JWT      | List (own or all admin)  |
| GET    | /api/bookings/:id             | JWT      | Detail + tickets         |
| POST   | /api/bookings                 | Customer | Create + generate QR     |
| PUT    | /api/bookings/:id/confirm     | Admin    | Confirm                  |
| PUT    | /api/bookings/:id/cancel      | JWT      | Cancel                   |
| PUT    | /api/bookings/:id/complete    | Admin    | Mark completed           |

### Payments
| Method | Endpoint                           | Auth     | Description              |
|--------|------------------------------------|----------|--------------------------|
| GET    | /api/payments/booking/:bookingId   | JWT      | Get payment for booking  |
| POST   | /api/payments/:id/create-qris      | JWT      | Generate QRIS QR code    |
| GET    | /api/payments/:id/status           | JWT      | Check payment status     |
| POST   | /api/payments/:id/confirm-sim      | JWT      | Simulate payment (sandbox)|
| POST   | /api/payments/:id/upload-proof     | JWT      | Upload transfer proof    |
| PUT    | /api/payments/:id/confirm          | Admin    | Confirm payment          |
| PUT    | /api/payments/:id/reject           | Admin    | Reject payment           |
| POST   | /api/payments/webhook              | –        | Midtrans webhook         |

### Tickets
| Method | Endpoint                       | Auth     | Description              |
|--------|--------------------------------|----------|--------------------------|
| GET    | /api/tickets                   | JWT      | My tickets               |
| GET    | /api/tickets/:id               | JWT      | Ticket detail            |
| GET    | /api/tickets/code/:code        | Admin    | Find by code             |
| POST   | /api/tickets/validate          | Admin    | Validate QR / code       |
| POST   | /api/tickets/:id/regenerate-qr | JWT      | Regenerate QR image      |
| GET    | /api/tickets/admin/all         | Admin    | All tickets (admin view) |
| GET    | /api/tickets/admin/stats       | Admin    | Status counts            |
| PUT    | /api/tickets/admin/:id/status  | Admin    | Cancel / expire ticket   |

### Admin QR Management
| Method | Endpoint                        | Auth       | Description              |
|--------|---------------------------------|------------|--------------------------|
| GET    | /api/admin/qr/stats             | Admin      | QR stats for dashboard   |
| GET    | /api/admin/qr                   | Admin      | List QR codes            |
| POST   | /api/admin/qr/create            | Owner/Admin| Generate QR code         |
| POST   | /api/admin/qr/scan              | Gate/Admin | Validate + record scan   |
| GET    | /api/admin/qr/history           | Admin      | Scan history             |
| GET    | /api/admin/qr/:id               | Admin      | QR detail + scan logs    |
| PUT    | /api/admin/qr/:id               | Owner/Admin| Update status/notes      |
| DELETE | /api/admin/qr/:id               | Owner/Admin| Soft delete              |
| POST   | /api/admin/qr/:id/regenerate    | Owner/Admin| Deactivate + new QR      |
| GET    | /api/admin/qr/:id/download/png  | Admin      | Download as PNG          |
| GET    | /api/admin/qr/:id/download/pdf  | Admin      | Download as printable HTML|

### Users, Customers, Promotions, Branches, Notifications, Reviews, Settings
All implemented — see `backend/src/modules/` for full route files.

### Health
| Method | Endpoint    | Auth | Description             |
|--------|-------------|------|-------------------------|
| GET    | /api/health | –    | DB connectivity check   |

---

## Roles & Permissions

| Role         | Key permissions                                      |
|--------------|------------------------------------------------------|
| owner        | All permissions                                      |
| super_admin  | All permissions                                      |
| admin        | QR generate/view/deactivate, bookings, payments, sites, reports, user management |
| cashier      | Ticket view/manage, payments, dashboard              |
| gate_officer | QR scan, ticket view, dashboard                      |
| marketing    | Site manage, reports, QR view                        |
| viewer       | Dashboard, reports, QR view, ticket view             |
| customer     | Public routes + own bookings/tickets/profile         |

---

## Realtime Events (Socket.IO)

| Event               | Direction      | Trigger                          |
|---------------------|----------------|----------------------------------|
| `booking:created`   | → admins       | New booking placed               |
| `booking:confirmed` | → user         | Admin confirms booking           |
| `booking:cancelled` | → user + admins| Booking cancelled                |
| `ticket:used`       | → admins + user| Ticket validated at gate         |
| `qr:generated`      | → admins       | Admin generates new QR code      |
| `qr:scanned`        | → admins + gate| Any QR scan attempt              |
| `visitor:entry`     | → admins       | Valid QR scan (entry granted)    |
| `payment:success`   | → admins + user| Payment confirmed                |
| `notification:new`  | → user         | New in-app notification          |
| `dashboard:refresh` | → admins       | Any event that changes stats     |

---

## Database Schema (22 tables)

```
roles ──────────────────────────────────────────────────────┐
permissions → role_permissions → roles                       │
                                                             │
users ←──────── roles                                        │
  │                                                          │
  ├── customers                                              │
  ├── admins                                                 │
  ├── staff ──────────────── branches ←── tourist_sites     │
  │                                           │              │
  ├── ticket_orders ───────────────── tourist_sites         │
  │     ├── order_details → ticket_types → tourist_sites    │
  │     ├── payments → payment_logs                         │
  │     └── tickets ─────────────────────────────┐         │
  │                                              │          │
  ├── qr_codes ←─────────── tickets            │          │
  │     └── qr_scan_logs                        │          │
  │                                             │          │
  ├── visitor_logs                              │          │
  ├── reviews → tourist_sites                  │          │
  ├── notifications                             │          │
  └── audit_logs                                │          │
                                                └──────────┘
promotions → ticket_orders
settings
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in your values.

| Variable              | Description                                     |
|-----------------------|-------------------------------------------------|
| `PORT`                | HTTP server port (default 3000)                 |
| `NODE_ENV`            | `development` or `production`                   |
| `FRONTEND_ORIGIN`     | Allowed CORS origin                             |
| `DB_HOST`             | MariaDB host                                    |
| `DB_PORT`             | MariaDB port (default 3306)                     |
| `DB_NAME`             | Database name                                   |
| `DB_USER`             | Database user                                   |
| `DB_PASSWORD`         | Database password                               |
| `DB_CONNECTION_LIMIT` | Pool size (default 20)                          |
| `JWT_SECRET`          | Access token signing secret (keep private)      |
| `JWT_EXPIRES_IN`      | Access token lifetime (e.g. `7d`)               |
| `JWT_REFRESH_SECRET`  | Refresh token signing secret                    |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime (e.g. `30d`)          |
| `QR_SECRET`           | HMAC key for QR signature                       |
| `QR_ENCRYPTION_KEY`   | AES-256-GCM key (exactly 32 chars)              |
| `QR_EXPIRY_HOURS`     | Default QR validity in hours (default 24)       |
| `BCRYPT_ROUNDS`       | bcrypt cost factor (default 12)                 |
| `MAX_FILE_SIZE`       | Upload limit in bytes (default 5242880 = 5 MB)  |
| `MIDTRANS_SERVER_KEY` | Midtrans server key                             |
| `MIDTRANS_CLIENT_KEY` | Midtrans client key                             |
| `MIDTRANS_IS_PRODUCTION` | `true` for live payments, `false` for sandbox|
| `LOG_LEVEL`           | Winston log level (default `info`)              |
| `LOG_DIR`             | Log file directory (default `logs`)             |

---

## Promo Codes (Seeded)

| Code       | Type       | Discount      | Min Purchase  | Validity |
|------------|------------|---------------|---------------|----------|
| WELCOME10  | Percentage | 10% (max 50k) | Rp 50.000     | 1 year   |
| WISATA20   | Percentage | 20% (max 100k)| Rp 200.000    | 6 months |
| FLAT50K    | Fixed      | Rp 50.000     | Rp 300.000    | 3 months |

---

## Features

### Customer
- Register / Login / Logout with JWT refresh tokens
- Browse attractions — search, category, city, price, sort
- Attraction detail with gallery, ticket types, facilities, reviews
- Full booking flow: date → ticket quantity → promo code → confirm
- QRIS payment with Midtrans integration (sandbox + live)
- Automatic QR ticket generation per ticket (AES-256-GCM + HMAC-SHA256)
- My Bookings with status filter and detail view
- My Tickets with QR display, download PNG, print
- In-app notifications (realtime via Socket.IO)
- Profile management with avatar upload and password change

### Admin
- Dashboard with live stats and canvas charts (revenue line, booking status doughnut)
- Attraction CRUD with image gallery management
- Ticket type management (per attraction, pricing tiers, daily quotas)
- Booking management (search, filter, confirm, cancel, complete)
- Payment confirmation / rejection with proof image
- **Admin Ticket Management** — view all customer tickets, cancel/expire, QR display
- **QR Management** — generate, deactivate, regenerate, download, print QR codes
- **Gate Scanner** — camera-based QR scanning (html5-qrcode), green/red result animation, scan history
- Customer management (view, activate/deactivate)
- User management (roles, activate/deactivate)
- Branch management
- Promotions / voucher CRUD (percentage + fixed, expiry, usage limits)
- Reports: revenue, visitors, popular attractions, ticket sales, QR scan stats (CSV export)
- Settings management (key/value store)
- Audit logs for all security-relevant actions

### Security
- JWT access tokens (short-lived) + refresh tokens
- bcrypt password hashing
- Role-based authorization (8 roles, granular permissions via `role_permissions` table)
- AES-256-GCM encrypted QR payloads
- HMAC-SHA256 signed QR codes (prevents forgery)
- Parameterized SQL queries throughout (no string interpolation)
- Helmet security headers
- Per-route rate limiting (global, auth, QR scan)
- express-validator input validation
- Soft deletes on all domain tables
- Full audit trail in `audit_logs`

---

*WisataPass v2.0 — MariaDB Full-Stack Edition*
