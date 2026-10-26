# System Architecture: CTI HRMS

## 1. System Topology & Process Model
CTI HRMS operates as a unified dual-process system managed via `npm run dev` (`concurrently`):
- **Frontend Development Server**: Vite running on port `5175`.
- **Backend API & Cron Server**: Node.js / Express running on port `3001`.

```
 Browser / Client
   ├── Static UI Assets (Vite :5175)
   ├── Direct Supabase Storage (https://ztvmtxcqsgysuzmwbewo.supabase.co/storage/v1/...)
   └── /api/* HTTP Requests ──[Vite Proxy]──> Express Server (:3001)
                                                    │
                 ┌──────────────────────────────────┴──────────────────────────────────┐
                 ▼                                  ▼                                  ▼
      Primary Supabase DB               External Partner DBs                  WhatsApp Cloud API
  (ztvmtxcqsgysuzmwbewo - AP SE2)       - LMS DB (gykfyiqujyiwchqgmsjx)        (Meta Graph API v21.0)
                                        - Timestrap DB (cwjkvasixpmieeuaield)
                                        - Projects DB (usoxzmpkverbehgeqzkc)
```

## 2. API Proxy & Client Communication
- In development, `vite.config.ts` proxies `/api` requests to `http://127.0.0.1:3001`.
- The frontend uses `src/lib/api.ts` which encapsulates `fetchWithAuth`, attaching the `Bearer <token>` header automatically from `localStorage.getItem('token')`.
- When an API call returns `401 Unauthorized`, `api.ts` purges the invalid session and redirects the user to `/login`.

## 3. Direct Supabase Storage vs. Backend Proxy
- **Direct Client Uploads (`src/lib/supabaseStorage.ts`)**:
  - The frontend client directly uploads files (invoices, asset manuals, warranty receipts, profile photos) to Supabase Storage.
  - Generates secure, collision-free paths: `assets/<assetId>/<filename>-<timestamp>.pdf`.
  - Obtains the permanent public CDN URL immediately and passes only the lightweight metadata object `{ name, size, type, url }` to the backend.
- **Backend Storage Operations (`server/supabase.js`)**:
  - Initialized with `SUPABASE_SERVICE_ROLE_KEY` for administrative operations, bucket provisioning, and server-side WhatsApp attachment fetching.

## 4. Multi-Database Interconnect Layer
HRMS aggregates organizational data across four distinct cloud PostgreSQL instances:
1. **Primary HRMS Database (`DATABASE_URL`)**:
   - Manages employees, authentication credentials, departments, assets, asset assignments, and bills.
   - Hosted on Supabase (Pooler: `aws-1-ap-southeast-2.pooler.supabase.com:6543`).
2. **Leave Management System DB (`LMS_DATABASE_URL`)**:
   - Stores leave types, holiday calendars, balance quotas, and approval statuses.
   - Polled by `server/routes/leaves.js` using employee email and ID.
3. **Timestrap Attendance DB (`TIMESTRAP_DB_URL`)**:
   - Hosted on Supabase Tokyo (`aws-0-ap-northeast-1`).
   - Synced by `server/routes/timesheets.js` to calculate logged hours and daily tasks.
4. **Corporate Projects DB (`PROJECTS_DB_URL`)**:
   - Hosted on Supabase Seoul (`aws-1-ap-northeast-2`).
   - Synced by `server/routes/projects.js` to assign employees to active project milestones.

## 5. Security & Role-Based Access Control (RBAC)
- Five distinct roles:
  1. `admin`: Full organizational and financial access (Bills, Assets, Employees, System Settings).
  2. `hr`: Employee management, onboarding, leaves, and department assignments.
  3. `manager`: Team oversight, task assignment, leave approvals.
  4. `it_support`: Hardware asset lifecycle management, serial assignments, return checks.
  5. `employee`: Personal dashboard, daily timesheets, leave applications, assigned asset viewing.
- Route guards on frontend (`ProtectedRoute.tsx`) + `requireRole(...)` middleware on Express endpoints.

## 6. Automated WhatsApp Cloud API Engine
- Handled in `server/routes/bills.js` and `server/index.js`.
- Uses `node-cron` to execute daily automated bill reminder scans at 09:00 AM.
- Uses Meta Graph API (`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`).
- Multi-recipient formatting: Sanitizes phone numbers to standard E.164 (`91XXXXXXXXXX`), throttles multi-sends to prevent Meta rate-limit bans, and records delivery logs in the `bill_reminder_logs` table.
