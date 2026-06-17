-- ============================================
-- Campus Lost & Found - Supabase Schema
-- Paste this entire file into the Supabase
-- SQL Editor and click "Run"
-- ============================================

-- 1. Create the items table
CREATE TABLE IF NOT EXISTS items (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL CHECK (type IN ('lost', 'found')),
  name            TEXT NOT NULL,
  description     TEXT DEFAULT '',
  location        TEXT NOT NULL,
  date_lost_found DATE NOT NULL,
  date_reported   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  image_base64    TEXT DEFAULT '',
  contact         TEXT NOT NULL,
  nickname        TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  edit_code       TEXT NOT NULL
);

-- 2. Enable Row Level Security
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies (public app — anyone can read/write)
--    The frontend validates the edit_code before delete/update.

CREATE POLICY "Public can read items"
  ON items FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can insert items"
  ON items FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Public can update items"
  ON items FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete items"
  ON items FOR DELETE
  TO anon
  USING (true);

-- 4. Indexes for fast filtering / sorting
CREATE INDEX IF NOT EXISTS items_status_idx       ON items (status);
CREATE INDEX IF NOT EXISTS items_type_idx         ON items (type);
CREATE INDEX IF NOT EXISTS items_nickname_idx     ON items (lower(nickname));
CREATE INDEX IF NOT EXISTS items_date_idx         ON items (date_reported DESC);
