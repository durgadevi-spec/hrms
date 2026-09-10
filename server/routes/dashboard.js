import { Router } from 'express';
import supabase from '../supabase.js';
import authMiddleware from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Execute multiple aggregates in parallel
    const [
      { count: totalEmployees },
      { count: onLeave },
      { count: activeProjects },
      { count: pendingTasks },
    ] = await Promise.all([
      supabase.from('employee_system_access').select('*', { count: 'exact', head: true }).eq('account_status', 'Active'),
      supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved').lte('start_date', today).gte('end_date', today),
      supabase.from('projects').select('*', { count: 'exact', head: true }).in('status', ['active', 'delayed']),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    const trends = {
      employees: '+12%',
      onLeave: '-2%',
      openRoles: '+3',
    };

    return res.json({
      totalEmployees,
      onLeave,
      openRoles: 5,
      activeProjects,
      pendingTasks,
      trends,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/recent-activity
router.get('/recent-activity', async (req, res) => {
  const [{ data: leaves }, { data: timesheets }] = await Promise.all([
    supabase
      .from('leave_requests')
      .select('id, leave_type, created_at, employee:employees(first_name, last_name, profile_photo)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('timesheets')
      .select('id, status, created_at, employee:employees(first_name, last_name, profile_photo)')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const activity = [
    ...(leaves || []).map(l => ({
      id: `leave_${l.id}`,
      type: 'leave',
      title: 'Leave Request',
      description: `${l.employee?.first_name} applied for ${l.leave_type.replace('_', ' ')}`,
      timestamp: l.created_at,
      user: { ...l.employee, profile_image_url: l.employee?.profile_photo },
    })),
    ...(timesheets || []).map(t => ({
      id: `ts_${t.id}`,
      type: 'timesheet',
      title: 'Timesheet Update',
      description: `${t.employee?.first_name} ${t.status} a timesheet`,
      timestamp: t.created_at,
      user: { ...t.employee, profile_image_url: t.employee?.profile_photo },
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);

  return res.json(activity);
});

export default router;
