import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from '../supabase.js';
import { sanitizeEmployee } from '../utils.js';
import authMiddleware from '../middleware/auth.js';

const router = Router();

// POST /api/auth/check-email
router.post('/check-email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  // Check system access
  const { data: access, error: accessErr } = await supabase
    .from('employee_system_access')
    .select('employee_id, account_status')
    .eq('login_email', email.toLowerCase().trim())
    .maybeSingle();

  if (accessErr) return res.status(500).json({ error: accessErr.message });
  if (!access) return res.json({ exists: false });

  if (access.account_status === 'Inactive') {
    return res.json({ exists: true, status: 'inactive', message: 'Account is deactivated. Contact admin.' });
  }

  // Fetch employee details
  const { data: emp, error: empErr } = await supabase
    .from('employees')
    .select('first_name, employee_id')
    .eq('id', access.employee_id)
    .single();

  if (empErr || !emp) return res.status(500).json({ error: 'Employee details not found' });

  return res.json({
    exists: true,
    status: access.account_status,
    firstName: emp.first_name,
    employeeId: emp.employee_id,
    passwordHint: `Your default password is: ${emp.first_name.toLowerCase()}@${emp.employee_id}`
  });
});

// POST /api/auth/activate
router.post('/activate', async (req, res) => {
  const { email, employeeId, newPassword } = req.body;

  if (!email || !employeeId || !newPassword) {
    return res.status(400).json({ error: 'Email, Employee ID, and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Find system access
  const { data: access, error: accessErr } = await supabase
    .from('employee_system_access')
    .select('*')
    .eq('login_email', email.toLowerCase().trim())
    .maybeSingle();

  if (accessErr || !access) {
    return res.status(401).json({ error: 'No matching account found. Check your email.' });
  }

  if (access.account_status === 'Inactive') {
    return res.status(403).json({ error: 'Account is deactivated. Contact admin.' });
  }

  // Verify employee ID
  const { data: emp, error: empErr } = await supabase
    .from('employees')
    .select('*')
    .eq('id', access.employee_id)
    .eq('employee_id', employeeId.trim())
    .maybeSingle();

  if (empErr || !emp) {
    return res.status(401).json({ error: 'No matching employee found. Check your Employee ID.' });
  }

  // Update password
  const password_hash = await bcrypt.hash(newPassword, 12);
  await supabase
    .from('employee_system_access')
    .update({ password_hash, updated_at: new Date().toISOString() })
    .eq('id', access.id);

  // Fetch job details
  const { data: job } = await supabase
    .from('employee_job_details')
    .select('*, department:departments(*)')
    .eq('employee_id', emp.id)
    .maybeSingle();

  const token = jwt.sign(
    { id: emp.id, email: access.login_email, role: access.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.json({
    token,
    employee: sanitizeEmployee({
      ...emp,
      ...job,
      id: emp.id, // job.id (employee_job_details PK) must not overwrite the employee's real id
      email: access.login_email,
      role: access.role,
      status: access.account_status
    })
  });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { data: access, error: accessErr } = await supabase
    .from('employee_system_access')
    .select('*')
    .eq('login_email', email.toLowerCase().trim())
    .maybeSingle();

  if (accessErr || !access) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (access.account_status === 'Inactive') {
    return res.status(403).json({ error: 'Account is deactivated. Contact admin.' });
  }

  const valid = await bcrypt.compare(password, access.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const { data: emp } = await supabase
    .from('employees')
    .select('*')
    .eq('id', access.employee_id)
    .single();

  const { data: job } = await supabase
    .from('employee_job_details')
    .select('*, department:departments(*)')
    .eq('employee_id', emp.id)
    .maybeSingle();

  // Update last login
  await supabase
    .from('employee_system_access')
    .update({ last_login: new Date().toISOString() })
    .eq('id', access.id);

  const token = jwt.sign(
    { id: emp.id, email: access.login_email, role: access.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.json({
    token,
    employee: sanitizeEmployee({
      ...emp,
      ...job,
      id: emp.id, // job.id (employee_job_details PK) must not overwrite the employee's real id
      email: access.login_email,
      role: access.role,
      status: access.account_status
    }),
  });
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { email, password, firstName, lastName, employeeId, designation } = req.body;

  if (!email || !password || !firstName || !lastName || !employeeId) {
    return res.status(400).json({ error: 'All required fields must be provided' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Check for duplicate email in access
  const { data: byEmail } = await supabase
    .from('employee_system_access')
    .select('id')
    .eq('login_email', email.toLowerCase().trim())
    .maybeSingle();
  if (byEmail) return res.status(409).json({ error: 'Email is already registered' });

  // Check for duplicate employee ID
  const { data: byEmpId } = await supabase
    .from('employees')
    .select('id')
    .eq('employee_id', employeeId.trim())
    .maybeSingle();
  if (byEmpId) return res.status(409).json({ error: 'Employee ID already exists' });

  const password_hash = await bcrypt.hash(password, 12);

  const { data: newEmp, error: empErr } = await supabase
    .from('employees')
    .insert({
      official_email: email.toLowerCase().trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      employee_id: employeeId.trim(),
      mobile_number: '0000000000', // required
      date_of_birth: '2000-01-01', // required
      gender: 'Other', // required
    })
    .select()
    .single();

  if (empErr) {
    console.error('Signup error (emp):', empErr);
    return res.status(500).json({ error: 'Failed to create account (personal)' });
  }

  // Insert job details
  await supabase.from('employee_job_details').insert({
    employee_id: newEmp.id,
    designation: (designation || 'Employee').trim(),
    role: 'employee',
    joining_date: new Date().toISOString().split('T')[0],
  });

  // Insert system access
  const { data: newAccess, error: accessErr } = await supabase
    .from('employee_system_access')
    .insert({
      employee_id: newEmp.id,
      username: email.toLowerCase().trim(),
      login_email: email.toLowerCase().trim(),
      password_hash,
      role: 'employee',
      account_status: 'Active'
    })
    .select()
    .single();

  if (accessErr) {
    console.error('Signup error (access):', accessErr);
    return res.status(500).json({ error: 'Failed to create account (access)' });
  }

  const token = jwt.sign(
    { id: newEmp.id, email: newAccess.login_email, role: newAccess.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.status(201).json({
    token,
    employee: sanitizeEmployee({
      ...newEmp,
      designation: (designation || 'Employee').trim(),
      email: newAccess.login_email,
      role: newAccess.role,
      status: newAccess.account_status
    }),
  });
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  const { data: emp, error: empErr } = await supabase
    .from('employees')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (empErr || !emp) return res.status(404).json({ error: 'User not found' });

  const { data: access } = await supabase
    .from('employee_system_access')
    .select('*')
    .eq('employee_id', emp.id)
    .single();

  const { data: job } = await supabase
    .from('employee_job_details')
    .select('*, department:departments(*)')
    .eq('employee_id', emp.id)
    .maybeSingle();

  return res.json(sanitizeEmployee({
    ...emp,
    ...job,
    id: emp.id, // job.id (employee_job_details PK) must not overwrite the employee's real id
    email: access?.login_email,
    role: access?.role,
    status: access?.account_status
  }));
});

// POST /api/auth/change-password
router.post('/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current and new password required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const { data: access } = await supabase
    .from('employee_system_access')
    .select('id, password_hash')
    .eq('employee_id', req.user.id)
    .single();

  if (!access) return res.status(404).json({ error: 'User not found' });

  const valid = await bcrypt.compare(currentPassword, access.password_hash);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

  const password_hash = await bcrypt.hash(newPassword, 12);
  await supabase
    .from('employee_system_access')
    .update({ password_hash, updated_at: new Date().toISOString() })
    .eq('id', access.id);

  return res.json({ message: 'Password changed successfully' });
});

export default router;