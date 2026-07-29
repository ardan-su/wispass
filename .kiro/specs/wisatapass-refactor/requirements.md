# Requirements Document

## Introduction

WisataPass is an existing online tourist attraction ticketing system built with Node.js, Express, PostgreSQL, Socket.IO, and Vanilla JavaScript (ES6 Modules). This specification covers the refactoring and extension of the current codebase with four primary goals:

1. **Database Migration** – Replace PostgreSQL (`pg`) with MariaDB (`mysql2`) while preserving all query logic and data integrity.
2. **Architecture Restructure** – Reorganize the flat `server/`+`client/` layout into a clean `backend/` + `frontend/` full-stack monorepo with module-based grouping.
3. **Admin QR Management Module** – Introduce a dedicated QR generation, printing, download, scanning, and validation subsystem with role-gated access.
4. **Production Readiness** – Expand security, role/permission model, realtime dashboard, and maintainability across the entire system.

All existing features (auth, attractions, bookings, payments, tickets, promotions, reviews, notifications, reports, customer portal, admin portal) MUST continue to function correctly after the refactor.

---

## Glossary

- **System**: The WisataPass application as a whole (backend + frontend).
- **Backend**: The Node.js/Express server located at `backend/`.
- **Frontend**: The static Vanilla JS SPA located at `frontend/`.
- **DB**: The MariaDB database accessed via `mysql2` connection pool.
- **QR_Service**: The backend module responsible for generating, signing, verifying, and managing QR codes.
- **QR_Scanner**: The frontend camera-based scanning component using `html5-qrcode`.
- **Auth_Middleware**: The JWT verification middleware in `backend/src/middleware/auth.js`.
- **Role**: A named set of permissions assigned to a user (Owner, Super Admin, Admin, Cashier, Gate Officer, Marketing, Viewer).
- **Permission**: A discrete capability (e.g., `qr:generate`, `qr:scan`) that may be granted to a Role.
- **Ticket**: A single-use entry credential tied to a booking detail, carrying a signed QR payload.
- **QR_Code**: A scannable image encoding an encrypted, signed JSON payload that uniquely identifies a Ticket.
- **Gate_Device**: A registered device (browser session + device fingerprint) authorized to scan QR codes at a Branch.
- **Branch**: A physical entry gate or location of a Tourist_Site that owns one or more Gate_Devices.
- **Tourist_Site**: A tourist attraction managed within the system (equivalent to the existing `attractions` table).
- **Soft_Delete**: A record marked `deleted_at IS NOT NULL` rather than physically removed from the DB.
- **Migration_Script**: A Node.js script that creates or alters DB schema idempotently.
- **Seed_Script**: A Node.js script that inserts baseline data required for system operation.
- **Socket_Server**: The Socket.IO server broadcasting realtime events to connected clients.
- **Audit_Log**: An immutable record of security-relevant actions written to the `audit_logs` table.

---

## Requirements

---

### Requirement 1: Database Migration from PostgreSQL to MariaDB

**User Story:** As a system operator, I want the database layer to use MariaDB instead of PostgreSQL, so that the system runs on the organization's existing MariaDB infrastructure.

#### Acceptance Criteria

