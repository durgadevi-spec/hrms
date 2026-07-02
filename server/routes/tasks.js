import { Router } from 'express';
import supabase from '../supabase.js';
import { toCamel } from '../utils.js';
import authMiddleware, { requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/tasks
router.get('/', async (req, res) => {
  const { projectId, assignedTo } = req.query;
  let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });
  if (projectId) query = query.eq('project_id', projectId);
  if (assignedTo) query = query.eq('assigned_to', assignedTo);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data.map(toCamel));
});

// GET /api/tasks/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase.from('tasks').select('*').eq('id', req.params.id).single();
  if (error || !data) return res.status(404).json({ error: 'Task not found' });
  return res.json(toCamel(data));
});

// POST /api/tasks
router.post('/', requireRole('admin', 'manager'), async (req, res) => {
  const { title, description, projectId, assignedTo, status, priority, dueDate } = req.body;
  if (!title) return res.status(400).json({ error: 'Task title is required' });

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      project_id: projectId || null,
      assigned_to: assignedTo || null,
      status: status || 'pending',
      priority: priority || 'medium',
      due_date: dueDate || null,
      created_by: req.user.id,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Notify assigned employee
  if (assignedTo) {
    await supabase.from('notifications').insert({
      employee_id: assignedTo,
      title: 'New Task Assigned',
      message: `You have been assigned a new task: "${title}"`,
      type: 'task',
      link: '/projects',
    });
  }

  return res.status(201).json(toCamel(data));
});

// PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
  const { title, description, status, priority, dueDate, assignedTo, projectId } = req.body;
  const updateData = { updated_at: new Date().toISOString(), updated_by: req.user.id };

  if (title !== undefined) updateData.title = title.trim();
  if (description !== undefined) updateData.description = description;
  if (status !== undefined) {
    updateData.status = status;
    if (status === 'completed') updateData.completed_at = new Date().toISOString();
  }
  if (priority !== undefined) updateData.priority = priority;
  if (dueDate !== undefined) updateData.due_date = dueDate;
  if (assignedTo !== undefined) updateData.assigned_to = assignedTo;
  if (projectId !== undefined) updateData.project_id = projectId;

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(toCamel(data));
});

// DELETE /api/tasks/:id  (admin/manager)
router.delete('/:id', requireRole('admin', 'manager'), async (req, res) => {
  const { error } = await supabase.from('tasks').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ message: 'Task deleted' });
});

export default router;
