-- ============================================================
-- FoodRescue — PostgreSQL Schema
-- System of Record
-- ============================================================

-- -------------------------
-- Extensions
-- -------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------
-- ENUM Types
-- -------------------------
CREATE TYPE user_role AS ENUM (
  'provider',
  'ngo',
  'volunteer',
  'admin'
);

CREATE TYPE user_status AS ENUM (
  'pending',
  'active',
  'suspended',
  'blocked'
);

CREATE TYPE donation_status AS ENUM (
  'posted',
  'matched',
  'claimed',
  'volunteer_assigned',
  'collected',
  'delivered',
  'completed',
  'expired',
  'cancelled'
);

CREATE TYPE claim_status AS ENUM (
  'pending',
  'accepted',
  'rejected',
  'expired'
);

CREATE TYPE delivery_status AS ENUM (
  'pending',
  'accepted',
  'picked_up',
  'in_transit',
  'delivered',
  'failed'
);

CREATE TYPE volunteer_availability AS ENUM (
  'available',
  'busy',
  'offline'
);

CREATE TYPE qr_code_type AS ENUM (
  'pickup',
  'delivery'
);

CREATE TYPE notification_type AS ENUM (
  'push',
  'email',
  'in_app'
);

CREATE TYPE complaint_status AS ENUM (
  'open',
  'investigating',
  'resolved',
  'dismissed'
);

CREATE TYPE food_category AS ENUM (
  'cooked_meals',
  'raw_ingredients',
  'packaged_food',
  'beverages',
  'bakery',
  'dairy',
  'fruits_vegetables',
  'other'
);

-- -------------------------
-- Tables
-- -------------------------

-- 1. Users (all roles share this table)
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role NOT NULL,
  status        user_status NOT NULL DEFAULT 'pending',
  full_name     VARCHAR(255) NOT NULL,
  phone         VARCHAR(20),
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Food Providers (extends users)
CREATE TABLE food_providers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name     VARCHAR(255) NOT NULL,
  business_type     VARCHAR(100),  -- restaurant, grocery, catering, etc.
  address           TEXT NOT NULL,
  latitude          DOUBLE PRECISION NOT NULL,
  longitude         DOUBLE PRECISION NOT NULL,
  operating_hours   JSONB,         -- { "mon": "09:00-22:00", ... }
  is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  total_donations   INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. NGOs (extends users)
CREATE TABLE ngos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_name VARCHAR(255) NOT NULL,
  registration_no   VARCHAR(100),
  address           TEXT NOT NULL,
  latitude          DOUBLE PRECISION NOT NULL,
  longitude         DOUBLE PRECISION NOT NULL,
  capacity          INTEGER,       -- max meals/items they can handle per day
  food_preferences  JSONB,         -- ["cooked_meals", "packaged_food"]
  is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  total_received    INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Volunteers (extends users)
CREATE TABLE volunteers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  availability      volunteer_availability NOT NULL DEFAULT 'offline',
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION,
  vehicle_type      VARCHAR(50),   -- bike, car, on_foot
  max_distance_km   DOUBLE PRECISION DEFAULT 10,
  total_deliveries  INTEGER NOT NULL DEFAULT 0,
  rating            DOUBLE PRECISION DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Food Donations
CREATE TABLE food_donations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id       UUID NOT NULL REFERENCES food_providers(id) ON DELETE CASCADE,
  title             VARCHAR(255) NOT NULL,
  description       TEXT,
  category          food_category NOT NULL,
  quantity          INTEGER NOT NULL,           -- number of servings / items
  unit              VARCHAR(50) DEFAULT 'servings',
  weight_kg         DOUBLE PRECISION,
  image_url         TEXT,
  pickup_address    TEXT NOT NULL,
  latitude          DOUBLE PRECISION NOT NULL,
  longitude         DOUBLE PRECISION NOT NULL,
  pickup_window_start TIMESTAMPTZ NOT NULL,
  pickup_window_end   TIMESTAMPTZ NOT NULL,
  expiry_time       TIMESTAMPTZ NOT NULL,
  status            donation_status NOT NULL DEFAULT 'posted',
  special_instructions TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Donation Claims (NGO claims a donation)
CREATE TABLE donation_claims (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donation_id       UUID NOT NULL REFERENCES food_donations(id) ON DELETE CASCADE,
  ngo_id            UUID NOT NULL REFERENCES ngos(id) ON DELETE CASCADE,
  match_score       DOUBLE PRECISION,          -- score from matching engine
  status            claim_status NOT NULL DEFAULT 'pending',
  claimed_at        TIMESTAMPTZ,
  responded_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(donation_id, ngo_id)
);

