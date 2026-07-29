# Implementation Plan: WisataPass Refactor — Remaining Work

## Overview

The backend core, auth module, tickets, QR service, payment, dashboard, reports, and all frontend pages are already complete. This plan covers only the remaining gaps: missing backend middleware utilities, six new backend module pairs, app.js route mounting additions, the `.env.example` file, three frontend components needing verification/completion, and the property-based + auth test files.

The implementation language is **JavaScript (Node.js/Express)** consistent with the existing codebase.

---

## Tasks

- [x] 1. Add missing utilities to existing backend files
  - [x] 1.1 Implement `requirePermission(permission)` factory in `backend/src/middleware/auth.js`
    - Add the `requirePermission` async middleware factory after `requireLevel`
    - Query `role_permissions JOIN permissions WHERE rp.role_id = ? AND p.name = ?`
    - Return HTTP 403 with `{ success: false, message: 'Insufficient permissions.' }` when no rows found
    - Export `requirePermission` alongside existing exports
    - _Requirements: 4.5, 4.6_

  - [x] 1.2 Implement `sanitize(value)` utility in `backend/src/utils/helpers.js`
    - Add `sanitize(value)` that applies `value.replace(/<[^>]*>/g, '').trim()` and handles non-string input gracefully
    - Export `sanitize` alongside existing exports
    - _Requirements: 10.9, 11.6_

- [x] 2. Implement user management module
  - [x] 2.1 Create `backend/src/modules/users/userController.js`
    - Implement `list`: paginated query against `users JOIN roles`, supports `?search=` on username/email/full_name, excludes `deleted_at IS NOT NULL`
    - Implement `detail`: `SELECT ... WHERE id = ? AND deleted_at IS NULL`
    - Implement `update`: allow updating `role_id`, `is_active`, `full_name`; apply `sanitize()` to string fields; write audit log entry
    - Implement `activate` / `deactivate`: set `is_active = 1 / 0`; write audit log entry
    - Use `success()` / `error()` response helpers throughout
    - _Requirements: 4.1, 4.5, 10.10_

  - [x] 2.2 Create `backend/src/modules/users/userRoutes.js`
    - Mount `authenticate` + `requirePermission('user:manage')` on all routes
    - `GET /` → `list`, `GET /:id` → `detail`, `PUT /:id` → `update`, `PUT /:id/activate` → `activate`, `PUT /:id/deactivate` → `deactivate`
    - Add `express-validator` chains (id must be UUID, role_id must be int, is_active must be boolean)
    - _Requirements: 4.5, 4.6, 10.5_

- [x] 3. Implement promotions module
  - [x] 3.1 Create `backend/src/modules/admin/promotionController.js`
    - Implement `list`: paginated, searchable (`?search=` on code/name), includes active/inactive filter
    - Implement `detail`, `create`, `update`: apply `sanitize()` to text fields; validate discount_type/value ranges in controller
    - Implement `remove`: soft delete (`deleted_at = NOW()`)
    - Implement `validateCode`: query by `code` where `is_active=1` and `start_date <= NOW() <= end_date`; return discount details or 404
    - Write audit log on create/update/delete
    - _Requirements: 13.2_

  - [x] 3.2 Create `backend/src/modules/admin/promotionRoutes.js`
    - Public route: `POST /validate-code` (no auth required)
    - Admin routes: `authenticate` + `requirePermission('attraction:manage')` guard
    - `GET /` → `list`, `GET /:id` → `detail`, `POST /` → `create`, `PUT /:id` → `update`, `DELETE /:id` → `remove`
    - Add `express-validator` chains for required fields (code, name, discount_type, discount_value, start_date, end_date)
    - _Requirements: 10.5, 13.2_

