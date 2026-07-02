import { Router } from 'express';
import supabase from '../supabase.js';
import { sanitizeEmployee } from '../utils.js';
import authMiddleware, { requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Helper function to build a unified employee object
const buildUnifiedEmployee = (emp, job, access) => {
  if (!emp) return null;
  return {
    ...emp,
    ...job,
    id: emp.id, // Ensure employee UUID is preserved
    employee_id: emp.employee_id, // Preserve actual employee code, don't let job.employee_id overwrite
    job_id: job?.id,
    email: access?.login_email || emp.official_email,
    role: access?.role || 'employee',
    status: access?.account_status || 'Active',
    username: access?.username
  };
};

// GET /api/employees
router.get('/', async (req, res) => {
  const [empRes, jobRes, accessRes] = await Promise.all([
    supabase.from('employees').select('*').eq('is_deleted', false).order('first_name'),
    supabase.from('employee_job_details').select('*, department:departments(id,name)'),
    supabase.from('employee_system_access').select('employee_id, login_email, role, account_status')
  ]);

  if (empRes.error) return res.status(500).json({ error: empRes.error.message });

  const jobsByEmp = {};
  jobRes.data?.forEach(j => jobsByEmp[j.employee_id] = j);

  const accessByEmp = {};
  accessRes.data?.forEach(a => accessByEmp[a.employee_id] = a);

  const unified = empRes.data.map(emp => buildUnifiedEmployee(emp, jobsByEmp[emp.id], accessByEmp[emp.id]));
  return res.json(unified.map(sanitizeEmployee));
});

// GET /api/employees/:id (Full profile)
router.get('/:id', async (req, res) => {
  try {
    const empId = req.params.id;
    console.log(`[Profile] Fetching employee: ${empId}, requestedBy: ${req.user?.email}, role: ${req.user?.role}`);

    let empRes = await supabase.from('employees').select('*').eq('id', empId).maybeSingle();
    console.log(`[Profile] By UUID lookup - data found: ${!!empRes.data}, error: ${empRes.error?.message || 'none'}`);

    // Fallback: If not found by ID, try by employee_id field
    if (!empRes.data) {
      empRes = await supabase.from('employees').select('*').eq('employee_id', empId).maybeSingle();
      console.log(`[Profile] By employee_id lookup - data found: ${!!empRes.data}, error: ${empRes.error?.message || 'none'}`);
    }

    // Fallback: If still not found and ID looks like an email, try email search
    if (!empRes.data && empId.includes('@')) {
      empRes = await supabase.from('employees').select('*').ilike('official_email', `%${empId}%`).maybeSingle();
      console.log(`[Profile] By email lookup - data found: ${!!empRes.data}, error: ${empRes.error?.message || 'none'}`);
    }

    // Last resort: ONLY if the requested ID matches the logged-in user's own ID
    // (prevents falling back to admin profile when viewing another employee)
    if (!empRes.data && req.user?.id && empId === req.user.id) {
      console.log(`[Profile] Attempting to load current user's profile: ${req.user.id}`);
      empRes = await supabase.from('employees').select('*').eq('id', req.user.id).maybeSingle();
      console.log(`[Profile] By current user ID - data found: ${!!empRes.data}, error: ${empRes.error?.message || 'none'}`);
    }

    // ── FIX: If still not found, check if the user exists in system_access only
    // (e.g. admin accounts seeded without a corresponding employees row)
    if (!empRes.data && ['admin', 'hr'].includes(req.user?.role)) {
      console.log(`[Profile] Employee row missing — attempting system_access fallback for: ${empId}`);
      const { data: accessData } = await supabase
        .from('employee_system_access')
        .select('*')
        .eq('employee_id', empId)
        .maybeSingle();

      if (accessData) {
        console.log(`[Profile] Found via system_access fallback: ${accessData.login_email}`);
        const nameParts = (accessData.login_email || '').split('@')[0].split('.');
        const firstName = nameParts[0]
          ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1)
          : 'Admin';
        const lastName = nameParts[1]
          ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1)
          : 'User';

        return res.json({
          id: empId,
          email: accessData.login_email,
          official_email: accessData.login_email,
          role: accessData.role,
          status: accessData.account_status || 'Active',
          first_name: firstName,
          last_name: lastName,
          // camelCase for frontend
          firstName,
          lastName,
          employeeId: accessData.username || accessData.login_email?.split('@')[0] || empId,
          designation: accessData.role === 'admin' ? 'System Administrator' : accessData.role,
          username: accessData.username,
          joiningDate: null,
          departmentId: null,
          salaryDetails: null,
          education: [],
          experience: [],
          certifications: [],
          emergencyContacts: [],
          attachments: []
        });
      }
    }
    // ── END FIX

    if (!empRes.data) {
      console.log(`[Profile] All lookups failed for: ${empId}`);
      return res.status(404).json({
        error: 'Employee not found',
        details: empRes.error?.message || 'No employee found with provided ID',
        requestedId: empId
      });
    }

    console.log(`[Profile] Found employee: ${empRes.data.first_name} ${empRes.data.last_name} (${empRes.data.id})`);

    const [jobRes, accessRes, salaryRes, eduRes, expRes, certRes, contactRes, attachmentRes, assetRes] = await Promise.all([
      supabase.from('employee_job_details').select('*, department:departments(*)').eq('employee_id', empRes.data.id).maybeSingle(),
      supabase.from('employee_system_access').select('*').eq('employee_id', empRes.data.id).maybeSingle(),

      // Only fetch salary if admin/hr or self
      (['admin', 'hr'].includes(req.user?.role) || req.user?.id === empRes.data.id)
        ? supabase.from('employee_salary_details').select('*').eq('employee_id', empRes.data.id).maybeSingle()
        : Promise.resolve({ data: null }),

      supabase.from('employee_education').select('*').eq('employee_id', empRes.data.id).order('year_of_passing', { ascending: false }),
      supabase.from('employee_experience').select('*').eq('employee_id', empRes.data.id).order('start_date', { ascending: false }),
      supabase.from('employee_certifications').select('*').eq('employee_id', empRes.data.id).order('issue_date', { ascending: false }),
      supabase.from('employee_emergency_contacts').select('*').eq('employee_id', empRes.data.id),
      supabase.from('employee_attachments').select('*').eq('employee_id', empRes.data.id),
      supabase.from('employee_assets').select('*').eq('employee_id', empRes.data.id)
    ]);

    const unified = buildUnifiedEmployee(empRes.data, jobRes.data, accessRes.data);

    // Apply toCamel to array sub-resources so frontend always receives camelCase
    const { toCamel } = await import('../utils.js');
    return res.json({
      ...sanitizeEmployee(unified),
      salaryDetails: salaryRes.data ? toCamel(salaryRes.data) : null,
      education: toCamel(eduRes.data || []),
      experience: toCamel(expRes.data || []),
      certifications: toCamel(certRes.data || []),
      emergencyContacts: toCamel(contactRes.data || []),
      attachments: toCamel(attachmentRes.data || []),
      assets: toCamel(assetRes.data || [])
    });
  } catch (error) {
    console.error('[Profile] Error fetching employee:', error);
    return res.status(500).json({ error: 'Failed to fetch employee', details: error.message });
  }
});

