import { Router } from 'express';
import supabase from '../supabase.js';
import { toCamel } from '../utils.js';
import authMiddleware, { requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/assets
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data.map(toCamel));
});

// POST /api/assets  (admin/hr)
router.post('/', requireRole('admin', 'hr'), async (req, res) => {
  const { name, assetType, serialNumber, description, status, purchaseDate, location } = req.body;
  if (!name || !assetType) return res.status(400).json({ error: 'Name and asset type are required' });

  const { data, error } = await supabase
    .from('assets')
    .insert({
      name: name.trim(),
      asset_type: assetType,
      serial_number: serialNumber?.trim() || null,
      description: description?.trim() || null,
      status: status || 'Available',
      purchase_date: purchaseDate || null,
      location: location?.trim() || null,
      created_by: req.user.id,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(toCamel(data));
});

// PUT /api/assets/:id
router.put('/:id', requireRole('admin', 'hr'), async (req, res) => {
  const { name, assetType, serialNumber, description, status, purchaseDate, location } = req.body;
  const updateData = { updated_at: new Date().toISOString() };
  if (name !== undefined) updateData.name = name.trim();
  if (assetType !== undefined) updateData.asset_type = assetType;
  if (serialNumber !== undefined) updateData.serial_number = serialNumber;
  if (description !== undefined) updateData.description = description;
  if (status !== undefined) updateData.status = status;
  if (purchaseDate !== undefined) updateData.purchase_date = purchaseDate;
  if (location !== undefined) updateData.location = location;

  const { data, error } = await supabase.from('assets').update(updateData).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(toCamel(data));
});

// DELETE /api/assets/:id
router.delete('/:id', requireRole('admin', 'hr'), async (req, res) => {
  const { error } = await supabase.from('assets').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ message: 'Asset deleted' });
});

// GET /api/assets/assignments/all
router.get('/assignments/all', async (req, res) => {
  const { data, error } = await supabase
    .from('employee_assets')
    .select('*')
    .eq('is_deleted', false)
    .is('returned_date', null)
    .order('assigned_date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data.map(toCamel));
});

// GET /api/assets/assignments/employee/:employeeId
router.get('/assignments/employee/:employeeId', async (req, res) => {
  const { data, error } = await supabase
    .from('employee_assets')
    .select('*')
    .eq('employee_id', req.params.employeeId)
    .eq('is_deleted', false)
    .is('returned_date', null);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data.map(toCamel));
});

// POST /api/assets/assign  (admin/hr)
router.post('/assign', requireRole('admin', 'hr'), async (req, res) => {
  const { assetId, employeeId } = req.body;
  if (!assetId || !employeeId) return res.status(400).json({ error: 'Asset and employee are required' });

  // Check asset is available
  const { data: asset } = await supabase.from('assets').select('status,name').eq('id', assetId).single();
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  // Case-insensitive status check (handles 'available', 'Available', 'AVAILABLE' from various clients)
  if (String(asset.status || '').toLowerCase() !== 'available') return res.status(400).json({ error: 'Asset is not available' });

  // Create assignment in employee_assets and update asset status
  const [assignResult] = await Promise.all([
    supabase.from('employee_assets').insert({
      asset_id: assetId,
      employee_id: employeeId,
      asset_name: asset.name,
      assigned_date: new Date().toISOString().split('T')[0],
      status: 'Assigned',
      created_by: req.user.id,
    }).select('*').single(),
    supabase.from('assets').update({ status: 'Assigned', updated_at: new Date().toISOString() }).eq('id', assetId),
  ]);

  if (assignResult.error) return res.status(500).json({ error: assignResult.error.message });

  // Notify employee
  await supabase.from('notifications').insert({
    employee_id: employeeId,
    title: 'Asset Assigned',
    message: `${asset.name} has been assigned to you.`,
    type: 'asset',
    link: '/assets',
  });

  return res.status(201).json(toCamel(assignResult.data));
});

// PUT /api/assets/return/:assignmentId  (admin/hr)
router.put('/return/:assignmentId', requireRole('admin', 'hr'), async (req, res) => {
  const { returnedCondition } = req.body;

  const { data: assignment } = await supabase
    .from('employee_assets')
    .select('asset_id, employee_id')
    .eq('id', req.params.assignmentId)
    .single();

  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

  const [returnResult] = await Promise.all([
    supabase.from('employee_assets').update({
      returned_date: new Date().toISOString().split('T')[0],
      remarks: returnedCondition || 'Good',
      status: 'Returned',
      updated_at: new Date().toISOString(),
    }).eq('id', req.params.assignmentId).select().single(),
    supabase.from('assets').update({ status: 'Available', updated_at: new Date().toISOString() }).eq('id', assignment.asset_id),
  ]);

  if (returnResult.error) return res.status(500).json({ error: returnResult.error.message });
  return res.json(toCamel(returnResult.data));
});

export default router;