- [x] 4. Implement reviews module
  - [x] 4.1 Create `backend/src/modules/admin/reviewController.js`
    - Implement `listBySite`: `GET /api/reviews/:siteId` — paginated reviews for a tourist site, excludes soft-deleted
    - Implement `create`: authenticated users only; apply `sanitize()` to comment; enforce one review per user per site
    - Implement `remove`: soft delete; restricted to owner of review or admin
    - _Requirements: 13.1, 13.2_

  - [x] 4.2 Create `backend/src/modules/admin/reviewRoutes.js`
    - `GET /:siteId` — public (no auth required)
    - `POST /` — `authenticate` required; validate `site_id` (UUID), `rating` (int 1–5), `comment` (string max 1000)
    - `DELETE /:id` — `authenticate` required
    - _Requirements: 10.5, 13.1_

- [x] 5. Implement notifications module
  - [x] 5.1 Create `backend/src/modules/admin/notificationController.js`
    - Implement `list`: query `notifications WHERE user_id = req.user.id OR is_global = 1`, paginated, ordered by `created_at DESC`
    - Implement `unreadCount`: `SELECT COUNT(*) WHERE (user_id = ? OR is_global = 1) AND read_at IS NULL`
    - Implement `markRead`: `UPDATE notifications SET read_at = NOW() WHERE id = ? AND (user_id = ? OR is_global = 1)`
    - Implement `markAllRead`: `UPDATE ... WHERE user_id = ? AND read_at IS NULL`
    - Implement `create` (admin only): insert notification; emit `notification:new` Socket.IO event
    - _Requirements: 13.1, 13.2_

  - [x] 5.2 Create `backend/src/modules/admin/notificationRoutes.js`
    - `authenticate` on all routes
    - `GET /` → `list`, `GET /unread-count` → `unreadCount`
    - `PUT /:id/read` → `markRead`, `PUT /read-all` → `markAllRead`
    - `POST /` → `create` with `requirePermission('attraction:manage')` (admin-only creation)
    - _Requirements: 10.5_

- [x] 6. Implement customers module
  - [x] 6.1 Create `backend/src/modules/admin/customerController.js`
    - Implement `list`: paginated users with `role.name = 'customer'` (or appropriate customer role), supports `?search=` on name/email/phone
    - Implement `detail`: user record + aggregated bookings summary (total bookings, total spent, last booking date)
    - Implement `update`: allow updating `full_name`, `phone`; apply `sanitize()`; write audit log
    - Implement `activate` / `deactivate`: set `is_active = 1 / 0`; write audit log entry
    - _Requirements: 13.2, 10.10_

  - [x] 6.2 Create `backend/src/modules/admin/customerRoutes.js`
    - `authenticate` + `requirePermission('user:manage')` on all routes
    - `GET /` → `list`, `GET /:id` → `detail`, `PUT /:id` → `update`
    - `PUT /:id/activate` → `activate`, `PUT /:id/deactivate` → `deactivate`
    - Add `express-validator` chain for `:id` UUID validation
    - _Requirements: 4.5, 10.5_

- [x] 7. Implement branches module
  - [x] 7.1 Create `backend/src/modules/admin/branchController.js`
    - Implement `list`: paginated, optional `?siteId=` filter on `tourist_site_id`, excludes soft-deleted; join `tourist_sites` for site name
    - Implement `detail`: full branch record with associated site name
    - Implement `create`, `update`: apply `sanitize()` to name/location; validate `tourist_site_id` exists; write audit log
    - Implement `remove`: soft delete; write audit log
    - _Requirements: 3.6, 13.2_

  - [x] 7.2 Create `backend/src/modules/admin/branchRoutes.js`
    - `GET /` and `GET /:id` are accessible to authenticated users (no permission gate beyond auth)
    - `POST /`, `PUT /:id`, `DELETE /:id` require `authenticate` + `requirePermission('attraction:manage')`
    - Validate: `name` required string, `tourist_site_id` UUID, `location` optional string, `is_active` optional boolean
    - _Requirements: 10.5, 13.2_

