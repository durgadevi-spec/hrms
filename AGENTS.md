# Project Rules & Memory Configuration: CTI HRMS

## 1. Project Overview
**CTI HRMS** is an enterprise Human Resource and Asset Management System built for employee records, department administration, asset lifecycle tracking (hardware profile specs, assignments, returns, damage reporting), leave management, multi-database attendance/timestrap sync, and bill payment reminders with automated WhatsApp Cloud API notifications.

## 2. Tech Stack & Environment
- **Frontend**: React 18, TypeScript 5, Vite 5 (Port `5175`), Tailwind CSS 3, Lucide Icons, DotLottie React (`@lottiefiles/dotlottie-react`), Recharts
- **Backend**: Node.js / Express 5 (Port `3001`), `pg` (node-postgres), `node-cron`, `multer`, `jsonwebtoken`, `bcryptjs`
- **Database Layer**: Multi-Database Supabase PostgreSQL Architecture:
  1. *Primary HRMS DB*: `ztvmtxcqsgysuzmwbewo` (Employees, Departments, Assets, Bills, Admins)
  2. *LMS DB (Leaves)*: `gykfyiqujyiwchqgmsjx` (Leave requests, leave balances, LMS users)
  3. *Timestrap DB (Attendance)*: `cwjkvasixpmieeuaield` (Timesheets, daily plans, work logs)
  4. *Projects DB*: `usoxzmpkverbehgeqzkc` (Corporate project master, assignments, milestones)
- **Direct Cloud Storage**: Supabase Storage (`@supabase/supabase-js`)
  - `asset-documents`: Invoices, warranty cards, manuals, and device receipts
  - `invoices`: Recurring bill reminder attachments and payment proofs
  - `avatars`: Employee profile pictures and document scans
- **Messaging Integration**: Meta WhatsApp Cloud API (Graph API v21.0) with automated bill reminder templates

## 3. Persistent Memory System (CRITICAL)
This project uses a 2-layer long-term memory system located in the `memory/` directory:
- **`memory/CURRENT_STATE.md`**: Live checkpoint of active work, recent changes, file mappings, and next steps.
- **`memory/ARCHITECTURE.md`**: Full system architecture, API proxy routing (`/api` -> `http://127.0.0.1:3001`), database sync boundaries, and WhatsApp engine.
- **`memory/DATABASE.md`**: Detailed documentation of all 4 Supabase databases, table schemas, column mappings, and storage buckets.
- **`memory/DECISIONS.md`**: Chronological log of all technical, architectural, and business decisions (never overwrite, only append).

### Agent Workflow Instructions:
1. **At the start of every substantial task**: Read `memory/CURRENT_STATE.md` and any relevant memory documents to understand the current state and prevent regression.
2. **After completing a substantial task**: Update `memory/CURRENT_STATE.md` with what changed, and append any new architectural or technical decisions to `memory/DECISIONS.md`.
3. **Preserve unrelated code**: Never delete or rewrite working features (e.g. Delete modal animations, Reactivate/Deactivate animations, WhatsApp scheduler) while working on a specific feature.

## 4. Key Architectural & Development Invariants
- **Vite Proxy**: Frontend calls `/api/*` which Vite proxies to `http://127.0.0.1:3001`. Do not hardcode `localhost:3001` in frontend components; use `api.get('/api/...')` from `src/lib/api.ts`.
- **Direct Supabase Access**: Use `src/lib/supabaseClient.ts` and `src/lib/supabaseStorage.ts` for direct client uploads to Supabase Storage instead of encoding raw Base64 data into database rows.
- **Role Hierarchy**: Five distinct roles: `admin`, `hr`, `manager`, `it_support`, `employee`. Always enforce role permissions both on frontend route guards and backend Express middleware (`requireRole`).
- **Date & Currency Formatters**: Use Indian locale formats (`en-IN`, currency `₹`) consistently across all financial and date displays.
