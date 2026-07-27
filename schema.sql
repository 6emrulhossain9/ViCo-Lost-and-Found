-- ============================================
-- Campus Lost & Found - Supabase Schema
-- Paste this entire file into the Supabase
-- SQL Editor and click "Run"
-- ============================================

-- 1. Create the items table (includes auth migration columns)
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
  nickname        TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  edit_code       TEXT NOT NULL DEFAULT '',
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Create profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url   TEXT DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable Row Level Security
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Drop old RLS policies (safe to run multiple times)
DROP POLICY IF EXISTS "Public can read items" ON items;
DROP POLICY IF EXISTS "Public can insert items" ON items;
DROP POLICY IF EXISTS "Public can update items" ON items;
DROP POLICY IF EXISTS "Public can delete items" ON items;

-- 5. New RLS Policies

-- Items: anyone can read (browsing the grid)
CREATE POLICY "Anyone can read items"
  ON items FOR SELECT
  TO anon, authenticated
  USING (true);

-- Items: only authenticated users can insert, and only their own items
CREATE POLICY "Authenticated users can insert items"
  ON items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Items: only the owner can update
CREATE POLICY "Owners can update items"
  ON items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Items: only the owner can delete
CREATE POLICY "Owners can delete items"
  ON items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Profiles: anyone can read display names
CREATE POLICY "Anyone can read profiles"
  ON profiles FOR SELECT
  TO anon, authenticated
  USING (true);

-- Profiles: users can manage their own profile only
CREATE POLICY "Users can manage own profile"
  ON profiles FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 6. Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 7. Indexes for fast filtering / sorting
CREATE INDEX IF NOT EXISTS items_status_idx       ON items (status);
CREATE INDEX IF NOT EXISTS items_type_idx         ON items (type);
CREATE INDEX IF NOT EXISTS items_user_id_idx      ON items (user_id);
CREATE INDEX IF NOT EXISTS items_date_idx         ON items (date_reported DESC);