- [x] 8. Implement settings module
  - [x] 8.1 Create `backend/src/modules/settings/settingsController.js`
    - Implement `listAll`: `SELECT * FROM settings ORDER BY key`
    - Implement `getByKey`: `SELECT * FROM settings WHERE key = ?`
    - Implement `updateByKey`: `UPDATE settings SET value = ?, updated_by = ?, updated_at = NOW() WHERE key = ?`; apply `sanitize()` to value; write audit log
    - _Requirements: 3.14, 14.1_

  - [x] 8.2 Create `backend/src/modules/settings/settingsRoutes.js`
    - `authenticate` + `requirePermission('settings:manage')` on all routes
    - `GET /` → `listAll`, `GET /:key` → `getByKey`, `PUT /:key` → `updateByKey`
    - Validate: `value` must be a string, `:key` must be alphanumeric with colons/underscores
    - _Requirements: 4.2, 10.5_

- [x] 9. Update `backend/src/app.js` with missing route mounts and middleware
  - [x] 9.1 Mount all missing API routers in `backend/src/app.js`
    - Import and mount `userRoutes` → `/api/users`
    - Import and mount `promotionRoutes` → `/api/promotions`
    - Import and mount `reviewRoutes` → `/api/reviews`
    - Import and mount `notificationRoutes` → `/api/notifications`
    - Import and mount `customerRoutes` → `/api/customers`
    - Import and mount `branchRoutes` → `/api/branches`
    - Import and mount `settingsRoutes` → `/api/settings`
    - _Requirements: 2.2, 2.3_

  - [x] 9.2 Add `compression()` middleware, scan-specific rate limiter, and fix health endpoint in `backend/src/app.js`
    - Add `compression()` import and place it in the middleware chain (before route handlers, after static serving)
    - Add a dedicated `rateLimit({ windowMs: 60*1000, max: 100 })` instance applied only to `/api/admin/qr/scan`
    - Change existing `/health` route to `/api/health` returning `{ status, db, uptime, timestamp, responseTime }`
    - _Requirements: 14.2, 14.8, 10.8_

- [x] 10. Create `backend/.env.example`
  - Create `backend/.env.example` documenting all environment variables defined in the design: PORT, NODE_ENV, FRONTEND_ORIGIN, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_CONNECTION_LIMIT, JWT_SECRET, JWT_ACCESS_EXPIRES, JWT_REFRESH_EXPIRES, QR_SECRET, QR_ENCRYPTION_KEY, QR_EXPIRY_HOURS, MIDTRANS_SERVER_KEY, MIDTRANS_CLIENT_KEY, MIDTRANS_IS_PRODUCTION, MAX_FILE_SIZE_MB, UPLOAD_DIR, LOG_DIR, LOG_LEVEL
  - Use placeholder (non-secret) values for all entries
  - _Requirements: 2.6, 14.1, 14.5_

- [x] 11. Checkpoint — Ensure all backend routes pass basic integration smoke tests
  - Verify all new routes are reachable (404 check on each path)
  - Ensure `requirePermission` returns 403 for a user without the required permission
  - Ask the user if questions arise.

