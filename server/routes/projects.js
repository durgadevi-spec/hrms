import { Router } from 'express';
import authMiddleware, { requireRole } from '../middleware/auth.js';
import projectsPool from '../projectsDb.js';
import supabase from '../supabase.js';

const router = Router();
router.use(authMiddleware);

// Map snake_case DB columns to camelCase for the frontend
function mapProject(row) {
  return {
    id: row.id,
    title: row.title,
    name: row.title,               // alias so existing frontend code works
    projectCode: row.project_code,
    clientName: row.client_name,
    description: row.description,
    status: (row.status || 'Planned').toLowerCase().replace(' ', '_'),
    startDate: row.start_date,
    endDate: row.end_date,
    progress: row.progress ?? 0,
    location: row.location,
    company: row.company,
    holdReason: row.hold_reason,
    completedAt: row.completed_at,
    createdByEmployeeId: row.created_by_employee_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Detect which columns actually exist in public.employees of the external DB
let _projEmpColumns = null;
async function getProjEmpColumns() {
  if (_projEmpColumns) return _projEmpColumns;
  const res = await projectsPool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employees'
  `);
  _projEmpColumns = res.rows.map(r => r.column_name);
  console.log('[projects] external employees columns:', _projEmpColumns);
  return _projEmpColumns;
}

// ---------- Assignment stubs (must be BEFORE /:id routes) ----------
router.get('/assignments/all', async (req, res) => {
  try {
    const { data: coreEmps, error: coreErr } = await supabase
      .from('employees')
      .select('id, official_email, employee_id');
    if (coreErr) throw coreErr;

    // Detect available columns in external employees table
    const cols = await getProjEmpColumns();
    const hasEmployeeCode = cols.includes('employee_code');
    const selectCols = ['id', 'email', hasEmployeeCode ? 'employee_code' : 'null as employee_code'].join(', ');

    const projEmpsRes = await projectsPool.query(`SELECT ${selectCols} FROM public.employees`);
    const teamMembersRes = await projectsPool.query("SELECT project_id, employee_id FROM public.project_team_members");

    // Map projects employee_id (UUID) -> email and employee_code
    const projEmpIdToEmail = {};
    const projEmpIdToCode = {};
    projEmpsRes.rows.forEach(row => {
      if (row.email) projEmpIdToEmail[row.id] = row.email.toLowerCase().trim();
      if (row.employee_code) projEmpIdToCode[row.id] = row.employee_code.toLowerCase().trim();
    });

    // Map email -> core employee_id (UUID)
    const emailToCoreId = {};
    // Also map employee_code -> core employee_id for fallback matching
    const codeToCoreId = {};
    coreEmps.forEach(emp => {
      if (emp.official_email) emailToCoreId[emp.official_email.toLowerCase().trim()] = emp.id;
      if (emp.employee_id) codeToCoreId[emp.employee_id.toLowerCase().trim()] = emp.id;
    });

    // Now build list of assignments with core employee_id
    const assignments = teamMembersRes.rows.map((row, idx) => {
      const email = projEmpIdToEmail[row.employee_id];
      const code = projEmpIdToCode[row.employee_id];
      
      // Try email match first, then fall back to employee_code match
      let coreEmployeeId = email ? emailToCoreId[email] : null;
      if (!coreEmployeeId && code) {
        coreEmployeeId = codeToCoreId[code];
      }
      
      // If still no match, try if the employee_id itself is directly a core employee UUID
      if (!coreEmployeeId) {
        const directMatch = coreEmps.find(emp => String(emp.id) === String(row.employee_id));
        if (directMatch) coreEmployeeId = directMatch.id;
      }
      
      return {
        id: `pa_${idx}`,
        projectId: row.project_id,
        employeeId: coreEmployeeId,
        roleInProject: 'member'
      };
    }).filter(pa => pa.employeeId !== null);

    return res.json(assignments);
  } catch (err) {
    console.error('[projects] GET /assignments/all error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});
router.post('/assignments', requireRole('admin', 'manager'), (_req, res) => res.json({ message: 'Assignment stored' }));
router.delete('/assignments/:id', requireRole('admin', 'manager'), (_req, res) => res.json({ message: 'Assignment removed' }));

// GET /api/projects
// Admins/managers → all projects; others → their own + assigned projects
router.get('/', async (req, res) => {
  try {
    const role  = req.user.role;
    const email = req.user.email;

    let result;
    if (role === 'admin' || role === 'manager') {
      result = await projectsPool.query(
        'SELECT * FROM public.projects ORDER BY created_at DESC'
      );
    } else {
      // Find the employee in the external DB by email to get their external UUID
      let externalUserId = null;
      
      // Try 1: Direct email lookup
      let empRes = await projectsPool.query(
        'SELECT id FROM public.employees WHERE email ILIKE $1',
        [email]
      );
      
      if (empRes.rows.length > 0) {
        externalUserId = empRes.rows[0].id;
      } else {
        // Try 2: Get employee code from core DB and match
        const { data: coreEmp } = await supabase
          .from('employees')
          .select('employee_id, first_name, last_name')
          .eq('official_email', email)
          .single();
        
        if (coreEmp?.employee_id) {
          // Only try employee_code match if column exists
          const cols = await getProjEmpColumns();
          if (cols.includes('employee_code')) {
            empRes = await projectsPool.query(
              'SELECT id FROM public.employees WHERE employee_code ILIKE $1',
              [coreEmp.employee_id]
            );
            if (empRes.rows.length > 0) {
              externalUserId = empRes.rows[0].id;
            }
          }
        }
        
        // Try 3: Match by name if available
        if (!externalUserId && coreEmp?.first_name && coreEmp?.last_name) {
          empRes = await projectsPool.query(
            'SELECT id FROM public.employees WHERE (first_name ILIKE $1 OR name ILIKE $2) LIMIT 1',
            [`%${coreEmp.first_name}%`, `%${coreEmp.first_name}%${coreEmp.last_name}%`]
          );
          if (empRes.rows.length > 0) {
            externalUserId = empRes.rows[0].id;
          }
        }
      }
      
      if (!externalUserId) {
        // If still not found, return all public projects
        return res.json([]);
      }
      
      // Get projects they created OR are assigned to as team members
      result = await projectsPool.query(
        `SELECT DISTINCT p.* FROM public.projects p
         LEFT JOIN public.project_team_members tm ON p.id = tm.project_id
         WHERE p.created_by_employee_id = $1 OR tm.employee_id = $1
         ORDER BY p.created_at DESC`,
        [externalUserId]
      );
    }

    return res.json(result.rows.map(mapProject));
  } catch (err) {
    console.error('[projects] GET / error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await projectsPool.query(
      'SELECT * FROM public.projects WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Project not found' });
    return res.json(mapProject(result.rows[0]));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/projects (admin / manager)
router.post('/', requireRole('admin', 'manager'), async (req, res) => {
  const { title, projectCode, clientName, description, status, startDate, endDate, location, company } = req.body;
  if (!title) return res.status(400).json({ error: 'Project title is required' });

  try {
    // Find the employee in the external DB by email to get their external UUID
    const empRes = await projectsPool.query(
      'SELECT id FROM public.employees WHERE email ILIKE $1',
      [req.user.email]
    );
    const externalUserId = empRes.rows.length > 0 ? empRes.rows[0].id : null;

    const result = await projectsPool.query(
      `INSERT INTO public.projects
         (title, project_code, client_name, description, status, start_date, end_date,
          location, company, created_by_employee_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        title.trim(),
        projectCode || `PROJ-${Date.now()}`,
        clientName || null,
        description?.trim() || null,
        status || 'Planned',
        startDate || null,
        endDate || null,
        location || null,
        company || null,
        externalUserId,
      ]
    );
    return res.status(201).json(mapProject(result.rows[0]));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:id
router.put('/:id', requireRole('admin', 'manager'), async (req, res) => {
  const fields = [];
  const values = [];
  let idx = 1;

  const allowed = {
    title: 'title', projectCode: 'project_code', clientName: 'client_name',
    description: 'description', status: 'status', startDate: 'start_date',
    endDate: 'end_date', location: 'location', company: 'company',
    progress: 'progress', holdReason: 'hold_reason',
  };

  for (const [key, col] of Object.entries(allowed)) {
    if (req.body[key] !== undefined) {
      fields.push(`${col} = $${idx++}`);
      values.push(req.body[key]);
    }
  }

  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

  fields.push(`updated_at = NOW()`);
  values.push(req.params.id);

  try {
    const result = await projectsPool.query(
      `UPDATE public.projects SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Project not found' });
    return res.json(mapProject(result.rows[0]));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:id (admin only)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await projectsPool.query('DELETE FROM public.projects WHERE id = $1', [req.params.id]);
    return res.json({ message: 'Project deleted' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;