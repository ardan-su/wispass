# 🎫 WisataPass – Online Tourist Attraction Ticketing System

A complete, production-ready MVP for selling entrance tickets to tourist attractions.  
Built with Node.js · Express · PostgreSQL · Socket.IO · Vanilla JavaScript (ES6 Modules).

---

## Tech Stack

| Layer       | Technology                                      |
|-------------|-------------------------------------------------|
| Frontend    | HTML5, CSS3, Vanilla JS (ES6 Modules)          |
| Backend     | Node.js, Express.js                             |
| Database    | PostgreSQL                                      |
| Auth        | JWT + bcrypt                                    |
| Realtime    | Socket.IO                                       |
| QR Code     | `qrcode` npm package (HMAC-signed payload)     |
| File Upload | Multer                                          |
| Security    | Helmet, express-rate-limit, express-validator   |
| Logging     | Winston                                         |

---

## Quick Start

### Prerequisites

- Node.js ≥ 18
- PostgreSQL ≥ 14 running locally

### 1 · Clone / open the project

```bash
cd /Users/ardanau/wisatapass/prisma/bizpro/wispass
```

### 2 · Install dependencies

```bash
npm install
```

### 3 · Configure environment

Edit `.env` to match your PostgreSQL credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wisatapass
DB_USER=postgres
DB_PASSWORD=postgres        # ← change to your password
JWT_SECRET=change_me_in_production
```

### 4 · Create the database

```bash
psql -U postgres -c "CREATE DATABASE wisatapass;"
```

### 5 · Run migrations (creates all 15 tables)

```bash
npm run migrate
```

### 6 · Seed sample data

```bash
npm run seed
```

This inserts:
- **Admin** account: `admin@wisatapass.local` / `admin123`
- **Customer** account: `john@example.com` / `customer123`
- 10 real tourist attractions across Indonesia
- Ticket types for every attraction
- 3 promo voucher codes: `WELCOME10`, `WISATA20`, `FLAT50K`

### 7 · Start the server

```bash
npm run dev      # development (nodemon auto-reload)
# or
npm start        # production
```

Open **http://localhost:3000**

---

## Demo Accounts

| Role     | Email                        | Password     |
|----------|------------------------------|--------------|
| Admin    | admin@wisatapass.local       | admin123     |
| Customer | john@example.com             | customer123  |

---

## Project Structure

```
wispass/
├── client/
│   └── public/
│       ├── index.html          ← Single-page app shell
│       ├── css/
│       │   └── main.css        ← Full design system (Inter font, light theme)
│       └── js/
│           ├── app.js          ← Bootstrap: auth + router + socket
│           ├── components/     ← Shared: api, auth, router, layout, toast, modal…
│           ├── pages/          ← login.js, register.js
│           ├── admin/          ← dashboard, attractions, bookings, customers…
│           └── customer/       ← home, browse, bookNow, myTickets…
├── server/
│   ├── server.js               ← Express + Socket.IO entry point
│   ├── config/                 ← database.js (pg Pool), multer.js
│   ├── middleware/             ← auth.js (JWT), validate.js
│   ├── models/                 ← UserModel, AttractionModel, BookingModel…
│   ├── controllers/            ← authController, bookingController…
│   ├── routes/                 ← 11 route files
│   ├── services/               ← qrService, socketService, notificationService
│   └── utils/                  ← helpers.js, logger.js
├── database/
│   ├── schema.sql              ← 15-table PostgreSQL schema + triggers
│   ├── migrate.js              ← npm run migrate
│   └── seed.js                 ← npm run seed
├── uploads/                    ← Served at /uploads/* (auto-created)
├── .env
└── package.json
```

---

## REST API Reference

### Authentication
| Method | Endpoint                   | Auth     | Description          |
|--------|----------------------------|----------|----------------------|
| POST   | /api/auth/register         | –        | Customer registration|
| POST   | /api/auth/login            | –        | Login (any role)     |
| GET    | /api/auth/me               | JWT      | Get own profile      |
| PUT    | /api/auth/profile          | JWT      | Update profile       |
| PUT    | /api/auth/change-password  | JWT      | Change password      |

### Dashboard
| Method | Endpoint                   | Auth     | Description          |
|--------|----------------------------|----------|----------------------|
| GET    | /api/dashboard/admin       | Admin    | Admin stats          |
| GET    | /api/dashboard/customer    | Customer | Customer stats       |

### Attractions
| Method | Endpoint                            | Auth     | Description         |
|--------|-------------------------------------|----------|---------------------|
| GET    | /api/attractions                    | –        | List (public)       |
| GET    | /api/attractions/admin/all          | Admin    | List all (admin)    |
| GET    | /api/attractions/categories         | –        | Category list       |
| GET    | /api/attractions/cities             | –        | City list           |
| GET    | /api/attractions/:id                | –        | Detail + tickets    |
| POST   | /api/attractions                    | Admin    | Create              |
| PUT    | /api/attractions/:id                | Admin    | Update              |
| DELETE | /api/attractions/:id                | Admin    | Delete              |
| POST   | /api/attractions/:id/images         | Admin    | Upload gallery image|
| DELETE | /api/attractions/images/:imageId    | Admin    | Remove image        |

### Ticket Types
| Method | Endpoint                                         | Auth  | Description        |
|--------|--------------------------------------------------|-------|--------------------|
| GET    | /api/ticket-types/attraction/:id                 | –     | List by attraction |
| GET    | /api/ticket-types/attraction/:id/availability    | –     | Quota by date      |
| POST   | /api/ticket-types/attraction/:id                 | Admin | Create             |
| PUT    | /api/ticket-types/:id                            | Admin | Update             |
| DELETE | /api/ticket-types/:id                            | Admin | Delete             |

### Bookings
| Method | Endpoint                     | Auth     | Description        |
|--------|------------------------------|----------|--------------------|
| GET    | /api/bookings                | JWT      | List               |
| GET    | /api/bookings/:id            | JWT      | Detail             |
| POST   | /api/bookings                | Customer | Create (+ QR gen)  |
| PUT    | /api/bookings/:id/confirm    | Admin    | Confirm            |
| PUT    | /api/bookings/:id/cancel     | JWT      | Cancel             |
| PUT    | /api/bookings/:id/complete   | Admin    | Complete           |

### Payments
| Method | Endpoint                          | Auth     | Description        |
|--------|-----------------------------------|----------|--------------------|
| GET    | /api/payments/booking/:bookingId  | JWT      | Payments for booking|
| POST   | /api/payments/:id/upload-proof    | Customer | Upload proof image |
| PUT    | /api/payments/:id/confirm         | Admin    | Confirm payment    |
| PUT    | /api/payments/:id/reject          | Admin    | Reject payment     |

### Tickets
| Method | Endpoint                    | Auth     | Description         |
|--------|-----------------------------|----------|---------------------|
| GET    | /api/tickets/mine           | Customer | My tickets          |
| GET    | /api/tickets/:id            | JWT      | Ticket detail       |
| GET    | /api/tickets/code/:code     | Admin    | Find by code        |
| POST   | /api/tickets/validate       | Admin    | Validate QR / code  |
| POST   | /api/tickets/:id/regenerate-qr | JWT   | Regenerate QR       |

### Customers, Promotions, Reports, Notifications, Reviews
All fully implemented — see `server/routes/` for the complete list.

---

## Features Implemented

### Customer
- Register / Login / Logout
- Browse attractions with search, category, city, price, sort filters
- Attraction detail with gallery, ticket types, facilities, reviews
- Full booking flow: date selection → ticket quantity → visitor data → promo → confirm
- Automatic QR ticket generation per ticket (HMAC-signed payload)
- My Bookings (filter by status)
- My Tickets (with QR display, download, print)
- Payment proof upload
- Profile management + avatar upload + password change
- Notifications (realtime via Socket.IO + read/unread)

### Admin
- Dashboard with live stats + canvas charts (revenue line, booking status doughnut)
- Attraction CRUD with image gallery management
- Ticket type management (per attraction, pricing tiers, quotas)
- Booking management (search, filter, confirm, cancel, complete)
- Payment confirmation / rejection
- QR Ticket validation (manual code or raw QR JSON data)
- Customer management (view, activate/deactivate)
- Promotions / voucher CRUD (percentage + fixed, expiry, usage limits)
- Reports: revenue, visitors, popular attractions, ticket sales (with CSV export)

### Realtime (Socket.IO)
- `booking:created` → admin sees new bookings live
- `booking:confirmed` / `booking:cancelled` → customer notified
- `ticket:used` → broadcast on validation
- `notification:new` → in-app notification badge + toast
- `dashboard:refresh` → admin dashboard auto-updates

### Security
- JWT authentication on all protected routes
- bcrypt password hashing (configurable rounds)
- Role-based authorization (admin / customer)
- express-rate-limit on all `/api` routes + stricter limit on auth endpoints
- Helmet security headers
- express-validator input validation
- Parameterized SQL queries throughout (no string interpolation)
- HMAC-signed QR payload to prevent ticket forgery

---

## Database Schema (15 tables)

```
roles  →  users  →  customers
                 →  bookings  →  booking_details  →  ticket_types  →  attractions
                             →  payments                            →  attraction_images
                             →  tickets  →  ticket_validations
                 →  reviews   →  attractions
                 →  notifications
attractions  →  visitor_logs
promotions   →  bookings
```

---

## Environment Variables

| Variable          | Default                | Description                  |
|-------------------|------------------------|------------------------------|
| PORT              | 3000                   | HTTP server port             |
| DB_HOST           | localhost              | PostgreSQL host              |
| DB_PORT           | 5432                   | PostgreSQL port              |
| DB_NAME           | wisatapass             | Database name                |
| DB_USER           | postgres               | Database user                |
| DB_PASSWORD       | postgres               | Database password            |
| JWT_SECRET        | (required)             | Token signing secret         |
| JWT_EXPIRES_IN    | 7d                     | Token lifetime               |
| BCRYPT_ROUNDS     | 12                     | bcrypt work factor           |
| MAX_FILE_SIZE     | 5242880                | Upload limit in bytes (5 MB) |
| RATE_LIMIT_WINDOW | 15                     | Rate limit window (minutes)  |
| RATE_LIMIT_MAX    | 200                    | Max requests per window      |

---

## Promo Codes (Seeded)

| Code       | Discount      | Min Purchase | Valid         |
|------------|---------------|--------------|---------------|
| WELCOME10  | 10% off       | Rp 50.000    | 1 year        |
| WISATA20   | 20% off       | Rp 200.000   | 6 months      |
| FLAT50K    | Rp 50.000 off | Rp 300.000   | 3 months      |

---

*WisataPass – Software Engineering Competency Certification Project*