1. THE Backend SHALL use `mysql2` (with the promise API) as the sole database driver, removing the `pg` dependency.
2. THE Backend SHALL configure the DB connection as a connection pool with configurable `connectionLimit`, `host`, `port`, `user`, `password`, and `database` environment variables.
3. WHEN a connection pool error occurs, THE Backend SHALL log the error via the Logger and continue serving requests already in flight.
4. THE DB SHALL enforce foreign key constraints by setting `FOREIGN_KEY_CHECKS = 1` per connection at pool creation time.
5. THE DB SHALL use `CHAR(36)` columns (UUID stored as string) in place of PostgreSQL `UUID` primary keys, with `DEFAULT (UUID())` on MariaDB 10.7+ or application-generated UUIDs otherwise.
6. THE DB SHALL use `DATETIME(3)` columns with `DEFAULT CURRENT_TIMESTAMP(3)` and `ON UPDATE CURRENT_TIMESTAMP(3)` in place of PostgreSQL `TIMESTAMPTZ`.
7. THE DB SHALL use `JSON` columns in place of PostgreSQL `JSONB` for semi-structured fields (`facilities`, `open_days`, `visitor_data`, `data`).
8. THE DB SHALL use `TINYINT(1)` columns in place of PostgreSQL `BOOLEAN` fields.
9. THE DB SHALL use `ENUM(...)` or `VARCHAR` with application-level validation in place of PostgreSQL `CHECK` constraints on status fields.
10. THE Migration_Script SHALL be idempotent: running it multiple times SHALL NOT produce errors or duplicate schema objects.
11. THE Migration_Script SHALL create all tables defined in Requirement 5 (expanded schema) in dependency order, with appropriate indexes.
12. THE Seed_Script SHALL insert all baseline data (roles, permissions, role_permissions, admin user, sample tourist sites, ticket types, promotions) required for the system to operate.
13. WHEN all existing PostgreSQL parameterized queries use `$1, $2` placeholders, THE Backend SHALL replace them with `?` placeholders compatible with `mysql2`.
14. THE DB SHALL support transactions via `connection.beginTransaction()`, `connection.commit()`, and `connection.rollback()` obtained from the pool.

---

### Requirement 2: Project Structure Restructure

**User Story:** As a developer, I want the project reorganized into a clean `backend/` + `frontend/` monorepo, so that concerns are clearly separated and each layer can be developed and deployed independently.

#### Acceptance Criteria

1. THE System SHALL restructure the root directory to contain `backend/`, `frontend/`, and `README.md` at the top level.
2. THE Backend SHALL organize source code under `backend/src/` with sub-directories: `config/`, `database/`, `middleware/`, `modules/`, `routes/`, `sockets/`, `utils/`.
3. THE Backend `modules/` directory SHALL contain one sub-directory per domain module: `auth`, `users`, `admin`, `tickets`, `qr`, `payment`, `dashboard`, `reports`, `settings`.
4. THE Backend SHALL place all uploaded files under `backend/uploads/` with sub-directories per type (`avatars/`, `proofs/`, `attraction-images/`).
5. THE Backend SHALL have its own `backend/package.json` listing only server-side dependencies.
6. THE Backend SHALL have its own `backend/.env` (with a committed `backend/.env.example`) for all environment-specific configuration.
7. THE Frontend SHALL organize static assets under `frontend/src/` with sub-directories: `css/`, `js/`, `pages/`, `components/`, `layouts/`, `assets/`, `utils/`.
8. THE Frontend SHALL have its own `frontend/package.json` if any build tooling is used, or a plain static structure otherwise.
9. THE System SHALL preserve the existing Single-Page Application routing behavior after the restructure.
10. WHEN the Backend serves the Frontend, THE Backend SHALL serve `frontend/index.html` as the SPA fallback for all non-API, non-upload routes.
11. THE Backend SHALL export a reusable `app.js` (Express app without `listen`) and a separate `server.js` (entry point that calls `listen`), allowing the app to be imported in tests.

---

### Requirement 3: Expanded Database Schema

**User Story:** As a system architect, I want the database to include all tables required by the new modules, so that the system can store roles, permissions, branches, QR codes, scan logs, gate devices, audit logs, and settings.

#### Acceptance Criteria

