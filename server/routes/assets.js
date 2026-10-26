import { Router } from 'express';
import supabase from '../supabase.js';
import { toCamel } from '../utils.js';
import authMiddleware, { requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Fields that map 1:1 (camelCase body key -> snake_case column), used by both
// create and update so the two stay in sync as the form grows.
const ASSET_FIELD_MAP = {
  name: 'name',
  assetType: 'asset_type',
  category: 'category',
  assetCode: 'asset_code',
  serialNumber: 'serial_number',
  brand: 'brand',
  model: 'model',
  processor: 'processor',
  ram: 'ram',
  storageType: 'storage_type',
  storageCapacity: 'storage_capacity',
  operatingSystem: 'operating_system',
  graphicsCard: 'graphics_card',
  displaySize: 'display_size',
  purchaseDate: 'purchase_date',
  purchaseCost: 'purchase_cost',
  vendor: 'vendor',
  invoiceNumber: 'invoice_number',
  warrantyStartDate: 'warranty_start_date',
  warrantyEndDate: 'warranty_end_date',
  location: 'location',
  department: 'department',
  description: 'description',
  status: 'status',
  assetImage: 'asset_image',
  documents: 'documents',
  mobileNumber: 'mobile_number',
};

const TEXT_FIELDS = new Set([
  'name', 'assetType', 'category', 'assetCode', 'serialNumber', 'brand', 'model',
  'processor', 'ram', 'storageType', 'storageCapacity', 'operatingSystem',
  'graphicsCard', 'displaySize', 'vendor', 'invoiceNumber', 'location',
  'department', 'description', 'status', 'assetImage', 'mobileNumber',
]);

const DATE_FIELDS = new Set(['purchaseDate', 'warrantyStartDate', 'warrantyEndDate']);

function buildRow(body) {
  const row = {};
  for (const [key, column] of Object.entries(ASSET_FIELD_MAP)) {
    if (body[key] === undefined) continue;
    let value = body[key];
    if (TEXT_FIELDS.has(key) && typeof value === 'string') value = value.trim() || null;
    if (DATE_FIELDS.has(key)) value = (typeof value === 'string' && value.trim()) ? value.trim() : null;
    if (key === 'purchaseCost') value = value === '' || value === null ? null : Number(value);
    if (key === 'documents' && !Array.isArray(value)) value = [];
    row[column] = value;
  }
  return row;
}

// GET /api/assets
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data.map(toCamel));
});

// POST /api/assets  (admin/hr/it_support)
router.post('/', requireRole('admin', 'hr', 'it_support'), async (req, res) => {
  const { name, assetType } = req.body;
  if (!name || !assetType) return res.status(400).json({ error: 'Name and asset type are required' });

  const row = buildRow(req.body);
  row.status = row.status || 'Available';
  row.created_by = req.user.id;

  const { data, error } = await supabase.from('assets').insert(row).select().single();
  if (error) return res.status(500).json({ error: error.message });

  // Optional: assign to an employee right away instead of a separate step.
  const { assignedEmployeeId, assignedDate } = req.body;
  if (assignedEmployeeId) {
    const [assignResult] = await Promise.all([
      supabase.from('employee_assets').insert({
        asset_id: data.id,
        employee_id: assignedEmployeeId,
        asset_name: data.name,
        assigned_date: assignedDate || new Date().toISOString().split('T')[0],
        status: 'Assigned',
        created_by: req.user.id,
      }),
      supabase.from('assets').update({ status: 'Assigned', updated_at: new Date().toISOString() }).eq('id', data.id),
    ]);
    if (!assignResult.error) {
      data.status = 'Assigned';
      await supabase.from('notifications').insert({
        employee_id: assignedEmployeeId,
        title: 'Asset Assigned',
        message: `${data.name} has been assigned to you.`,
        type: 'asset',
        link: '/assets',
      });
    }
  }

  return res.status(201).json(toCamel(data));
});

// PUT /api/assets/:id
router.put('/:id', requireRole('admin', 'hr', 'it_support'), async (req, res) => {
  const updateData = { ...buildRow(req.body), updated_at: new Date().toISOString() };

  const { data, error } = await supabase.from('assets').update(updateData).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(toCamel(data));
});

// DELETE /api/assets/:id
router.delete('/:id', requireRole('admin', 'hr', 'it_support'), async (req, res) => {
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
router.post('/assign', requireRole('admin', 'hr', 'it_support'), async (req, res) => {
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
router.put('/return/:assignmentId', requireRole('admin', 'hr', 'it_support'), async (req, res) => {
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

// POST /api/assets/reassign (admin/hr/it_support)
router.post('/reassign', requireRole('admin', 'hr', 'it_support'), async (req, res) => {
  const { assetId, newEmployeeId, remarks } = req.body;
  if (!assetId || !newEmployeeId) return res.status(400).json({ error: 'Asset and new employee are required' });

  // 1. Check asset exists
  const { data: asset, error: assetErr } = await supabase.from('assets').select('id, name').eq('id', assetId).single();
  if (assetErr || !asset) return res.status(404).json({ error: 'Asset not found' });

  // 2. Mark any current active assignment as Returned
  const today = new Date().toISOString().split('T')[0];
  await supabase
    .from('employee_assets')
    .update({
      returned_date: today,
      remarks: remarks || 'Reassigned to another employee',
      status: 'Returned',
      updated_at: new Date().toISOString(),
    })
    .eq('asset_id', assetId)
    .is('returned_date', null);

  // 3. Create new assignment
  const { data: newAssignment, error: assignErr } = await supabase
    .from('employee_assets')
    .insert({
      asset_id: assetId,
      employee_id: newEmployeeId,
      asset_name: asset.name,
      assigned_date: today,
      status: 'Assigned',
      created_by: req.user.id,
    })
    .select('*')
    .single();

  if (assignErr) return res.status(500).json({ error: assignErr.message });

  // 4. Ensure asset status is Assigned
  await supabase.from('assets').update({ status: 'Assigned', updated_at: new Date().toISOString() }).eq('id', assetId);

  // 5. Notify the new employee
  await supabase.from('notifications').insert({
    employee_id: newEmployeeId,
    title: 'Asset Assigned',
    message: `${asset.name} has been assigned to you.`,
    type: 'asset',
    link: '/assets',
  });

  return res.status(200).json(toCamel(newAssignment));
});

export default router;