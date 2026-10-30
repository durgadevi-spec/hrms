# Current Project State: CTI HRMS
*Last Updated: 2026-10-29*

## 1. Active Focus
- Reduce initial loading delays on Employees and Admin Dashboard.
- Verification of dynamic category-tailored asset forms across inventory.
- Direct Supabase document storage integration.

## 2. Recently Completed
- **Admin Dashboard Summary Card Filters**:
  - Made the five remaining summary cards clickable to filter the employee list by the related metric: total employees, leave status, or today's timesheets.
  - Removed the Overdue Tasks and Active Projects summary cards as requested.
  - Highlighted the selected card and added a Clear card filter action; clicking a card shows all statuses by default while retaining the other employee filters.
- **Employees & Admin Dashboard Progressive Loading**:
  - Employees now show the roster as soon as the employee endpoint responds; LMS leave/status data is fetched independently in the background.
  - Admin Dashboard now waits only for employee data before rendering. Departments, LMS leaves, TimeStrap timesheets, PMS projects/assignments/tasks, and employee sync status load independently afterward.
  - LMS/PMS sync badges show a pending ellipsis until the integration status request completes, instead of briefly displaying false “not synced” marks.
- **Employee Form Full-Screen Alignment Fix**:
  - Rendered the employee profile dialog in a document-level portal so transformed app layout ancestors cannot constrain its fixed positioning.
  - Full-screen mode now uses viewport width and dynamic viewport height, removes modal margins/borders, and disables the scale animation.
- **Employee Form Full-Screen Toggle**:
  - Added a header control to expand the existing Add/Edit Employee Profile dialog to the full viewport and restore its default size.
  - Kept the form contents, save actions, and default dialog layout unchanged.
- **Employee Profile Save Feedback**:
  - Added visible saving progress and success/error messages for Save as Draft and Complete Profile actions.
  - Disabled repeated save actions while a request is in progress and added a synchronous guard against duplicate saves.
  - Save status clears when form data is edited; existing API save flow and success/error handling remain in place.
- **Employee Shift Start & End Times**:
  - Added optional shift start/end time inputs to the existing employee Job Details form without removing or changing other employee fields.
  - Saved values as `shift_start_time` and `shift_end_time` on `employee_job_details`, and loaded them into the profile edit form.
  - Added the columns to the fresh-schema migration and `db_updates.sql`; existing Supabase installations need the two `ALTER TABLE` statements in `db_updates.sql` run in the SQL Editor before saving shift times.
- **Employee Profile Overview & Read-Only Details Dialog**:
  - Added shift hours to the employee profile overview.
  - Added a separate, scrollable View Details dialog for readable personal, job/shift, identity, salary (when authorized), emergency contact, education, experience, certification, attachment, and asset information.
  - Kept the existing Edit Info action and the other profile actions unchanged.