1. THE DB SHALL contain a `roles` table with columns: `id INT AUTO_INCREMENT PK`, `name VARCHAR(50) UNIQUE NOT NULL`, `description TEXT`, `created_at DATETIME(3)`.
2. THE DB SHALL contain a `permissions` table with columns: `id INT AUTO_INCREMENT PK`, `name VARCHAR(100) UNIQUE NOT NULL` (e.g., `qr:generate`), `description TEXT`, `created_at DATETIME(3)`.
3. THE DB SHALL contain a `role_permissions` table with columns: `role_id INT FK`, `permission_id INT FK`, composite PK on (`role_id`, `permission_id`).
4. THE DB SHALL contain a `users` table with UUID PK, `role_id FK`, `username`, `email`, `password_hash`, `full_name`, `phone`, `avatar`, `is_active TINYINT(1)`, `last_login_at`, `deleted_at`, `created_at`, `updated_at`.
5. THE DB SHALL contain a `tourist_sites` table (replacing/migrating from `attractions`) with the same columns as the existing `attractions` plus `deleted_at DATETIME(3)`.
6. THE DB SHALL contain a `branches` table with columns: `id CHAR(36) PK`, `tourist_site_id CHAR(36) FK`, `name VARCHAR(255)`, `location TEXT`, `is_active TINYINT(1)`, `deleted_at`, `created_at`, `updated_at`.
7. THE DB SHALL contain a `ticket_types` table with the same columns as the existing schema plus `deleted_at DATETIME(3)`.
8. THE DB SHALL contain a `ticket_orders` table (replacing/migrating from `bookings`) with the same columns as the existing `bookings` plus `deleted_at DATETIME(3)`.
9. THE DB SHALL contain a `payments` table with an additional `payment_logs` child table recording each status transition: `id CHAR(36) PK`, `payment_id CHAR(36) FK`, `status VARCHAR(30)`, `notes TEXT`, `created_by CHAR(36) FK users(id)`, `created_at DATETIME(3)`.
10. THE DB SHALL contain a `qr_codes` table with columns: `id CHAR(36) PK`, `uuid VARCHAR(36) UNIQUE NOT NULL`, `ticket_id CHAR(36) FK`, `branch_id CHAR(36) FK`, `payload_encrypted TEXT`, `digital_signature VARCHAR(512)`, `hash VARCHAR(255)`, `status ENUM('active','used','expired','deactivated')`, `generated_by CHAR(36) FK`, `generated_at DATETIME(3)`, `expires_at DATETIME(3)`, `deleted_at DATETIME(3)`, `created_at DATETIME(3)`, `updated_at DATETIME(3)`.
11. THE DB SHALL contain a `qr_scan_logs` table with columns: `id CHAR(36) PK`, `qr_code_id CHAR(36) FK`, `scanned_by CHAR(36) FK users(id)`, `gate_device_id CHAR(36) FK`, `branch_id CHAR(36) FK`, `result ENUM('valid','invalid','used','expired','deactivated')`, `visitor_name VARCHAR(255)`, `ticket_type VARCHAR(100)`, `scan_time DATETIME(3)`, `ip_address VARCHAR(45)`, `created_at DATETIME(3)`.
12. THE DB SHALL contain a `gate_devices` table with columns: `id CHAR(36) PK`, `branch_id CHAR(36) FK`, `device_name VARCHAR(255)`, `device_fingerprint VARCHAR(255) UNIQUE`, `is_active TINYINT(1)`, `last_seen_at DATETIME(3)`, `created_at DATETIME(3)`, `updated_at DATETIME(3)`.
13. THE DB SHALL contain an `audit_logs` table with columns: `id CHAR(36) PK`, `user_id CHAR(36) FK NULL`, `action VARCHAR(100) NOT NULL`, `entity_type VARCHAR(50)`, `entity_id VARCHAR(36)`, `old_values JSON`, `new_values JSON`, `ip_address VARCHAR(45)`, `user_agent TEXT`, `created_at DATETIME(3)`.
14. THE DB SHALL contain a `settings` table with columns: `id INT AUTO_INCREMENT PK`, `key VARCHAR(100) UNIQUE NOT NULL`, `value TEXT`, `description TEXT`, `updated_by CHAR(36) FK users(id)`, `updated_at DATETIME(3)`.
15. THE DB SHALL contain a `visitor_logs` table, a `notifications` table, and a `reviews` table carrying over the existing schema with `deleted_at` added.
16. WHEN a record is soft-deleted, THE DB SHALL set `deleted_at = NOW()` and THE Backend SHALL exclude records where `deleted_at IS NOT NULL` from all standard queries.

---

### Requirement 4: Role and Permission System

**User Story:** As a system owner, I want fine-grained role-based access control, so that each staff member can only perform actions appropriate to their role.

#### Acceptance Criteria