// POST /api/employees (Basic creation - admin/hr)
router.post('/', requireRole('admin', 'hr'), async (req, res) => {
  const {
    officialEmail, firstName, lastName, employeeId, departmentId, designation, role,
    joiningDate
  } = req.body;

  if (!officialEmail || !firstName || !lastName || !employeeId) {
    return res.status(400).json({ error: 'Required fields missing' });
  }

  // Check duplicates
  const { data: existingEmail } = await supabase.from('employees').select('id').eq('official_email', officialEmail.toLowerCase()).maybeSingle();
  if (existingEmail) return res.status(409).json({ error: 'Email already registered' });

  // Default password
  const bcrypt = await import('bcryptjs');
  const defaultPassword = `${firstName.toLowerCase()}@${employeeId}`;
  const password_hash = await bcrypt.default.hash(defaultPassword, 12);

  // 1. Create employee
  const { data: emp, error: empErr } = await supabase.from('employees').insert({
    official_email: officialEmail.toLowerCase(),
    first_name: firstName,
    last_name: lastName,
    employee_id: employeeId,
    mobile_number: req.body.mobileNumber || '0000000000',
    nationality: req.body.nationality || null,
    national_id: req.body.nationalId || null,
    marital_status: req.body.maritalStatus || null,
    profile_picture: req.body.profilePicture || null,
    passport_scan: req.body.passportScan || null,
    current_address: req.body.currentAddress || null,
    date_of_birth: req.body.dateOfBirth || '2000-01-01',
    gender: req.body.gender || 'Prefer Not to Say',
    created_by: req.user.id
  }).select().single();

  if (empErr) return res.status(500).json({ error: empErr.message });

  // 2. Create job details
  await supabase.from('employee_job_details').insert({
    employee_id: emp.id,
    department_id: departmentId || null,
    designation: designation || 'Employee',
    joining_date: joiningDate || new Date().toISOString().split('T')[0],
    role: role || 'employee',
    created_by: req.user.id
  });

  // 3. Create system access
  await supabase.from('employee_system_access').insert({
    employee_id: emp.id,
    username: officialEmail.toLowerCase(),
    login_email: officialEmail.toLowerCase(),
    password_hash,
    role: role || 'employee',
    account_status: 'Active',
    created_by: req.user.id
  });

  return res.status(201).json(sanitizeEmployee(emp));
});

