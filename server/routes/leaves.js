import { Router } from 'express';
import authMiddleware from '../middleware/auth.js';
import lmsPool from '../lmsDb.js';

const router = Router();
router.use(authMiddleware);

// Helper to format snake_case to camelCase
function toCamel(obj) {
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      acc[camelKey] = obj[key];
      return acc;
    }, {});
  }
  return obj;
}

// GET /api/leave-requests
// Returns { balances: [], history: [], isLmsAdmin: boolean, syncTime: string }
router.get('/', async (req, res) => {
  try {
    const role = req.user.role;
    const email = req.user.email;
    const isAdmin = ['admin', 'hr', 'manager'].includes(role);
    
    let userExternalId = null;
    let balances = [];
    let history = [];
    let permissions = [];
    
    console.log(`[leaves] GET / for email: ${email}, role: ${role}`);

    // Attempt to find the external user ID by email
    // We use ILIKE '%' || $1 || '%' because some emails in the LMS DB have trailing newlines or spaces
    const userRes = await lmsPool.query(
      "SELECT user_id, email FROM public.users WHERE email ILIKE '%' || $1 || '%'",
      [email]
    );

    if (userRes.rows.length > 0) {
      userExternalId = userRes.rows[0].user_id;
      console.log(`[leaves] Found user in LMS DB: ${userExternalId} (email: ${userRes.rows[0].email})`);
    } else {
      console.log(`[leaves] Could NOT find user in LMS DB for email: ${email}`);
    }

    if (isAdmin) {
      // Admins see ALL balances and ALL leave history
      const balRes = await lmsPool.query("SELECT * FROM public.leave_balance ORDER BY created_at DESC");
      balances = balRes.rows;

      const histRes = await lmsPool.query("SELECT * FROM public.leaves ORDER BY created_at DESC");
      history = histRes.rows;

      const permRes = await lmsPool.query("SELECT * FROM public.permissions ORDER BY created_at DESC");
      permissions = permRes.rows;
    } else {
      // Regular employees see only their own data
      if (userExternalId) {
        const balRes = await lmsPool.query("SELECT * FROM public.leave_balance WHERE employee_code = $1", [userExternalId]);
        balances = balRes.rows;

        const histRes = await lmsPool.query("SELECT * FROM public.leaves WHERE user_id = $1 ORDER BY created_at DESC", [userExternalId]);
        history = histRes.rows;

        const permRes = await lmsPool.query("SELECT * FROM public.permissions WHERE user_id = $1 ORDER BY created_at DESC", [userExternalId]);
        permissions = permRes.rows;
      }
    }

    let lmsUsers = [];
    if (isAdmin) {
      try {
        const usersRes = await lmsPool.query("SELECT user_id, email FROM public.users");
        lmsUsers = usersRes.rows;
      } catch (err) {
        console.error('[leaves] Failed to query LMS users:', err.message);
      }
    }

    return res.json({
      balances: toCamel(balances),
      history: toCamel(history),
      permissions: toCamel(permissions),
      lmsUsers: toCamel(lmsUsers),
      isLmsAdmin: isAdmin,
      syncTime: new Date().toISOString()
    });

  } catch (err) {
    console.error('[leaves] GET / error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