1. THE System SHALL define exactly seven roles: `Owner`, `Super Admin`, `Admin`, `Cashier`, `Gate Officer`, `Marketing`, `Viewer`.
2. THE System SHALL define the following permissions (at minimum): `qr:generate`, `qr:view`, `qr:deactivate`, `qr:delete`, `qr:scan`, `booking:confirm`, `booking:cancel`, `booking:complete`, `payment:confirm`, `payment:reject`, `attraction:manage`, `report:view`, `user:manage`, `settings:manage`.
3. THE Seed_Script SHALL seed all roles, permissions, and the following default role-permission mappings:
   - `Owner`: all permissions
   - `Super Admin`: all permissions except `settings:manage`
   - `Admin`: `qr:generate`, `qr:view`, `qr:deactivate`, `booking:confirm`, `booking:cancel`, `booking:complete`, `payment:confirm`, `payment:reject`, `attraction:manage`, `report:view`
   - `Cashier`: `booking:confirm`, `payment:confirm`, `payment:reject`
   - `Gate Officer`: `qr:scan`, `qr:view`
   - `Marketing`: `attraction:manage`, `report:view`
   - `Viewer`: `qr:view`, `report:view`
4. WHEN a request reaches a protected route, THE Auth_Middleware SHALL verify the JWT, load the user's role, and resolve the user's effective permissions from `role_permissions`.
5. WHEN a user lacks a required permission, THE Auth_Middleware SHALL return HTTP 403 with `{ success: false, message: "Insufficient permissions." }`.
6. THE Backend SHALL expose a `requirePermission(permission)` middleware factory that returns a middleware rejecting users without the specified permission.
7. WHEN a permission-gated action is performed, THE Backend SHALL write an entry to `audit_logs` recording the user, action, entity, and IP address.

---

### Requirement 5: Admin QR Management Module

**User Story:** As an Admin, I want to generate, manage, and monitor QR codes for tickets, so that gate officers can validate visitor entry reliably and securely.

#### Acceptance Criteria

1. WHEN an authorized user (role with `qr:generate` permission) calls `POST /api/admin/qr/create`, THE QR_Service SHALL generate a QR code with: a unique UUID, an encrypted payload, the Branch ID, the Ticket ID, the generated timestamp, the expiry timestamp, a digital signature (HMAC-SHA256), and a hash.
2. THE QR_Service SHALL encrypt the payload using AES-256-GCM with a key derived from `QR_ENCRYPTION_KEY` in the environment.
3. THE QR_Service SHALL compute the digital signature as `HMAC-SHA256(payload_json, QR_SECRET)` where `QR_SECRET` is an environment variable.
4. THE QR_Service SHALL store the generated QR code record in the `qr_codes` table with `status = 'active'`.
5. THE QR_Service SHALL return the QR code image as a base64-encoded PNG and as a downloadable PDF option.
6. WHEN an authorized user calls `GET /api/admin/qr`, THE Backend SHALL return a paginated, searchable, filterable list of QR codes belonging to branches the user can access.
7. WHEN an authorized user calls `GET /api/admin/qr/:id`, THE Backend SHALL return the full QR code record including scan history.
8. WHEN an authorized user calls `PUT /api/admin/qr/:id`, THE Backend SHALL support updating the QR code's `expires_at` or `status` (deactivate only, not re-activate via this endpoint).
9. WHEN an authorized user calls `DELETE /api/admin/qr/:id`, THE Backend SHALL perform a soft delete (set `deleted_at`) and respond with HTTP 200.
10. WHEN an authorized user (role with `qr:generate` permission) calls `POST /api/admin/qr/:id/regenerate`, THE QR_Service SHALL deactivate the existing QR code and generate a new one linked to the same ticket.
11. WHEN an authorized user calls `GET /api/admin/qr/history`, THE Backend SHALL return scan log entries with pagination and filter by date range, branch, and result.
12. WHEN an authorized user calls `GET /api/admin/dashboard`, THE Backend SHALL return: today's scan count, active QR count, expired QR count, today's visitor count, today's revenue, and the 20 most recent scan log entries.
13. THE Backend SHALL restrict `POST /api/admin/qr/create` and `POST /api/admin/qr/:id/regenerate` to users with `qr:generate` permission only.
14. THE Backend SHALL restrict `POST /api/admin/qr/scan` to users with `qr:scan` permission only.

