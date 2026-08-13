-- ============================================================================
-- CLEANUP: Remove duplicate and malformed asset types and categories
-- Run this in Supabase SQL Editor to clean up any inconsistent data
-- ============================================================================

-- Step 1: Remove ALL asset types except the properly-cased system ones
DELETE FROM asset_types
WHERE name NOT IN (
  'Laptop',
  'Mobile', 
  'ID Card',
  'Access Card',
  'Other'
)
OR (
  name IN ('id_card', 'id card', 'access_card', 'access card', 'laptop', 'mobile', 'other')
);

-- Step 2: Remove ALL asset categories except the properly-cased system ones
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

-- Step 3: Ensure system types have correct casing and styling
UPDATE asset_types
SET name = CASE
  WHEN lower(name) = 'laptop' THEN 'Laptop'
  WHEN lower(name) = 'mobile' THEN 'Mobile'
  WHEN lower(name) = 'id card' OR name = 'id_card' THEN 'ID Card'
  WHEN lower(name) = 'access card' OR name = 'access_card' THEN 'Access Card'
  WHEN lower(name) = 'other' THEN 'Other'
  ELSE name
END,
    icon = CASE
  WHEN lower(name) IN ('laptop', 'Laptop') THEN 'laptop'
  WHEN lower(name) IN ('mobile', 'Mobile') THEN 'smartphone'
  WHEN lower(name) IN ('id card', 'id_card', 'ID Card', 'ID Card') THEN 'creditcard'
  WHEN lower(name) IN ('access card', 'access_card', 'Access Card') THEN 'key'
  WHEN lower(name) IN ('other', 'Other') THEN 'package'
  ELSE icon
END,
    color = CASE
  WHEN lower(name) IN ('laptop', 'Laptop') THEN 'bg-primary-100 text-primary-600'
  WHEN lower(name) IN ('mobile', 'Mobile') THEN 'bg-accent-100 text-accent-600'
  WHEN lower(name) IN ('id card', 'id_card', 'ID Card') THEN 'bg-warning-100 text-warning-600'
  WHEN lower(name) IN ('access card', 'access_card', 'Access Card') THEN 'bg-error-100 text-error-600'
  WHEN lower(name) IN ('other', 'Other') THEN 'bg-secondary-100 text-secondary-600'
  ELSE color
END,
    is_system = true
WHERE is_system = true
  AND lower(name) IN ('laptop', 'mobile', 'id card', 'access card', 'other');

-- Step 4: Verify cleanup
SELECT 'Asset Types' as table_name, COUNT(*) as count FROM asset_types
UNION ALL
SELECT 'Asset Categories' as table_name, COUNT(*) as count FROM asset_categories;

-- Step 5: Show remaining asset types
SELECT id, name, icon, color, is_system FROM asset_types ORDER BY name;

-- Step 6: Show remaining asset categories  
SELECT id, name, icon, color, is_system FROM asset_categories ORDER BY name;
