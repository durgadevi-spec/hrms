import { Router } from 'express';
import authMiddleware, { requireRole } from '../middleware/auth.js';
import supabase from '../supabase.js';
import lmsPool from '../lmsDb.js';
import projectsPool from '../projectsDb.js';

import bcrypt from 'bcryptjs';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('admin', 'hr'));

/**
 * GET /api/admin/employee-sync
 * Returns all core employees enriched with flags indicating if they exist
 * in the LMS database and the PMS (Projects) database.
 * Used by the Admin Dashboard employee selector to show sync status.
 */
router.get('/employee-sync', async (req, res) => {
  try {
    // 1. Fetch all employees from Core DB (Supabase)
    const { data: coreEmps, error: coreErr } = await supabase
      .from('employees')
      .select('id, official_email, first_name, last_name, employee_id');
    if (coreErr) throw coreErr;

    // 2. Fetch emails present in LMS DB
    let lmsEmails = new Set();
    try {
      const lmsRes = await lmsPool.query('SELECT LOWER(TRIM(email)) AS email FROM public.users WHERE email IS NOT NULL');
      lmsRes.rows.forEach(r => lmsEmails.add(r.email));
    } catch (err) {
      console.error('[admin] LMS email fetch failed:', err.message);
    }

    // 3. Fetch emails present in PMS (Projects) DB
    let pmsEmails = new Set();
    try {
      const pmsRes = await projectsPool.query('SELECT LOWER(TRIM(email)) AS email FROM public.employees WHERE email IS NOT NULL');
      pmsRes.rows.forEach(r => pmsEmails.add(r.email));
    } catch (err) {
      console.error('[admin] PMS email fetch failed:', err.message);
    }

    // 4. Enrich core employees with sync flags
    const enriched = coreEmps.map(emp => {
      const emailKey = (emp.official_email || '').toLowerCase().trim();
      return {
        id: emp.id,
        email: emp.official_email,
        firstName: emp.first_name,
        lastName: emp.last_name,
        employeeId: emp.employee_id,
        // Cross-DB presence flags
        inLms: lmsEmails.has(emailKey),
        inPms: pmsEmails.has(emailKey),
      };
    });

    return res.json({
      employees: enriched,
      summary: {
        total: enriched.length,
        inLms: enriched.filter(e => e.inLms).length,
        inPms: enriched.filter(e => e.inPms).length,
        inBoth: enriched.filter(e => e.inLms && e.inPms).length,
        notSynced: enriched.filter(e => !e.inLms && !e.inPms).length,
      }
    });
  } catch (err) {
    console.error('[admin] GET /employee-sync error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/seed-lms-employees
 * Fetches all employees from the LMS DB and inserts any missing ones into the Core DB.
 */
router.post('/seed-lms-employees', async (req, res) => {
  try {
    // 1. Fetch all users from LMS DB
    const lmsRes = await lmsPool.query('SELECT user_id, username, email, role FROM public.users WHERE email IS NOT NULL');
    const lmsUsers = lmsRes.rows;

    if (lmsUsers.length === 0) {
      return res.json({ message: 'No users found in LMS to sync.', added: 0 });
    }

    // 2. Fetch all existing emails and employee IDs in Core DB
    const { data: coreEmps, error: coreErr } = await supabase.from('employees').select('official_email, employee_id');
    if (coreErr) throw coreErr;

    const coreEmails = new Set(coreEmps.map(e => (e.official_email || '').toLowerCase().trim()));
    const coreEmpIds = new Set(coreEmps.map(e => (e.employee_id || '').toLowerCase().trim()));

    // 3. Find LMS users not in Core DB (check both email and employee_id)
    const newUsers = lmsUsers.filter(u => {
      const emailMatch = coreEmails.has((u.email || '').toLowerCase().trim());
      const idMatch = coreEmpIds.has((u.user_id || '').toLowerCase().trim());
      return !emailMatch && !idMatch;
    });

    if (newUsers.length === 0) {
      return res.json({ message: 'All LMS users are already synced.', added: 0 });
    }

    // Hash a default password
    const defaultPasswordHash = await bcrypt.hash('Welcome123!', 12);

    // 4. Insert into Supabase Core DB across normalized tables
    let insertedCount = 0;
    let insertedEmps = [];

    for (const u of newUsers) {
      const parts = (u.username || '').trim().split(' ');
      const firstName = parts[0] || 'Unknown';
      const lastName = parts.length > 1 ? parts.slice(1).join(' ') : 'Unknown';
      const email = u.email.trim().toLowerCase();
      const role = u.role === 'admin' ? 'admin' : 'employee';

      // Insert into basic employees table
      const { data: emp, error: empErr } = await supabase.from('employees').insert({
        official_email: email,
        first_name: firstName,
        last_name: lastName,
        employee_id: u.user_id,
        mobile_number: '0000000000',
        date_of_birth: '2000-01-01',
        gender: 'Prefer Not to Say',
        created_by: req.user.id
      }).select().single();

      if (empErr) {
        console.error(`[admin] Failed to insert basic employee ${email}:`, empErr.message);
        continue;
      }

      // Insert job details
      await supabase.from('employee_job_details').insert({
        employee_id: emp.id,
        designation: 'N/A',
        joining_date: new Date().toISOString().split('T')[0],
        role: role,
        created_by: req.user.id
      });

      // Insert system access
      await supabase.from('employee_system_access').insert({
        employee_id: emp.id,
        username: email,
        login_email: email,
        password_hash: defaultPasswordHash,
        role: role,
        account_status: 'Active',
        created_by: req.user.id
      });

      insertedCount++;
      insertedEmps.push(emp);
    }

    return res.json({ 
      message: `Successfully synced ${insertedCount} employees from LMS.`, 
      added: insertedCount,
      employees: insertedEmps
    });

  } catch (err) {
    console.error('[admin] POST /seed-lms-employees error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
