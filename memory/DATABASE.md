# Database Schemas & Storage Integration: CTI HRMS

## 1. Primary HRMS Database (`ztvmtxcqsgysuzmwbewo`)
- **Project Reference**: `ztvmtxcqsgysuzmwbewo`
- **Region**: AWS AP Southeast 2 (Sydney)
- **Direct REST Endpoint**: `https://ztvmtxcqsgysuzmwbewo.supabase.co`
- **Postgres Pooler**: `postgresql://postgres.ztvmtxcqsgysuzmwbewo:***@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres`

### Core Tables & Schemas

| Table Name | Purpose | Primary Fields & Types |
| :--- | :--- | :--- |
| **`employees`** | Organizational staff catalog & auth credentials | `id` (UUID), `first_name`, `last_name`, `email` (UNIQUE), `password_hash`, `role` (`admin`/`hr`/`manager`/`it_support`/`employee`), `status` (`Active`/`Inactive`/`on_leave`), `department_id`, `employee_id` (e.g. `EMP0042`), `designation`, `salary`, `joining_date`, `emergency_contacts` (JSONB) |
| **`departments`** | Company functional divisions | `id` (UUID), `name`, `description`, `manager_ids` (TEXT[] / JSONB), `created_at` |
| **`assets`** | Hardware, IT devices, furniture, and cards | `id` (UUID), `name`, `asset_type`, `category`, `asset_code`, `serial_number`, `brand`, `model`, `processor`, `ram`, `storage_type`, `storage_capacity`, `operating_system`, `graphics_card`, `display_size`, `purchase_date`, `purchase_cost`, `vendor`, `invoice_number`, `warranty_start_date`, `warranty_end_date`, `location`, `department`, `description`, `status` (`available`/`assigned`/`maintenance`/`damaged`/`retired`), `documents` (JSONB array of `{ name, size, type, url }`), `mobile_number` |
| **`asset_assignments`** | Custody check-out & check-in history | `id` (UUID), `asset_id` (FK), `employee_id` (FK), `assigned_at`, `returned_at`, `notes` |
| **`asset_categories`** | Dynamic categories with hardware profiles | `id` (UUID), `name`, `hardware_profile` (`computer` / `mobile` / `none`), `is_system` (BOOLEAN) |
| **`asset_types`** | Top-level device classifications | `id` (UUID), `name`, `is_system` (BOOLEAN) |
| **`bills`** | Recurring vendor, utility, and expense obligations | `id` (SERIAL / UUID), `name`, `amount`, `due_date`, `status` (`UNPAID` / `PAID`), `recipient_number` (legacy), `recipient_numbers` (TEXT[]), `invoice_urls` (TEXT[]), `paid_at`, `created_at` |
| **`bill_reminder_logs`** | WhatsApp dispatch history & delivery receipts | `id` (SERIAL), `bill_id` (FK), `sent_at`, `status` (`SUCCESS`/`FAILED`), `recipient`, `message_id`, `error_message` |

---

## 2. Supabase Storage Buckets
The Primary Supabase project hosts public cloud object storage buckets:

| Bucket Name | Access | Purpose | Path Convention |
| :--- | :--- | :--- | :--- |
| **`asset-documents`** | Public Read / Authenticated Write | Invoices, warranty cards, user manuals | `assets/{assetId}/{filename}-{timestamp}.ext` |
| **`invoices`** | Public Read / Authenticated Write | Vendor invoices, utility bills, receipts | `bills/{billId}/{filename}-{timestamp}.ext` |
| **`avatars`** | Public Read / Authenticated Write | Employee headshots & profile photos | `employees/{empId}/{filename}-{timestamp}.ext` |

---

## 3. External Partner Databases

### A. Leave Management System (LMS)
- **Project Ref**: `gykfyiqujyiwchqgmsjx` (AWS AP-Southeast-2)
- **Tables Synced**: `leave_requests`, `leave_balances`, `users`
- **Key Fields**: `user_id`, `leave_type`, `start_date`, `end_date`, `status`, `reason`, `total_days`

### B. Timestrap System (Attendance & Timesheets)
- **Project Ref**: `cwjkvasixpmieeuaield` (AWS AP-Northeast-1, Tokyo)
- **Tables Synced**: `timesheets`, `daily_plans`, `time_entries`
- **Key Fields**: `user_id`, `date`, `total_hours`, `task_name`, `project_name`, `status`

### C. Projects Management System (PMS)
- **Project Ref**: `usoxzmpkverbehgeqzkc` (AWS AP-Northeast-2, Seoul)
- **Tables Synced**: `projects`, `tasks`, `project_assignments`
- **Key Fields**: `id`, `name`, `client_name`, `status`, `start_date`, `end_date`, `progress`
