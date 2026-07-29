-- WisataPass Database Schema
-- PostgreSQL

-- Drop existing tables (in reverse dependency order)
DROP TABLE IF EXISTS visitor_logs CASCADE;
DROP TABLE IF EXISTS ticket_validations CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS booking_details CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;
DROP TABLE IF EXISTS ticket_types CASCADE;
DROP TABLE IF EXISTS attraction_images CASCADE;
DROP TABLE IF EXISTS attractions CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ─── ROLES ───────────────────────────────────────────────────────────────────
CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE,  -- 'admin', 'customer'
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id       INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    username      VARCHAR(100) NOT NULL UNIQUE,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255),
    phone         VARCHAR(30),
    avatar        VARCHAR(500),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CUSTOMERS (extended profile) ────────────────────────────────────────────
CREATE TABLE customers (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender        VARCHAR(10) CHECK (gender IN ('male','female','other')),
    address       TEXT,
    city          VARCHAR(100),
    province      VARCHAR(100),
    postal_code   VARCHAR(20),
    id_number     VARCHAR(50),        -- KTP / Passport
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ATTRACTIONS ──────────────────────────────────────────────────────────────
CREATE TABLE attractions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(255) NOT NULL,
    slug             VARCHAR(255) NOT NULL UNIQUE,
    category         VARCHAR(100) NOT NULL,  -- waterpark, zoo, museum, beach, etc.
    description      TEXT,
    facilities       JSONB DEFAULT '[]',     -- array of strings
    location         TEXT,
    city             VARCHAR(100),
    province         VARCHAR(100),
    maps_link        VARCHAR(500),
    latitude         DECIMAL(10,8),
    longitude        DECIMAL(11,8),
    open_time        TIME,
    close_time       TIME,
    open_days        JSONB DEFAULT '["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]',
    cover_image      VARCHAR(500),
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured      BOOLEAN NOT NULL DEFAULT FALSE,
    total_reviews    INT NOT NULL DEFAULT 0,
    average_rating   DECIMAL(3,2) NOT NULL DEFAULT 0,
    total_visitors   INT NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ATTRACTION IMAGES ────────────────────────────────────────────────────────
CREATE TABLE attraction_images (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
    image_url     VARCHAR(500) NOT NULL,
    caption       VARCHAR(255),
    sort_order    INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TICKET TYPES ─────────────────────────────────────────────────────────────
CREATE TABLE ticket_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attraction_id   UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,    -- Adult, Child, Family, VIP, etc.
    description     TEXT,
    base_price      DECIMAL(12,2) NOT NULL,
    weekend_price   DECIMAL(12,2),
    holiday_price   DECIMAL(12,2),
    daily_quota     INT NOT NULL DEFAULT 100,
    min_purchase    INT NOT NULL DEFAULT 1,
    max_purchase    INT NOT NULL DEFAULT 10,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PROMOTIONS ───────────────────────────────────────────────────────────────
CREATE TABLE promotions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(50) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    discount_type   VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage','fixed')),
    discount_value  DECIMAL(12,2) NOT NULL,
    min_purchase    DECIMAL(12,2) NOT NULL DEFAULT 0,
    max_discount    DECIMAL(12,2),
    usage_limit     INT,
    used_count      INT NOT NULL DEFAULT 0,
    valid_from      TIMESTAMPTZ NOT NULL,
    valid_until     TIMESTAMPTZ NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── BOOKINGS ─────────────────────────────────────────────────────────────────
CREATE TABLE bookings (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code     VARCHAR(30) NOT NULL UNIQUE,
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    attraction_id    UUID NOT NULL REFERENCES attractions(id) ON DELETE RESTRICT,
    promotion_id     UUID REFERENCES promotions(id) ON DELETE SET NULL,
    visit_date       DATE NOT NULL,
    subtotal         DECIMAL(12,2) NOT NULL,
    discount_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount     DECIMAL(12,2) NOT NULL,
    status           VARCHAR(30) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','confirmed','cancelled','completed','refunded')),
    payment_status   VARCHAR(30) NOT NULL DEFAULT 'unpaid'
                         CHECK (payment_status IN ('unpaid','paid','refunded','failed')),
    notes            TEXT,
    admin_notes      TEXT,
    cancelled_at     TIMESTAMPTZ,
    confirmed_at     TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── BOOKING DETAILS ──────────────────────────────────────────────────────────
CREATE TABLE booking_details (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id     UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    ticket_type_id UUID NOT NULL REFERENCES ticket_types(id) ON DELETE RESTRICT,
    quantity       INT NOT NULL,
    unit_price     DECIMAL(12,2) NOT NULL,
    subtotal       DECIMAL(12,2) NOT NULL,
    visitor_data   JSONB DEFAULT '[]',  -- array of {name, id_number, age}
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PAYMENTS ─────────────────────────────────────────────────────────────────
CREATE TABLE payments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id     UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    payment_code   VARCHAR(50) NOT NULL UNIQUE,
    amount         DECIMAL(12,2) NOT NULL,
    method         VARCHAR(50) NOT NULL DEFAULT 'manual',  -- bank_transfer, credit_card, etc.
    status         VARCHAR(30) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','paid','failed','refunded')),
    proof_image    VARCHAR(500),
    paid_at        TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TICKETS ──────────────────────────────────────────────────────────────────
CREATE TABLE tickets (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_code      VARCHAR(50) NOT NULL UNIQUE,
    booking_id       UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    booking_detail_id UUID NOT NULL REFERENCES booking_details(id) ON DELETE CASCADE,
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    attraction_id    UUID NOT NULL REFERENCES attractions(id) ON DELETE RESTRICT,
    ticket_type_id   UUID NOT NULL REFERENCES ticket_types(id) ON DELETE RESTRICT,
    visit_date       DATE NOT NULL,
    validation_token VARCHAR(255) NOT NULL UNIQUE,
    qr_code          TEXT,             -- base64 QR image
    qr_data          TEXT,             -- JSON payload encoded in QR
    status           VARCHAR(30) NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','used','expired','cancelled')),
    used_at          TIMESTAMPTZ,
    expires_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TICKET VALIDATIONS ───────────────────────────────────────────────────────
CREATE TABLE ticket_validations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id    UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    validated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    result       VARCHAR(20) NOT NULL CHECK (result IN ('valid','invalid','used','expired','cancelled')),
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── REVIEWS ──────────────────────────────────────────────────────────────────
CREATE TABLE reviews (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
    rating        INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title         VARCHAR(255),
    comment       TEXT,
    is_visible    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, attraction_id, booking_id)
);

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL,  -- booking_confirmed, ticket_ready, etc.
    title       VARCHAR(255) NOT NULL,
    message     TEXT NOT NULL,
    data        JSONB DEFAULT '{}',
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── VISITOR LOGS ─────────────────────────────────────────────────────────────
CREATE TABLE visitor_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attraction_id UUID NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
    ticket_id     UUID REFERENCES tickets(id) ON DELETE SET NULL,
    visit_date    DATE NOT NULL,
    visitor_count INT NOT NULL DEFAULT 1,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_users_email          ON users(email);
CREATE INDEX idx_users_username       ON users(username);
CREATE INDEX idx_users_role_id        ON users(role_id);
CREATE INDEX idx_attractions_slug     ON attractions(slug);
CREATE INDEX idx_attractions_category ON attractions(category);
CREATE INDEX idx_attractions_city     ON attractions(city);
CREATE INDEX idx_attractions_active   ON attractions(is_active);
CREATE INDEX idx_ticket_types_attr    ON ticket_types(attraction_id);
CREATE INDEX idx_bookings_user        ON bookings(user_id);
CREATE INDEX idx_bookings_attraction  ON bookings(attraction_id);
CREATE INDEX idx_bookings_code        ON bookings(booking_code);
CREATE INDEX idx_bookings_status      ON bookings(status);
CREATE INDEX idx_bookings_visit_date  ON bookings(visit_date);
CREATE INDEX idx_booking_details_bk   ON booking_details(booking_id);
CREATE INDEX idx_payments_booking     ON payments(booking_id);
CREATE INDEX idx_tickets_booking      ON tickets(booking_id);
CREATE INDEX idx_tickets_code         ON tickets(ticket_code);
CREATE INDEX idx_tickets_token        ON tickets(validation_token);
CREATE INDEX idx_tickets_status       ON tickets(status);
CREATE INDEX idx_notifications_user   ON notifications(user_id, is_read);
CREATE INDEX idx_visitor_logs_date    ON visitor_logs(attraction_id, visit_date);
CREATE INDEX idx_promotions_code      ON promotions(code);

-- ─── UPDATED_AT TRIGGER ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at           BEFORE UPDATE ON users           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_customers_updated_at       BEFORE UPDATE ON customers       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_attractions_updated_at     BEFORE UPDATE ON attractions     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_ticket_types_updated_at    BEFORE UPDATE ON ticket_types    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bookings_updated_at        BEFORE UPDATE ON bookings        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payments_updated_at        BEFORE UPDATE ON payments        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tickets_updated_at         BEFORE UPDATE ON tickets         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_promotions_updated_at      BEFORE UPDATE ON promotions      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_reviews_updated_at         BEFORE UPDATE ON reviews         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
