/**
 * WisataPass – MariaDB Migration Script
 * Creates all tables, indexes, triggers, and initial roles/permissions.
 *
 * Usage: node src/database/migrate.js [--fresh]
 *   --fresh  drops all tables before recreating (destructive!)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../..', '.env') });
const mysql = require('mysql2/promise');

const isFresh = process.argv.includes('--fresh');

const DB_CONFIG = {
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  multipleStatements: true,
  charset:            'utf8mb4',
};
const DB_NAME = process.env.DB_NAME || 'wisatapass';

// ─── DDL ────────────────────────────────────────────────────────────────────

const DROP_TABLES = `
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS qr_scan_logs;
DROP TABLE IF EXISTS qr_codes;
DROP TABLE IF EXISTS gate_devices;
DROP TABLE IF EXISTS visitor_logs;
DROP TABLE IF EXISTS payment_logs;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS ticket_orders;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS ticket_types;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS promotions;
DROP TABLE IF EXISTS attraction_images;
DROP TABLE IF EXISTS tourist_sites;
DROP TABLE IF EXISTS branches;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
SET FOREIGN_KEY_CHECKS = 1;
`;

const CREATE_TABLES = `
-- ─── ROLES ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(50) NOT NULL UNIQUE COMMENT 'owner|super_admin|admin|cashier|gate_officer|marketing|viewer|customer',
  description TEXT,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PERMISSIONS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permissions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  module      VARCHAR(50)  NOT NULL,
  action      VARCHAR(50)  NOT NULL,
  description TEXT,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── ROLE PERMISSIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id)       REFERENCES roles(id)       ON DELETE CASCADE,
  CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              VARCHAR(36) PRIMARY KEY,
  role_id         INT         NOT NULL,
  username        VARCHAR(100) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  full_name       VARCHAR(255),
  phone           VARCHAR(30),
  avatar          VARCHAR(500),
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at   DATETIME,
  deleted_at      DATETIME    DEFAULT NULL COMMENT 'soft delete',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email    (email),
  UNIQUE KEY uq_users_username (username),
  KEY idx_users_role_id        (role_id),
  KEY idx_users_is_active      (is_active),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── CUSTOMERS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id            VARCHAR(36) PRIMARY KEY,
  user_id       VARCHAR(36) NOT NULL,
  date_of_birth DATE,
  gender        ENUM('male','female','other'),
  address       TEXT,
  city          VARCHAR(100),
  province      VARCHAR(100),
  postal_code   VARCHAR(20),
  id_number     VARCHAR(50),
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_customers_user (user_id),
  CONSTRAINT fk_customers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── ADMINS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id         VARCHAR(36) PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL,
  department VARCHAR(100),
  notes      TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_admins_user (user_id),
  CONSTRAINT fk_admins_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── TOURIST SITES (formerly attractions) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS tourist_sites (
  id             VARCHAR(36) PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  slug           VARCHAR(255) NOT NULL,
  category       VARCHAR(100) NOT NULL,
  description    TEXT,
  facilities     JSON,
  location       TEXT,
  city           VARCHAR(100),
  province       VARCHAR(100),
  maps_link      VARCHAR(500),
  latitude       DECIMAL(10,8),
  longitude      DECIMAL(11,8),
  open_time      TIME,
  close_time     TIME,
  open_days      JSON,
  cover_image    VARCHAR(500),
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  is_featured    TINYINT(1) NOT NULL DEFAULT 0,
  total_reviews  INT NOT NULL DEFAULT 0,
  average_rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  total_visitors INT NOT NULL DEFAULT 0,
  deleted_at     DATETIME DEFAULT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tourist_sites_slug (slug),
  KEY idx_ts_category  (category),
  KEY idx_ts_city      (city),
  KEY idx_ts_is_active (is_active),
  KEY idx_ts_featured  (is_featured)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── ATTRACTION IMAGES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attraction_images (
  id            VARCHAR(36) PRIMARY KEY,
  site_id       VARCHAR(36) NOT NULL,
  image_url     VARCHAR(500) NOT NULL,
  caption       VARCHAR(255),
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ai_site (site_id),
  CONSTRAINT fk_ai_site FOREIGN KEY (site_id) REFERENCES tourist_sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── BRANCHES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id         VARCHAR(36) PRIMARY KEY,
  site_id    VARCHAR(36) NOT NULL,
  name       VARCHAR(255) NOT NULL,
  code       VARCHAR(50)  NOT NULL,
  address    TEXT,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_branches_code (code),
  KEY idx_branches_site (site_id),
  CONSTRAINT fk_branches_site FOREIGN KEY (site_id) REFERENCES tourist_sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── STAFF ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id         VARCHAR(36) PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL,
  branch_id  VARCHAR(36),
  position   VARCHAR(100),
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_staff_user (user_id),
  KEY idx_staff_branch (branch_id),
  CONSTRAINT fk_staff_user   FOREIGN KEY (user_id)   REFERENCES users(id)     ON DELETE CASCADE,
  CONSTRAINT fk_staff_branch FOREIGN KEY (branch_id) REFERENCES branches(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PROMOTIONS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promotions (
  id             VARCHAR(36) PRIMARY KEY,
  code           VARCHAR(50)  NOT NULL,
  name           VARCHAR(255) NOT NULL,
  description    TEXT,
  discount_type  ENUM('percentage','fixed') NOT NULL,
  discount_value DECIMAL(12,2) NOT NULL,
  min_purchase   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  max_discount   DECIMAL(12,2),
  usage_limit    INT,
  used_count     INT NOT NULL DEFAULT 0,
  valid_from     DATETIME NOT NULL,
  valid_until    DATETIME NOT NULL,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_promotions_code (code),
  KEY idx_promo_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── TICKET TYPES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_types (
  id            VARCHAR(36) PRIMARY KEY,
  site_id       VARCHAR(36) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  base_price    DECIMAL(12,2) NOT NULL,
  weekend_price DECIMAL(12,2),
  holiday_price DECIMAL(12,2),
  daily_quota   INT NOT NULL DEFAULT 100,
  min_purchase  INT NOT NULL DEFAULT 1,
  max_purchase  INT NOT NULL DEFAULT 10,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tt_site (site_id),
  CONSTRAINT fk_tt_site FOREIGN KEY (site_id) REFERENCES tourist_sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── TICKET ORDERS (formerly bookings) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_orders (
  id              VARCHAR(36) PRIMARY KEY,
  booking_code    VARCHAR(30) NOT NULL,
  user_id         VARCHAR(36) NOT NULL,
  site_id         VARCHAR(36) NOT NULL,
  branch_id       VARCHAR(36),
  promotion_id    VARCHAR(36),
  visit_date      DATE NOT NULL,
  subtotal        DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_amount    DECIMAL(12,2) NOT NULL,
  status          ENUM('pending','confirmed','cancelled','completed','refunded') NOT NULL DEFAULT 'pending',
  payment_status  ENUM('unpaid','paid','refunded','failed') NOT NULL DEFAULT 'unpaid',
  notes           TEXT,
  admin_notes     TEXT,
  cancelled_at    DATETIME,
  confirmed_at    DATETIME,
  completed_at    DATETIME,
  deleted_at      DATETIME DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_orders_code    (booking_code),
  KEY idx_orders_user          (user_id),
  KEY idx_orders_site          (site_id),
  KEY idx_orders_status        (status),
  KEY idx_orders_payment       (payment_status),
  KEY idx_orders_visit_date    (visit_date),
  CONSTRAINT fk_orders_user   FOREIGN KEY (user_id)      REFERENCES users(id)           ON DELETE RESTRICT,
  CONSTRAINT fk_orders_site   FOREIGN KEY (site_id)      REFERENCES tourist_sites(id)   ON DELETE RESTRICT,
  CONSTRAINT fk_orders_branch FOREIGN KEY (branch_id)    REFERENCES branches(id)        ON DELETE SET NULL,
  CONSTRAINT fk_orders_promo  FOREIGN KEY (promotion_id) REFERENCES promotions(id)      ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── ORDER DETAILS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_details (
  id             VARCHAR(36) PRIMARY KEY,
  order_id       VARCHAR(36) NOT NULL,
  ticket_type_id VARCHAR(36) NOT NULL,
  quantity       INT NOT NULL,
  unit_price     DECIMAL(12,2) NOT NULL,
  subtotal       DECIMAL(12,2) NOT NULL,
  visitor_data   JSON,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_od_order  (order_id),
  KEY idx_od_tttype (ticket_type_id),
  CONSTRAINT fk_od_order  FOREIGN KEY (order_id)       REFERENCES ticket_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_od_tttype FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PAYMENTS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id           VARCHAR(36) PRIMARY KEY,
  order_id     VARCHAR(36) NOT NULL,
  payment_code VARCHAR(50) NOT NULL,
  amount       DECIMAL(12,2) NOT NULL,
  method       VARCHAR(50) NOT NULL DEFAULT 'manual',
  status       ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  proof_image  VARCHAR(500),
  paid_at      DATETIME,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_payments_code (payment_code),
  KEY idx_payments_order (order_id),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES ticket_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── PAYMENT LOGS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_logs (
  id          VARCHAR(36) PRIMARY KEY,
  payment_id  VARCHAR(36) NOT NULL,
  event       VARCHAR(100) NOT NULL,
  payload     JSON,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pl_payment (payment_id),
  CONSTRAINT fk_pl_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── TICKETS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id                VARCHAR(36) PRIMARY KEY,
  ticket_code       VARCHAR(50) NOT NULL,
  order_id          VARCHAR(36) NOT NULL,
  order_detail_id   VARCHAR(36) NOT NULL,
  user_id           VARCHAR(36) NOT NULL,
  site_id           VARCHAR(36) NOT NULL,
  ticket_type_id    VARCHAR(36) NOT NULL,
  visit_date        DATE NOT NULL,
  validation_token  VARCHAR(255) NOT NULL,
  qr_code           MEDIUMTEXT  COMMENT 'base64 QR image',
  qr_data           TEXT        COMMENT 'JSON payload in QR',
  status            ENUM('active','used','expired','cancelled') NOT NULL DEFAULT 'active',
  used_at           DATETIME,
  expires_at        DATETIME,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tickets_code  (ticket_code),
  UNIQUE KEY uq_tickets_token (validation_token),
  KEY idx_tickets_order       (order_id),
  KEY idx_tickets_user        (user_id),
  KEY idx_tickets_status      (status),
  KEY idx_tickets_visit       (visit_date),
  CONSTRAINT fk_tickets_order  FOREIGN KEY (order_id)        REFERENCES ticket_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_tickets_detail FOREIGN KEY (order_detail_id) REFERENCES order_details(id) ON DELETE CASCADE,
  CONSTRAINT fk_tickets_user   FOREIGN KEY (user_id)         REFERENCES users(id)         ON DELETE RESTRICT,
  CONSTRAINT fk_tickets_site   FOREIGN KEY (site_id)         REFERENCES tourist_sites(id) ON DELETE RESTRICT,
  CONSTRAINT fk_tickets_ttype  FOREIGN KEY (ticket_type_id)  REFERENCES ticket_types(id)  ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── QR CODES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_codes (
  id               VARCHAR(36) PRIMARY KEY,
  uuid             VARCHAR(36) NOT NULL,
  ticket_id        VARCHAR(36),
  order_id         VARCHAR(36),
  site_id          VARCHAR(36),
  branch_id        VARCHAR(36),
  generated_by     VARCHAR(36) NOT NULL,
  qr_image         MEDIUMTEXT  NOT NULL COMMENT 'base64 PNG',
  qr_data          TEXT        NOT NULL COMMENT 'encrypted JSON payload',
  payload_hash     VARCHAR(64) NOT NULL COMMENT 'SHA-256 of raw payload',
  signature        VARCHAR(128) NOT NULL COMMENT 'HMAC-SHA256 signature',
  status           ENUM('active','used','expired','deactivated','deleted') NOT NULL DEFAULT 'active',
  scan_count       INT NOT NULL DEFAULT 0,
  max_scans        INT NOT NULL DEFAULT 1,
  valid_from       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at       DATETIME NOT NULL,
  last_scanned_at  DATETIME,
  notes            TEXT,
  deleted_at       DATETIME DEFAULT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_qr_uuid        (uuid),
  KEY idx_qr_ticket            (ticket_id),
  KEY idx_qr_order             (order_id),
  KEY idx_qr_site              (site_id),
  KEY idx_qr_branch            (branch_id),
  KEY idx_qr_status            (status),
  KEY idx_qr_generated_by      (generated_by),
  KEY idx_qr_expires           (expires_at),
  CONSTRAINT fk_qr_ticket       FOREIGN KEY (ticket_id)    REFERENCES tickets(id)       ON DELETE SET NULL,
  CONSTRAINT fk_qr_order        FOREIGN KEY (order_id)     REFERENCES ticket_orders(id) ON DELETE SET NULL,
  CONSTRAINT fk_qr_site         FOREIGN KEY (site_id)      REFERENCES tourist_sites(id) ON DELETE SET NULL,
  CONSTRAINT fk_qr_branch       FOREIGN KEY (branch_id)    REFERENCES branches(id)      ON DELETE SET NULL,
  CONSTRAINT fk_qr_generated_by FOREIGN KEY (generated_by) REFERENCES users(id)         ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── GATE DEVICES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gate_devices (
  id          VARCHAR(36) PRIMARY KEY,
  branch_id   VARCHAR(36),
  name        VARCHAR(100) NOT NULL,
  device_code VARCHAR(50)  NOT NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  last_seen   DATETIME,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_gate_code  (device_code),
  KEY idx_gate_branch (branch_id),
  CONSTRAINT fk_gate_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── QR SCAN LOGS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_scan_logs (
  id              VARCHAR(36) PRIMARY KEY,
  qr_id           VARCHAR(36) NOT NULL,
  scanned_by      VARCHAR(36),
  gate_device_id  VARCHAR(36),
  result          ENUM('valid','invalid','expired','used','wrong_branch','wrong_tenant','not_found') NOT NULL,
  visitor_name    VARCHAR(255),
  ticket_type     VARCHAR(100),
  scan_time       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address      VARCHAR(45),
  user_agent      VARCHAR(500),
  notes           TEXT,
  KEY idx_qsl_qr       (qr_id),
  KEY idx_qsl_scanned  (scanned_by),
  KEY idx_qsl_result   (result),
  KEY idx_qsl_time     (scan_time),
  CONSTRAINT fk_qsl_qr      FOREIGN KEY (qr_id)          REFERENCES qr_codes(id)    ON DELETE CASCADE,
  CONSTRAINT fk_qsl_scanner FOREIGN KEY (scanned_by)      REFERENCES users(id)       ON DELETE SET NULL,
  CONSTRAINT fk_qsl_device  FOREIGN KEY (gate_device_id)  REFERENCES gate_devices(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── VISITOR LOGS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visitor_logs (
  id            VARCHAR(36) PRIMARY KEY,
  site_id       VARCHAR(36) NOT NULL,
  ticket_id     VARCHAR(36),
  qr_id         VARCHAR(36),
  visit_date    DATE NOT NULL,
  visitor_count INT NOT NULL DEFAULT 1,
  entry_time    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_vl_site  (site_id),
  KEY idx_vl_date  (visit_date),
  CONSTRAINT fk_vl_site   FOREIGN KEY (site_id)   REFERENCES tourist_sites(id) ON DELETE CASCADE,
  CONSTRAINT fk_vl_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id)       ON DELETE SET NULL,
  CONSTRAINT fk_vl_qr     FOREIGN KEY (qr_id)     REFERENCES qr_codes(id)      ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── REVIEWS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id         VARCHAR(36) PRIMARY KEY,
  site_id    VARCHAR(36) NOT NULL,
  user_id    VARCHAR(36) NOT NULL,
  order_id   VARCHAR(36),
  rating     TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title      VARCHAR(255),
  comment    TEXT,
  is_visible TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reviews_user_site_order (user_id, site_id, order_id),
  KEY idx_rv_site (site_id),
  CONSTRAINT fk_rv_site  FOREIGN KEY (site_id)  REFERENCES tourist_sites(id) ON DELETE CASCADE,
  CONSTRAINT fk_rv_user  FOREIGN KEY (user_id)  REFERENCES users(id)         ON DELETE CASCADE,
  CONSTRAINT fk_rv_order FOREIGN KEY (order_id) REFERENCES ticket_orders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         VARCHAR(36) PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL,
  type       VARCHAR(50) NOT NULL,
  title      VARCHAR(255) NOT NULL,
  message    TEXT NOT NULL,
  data       JSON,
  is_read    TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notif_user    (user_id, is_read),
  KEY idx_notif_created (created_at),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── AUDIT LOGS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          VARCHAR(36) PRIMARY KEY,
  user_id     VARCHAR(36),
  action      VARCHAR(100) NOT NULL,
  module      VARCHAR(50)  NOT NULL,
  entity_id   VARCHAR(36),
  old_data    JSON,
  new_data    JSON,
  ip_address  VARCHAR(45),
  user_agent  VARCHAR(500),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_al_user   (user_id),
  KEY idx_al_module (module),
  KEY idx_al_entity (entity_id),
  KEY idx_al_time   (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── SETTINGS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  key_name   VARCHAR(100) NOT NULL,
  value      TEXT,
  type       ENUM('string','integer','boolean','json') NOT NULL DEFAULT 'string',
  group_name VARCHAR(50)  NOT NULL DEFAULT 'general',
  label      VARCHAR(255),
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_settings_key (key_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const INITIAL_DATA = `
-- ─── ROLES ───────────────────────────────────────────────────────────────────
INSERT IGNORE INTO roles (name, description) VALUES
  ('owner',        'Business owner with full access'),
  ('super_admin',  'Platform super administrator'),
  ('admin',        'Site administrator'),
  ('cashier',      'Handles ticket sales and payments'),
  ('gate_officer', 'Scans QR codes at entry gates'),
  ('marketing',    'Manages promotions and reports'),
  ('viewer',       'Read-only access'),
  ('customer',     'Regular customer account');

-- ─── PERMISSIONS ──────────────────────────────────────────────────────────────
INSERT IGNORE INTO permissions (name, module, action, description) VALUES
  ('qr.generate',    'qr',      'generate',   'Generate QR codes'),
  ('qr.scan',        'qr',      'scan',        'Scan QR codes at gate'),
  ('qr.view',        'qr',      'view',        'View QR codes list'),
  ('qr.delete',      'qr',      'delete',      'Delete QR codes'),
  ('qr.deactivate',  'qr',      'deactivate',  'Deactivate QR codes'),
  ('ticket.view',    'tickets', 'view',        'View tickets'),
  ('ticket.manage',  'tickets', 'manage',      'Manage tickets'),
  ('report.view',    'reports', 'view',        'View reports'),
  ('report.export',  'reports', 'export',      'Export reports'),
  ('dashboard.view', 'dashboard','view',       'View dashboard'),
  ('user.manage',    'users',   'manage',      'Manage users'),
  ('site.manage',    'sites',   'manage',      'Manage tourist sites');

-- ─── SETTINGS ────────────────────────────────────────────────────────────────
INSERT IGNORE INTO settings (key_name, value, type, group_name, label) VALUES
  ('app_name',          'WisataPass',       'string',  'general', 'Application Name'),
  ('app_url',           'http://localhost:3000', 'string', 'general', 'App URL'),
  ('qr_expiry_hours',   '24',               'integer', 'qr',      'QR Code Expiry (hours)'),
  ('qr_max_scans',      '1',                'integer', 'qr',      'Max scans per QR'),
  ('ticket_time_zone',  'Asia/Jakarta',     'string',  'tickets', 'Ticket Timezone'),
  ('currency',          'IDR',              'string',  'payment', 'Currency'),
  ('bcrypt_rounds',     '12',               'integer', 'security','Bcrypt Rounds');
`;

async function migrate() {
  let conn;
  try {
    // Connect without specifying database first to create it if needed
    conn = await mysql.createConnection({ ...DB_CONFIG, database: undefined });

    console.log(`📦 Ensuring database "${DB_NAME}" exists…`);
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${DB_NAME}\``);

    if (isFresh) {
      console.log('⚠️  --fresh flag: dropping all existing tables…');
      await conn.query(DROP_TABLES);
      console.log('   Tables dropped.');
    }

    console.log('🔨 Creating tables…');
    await conn.query(CREATE_TABLES);
    console.log('   Tables created.');

    console.log('🌱 Inserting initial data (roles, permissions, settings)…');
    await conn.query(INITIAL_DATA);
    console.log('   Initial data inserted.');

    console.log('\n✅ Migration completed successfully!');
    console.log(`   Database: ${DB_NAME} @ ${DB_CONFIG.host}:${DB_CONFIG.port || 3306}`);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (err.sql) console.error('   SQL:', err.sql.substring(0, 200));
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

migrate();
