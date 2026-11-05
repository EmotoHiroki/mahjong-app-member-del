-- Tiger Mahjong Ranking System - Supabase Schema
-- Run this in the Supabase SQL editor after creating a new project

-- =====================
-- Tables
-- =====================

CREATE TABLE members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- player_count: 3 = 3-player match (default), 4 = optional 4-player
CREATE TABLE matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TIMESTAMPTZ DEFAULT NOW(),
  player_count INTEGER NOT NULL DEFAULT 3 CHECK (player_count IN (3, 4)),
  table_number TEXT,
  cancelled BOOLEAN NOT NULL DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cancel_reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- No points_changed: points are managed separately via point_history
CREATE TABLE match_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  placement INTEGER NOT NULL CHECK (placement BETWEEN 1 AND 4),
  UNIQUE(match_id, placement),
  UNIQUE(match_id, member_id)
);

-- point_type: store-issued point categories (not tied to match placements)
CREATE TABLE point_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  points_changed INTEGER NOT NULL,
  point_type TEXT NOT NULL DEFAULT 'その他' CHECK (point_type IN ('来店', '新規来店', '月間MVP', 'その他')),
  reason TEXT NOT NULL DEFAULT '',
  cancelled BOOLEAN NOT NULL DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cancel_reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- profiles extends auth.users with role info
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'staff', 'user')),
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- Auto-create profile on signup
-- =====================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================
-- Row Level Security
-- =====================

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- members: all authenticated users can read; admin/staff can write
CREATE POLICY "members_read" ON members FOR SELECT TO authenticated USING (true);
CREATE POLICY "members_insert" ON members FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('admin', 'staff'));
CREATE POLICY "members_update" ON members FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin');

-- matches: all authenticated users can read; admin/staff can insert; admin can delete
CREATE POLICY "matches_read" ON matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "matches_insert" ON matches FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('admin', 'staff'));
CREATE POLICY "matches_delete" ON matches FOR DELETE TO authenticated
  USING (get_my_role() = 'admin');

-- match_results: same as matches
CREATE POLICY "match_results_read" ON match_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "match_results_insert" ON match_results FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('admin', 'staff'));
CREATE POLICY "match_results_delete" ON match_results FOR DELETE TO authenticated
  USING (get_my_role() = 'admin');

-- point_history: admin/staff see all; members see only their own
CREATE POLICY "point_history_read" ON point_history FOR SELECT TO authenticated
  USING (
    get_my_role() IN ('admin', 'staff')
    OR member_id IN (
      SELECT member_id FROM profiles WHERE id = auth.uid() AND member_id IS NOT NULL
    )
  );
CREATE POLICY "point_history_insert" ON point_history FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('admin', 'staff'));
CREATE POLICY "point_history_delete" ON point_history FOR DELETE TO authenticated
  USING (get_my_role() = 'admin');

-- profiles: users can read their own; admin/staff can read all
CREATE POLICY "profiles_read_own" ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR get_my_role() IN ('admin', 'staff'));
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin');

-- =====================
-- To create admin user:
-- 1. Sign up via Supabase Auth (or create user in dashboard)
-- 2. Run: UPDATE profiles SET role = 'admin' WHERE id = '<user-uuid>';
-- =====================

-- =====================
-- Migration: run on existing DB to add new columns
-- =====================
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS table_number TEXT,
  ADD COLUMN IF NOT EXISTS cancelled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

ALTER TABLE point_history
  ADD COLUMN IF NOT EXISTS cancelled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- Allow admin/staff to update (cancel) matches and point_history
-- Run only if policies don't exist yet:
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='matches' AND policyname='matches_update') THEN
    CREATE POLICY "matches_update" ON matches FOR UPDATE TO authenticated
      USING (get_my_role() IN ('admin', 'staff'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='point_history' AND policyname='point_history_update') THEN
    CREATE POLICY "point_history_update" ON point_history FOR UPDATE TO authenticated
      USING (get_my_role() IN ('admin', 'staff'));
  END IF;
END $$;

-- =====================
-- Phase 2 Migration
-- =====================

-- members: add internal_id for duplicate prevention
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS internal_id TEXT UNIQUE;

-- backfill existing members with internal_id (M00001, M00002, ...)
WITH numbered AS (
  SELECT id, 'M' || LPAD((ROW_NUMBER() OVER (ORDER BY created_at))::TEXT, 5, '0') AS new_id
  FROM members
  WHERE internal_id IS NULL
)
UPDATE members SET internal_id = numbered.new_id
FROM numbered WHERE members.id = numbered.id;

-- store_settings: single-row table for global store config
CREATE TABLE IF NOT EXISTS store_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  required_match_count INTEGER NOT NULL DEFAULT 50 CHECK (required_match_count >= 0),
  display_top_n INTEGER NOT NULL DEFAULT 10 CHECK (display_top_n IN (5, 10, 9999)),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO store_settings (id, required_match_count, display_top_n)
VALUES (1, 50, 10)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='store_settings' AND policyname='store_settings_read') THEN
    CREATE POLICY "store_settings_read" ON store_settings FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='store_settings' AND policyname='store_settings_update') THEN
    CREATE POLICY "store_settings_update" ON store_settings FOR UPDATE TO authenticated
      USING (get_my_role() = 'admin');
  END IF;
