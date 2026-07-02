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

-- 3. Update the employee_assets (assignments) table to link to assets table
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
