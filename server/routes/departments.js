import { Router } from 'express';
import supabase from '../supabase.js';
import { toCamel } from '../utils.js';
import authMiddleware, { requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/departments
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('name');
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data.map(toCamel));
});

// GET /api/departments/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (error || !data) return res.status(404).json({ error: 'Department not found' });
  return res.json(toCamel(data));
});

// POST /api/departments  (admin/hr)
router.post('/', requireRole('admin', 'hr'), async (req, res) => {
  const { name, description, managerIds } = req.body;
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'Department name must be at least 2 characters' });
  }

  const { data, error } = await supabase
    .from('departments')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      manager_ids: Array.isArray(managerIds) ? managerIds : [],
      created_by: req.user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('DEPT POST ERROR:', error);
    return res.status(500).json({ error: error.message });
  }
  return res.status(201).json(toCamel(data));
});

// PUT /api/departments/:id  (admin/hr)
router.put('/:id', requireRole('admin', 'hr'), async (req, res) => {
  const { name, description, managerIds } = req.body;

  const updateData = { updated_at: new Date().toISOString(), updated_by: req.user.id };
  if (name !== undefined) updateData.name = name.trim();
  if (description !== undefined) updateData.description = description?.trim() || null;
  if (managerIds !== undefined) {
    updateData.manager_ids = Array.isArray(managerIds) ? managerIds : [];
  }

  console.log('[DEBUG] DEPT PUT - req.body:', req.body, '| updateData:', updateData);

  const { data, error } = await supabase
    .from('departments')
    .update(updateData)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    console.error('DEPT PUT ERROR:', JSON.stringify(error, null, 2));
    return res.status(500).json({ error: error.message });
  }
  return res.json(toCamel(data));
});

// DELETE /api/departments/:id  (admin only)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  const { error } = await supabase.from('departments').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ message: 'Department deleted' });
});

export default router;