---

### Requirement 6: QR Validation Engine

**User Story:** As a Gate Officer, I want to scan a QR code and receive an instant validation result, so that I can admit valid visitors and reject invalid ones quickly.

#### Acceptance Criteria

1. WHEN a Gate Officer calls `POST /api/admin/qr/scan` with a raw QR payload, THE QR_Service SHALL validate the following in order: digital signature, expiry timestamp, QR status (not `used` or `deactivated`), branch match, and existence in the DB.
2. WHEN all validations pass, THE QR_Service SHALL mark the QR code `status = 'used'`, insert a `qr_scan_logs` record with `result = 'valid'`, increment `tourist_sites.total_visitors`, insert a `visitor_logs` record, and return `{ success: true, visitor_name, ticket_type, status: "valid", scan_time }`.
3. WHEN the digital signature is invalid, THE QR_Service SHALL return `{ success: false, status: "invalid", message: "Tampered QR code." }` and log the attempt.
4. WHEN the QR code has expired (`expires_at < NOW()`), THE QR_Service SHALL return `{ success: false, status: "expired", message: "QR code has expired." }`.
5. WHEN the QR code status is `used`, THE QR_Service SHALL return `{ success: false, status: "used", message: "Ticket already used." }`.
6. WHEN the QR code status is `deactivated`, THE QR_Service SHALL return `{ success: false, status: "deactivated", message: "QR code has been deactivated." }`.
7. WHEN the branch in the QR payload does not match the scanning Gate Officer's assigned branch, THE QR_Service SHALL return `{ success: false, status: "invalid", message: "Wrong branch." }`.
8. WHEN a scan occurs (valid or invalid), THE Socket_Server SHALL broadcast a `qr:scanned` event to all connected admin dashboard clients with the scan result payload.
9. THE QR_Service SHALL complete the full validation and DB write cycle within 500ms under normal load.

---

### Requirement 7: QR Scanner Frontend Component

**User Story:** As a Gate Officer, I want a camera-based QR scanning interface in the admin portal, so that I can scan physical QR codes without manually entering ticket codes.

#### Acceptance Criteria

1. THE QR_Scanner SHALL use `html5-qrcode` (loaded via CDN) to access the device camera.
2. THE QR_Scanner SHALL present buttons to start the camera, stop the camera, and switch between front and rear cameras.
3. WHEN a QR code is detected by the camera, THE QR_Scanner SHALL immediately call `POST /api/admin/qr/scan` with the decoded payload.
4. WHEN the scan result is `valid`, THE QR_Scanner SHALL display a green animated overlay, play a success sound, and vibrate the device (on mobile via `navigator.vibrate`).
5. WHEN the scan result is not `valid`, THE QR_Scanner SHALL display a red animated overlay.
6. THE QR_Scanner SHALL maintain a visible scan history list showing the last 20 scan results in the current session.
7. WHERE the device supports it, THE QR_Scanner SHALL provide a flash/torch toggle button.
8. THE QR_Scanner page SHALL be accessible only to users with `qr:scan` permission; unauthorized users SHALL be redirected to the dashboard.

---

### Requirement 8: QR Code UI (Admin Management Page)

**User Story:** As an Admin, I want a dedicated QR management page in the admin portal, so that I can generate, view, download, and manage all QR codes from one place.

#### Acceptance Criteria

1. THE Frontend SHALL provide a QR management page at the `/admin/qr` route displaying a searchable, filterable, paginated table of QR codes.
2. THE Frontend SHALL provide a "Generate QR" button that opens a modal allowing the admin to select a ticket, branch, and expiry duration.
3. WHEN a QR code is generated, THE Frontend SHALL display the QR image inline, with "Download PNG" and "Download PDF" buttons.
4. THE Frontend SHALL provide a "Print" button that opens the browser print dialog with the QR code optimized for printing.
5. THE Frontend SHALL provide per-row actions: View, Deactivate, Regenerate, Delete — each with a confirmation modal for destructive actions.
6. THE Frontend SHALL display a scan history tab within the QR detail view showing all scan log entries for that QR code.
7. THE Frontend SHALL filter the QR list by status (`active`, `used`, `expired`, `deactivated`), branch, and date range.
8. THE Frontend SHALL export the filtered QR list as CSV.