- [x] 12. Verify and complete frontend QR management pages
  - [x] 12.1 Verify / complete `frontend/public/js/admin/qrManagement.js`
    - Ensure searchable/filterable/paginated QR table renders correctly (columns: uuid, ticket, branch, status, expires_at, scan_count, actions)
    - Ensure "Generate QR" modal posts to `POST /api/admin/qr/create` with ticket/branch/expiry inputs; displays returned `qrImage` inline after creation
    - Ensure "Download PNG" triggers `<a download>` with the base64 data URL; "Download PDF" calls a PDF-generation helper
    - Ensure "Print" button calls `window.print()` scoped to the QR image element
    - Ensure per-row View / Deactivate / Regenerate / Delete with confirmation modals via `modal.js`
    - Ensure status/branch/date range filter controls call the API with corresponding query params
    - Ensure CSV export uses the `dataExport.js` (or inline CSV logic if that component is missing) on the current filtered result set
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.7, 8.8_

  - [x] 12.2 Verify / complete `frontend/public/js/admin/qrDetail.js`
    - Ensure the QR detail card displays all fields from `GET /api/admin/qr/:id` (uuid, status, branch, ticket, expires_at, scan_count, qrImage)
    - Ensure the scan history tab fetches `GET /api/admin/qr/history?qrId=:id` and renders a paginated table (scan_time, result, visitor_name, scanned_by, ip_address)
    - _Requirements: 5.7, 8.6_

  - [x] 12.3 Verify / complete `frontend/public/js/admin/gateScanner.js`
    - Ensure `html5-qrcode` camera initialization with front/rear toggle button
    - Ensure decoded QR payload is posted to `POST /api/admin/qr/scan`; green overlay on valid, red overlay on invalid results
    - Ensure success sound (`AudioContext` or `<audio>` element) and `navigator.vibrate(200)` on valid scan
    - Ensure flash/torch toggle via `html5-qrcode` `torch` capability (if device supports it)
    - Ensure session scan history list (last 20 entries) is maintained in-memory and rendered below the camera view
    - Ensure the page redirects to `#/admin` with a toast if the user lacks `qr:scan` permission
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [x] 13. Create `frontend/public/js/components/skeleton.js`
  - Implement `renderTableSkeleton(rows = 5, cols = 4)`: returns HTML string of a `<table>` with animated shimmer `<div>` cells
  - Implement `renderCardSkeleton(count = 3)`: returns HTML string of `count` skeleton card `<div>` elements with shimmer animation
  - Use CSS classes consistent with `main.css` (e.g., `.skeleton-shimmer`) rather than inline styles
  - Export both functions as named exports
  - _Requirements: 12.4_

- [x] 14. Checkpoint — Ensure all frontend QR pages load without console errors
  - Open `#/admin/qr`, `#/admin/qr/:id`, and `#/admin/gate` in the browser
  - Verify no JavaScript errors; confirm skeleton loaders appear during data fetch
  - Ask the user if questions arise.

- [-] 15. Write property-based tests for QR service
  - [-]* 15.1 Write property test for QR payload encryption round-trip (Property 1)
    - File: `backend/tests/qrService.property.test.js`
    - Use `fast-check` with `fc.record({ uuid, ticketId, siteId, branchId, issuedAt, expiresAt, label })` arbitrary
    - Assert `decryptPayload(encryptPayload(payload))` deeply equals original payload
    - Tag: `// Feature: wisatapass-refactor, Property 1: QR payload encryption round-trip`
    - **Property 1: QR payload encryption round-trip**
    - **Validates: Requirements 5.2**

  - [ ]* 15.2 Write property test for generated QR passes verifyQR (Property 2)
    - Use `fc.record({ generatedBy: fc.uuid(), ticketId: fc.option(fc.uuid()), siteId: fc.option(fc.uuid()), branchId: fc.option(fc.uuid()), expiryHours: fc.integer({ min: 1, max: 8760 }) })` arbitrary
    - Assert `verifyQR(record.qr_data).valid === true`
    - **Property 2: Generated QR always passes signature verification**
    - **Validates: Requirements 5.1, 5.3**

  - [ ]* 15.3 Write property test for QR expiry math (Property 3)
    - Use `fc.integer({ min: 1, max: 8760 })` for expiryHours
    - Assert `Math.abs(new Date(record.expires_at) - new Date(record.created_at) - expiryHours * 3600000) <= 1000`
    - **Property 3: QR expiry is always issuedAt + expiryHours**
    - **Validates: Requirements 5.1**

  - [ ]* 15.4 Write property test for QR image is valid PNG data URL (Property 4)
    - Use same generation arbitrary as Property 2
    - Assert `record.qr_image.startsWith('data:image/png;base64,')` and remainder is non-empty
    - **Property 4: Generated QR image is always a valid PNG data URL**
    - **Validates: Requirements 5.5**

  - [ ]* 15.5 Write property test for tampered signature fails validation (Property 5)
    - Generate a valid QR, then use `fc.integer({ min: 0, max: 63 })` to pick a position in the `s` field and replace one char
    - Assert `verifyQR(tampered).valid === false`
    - **Property 5: Tampered signature always fails validation**
    - **Validates: Requirements 5.3, 6.1, 6.3, 10.7**

  - [ ]* 15.6 Write property test for expired QR fails validation (Property 6)
    - Set `expiresAt` to a past date using `fc.date({ max: new Date(Date.now() - 1000) })`
    - Assert `verifyQR(qrData).valid === false && verifyQR(qrData).expired === true`
    - **Property 6: Expired QR always fails validation**
    - **Validates: Requirements 6.1, 6.4**

  - [ ]* 15.7 Write property test for branch mismatch fails validation (Property 7)
    - Generate QR with `branchId = B1`; use `fc.uuid().filter(id => id !== B1)` as `expectedBranchId`
    - Assert `verifyQR(qrData, { expectedBranchId: B2 }).valid === false`
    - **Property 7: Branch mismatch always fails validation**
    - **Validates: Requirements 6.7**