- **Searchable, Scrollable Employee Select Dropdowns**:
  - Created reusable [`SearchableEmployeeSelect.tsx`](file:///c:/Users/Hello/Downloads/hrms/src/components/common/SearchableEmployeeSelect.tsx) with custom scrollable dropdown list (`max-h-60 overflow-y-auto`) and built-in search bar.
  - Replaced native unscrollable `<select>` across `Projects.tsx`, `Leaves.tsx` (both Leave History & Permissions tabs), and `Timesheets.tsx` (Organization Overview & Employee Drill-Down).
  - Ensured inactive employees are excluded from selection lists in Projects, Leaves, and Timesheets.
- **Admin Dashboard Status Dropdown**:
  - Styled Status filter as a clean `<select>` dropdown matching Department and Designation in both the main grid filter bar and the employee detail sidebar.
- **Default Active Employees Filter**:
  - `src/pages/Employees.tsx`: Set default `statusFilter` to `'active'`. Only active employees display by default. The Total, Active, On Leave, and Inactive summary cards allow 1-click filtering.
  - `src/pages/AdminDashboard.tsx`: Added `statusFilter` (`active` by default).
- **Pushed to GitHub (`durgadevi-spec/hrms`)**:
  - Commit `01b48d1` pushed to `origin/main` (`https://github.com/durgadevi-spec/hrms.git`) using `navee-n20`.
  - Staged and pushed dynamic asset category forms, Lottie animations, Supabase direct storage client, and agent memory documentation.
- **Dynamic Category-Tailored Asset Form Formats**:
  - Automatically adapts the Add & Edit Asset modal fields based on the selected asset type and category:
    1. **ID & Access Cards**: Card/Badge Name, Card/RFID No., Access permissions, Assigned employee, Issue date, Department, Location, Card status, Notes. Hides hardware specs, purchase vendor, invoice, and warranty.
    2. **SIM Cards**: Mobile number, Telecom operator/carrier, SIM name, ICCID serial, Plan details, Assigned employee, Issue date, Department, SIM status, Notes.
    3. **Mobile & Tablet**: Device name, Brand, Model, IMEI 1/Serial, IMEI 2, Linked SIM/Phone, OS, Storage/RAM, Purchase/Warranty, Assignment, Status.
    4. **Computers & Laptops**: Full hardware specs (Processor, RAM, SSD/HDD, OS, GPU, Display), Purchase, Vendor, Invoice, Warranty, Assignment.
    5. **General Equipment**: Office furniture, TV, networking hardware, general facilities.
  - Added visual format indicator banner for active format recognition.
  - Intelligent two-way type/category auto-syncing.
  - Table & Grid item views dynamically label `🪪 Card No: ...` for cards and `📶 ICCID: ...` for SIM cards.
  - Kept existing Return and Reassign modals intact without creating unnecessary handover modals.
- **Clean "No Data Found" Animation Integration**:
  - Replaced the previous ghosty animation and card container with `"No Data found.lottie"` across Assets, Employees, Projects, Bills, Departments, Leaves, Managers, Profile, and Timesheets.
  - Eliminated white card background containers so the illustration displays transparently and seamlessly across light and dark modes.
- **Supabase Direct Access Extension**:
  - Configured `src/lib/supabaseClient.ts` with direct client initialization.
  - Configured `src/lib/supabaseStorage.ts` with helper methods for direct file uploads to `asset-documents`, `invoices`, and `avatars`.
  - Added `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env`.
  - Initialized public Supabase storage buckets: `asset-documents`, `invoices`, `avatars`.
- **Lottie Confirmation Modals**:
  - Permanent delete modal with `permanent-delete.lottie`.
  - Account reactivate / deactivate feedback modal with `tick-success.lottie`.
  - Contract & bill creation feedback modal with `contract-approved.lottie`.
- **WhatsApp Cloud API Bill Reminders**:
  - Automated WhatsApp bill notifications with template `bill_reminder`.
  - Support for multiple WhatsApp recipients per bill reminder.
  - Throttle and rate-limit handling for group WhatsApp sends.

## 3. Key Files & Structure
- **Frontend Direct Supabase Client**: `src/lib/supabaseClient.ts`
- **Frontend Supabase Storage Helpers**: `src/lib/supabaseStorage.ts`
- **Frontend API Client (Express proxy)**: `src/lib/api.ts`
- **Empty State Component**: `src/components/common/NoDataAnimation.tsx`
- **Success & Action Animation Modal**: `src/components/common/SuccessAnimationModal.tsx`
- **Asset Management View**: `src/pages/Assets.tsx`
- **Bill Reminders View**: `src/pages/Bills.tsx`
- **Employee Profiles & Roster**: `src/pages/Employees.tsx` & `src/pages/Profile.tsx`
- **Server Entry & Cron**: `server/index.js`
- **Backend Supabase Service Client**: `server/supabase.js`

## 4. Known Issues & Tech Debt
- Some existing assets created prior to direct storage have Base64 strings in their `documents` column. They still render correctly, but new uploads should use the Supabase Storage CDN URLs.

## 5. Next Planned Tasks
- Wire `uploadAssetDocument` inside `Assets.tsx` file picker so new asset attachments upload directly to the `asset-documents` bucket.
- Verify real-time storage uploads in the browser.