---

### Requirement 9: Realtime Admin Dashboard

**User Story:** As an Admin, I want the dashboard to update in realtime, so that I can monitor gate activity, revenue, and QR events without refreshing.

#### Acceptance Criteria

1. THE Socket_Server SHALL broadcast the following events: `qr:generated` (when a QR is created), `qr:scanned` (on every scan attempt), `visitor:entered` (when a valid scan admits a visitor), `payment:success` (when a payment is confirmed), `booking:created` (when a new booking is placed).
2. WHEN a `qr:scanned` event is received on the Frontend dashboard, THE Frontend SHALL append the new scan entry to the "Live Gate Activity" feed without a page reload.
3. WHEN any realtime event updates a dashboard counter (scans today, visitors today, revenue today), THE Frontend SHALL update the counter value with a smooth CSS transition.
4. THE Socket_Server SHALL authenticate Socket.IO connections using the same JWT used for REST API calls; unauthenticated connections SHALL be disconnected.
5. WHEN a Socket.IO client reconnects after a disconnect, THE Frontend SHALL request a full dashboard data refresh via REST before resuming realtime updates.

---

### Requirement 10: Security Hardening

**User Story:** As a system operator, I want comprehensive security controls, so that the application is protected against common web attacks in production.

#### Acceptance Criteria

1. THE Backend SHALL issue short-lived access tokens (default 15 minutes) and long-lived refresh tokens (default 7 days), with a `POST /api/auth/refresh` endpoint.
2. WHEN an access token expires, THE Frontend SHALL automatically call `POST /api/auth/refresh` using the stored refresh token and retry the original request without user interaction.
3. THE Backend SHALL store refresh tokens in the DB (`refresh_tokens` table with `user_id`, `token_hash`, `expires_at`, `revoked_at`) and SHALL reject revoked tokens.
4. THE Backend SHALL apply `helmet` with a restrictive Content-Security-Policy that allows the application's own scripts, styles, and the `html5-qrcode` CDN origin.
5. THE Backend SHALL validate all incoming request bodies using `express-validator` rules defined in each module's route file; invalid requests SHALL return HTTP 422 with field-level error details.
6. THE Backend SHALL use parameterized queries exclusively (no string concatenation into SQL) throughout all modules.
7. THE QR_Service SHALL sign QR payloads with HMAC-SHA256 and SHALL reject any payload whose signature does not match during validation.
8. THE Backend SHALL enforce per-route rate limits: 20 requests per 15 minutes on auth endpoints, 100 per minute on QR scan, and 200 per 15 minutes globally.
9. THE Backend SHALL sanitize user-supplied strings for XSS using a utility function applied before any string is written to the DB or rendered.
10. THE Backend SHALL write to `audit_logs` for every: login attempt, password change, QR generation, QR scan, QR deactivation, payment confirmation, and user activation/deactivation.

---

### Requirement 11: Reusable Backend Utilities and Middleware

**User Story:** As a developer, I want shared utilities and middleware that are consistent across all modules, so that there is no duplicate code and adding new modules is straightforward.

#### Acceptance Criteria

1. THE Backend SHALL provide a `responseHelper` utility with `sendSuccess(res, data, message, statusCode)` and `sendError(res, message, statusCode, errors)` functions used by all controllers.
2. THE Backend SHALL provide a centralized `errorHandler` middleware registered last in the Express pipeline that normalizes all thrown errors into the standard response format.
3. THE Backend SHALL provide a `dbService` wrapper around `mysql2` that exposes: `query(sql, params)`, `queryOne(sql, params)`, `transaction(callback)`.
4. THE Backend SHALL provide a `paginate(req)` utility that extracts `page` and `limit` from query params, validates them, and returns `{ offset, limit }`.
5. THE Backend SHALL provide an `auditLogger` utility that calls `dbService.query` to insert into `audit_logs` and is callable from any module without circular dependencies.
6. THE Backend SHALL provide a `sanitize(value)` utility that strips HTML tags and trims whitespace from string inputs.
7. THE Backend SHALL provide a `logger` utility (Winston) with transports for console (development) and file rotation (production), used by all modules.

