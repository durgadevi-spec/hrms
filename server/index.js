import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import departmentRoutes from './routes/departments.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import timesheetRoutes from './routes/timesheets.js';
import leaveRoutes from './routes/leaves.js';
import assetRoutes from './routes/assets.js';
import notificationRoutes from './routes/notifications.js';
import dashboardRoutes from './routes/dashboard.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

import bodyParser from 'body-parser';

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// IT Support accounts are limited to the Assets module. This blocks direct
// API access to every other module, even if the request bypasses the UI.
// Auth, Assets, and Notifications stay open since it_support needs those too.
function restrictItSupport(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.replace('Bearer ', '').trim(), process.env.JWT_SECRET);
      if (decoded.role === 'it_support') {
        return res.status(403).json({ error: 'IT Support accounts only have access to the Assets module.' });
      }
    } catch {
      // Invalid/expired token — let the route's own authMiddleware return the proper 401.
    }
  }
  next();
}

// IT Support needs to *read* data outside Assets — e.g. their own Profile page
// pulls departments/tasks/timesheets/leaves/projects just to render one page —
// but still can't create, edit, or delete anything in those modules (those
// write routes already require admin/hr/manager via requireRole in each file).
// The Sidebar/App routing still keeps the actual module pages hidden and
// unreachable; this only covers the read-only calls those allowed pages make.
function restrictItSupportWrites(req, res, next) {
  if (req.method === 'GET') return next();
  return restrictItSupport(req, res, next);
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', restrictItSupportWrites, employeeRoutes);
app.use('/api/departments', restrictItSupportWrites, departmentRoutes);
app.use('/api/projects', restrictItSupportWrites, projectRoutes);
app.use('/api/tasks', restrictItSupportWrites, taskRoutes);
app.use('/api/timesheets', restrictItSupportWrites, timesheetRoutes);
app.use('/api/leave-requests', restrictItSupportWrites, leaveRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', restrictItSupport, dashboardRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`🚀 API Server running on http://localhost:${port}`);
  console.log(`   Connected to PostgreSQL via Supabase pooler`);
});