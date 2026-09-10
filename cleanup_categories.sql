-- ============================================================================
-- CLEANUP: Remove duplicate and malformed asset categories
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Remove ALL asset categories except the properly-cased system ones
DELETE FROM asset_categories
WHERE name NOT IN (
  'Computer & Laptop',
  'Mobile & Tablet',
  'Networking Equipment',
  'Office Equipment',
  'Furniture',
  'ID / Access Card',
  'Other'
);

-- Step 2: Ensure system categories have correct styling
UPDATE asset_categories
SET 
  hardware_profile = CASE
    WHEN lower(name) = 'computer & laptop' THEN 'computer'
    WHEN lower(name) = 'mobile & tablet' THEN 'mobile'
    ELSE 'none'
  END,
  icon = CASE
    WHEN lower(name) = 'computer & laptop' THEN 'monitor'
    WHEN lower(name) = 'mobile & tablet' THEN 'smartphone'
    WHEN lower(name) = 'networking equipment' THEN 'router'
    WHEN lower(name) = 'office equipment' THEN 'briefcase'
    WHEN lower(name) = 'furniture' THEN 'chair'
    WHEN lower(name) = 'id / access card' THEN 'creditcard'
    WHEN lower(name) = 'other' THEN 'package'
    ELSE icon
  END,
  color = CASE
    WHEN lower(name) = 'computer & laptop' THEN 'bg-blue-100 text-blue-600'
    WHEN lower(name) = 'mobile & tablet' THEN 'bg-violet-100 text-violet-600'
    WHEN lower(name) = 'networking equipment' THEN 'bg-teal-100 text-teal-600'
    WHEN lower(name) = 'office equipment' THEN 'bg-orange-100 text-orange-600'
    WHEN lower(name) = 'furniture' THEN 'bg-amber-100 text-amber-600'
    WHEN lower(name) = 'id / access card' THEN 'bg-rose-100 text-rose-600'
    WHEN lower(name) = 'other' THEN 'bg-gray-100 text-gray-600'
    ELSE color
  END,
  is_system = true
WHERE is_system = true
  AND lower(name) IN ('computer & laptop', 'mobile & tablet', 'networking equipment', 'office equipment', 'furniture', 'id / access card', 'other');

-- Verify cleanup
SELECT 'Asset Categories Cleaned' as status;
SELECT id, name, hardware_profile, icon, color, is_system FROM asset_categories ORDER BY name;