END $$;

-- =====================
-- Phase 3 Migration
-- =====================

-- Expand point_type CHECK constraint to include campaign types
ALTER TABLE point_history DROP CONSTRAINT IF EXISTS point_history_point_type_check;
ALTER TABLE point_history
  ADD CONSTRAINT point_history_point_type_check
  CHECK (point_type IN ('来店', '新規来店', '月間MVP', '誕生日', '雨の日', 'イベント', '女性来店', 'その他'));

-- =====================
-- Phase 4 Migration
-- =====================

-- Record which staff/admin granted each point entry (audit trail)
ALTER TABLE point_history
  ADD COLUMN IF NOT EXISTS created_by_email TEXT;

-- =====================
-- Phase 5 Migration
-- =====================

-- Drop old static CHECK constraint (types are now managed in point_type_config table)
ALTER TABLE point_history DROP CONSTRAINT IF EXISTS point_history_point_type_check;

-- Admin-configurable point type definitions
CREATE TABLE IF NOT EXISTS point_type_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  default_points INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 999,
  category TEXT NOT NULL DEFAULT 'その他',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE point_type_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='point_type_config' AND policyname='point_type_config_read') THEN
    CREATE POLICY "point_type_config_read" ON point_type_config FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='point_type_config' AND policyname='point_type_config_update') THEN
    CREATE POLICY "point_type_config_update" ON point_type_config FOR UPDATE TO authenticated
      USING (get_my_role() = 'admin');
  END IF;
END $$;

-- Seed all point types (ordered by usage frequency as requested)
INSERT INTO point_type_config (type_key, label, default_points, display_order, category) VALUES
  ('来店',           '来店',           10,   1,  '基本'),
  ('紹介者',         '紹介者',         500,  2,  '基本'),
  ('被紹介者',       '被紹介者',       100,  3,  '基本'),
  ('新規会員登録',   '新規会員登録',   300,  4,  '基本'),
  ('役満達成',       '役満達成',       50,   5,  '基本'),
  ('イベント参加',   'イベント参加',   10,   6,  '基本'),
  ('女性来店',       '女性来店',       10,   7,  '基本'),
  ('学生来店',       '学生来店',       10,   8,  '基本'),
  ('誕生日',         '誕生日',         300,  9,  '基本'),
  ('LINE登録',               'LINE登録',               50,   10, '登録系'),
  ('アプリ登録',             'アプリ登録',             100,  11, '登録系'),
  ('Google口コミ投稿',       'Google口コミ投稿',       300,  12, '登録系'),
  ('SNS投稿',                'SNS投稿',                50,   13, '登録系'),
  ('友達招待',               '友達招待',               100,  14, '登録系'),
  ('イベント優勝',   'イベント優勝',   500,  15, '店舗イベント'),
  ('店舗大会参加',   '店舗大会参加',   10,   16, '店舗イベント'),
  ('店舗大会優勝',   '店舗大会優勝',   500,  17, '店舗イベント'),
  ('月間MVP（平均着順）', '月間MVP（平均着順）', 2500, 18, '月間MVP'),
  ('月間MVP（トップ率）', '月間MVP（トップ率）', 2500, 19, '月間MVP'),
  ('月間MVP（最大連勝）', '月間MVP（最大連勝）', 2500, 20, '月間MVP'),
  ('月間MVP（打半荘数）', '月間MVP（打半荘数）', 2500, 21, '月間MVP'),
  ('GWイベント',         'GWイベント',         50,  22, '季節イベント'),
  ('お盆イベント',       'お盆イベント',       50,  23, '季節イベント'),
  ('年末年始イベント',   '年末年始イベント',   100, 24, '季節イベント'),
  ('周年イベント',       '周年イベント',       300, 25, '季節イベント'),
  ('その他',             'その他',             0,   99, 'その他')
ON CONFLICT (type_key) DO NOTHING;

-- Phase 6: only admins can delete members. Existing foreign keys delete this
-- member's match_results/point_history and unlink profiles; auth users remain.
DROP POLICY IF EXISTS members_delete_admin ON public.members;
CREATE POLICY members_delete_admin ON public.members FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');
