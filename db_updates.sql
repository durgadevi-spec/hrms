-- ============================================================================
-- HRMS Database Updates
-- Run these in your Supabase SQL Editor
-- ============================================================================

-- 1. Add profile_picture and passport_scan columns to employees table
-- These store base64-encoded images (small files) or URLs
ALTER TABLE employees ADD COLUMN IF NOT EXISTS profile_picture TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS passport_scan TEXT;

-- 2. Create the assets table (if not already present)
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'other',
  serial_number TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Asset types catalog (database-backed list, no hardcoded frontend values)
CREATE TABLE IF NOT EXISTS asset_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT 'package',
  color TEXT DEFAULT 'bg-secondary-100 text-secondary-600',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add columns if they don't exist
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'package';
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'bg-secondary-100 text-secondary-600';

-- Insert or update system asset types with icon and color styling (UPSERT pattern)
INSERT INTO asset_types (name, icon, color, is_system) VALUES
  ('Laptop', 'laptop', 'bg-primary-100 text-primary-600', true),
  ('Mobile', 'smartphone', 'bg-accent-100 text-accent-600', true),
  ('ID Card', 'creditcard', 'bg-warning-100 text-warning-600', true),
  ('Access Card', 'key', 'bg-error-100 text-error-600', true),
  ('Other', 'package', 'bg-secondary-100 text-secondary-600', true)
ON CONFLICT (name) DO UPDATE
SET is_system = EXCLUDED.is_system,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color;

-- Normalize asset types to match system types
UPDATE assets
SET asset_type = 'Laptop'
WHERE lower(asset_type) = 'laptop' AND asset_type != 'Laptop';

UPDATE assets
SET asset_type = 'Mobile'
WHERE lower(asset_type) = 'mobile' AND asset_type != 'Mobile';

UPDATE assets
SET asset_type = 'ID Card'
WHERE lower(asset_type) = 'id card' AND asset_type != 'ID Card';

UPDATE assets
SET asset_type = 'Access Card'
WHERE lower(asset_type) = 'access card' AND asset_type != 'Access Card';

UPDATE assets
SET asset_type = 'Other'
WHERE lower(asset_type) = 'other' AND asset_type != 'Other';

-- 4. Asset categories catalog (database-backed list, no hardcoded frontend values)
CREATE TABLE IF NOT EXISTS asset_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  hardware_profile TEXT NOT NULL DEFAULT 'none',
  icon TEXT DEFAULT 'package',
  color TEXT DEFAULT 'bg-secondary-100 text-secondary-600',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add columns if they don't exist
ALTER TABLE asset_categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE asset_categories ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'package';
ALTER TABLE asset_categories ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'bg-secondary-100 text-secondary-600';

-- Insert or update system asset categories with icon and color styling (UPSERT pattern)
INSERT INTO asset_categories (name, hardware_profile, icon, color, is_system) VALUES
  ('Computer & Laptop', 'computer', 'monitor', 'bg-blue-100 text-blue-600', true),
  ('Mobile & Tablet', 'mobile', 'smartphone', 'bg-violet-100 text-violet-600', true),
  ('Networking Equipment', 'none', 'router', 'bg-teal-100 text-teal-600', true),
  ('Office Equipment', 'none', 'briefcase', 'bg-orange-100 text-orange-600', true),
  ('Furniture', 'none', 'chair', 'bg-amber-100 text-amber-600', true),
  ('ID / Access Card', 'none', 'creditcard', 'bg-rose-100 text-rose-600', true),
  ('Other', 'none', 'package', 'bg-gray-100 text-gray-600', true)
ON CONFLICT (name) DO UPDATE
SET hardware_profile = EXCLUDED.hardware_profile,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    is_system = true;

-- CLEANUP: Remove duplicate asset types with inconsistent casing, keeping only the properly cased system versions
DELETE FROM asset_types
WHERE is_system = true
  AND lower(name) IN ('laptop', 'mobile', 'id card', 'access card', 'other')
  AND name NOT IN ('Laptop', 'Mobile', 'ID Card', 'Access Card', 'Other');

-- CLEANUP: Remove duplicate asset categories with inconsistent casing, keeping only the properly cased system versions
DELETE FROM asset_categories
WHERE is_system = true
  AND lower(name) IN ('computer & laptop', 'mobile & tablet', 'networking equipment', 'office equipment', 'furniture', 'id / access card', 'other')
  AND name NOT IN ('Computer & Laptop', 'Mobile & Tablet', 'Networking Equipment', 'Office Equipment', 'Furniture', 'ID / Access Card', 'Other');

-- 5. Update the employee_assets (assignments) table to link to assets table
ALTER TABLE employee_assets ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES assets(id) ON DELETE CASCADE;

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_assets_employee_id ON employee_assets(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_assets_asset_id ON employee_assets(asset_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);

-- 5. RLS policies (adjust as needed for your auth setup)
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_assets ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read assets
DROP POLICY IF EXISTS "Allow read assets" ON assets;
CREATE POLICY "Allow read assets" ON assets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow admin insert assets" ON assets;
CREATE POLICY "Allow admin insert assets" ON assets FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow admin update assets" ON assets;
CREATE POLICY "Allow admin update assets" ON assets FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow admin delete assets" ON assets;
CREATE POLICY "Allow admin delete assets" ON assets FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow read employee_assets" ON employee_assets;
CREATE POLICY "Allow read employee_assets" ON employee_assets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert employee_assets" ON employee_assets;
CREATE POLICY "Allow insert employee_assets" ON employee_assets FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update employee_assets" ON employee_assets;
CREATE POLICY "Allow update employee_assets" ON employee_assets FOR UPDATE USING (true);
