import { Router } from 'express';
import supabase from '../supabase.js';
import { toCamel } from '../utils.js';
import authMiddleware, { requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/asset-types
router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('asset_types').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data.map(toCamel));
});

// POST /api/asset-types  (admin/hr/it_support) — add a new type from the Assets page
router.post('/', requireRole('admin', 'hr', 'it_support'), async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Type name is required' });

  const { data, error } = await supabase
    .from('asset_types')
    .insert({ name: name.trim(), created_by: req.user.id })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'That asset type already exists' });
    return res.status(500).json({ error: error.message });
  }
  return res.status(201).json(toCamel(data));
});

// PUT /api/asset-types/:id  (admin/hr/it_support)
router.put('/:id', requireRole('admin', 'hr', 'it_support'), async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Type name is required' });

  const { data, error } = await supabase
    .from('asset_types')
    .update({ name: name.trim() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'That asset type already exists' });
    return res.status(500).json({ error: error.message });
  }
  return res.json(toCamel(data));
});

// DELETE /api/asset-types/:id  (admin/hr/it_support)
router.delete('/:id', requireRole('admin', 'hr', 'it_support'), async (req, res) => {
  // Check if this is a system (built-in) asset type
  const { data: typeData, error: fetchError } = await supabase
    .from('asset_types')
    .select('is_system')
    .eq('id', req.params.id)
    .single();

  if (fetchError) return res.status(500).json({ error: fetchError.message });
  if (!typeData) return res.status(404).json({ error: 'Asset type not found' });
  if (typeData.is_system) return res.status(403).json({ error: 'Built-in asset types cannot be deleted' });

  const { error } = await supabase.from('asset_types').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ message: 'Asset type deleted' });
});

export default router;