-- 7. Deliveries
CREATE TABLE deliveries (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donation_id       UUID NOT NULL REFERENCES food_donations(id) ON DELETE CASCADE,
  volunteer_id      UUID REFERENCES volunteers(id),
  ngo_id            UUID NOT NULL REFERENCES ngos(id) ON DELETE CASCADE,
  status            delivery_status NOT NULL DEFAULT 'pending',
  pickup_time       TIMESTAMPTZ,
  delivery_time     TIMESTAMPTZ,
  distance_km       DOUBLE PRECISION,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. QR Codes
CREATE TABLE qr_codes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id       UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  code              VARCHAR(255) UNIQUE NOT NULL,
  type              qr_code_type NOT NULL,
  is_scanned        BOOLEAN NOT NULL DEFAULT FALSE,
  scanned_at        TIMESTAMPTZ,
  scanned_by        UUID REFERENCES users(id),
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Notifications
CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type              notification_type NOT NULL DEFAULT 'in_app',
  title             VARCHAR(255) NOT NULL,
  body              TEXT NOT NULL,
  data              JSONB,         -- payload for deep-linking
  is_read           BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Device Tokens (for push notifications)
CREATE TABLE device_tokens (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token             TEXT NOT NULL,
  platform          VARCHAR(20) NOT NULL,  -- ios, android
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- 11. Complaints
CREATE TABLE complaints (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id  UUID REFERENCES users(id),
  donation_id       UUID REFERENCES food_donations(id),
  subject           VARCHAR(255) NOT NULL,
  description       TEXT NOT NULL,
  status            complaint_status NOT NULL DEFAULT 'open',
  resolution_notes  TEXT,
  resolved_by       UUID REFERENCES users(id),
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Audit Logs
CREATE TABLE audit_logs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id          UUID REFERENCES users(id),
  action            VARCHAR(100) NOT NULL,      -- e.g. 'user.verify', 'donation.cancel'
  entity_type       VARCHAR(100),               -- e.g. 'user', 'donation'
  entity_id         UUID,
  changes           JSONB,                      -- { before: {...}, after: {...} }
  ip_address        VARCHAR(45),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Badges (gamification)
CREATE TABLE badges (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              VARCHAR(100) NOT NULL UNIQUE,
  description       TEXT,
  icon_url          TEXT,
  criteria          JSONB NOT NULL,             -- { "type": "donations_count", "threshold": 10 }
  points            INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. User Badges
CREATE TABLE user_badges (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id          UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- 15. Leaderboard Entries
CREATE TABLE leaderboard_entries (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period            VARCHAR(20) NOT NULL,       -- 'weekly', 'monthly', 'all_time'
  period_start      DATE NOT NULL,
  points            INTEGER NOT NULL DEFAULT 0,
  rank              INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, period, period_start)
);

-- 16. Refresh Tokens
CREATE TABLE refresh_tokens (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash        VARCHAR(255) NOT NULL,
  expires_at        TIMESTAMPTZ NOT NULL,
  revoked           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------
-- Indexes
-- -------------------------

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- Food Providers
CREATE INDEX idx_food_providers_user_id ON food_providers(user_id);
CREATE INDEX idx_food_providers_geo ON food_providers(latitude, longitude);

-- NGOs
CREATE INDEX idx_ngos_user_id ON ngos(user_id);
CREATE INDEX idx_ngos_geo ON ngos(latitude, longitude);

-- Volunteers
CREATE INDEX idx_volunteers_user_id ON volunteers(user_id);
CREATE INDEX idx_volunteers_availability ON volunteers(availability);
CREATE INDEX idx_volunteers_geo ON volunteers(latitude, longitude);

-- Food Donations
CREATE INDEX idx_food_donations_provider ON food_donations(provider_id);
CREATE INDEX idx_food_donations_status ON food_donations(status);
CREATE INDEX idx_food_donations_expiry ON food_donations(expiry_time);
CREATE INDEX idx_food_donations_geo ON food_donations(latitude, longitude);
CREATE INDEX idx_food_donations_category ON food_donations(category);

-- Donation Claims
CREATE INDEX idx_donation_claims_donation ON donation_claims(donation_id);
CREATE INDEX idx_donation_claims_ngo ON donation_claims(ngo_id);
CREATE INDEX idx_donation_claims_status ON donation_claims(status);

-- Deliveries
CREATE INDEX idx_deliveries_donation ON deliveries(donation_id);
CREATE INDEX idx_deliveries_volunteer ON deliveries(volunteer_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);

-- QR Codes
CREATE INDEX idx_qr_codes_delivery ON qr_codes(delivery_id);
CREATE INDEX idx_qr_codes_code ON qr_codes(code);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Audit Logs
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Refresh Tokens
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- -------------------------
-- Triggers
-- -------------------------

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name
    FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trigger_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      t
    );
  END LOOP;
END;
$$;
