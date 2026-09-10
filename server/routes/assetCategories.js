import { Router } from 'express';
import supabase from '../supabase.js';
import { toCamel } from '../utils.js';
import authMiddleware, { requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const VALID_PROFILES = ['computer', 'mobile', 'none'];

// GET /api/asset-categories
router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('asset_categories').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data.map(toCamel));
});

// POST /api/asset-categories  (admin/hr/it_support) — add a new category from the Assets page
router.post('/', requireRole('admin', 'hr', 'it_support'), async (req, res) => {
  const { name, hardwareProfile } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Category name is required' });
  const profile = VALID_PROFILES.includes(hardwareProfile) ? hardwareProfile : 'none';

  const { data, error } = await supabase
    .from('asset_categories')
    .insert({ name: name.trim(), hardware_profile: profile, created_by: req.user.id })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'That category already exists' });
    return res.status(500).json({ error: error.message });
  }
  return res.status(201).json(toCamel(data));
});

// PUT /api/asset-categories/:id  (admin/hr/it_support)
router.put('/:id', requireRole('admin', 'hr', 'it_support'), async (req, res) => {
  const { name, hardwareProfile } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Category name is required' });
  const profile = VALID_PROFILES.includes(hardwareProfile) ? hardwareProfile : 'none';

  const { data, error } = await supabase
    .from('asset_categories')
    .update({ name: name.trim(), hardware_profile: profile })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'That category already exists' });
    return res.status(500).json({ error: error.message });
  }
  return res.json(toCamel(data));
});

// DELETE /api/asset-categories/:id  (admin/hr/it_support)
router.delete('/:id', requireRole('admin', 'hr', 'it_support'), async (req, res) => {
  // Check if this is a system (built-in) asset category
  const { data: categoryData, error: fetchError } = await supabase
    .from('asset_categories')
    .select('is_system')
    .eq('id', req.params.id)
    .single();

  if (fetchError) return res.status(500).json({ error: fetchError.message });
  if (!categoryData) return res.status(404).json({ error: 'Asset category not found' });
  if (categoryData.is_system) return res.status(403).json({ error: 'Built-in asset categories cannot be deleted' });

  const { error } = await supabase.from('asset_categories').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ message: 'Asset category deleted' });
});

export default router;