// PUT /api/employees/:id/personal
router.put('/:id/personal', async (req, res) => {
  try {
    const isSelf = req.user.id === req.params.id;
    const isAdminOrHR = ['admin', 'hr'].includes(req.user.role);
    if (!isSelf && !isAdminOrHR) return res.status(403).json({ error: 'Unauthorized' });

    const updateData = { ...req.body, updated_at: new Date().toISOString(), updated_by: req.user.id };
    delete updateData.id;
    delete updateData.employee_id;

    if (req.body.profilePicture !== undefined) { updateData.profile_picture = req.body.profilePicture; delete updateData.profilePicture; }
    if (req.body.passportScan !== undefined) { updateData.passport_scan = req.body.passportScan; delete updateData.passportScan; }
    if (req.body.firstName !== undefined) { updateData.first_name = req.body.firstName; delete updateData.firstName; }
    if (req.body.lastName !== undefined) { updateData.last_name = req.body.lastName; delete updateData.lastName; }
    if (req.body.officialEmail !== undefined) { updateData.official_email = req.body.officialEmail; delete updateData.officialEmail; }
    if (req.body.personalEmail !== undefined) { updateData.personal_email = req.body.personalEmail; delete updateData.personalEmail; }
    if (req.body.mobileNumber !== undefined) { updateData.mobile_number = req.body.mobileNumber; delete updateData.mobileNumber; }
    if (req.body.dateOfBirth !== undefined) { updateData.date_of_birth = req.body.dateOfBirth; delete updateData.dateOfBirth; }
    if (req.body.bloodGroup !== undefined) { updateData.blood_group = req.body.bloodGroup; delete updateData.bloodGroup; }
    if (req.body.maritalStatus !== undefined) { updateData.marital_status = req.body.maritalStatus; delete updateData.maritalStatus; }
    if (req.body.nationalId !== undefined) { updateData.national_id = req.body.nationalId; delete updateData.nationalId; }
    if (req.body.currentAddress !== undefined) { updateData.current_address = req.body.currentAddress; delete updateData.currentAddress; }
    if (req.body.permanentAddress !== undefined) { updateData.permanent_address = req.body.permanentAddress; delete updateData.permanentAddress; }
    if (req.body.passportNumber !== undefined) { updateData.passport_number = req.body.passportNumber; delete updateData.passportNumber; }
    if (req.body.passportIssueDate !== undefined) { updateData.passport_issue_date = req.body.passportIssueDate; delete updateData.passportIssueDate; }
    if (req.body.passportExpiryDate !== undefined) { updateData.passport_expiry_date = req.body.passportExpiryDate; delete updateData.passportExpiryDate; }
    if (req.body.isPersonWithDisability !== undefined) { updateData.is_person_with_disability = req.body.isPersonWithDisability; delete updateData.isPersonWithDisability; }
    if (req.body.disabilityType !== undefined) { updateData.disability_type = req.body.disabilityType; delete updateData.disabilityType; }
    if (req.body.disabilityPercentage !== undefined) { updateData.disability_percentage = req.body.disabilityPercentage; delete updateData.disabilityPercentage; }

    // Aadhaar & PAN
    if (req.body.aadhaarNumber !== undefined) { updateData.aadhaar_number = req.body.aadhaarNumber; delete updateData.aadhaarNumber; }
    if (req.body.panNumber !== undefined) { updateData.pan_number = req.body.panNumber; delete updateData.panNumber; }

    // Visa Details
    if (req.body.visaNumber !== undefined) { updateData.visa_number = req.body.visaNumber; delete updateData.visaNumber; }
    if (req.body.visaType !== undefined) { updateData.visa_type = req.body.visaType; delete updateData.visaType; }
    if (req.body.visaCountry !== undefined) { updateData.visa_country = req.body.visaCountry; delete updateData.visaCountry; }
    if (req.body.visaIssueDate !== undefined) { updateData.visa_issue_date = req.body.visaIssueDate; delete updateData.visaIssueDate; }
    if (req.body.visaExpiryDate !== undefined) { updateData.visa_expiry_date = req.body.visaExpiryDate; delete updateData.visaExpiryDate; }
    if (req.body.visaStatus !== undefined) { updateData.visa_status = req.body.visaStatus; delete updateData.visaStatus; }

    // Sanitize empty strings to null to avoid Postgres type casting errors (e.g. for DATE fields)
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === '') {
        updateData[key] = null;
      }
    });

    // Debug: log the keys and value sizes being sent
    console.log('PERSONAL UPDATE - keys:', Object.keys(updateData));
    console.log('PERSONAL UPDATE - value sizes:', Object.fromEntries(
      Object.entries(updateData).map(([k, v]) => [k, typeof v === 'string' ? v.length : typeof v])
    ));

    const { data, error } = await supabase.from('employees').update(updateData).eq('id', req.params.id).select().single();
    if (error) {
      console.error('SUPABASE UPDATE ERROR:', JSON.stringify(error, null, 2));
      return res.status(500).json({ error: error.message });
    }
    return res.json(data);
  } catch (err) {
    console.error('PERSONAL ROUTE UNCAUGHT ERROR:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// PUT /api/employees/:id/job
router.put('/:id/job', requireRole('admin', 'hr'), async (req, res) => {
  // The "role" field controls system access/permissions and lives in
  // employee_system_access, not employee_job_details. Pull it out here so
  // it doesn't get silently dropped when written to the job details table.
  const { role, ...jobFields } = req.body;

  const updateData = { ...jobFields, updated_at: new Date().toISOString(), updated_by: req.user.id };
  delete updateData.id;
  delete updateData.employee_id;

  const { data: existing } = await supabase.from('employee_job_details').select('id').eq('employee_id', req.params.id).maybeSingle();

  let result;
  if (existing) {
    result = await supabase.from('employee_job_details').update(updateData).eq('employee_id', req.params.id).select().single();
  } else {
    result = await supabase.from('employee_job_details').insert({ ...updateData, employee_id: req.params.id }).select().single();
  }

  if (result.error) return res.status(500).json({ error: result.error.message });

  // Update system access role if it was included in the payload.
  if (role !== undefined) {
    // Only admins may grant admin access; HR can assign employee/manager/hr.
    if (role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only an admin can grant admin access' });
    }

    const { error: roleError } = await supabase
      .from('employee_system_access')
      .update({ role, updated_at: new Date().toISOString(), updated_by: req.user.id })
      .eq('employee_id', req.params.id);

    if (roleError) return res.status(500).json({ error: roleError.message });
  }

  return res.json({ ...result.data, role: role ?? undefined });
});

// PUT /api/employees/:id/salary
router.put('/:id/salary', requireRole('admin', 'hr'), async (req, res) => {
  const updateData = { ...req.body, updated_at: new Date().toISOString(), updated_by: req.user.id };
  delete updateData.id;
  delete updateData.employee_id;

  const { data: existing } = await supabase.from('employee_salary_details').select('id').eq('employee_id', req.params.id).maybeSingle();

  let result;
  if (existing) {
    result = await supabase.from('employee_salary_details').update(updateData).eq('employee_id', req.params.id).select().single();
  } else {
    result = await supabase.from('employee_salary_details').insert({ ...updateData, employee_id: req.params.id }).select().single();
  }

  if (result.error) return res.status(500).json({ error: result.error.message });
  return res.json(result.data);
});

// Arrays CRUD (Education, Experience, Certifications, Emergency Contacts)
const arrayCrudEndpoints = [
  { path: 'education', table: 'employee_education' },
  { path: 'experience', table: 'employee_experience' },
  { path: 'certifications', table: 'employee_certifications' },
  { path: 'emergency-contacts', table: 'employee_emergency_contacts' },
  { path: 'attachments', table: 'employee_attachments' },
  { path: 'assets', table: 'employee_assets' }
];

arrayCrudEndpoints.forEach(({ path, table }) => {
  // Add item
  router.post(`/:id/${path}`, async (req, res) => {
    const isSelf = req.user.id === req.params.id;
    const isAdminOrHR = ['admin', 'hr'].includes(req.user.role);
    if (!isSelf && !isAdminOrHR) return res.status(403).json({ error: 'Unauthorized' });

    const insertData = { ...req.body, employee_id: req.params.id, created_by: req.user.id };

    // Sanitize empty strings to null
    Object.keys(insertData).forEach(key => {
      if (insertData[key] === '') {
        insertData[key] = null;
      }
    });

    const { data, error } = await supabase.from(table).insert(insertData).select().single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  });

  // Update item
  router.put(`/:id/${path}/:itemId`, async (req, res) => {
    const isSelf = req.user.id === req.params.id;
    const isAdminOrHR = ['admin', 'hr'].includes(req.user.role);
    if (!isSelf && !isAdminOrHR) return res.status(403).json({ error: 'Unauthorized' });

    const updateData = { ...req.body, updated_at: new Date().toISOString(), updated_by: req.user.id };
    delete updateData.id;
    delete updateData.employee_id;

    // Sanitize empty strings to null
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === '') {
        updateData[key] = null;
      }
    });

    const { data, error } = await supabase.from(table).update(updateData).eq('id', req.params.itemId).eq('employee_id', req.params.id).select().single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  });

  // Delete item
  router.delete(`/:id/${path}/:itemId`, async (req, res) => {
    const isSelf = req.user.id === req.params.id;
    const isAdminOrHR = ['admin', 'hr'].includes(req.user.role);
    if (!isSelf && !isAdminOrHR) return res.status(403).json({ error: 'Unauthorized' });

    const { error } = await supabase.from(table).delete().eq('id', req.params.itemId).eq('employee_id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).send();
  });
});

// PUT /api/employees/:id/deactivate
router.put('/:id/deactivate', requireRole('admin', 'hr'), async (req, res) => {
  const { data, error } = await supabase
    .from('employee_system_access')
    .update({
      account_status: 'Inactive',
      updated_at: new Date().toISOString(),
      updated_by: req.user.id,
    })
    .eq('employee_id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// PUT /api/employees/:id/reactivate
router.put('/:id/reactivate', requireRole('admin', 'hr'), async (req, res) => {
  const { data, error } = await supabase
    .from('employee_system_access')
    .update({
      account_status: 'Active',
      updated_at: new Date().toISOString(),
      updated_by: req.user.id,
    })
    .eq('employee_id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

export default router;