- [-] 16. Write property-based tests for backend helpers
  - [-]* 16.1 Write property test for pagination offset (Property 8)
    - File: `backend/tests/helpers.property.test.js`
    - Use `fc.integer({ min: 1, max: 1000 })` for page and `fc.integer({ min: 1, max: 100 })` for limit
    - Assert `getPagination({ page: String(page), limit: String(limit) }).offset === (page - 1) * limit`
    - **Property 8: Pagination offset is always (page - 1) × limit**
    - **Validates: Requirements 11.4**

  - [ ]* 16.2 Write property test for sanitize strips HTML (Property 9)
    - Use `fc.string()` arbitrary
    - Assert `sanitize(s)` does not match `/<[^>]*>/`
    - **Property 9: sanitize strips all HTML tags**
    - **Validates: Requirements 10.9, 11.6**

- [x] 17. Write property-based tests for auth utilities
  - [-]* 17.1 Write property test for JWT access token round-trip (Property 10)
    - File: `backend/tests/auth.property.test.js`
    - Use `fc.uuid()` for userId
    - Assert `verifyAccess(signAccess({ userId })).userId === userId`
    - **Property 10: JWT access token round-trip preserves userId**
    - **Validates: Requirements 10.1**

  - [ ]* 17.2 Write property test for permission enforcement rejects insufficient roles (Property 12)
    - Use `fc.constantFrom(...rolesWithoutPermission)` to generate users lacking the permission
    - Call the `requirePermission` middleware with a mock `req.user` that has a role without the permission
    - Assert `res.status` was called with 403
    - **Property 12: Permission enforcement rejects insufficient roles**
    - **Validates: Requirements 4.5, 4.6, 5.13, 5.14**

- [~] 18. Final checkpoint — Run all tests and confirm zero failures
  - Run `cd backend && npm test` (or `npx jest --testPathPattern=tests/`)
  - All property tests must pass with ≥ 100 iterations each
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All already-complete files (auth, QR service, tickets, payment, dashboard, reports, sockets, all frontend pages except the three listed above) are explicitly excluded from this plan
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties; unit tests validate specific examples and edge cases
- Task 1.1 (`requirePermission`) is a prerequisite for tasks 2.2, 5.2, 6.2, 7.2, 8.2, and 9.1 — implement it first
- Task 1.2 (`sanitize`) is a prerequisite for tasks 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1
- All new route files should follow the exact same import/export pattern as existing routes (e.g., `siteRoutes.js`) to maintain consistency

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "10"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1", "5.1", "6.1", "7.1", "8.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "4.2", "5.2", "6.2", "7.2", "8.2"] },
    { "id": 3, "tasks": ["9.1", "9.2"] },
    { "id": 4, "tasks": ["12.1", "12.2", "12.3", "13"] },
    { "id": 5, "tasks": ["15.1", "15.2", "15.3", "15.4", "15.5", "15.6", "15.7"] },
    { "id": 6, "tasks": ["16.1", "16.2", "17.1", "17.2"] }
  ]
}
```