---

### Requirement 12: Frontend Reusable Components

**User Story:** As a frontend developer, I want a library of reusable UI components, so that every page is visually consistent and new features can be built without duplicating markup or logic.

#### Acceptance Criteria

1. THE Frontend SHALL provide an `api.js` utility that wraps `fetch`, automatically attaches the Authorization header from localStorage, handles 401 responses by triggering token refresh, and returns parsed JSON.
2. THE Frontend SHALL provide a `toast.js` component that shows success, error, warning, and info notifications with auto-dismiss and a close button.
3. THE Frontend SHALL provide a `modal.js` component that renders a confirmation dialog with configurable title, message, confirm label, and cancel label.
4. THE Frontend SHALL provide a `skeleton.js` component that renders loading skeleton placeholders for tables and cards.
5. THE Frontend SHALL provide a `pagination.js` component that renders a page navigator and emits a `pageChange` event with the new page number.
6. THE Frontend SHALL provide a `table.js` utility that renders a responsive, sortable HTML table from a column definition array and a data array.
7. THE Frontend SHALL provide a `dataExport.js` utility that exports a given data array as CSV or triggers a PDF download.
8. THE Frontend SHALL preserve the existing glassmorphism visual style: dark mode by default with a light mode toggle, animated gradient cards, smooth transitions, and Inter/system font stack.
9. THE Frontend SHALL provide a dark/light mode toggle that persists the user's preference in `localStorage` and applies the appropriate CSS class to `<html>`.

---

### Requirement 13: Preservation of Existing Features

**User Story:** As an end user, I want all existing customer and admin features to continue working after the refactor, so that no functionality is lost during the migration.

#### Acceptance Criteria

1. THE System SHALL preserve the following customer-facing features without regression: registration, login, attraction browse with search/filter, attraction detail, full booking flow, QR ticket generation on booking, My Bookings, My Tickets (QR display/download/print), payment proof upload, profile management, notifications.
2. THE System SHALL preserve the following admin features without regression: dashboard with charts, attraction CRUD with image gallery, ticket type management, booking management (confirm/cancel/complete), payment confirmation/rejection, existing QR ticket validation, customer management, promotions CRUD, revenue/visitor/reports with CSV export.
3. WHEN any existing API endpoint is called with the same request parameters as before the refactor, THE Backend SHALL return a response with the same structure and HTTP status code.
4. THE Frontend SPA routing SHALL continue to function for all existing routes after the restructure.
5. WHEN the Migration_Script runs against a fresh MariaDB database, THE System SHALL operate identically to the pre-refactor PostgreSQL system using the same seeded data.

---

### Requirement 14: Production Readiness

**User Story:** As a DevOps engineer, I want the application to be configurable, observable, and deployable, so that it can run reliably in a production environment.

#### Acceptance Criteria

1. THE Backend SHALL read all secrets and environment-specific values (DB credentials, JWT secrets, QR keys, port, allowed origins) exclusively from environment variables, with no hardcoded defaults for secrets.
2. THE Backend SHALL provide a `/api/health` endpoint returning `{ status: "ok", db: "connected", uptime, timestamp }` that responds within 200ms.
3. THE Backend SHALL use Winston with daily file rotation for production logging, writing separate `access.log`, `error.log`, and `combined.log` files under `backend/logs/`.
4. THE Backend SHALL include graceful shutdown logic that waits for in-flight requests to complete (up to 10 seconds) before closing the HTTP server and DB pool.
5. THE Backend SHALL include a `backend/.env.example` file documenting every supported environment variable with a non-secret placeholder value.
6. THE Migration_Script and Seed_Script SHALL be executable via `npm run migrate` and `npm run seed` from within `backend/`.
7. WHERE `NODE_ENV=production`, THE Backend error handler SHALL return only `{ success: false, message: "Internal server error" }` without stack traces.
8. THE Backend SHALL compress HTTP responses using `compression` middleware for all responses larger than 1 KB.
