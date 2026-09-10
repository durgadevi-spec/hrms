import { Router } from 'express';
import timestrapPool from '../timestrapDb.js';
import authMiddleware from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Helper to format snake_case to camelCase
function toCamel(obj) {
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (obj !== null && typeof obj === 'object') {
    if (obj instanceof Date) return obj; // don't convert Date objects
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      acc[camelKey] = toCamel(obj[key]);
      return acc;
    }, {});
  }
  return obj;
}

// GET /api/timesheets
router.get('/', async (req, res) => {
  try {
    const scope = req.query.scope || 'my';
    const email = req.user.email;
    const role = req.user.role;
    const isAdmin = ['admin', 'hr', 'manager'].includes(role);

    if (scope === 'org' && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden. Admin access required for org scope.' });
    }

    // 1. Map email to TimeStrap User ID
    let userExternalId = null;
    const userRes = await timestrapPool.query(
      "SELECT id, name, employee_code, department FROM public.employees WHERE email ILIKE $1",
      [`%${email}%`]
    );
    if (userRes.rows.length > 0) {
      userExternalId = userRes.rows[0].id;
    }

    if (!userExternalId && scope === 'my') {
      return res.json({
        dailyPlans: [],
        planTasks: [],
        dailySubmissions: [],
        timeEntries: [],
        timesheetSubmissions: [],
        employees: []
      });
    }

    // 2. Query Data Based on Scope
    let dailyPlans = [];
    let planTasks = [];
    let dailySubmissions = [];
    let timeEntries = [];
    let timesheetSubmissions = [];
    let employees = [];

    if (scope === 'my' || scope === 'employee') {
      // Fetch for specific user
      const targetId = scope === 'employee' ? req.query.employeeId : userExternalId;
      if (!targetId) return res.status(400).json({ error: 'Employee ID required' });

      const dpRes = await timestrapPool.query("SELECT * FROM public.daily_plans WHERE employee_id = $1", [targetId]);
      dailyPlans = dpRes.rows;

      if (dailyPlans.length > 0) {
        const planIds = dailyPlans.map(dp => dp.id);
        // Safely query plan tasks
        const ptRes = await timestrapPool.query("SELECT * FROM public.plan_tasks WHERE plan_id = ANY($1::text[])", [planIds]);
        planTasks = ptRes.rows;
      }

      const dsRes = await timestrapPool.query("SELECT * FROM public.daily_submissions WHERE employee_id = $1", [targetId]);
      dailySubmissions = dsRes.rows;

      const teRes = await timestrapPool.query("SELECT * FROM public.time_entries WHERE employee_id = $1 ORDER BY date DESC", [targetId]);
      timeEntries = teRes.rows;

      const tsRes = await timestrapPool.query("SELECT * FROM public.timesheet_submissions WHERE employee_id = $1 ORDER BY created_at DESC", [targetId]);
      timesheetSubmissions = tsRes.rows;

      employees = userRes.rows; // Just the current user

    } else if (scope === 'org') {
      // Fetch all employees for Admin summary view
      const empRes = await timestrapPool.query("SELECT id, name, email, employee_code, department FROM public.employees WHERE is_active = true");
      employees = empRes.rows;

      // To keep payload size reasonable, we fetch recent time entries (e.g. current month) or aggregates
      // Since it's a dashboard, we'll fetch the last 30 days of data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

      const dsRes = await timestrapPool.query("SELECT * FROM public.daily_submissions WHERE date >= $1", [dateStr]);
      dailySubmissions = dsRes.rows;

      const teRes = await timestrapPool.query("SELECT * FROM public.time_entries WHERE date >= $1", [dateStr]);
      timeEntries = teRes.rows;

      // Plan data might be huge, fetching only recent plans
      const dpRes = await timestrapPool.query("SELECT * FROM public.daily_plans WHERE date >= $1", [dateStr]);
      dailyPlans = dpRes.rows;

      // Fetch plan tasks for all plans in org scope
      if (dailyPlans.length > 0) {
        const planIds = dailyPlans.map(dp => dp.id);
        const ptRes = await timestrapPool.query("SELECT * FROM public.plan_tasks WHERE plan_id = ANY($1::text[])", [planIds]);
        planTasks = ptRes.rows;
      }

      // Timesheet submissions are monthly, fetch all recent ones
      const tsRes = await timestrapPool.query("SELECT * FROM public.timesheet_submissions ORDER BY created_at DESC LIMIT 500");
      timesheetSubmissions = tsRes.rows;
    }

    return res.json(toCamel({
      dailyPlans,
      planTasks,
      dailySubmissions,
      timeEntries,
      timesheetSubmissions,
      employees
    }));

  } catch (err) {
    console.error('[timesheets] GET / error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;