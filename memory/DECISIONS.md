# Technical & Architectural Decision Log: CTI HRMS

*Rules: Never overwrite past entries. Always append new decisions with the date.*

---

### [2026-10-29] - Employee Form Full-Screen Viewport Positioning
- **Context**: The Add/Edit Employee dialog's full-screen toggle retained a top gap because fixed positioning was affected by its application layout ancestor.
- **Decision**:
  - Render the dialog through a document-level portal.
  - Size full-screen mode explicitly to viewport width and dynamic viewport height, remove border/margin framing, and skip the scale animation.
- **Consequences**: The full-screen option aligns to the browser viewport while the regular modal retains its original dimensions.

---

### [2026-10-29] - Employee Form Full-Screen Option
- **Context**: The multi-section Add Employee dialog needed an optional larger workspace while preserving its existing default presentation.
- **Decision**:
  - Added a toggle in the employee profile form header to switch between the current dialog size and full viewport.
  - Kept the form state, navigation, save actions, and default dialog size unchanged.
- **Consequences**: Users can choose a full-screen workspace when entering employee details and return to the original modal size at any time.

---

### [2026-10-29] - Employee Profile Save Progress Feedback
- **Context**: The profile form did not clearly signal when a draft or full profile save was in progress or completed, leading users to click repeatedly.
- **Decision**:
  - Display an in-progress spinner and action-specific text, followed by a visible success or error message.
  - Disable save/step controls while saving and guard the save handler with a ref to block duplicate submissions before React updates button state.
  - Clear stale feedback when the user edits form data.
- **Consequences**: Users can see whether the profile is saving and whether it succeeded, without changing the existing persistence flow.

---

### [2026-10-29] - Employee Profile Details Dialog
- **Context**: The employee overview needed to surface shift hours and provide a readable view of the full profile without entering the edit workflow.
- **Decision**:
  - Show saved shift start/end times on the profile overview.
  - Add a separate, scrollable, read-only details dialog that uses the already-loaded profile data.
  - Keep the existing Edit Info action unchanged; salary details display only when the profile API includes them for the current authorized viewer.
- **Consequences**: Users can review full employee details in one dialog without changing existing profile editing or management actions.

---

### [2026-10-29] - Employee Shift Time Fields
- **Context**: Employee job details needed to store shift start and end times while preserving all existing employee information and workflows.
- **Decision**:
  - Added optional start/end time inputs to the existing Job Details form.
  - Stored them in separate `TIME` columns (`shift_start_time`, `shift_end_time`) on `employee_job_details`; retained the existing `shift` field.
  - Wired profile editing to load and save the time values.
  - Added the columns to the fresh-schema migration and provided an additive SQL update for existing databases.
- **Consequences**: Employee shift times persist independently and existing job records remain valid with empty times.

---

### [2026-10-24] - Agent Memory System & Supabase Direct Access Extension
- **Context**: Across development sessions, context about the 4-database setup, role system, and file storage methods was lost or required repeated manual discovery. Additionally, asset attachments were stored as heavy Base64 strings directly in JSONB columns.
- **Decision**:
  - Implemented 2-layer Agent Memory system (`AGENTS.md` + `memory/` directory containing `CURRENT_STATE.md`, `ARCHITECTURE.md`, `DATABASE.md`, `DECISIONS.md`).
  - Added direct frontend Supabase client (`src/lib/supabaseClient.ts`) and storage helper library (`src/lib/supabaseStorage.ts`).
  - Provisioned dedicated Supabase Storage buckets: `asset-documents`, `invoices`, and `avatars`.
  - Added `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env`.
- **Consequences**: Antigravity agents automatically load and maintain the persistent memory files at task start/end; document uploads upload directly to Supabase CDN rather than inflating PostgreSQL database rows.

---

### [2026-10-24] - Clean No-Data Animation Integration
- **Context**: Replaced previous ghost animation which had an unwanted white card container.
- **Decision**:
  - Configured `NoDataAnimation.tsx` with `"No Data found.lottie"`.
  - Removed all card borders, white backgrounds, and redundant action buttons from the empty state wrapper.
  - Deployed cleanly across Assets, Employees, Projects, Bills, Departments, Leaves, Managers, Profile, and Timesheets.
- **Consequences**: Transparent, responsive empty state display without visual clutter.

---

### [2026-10-23] - Lottie Modal Feedback for System Actions
- **Context**: Standard browser alerts and text prompts for critical lifecycle actions (permanent delete, employee deactivation/reactivation, contract creation) lacked executive polish and visual confirmation.
- **Decision**:
  - Built `SuccessAnimationModal.tsx` powered by `@lottiefiles/dotlottie-react`.
  - Wired `permanent-delete.lottie` for deletions, `tick-success.lottie` for account activation toggles, and `contract-approved.lottie` for bill creation.
- **Consequences**: Consistent, engaging visual confirmation across all management modules.

---

### [2026-10-22] - Multi-Recipient WhatsApp Cloud API Notification Engine
- **Context**: Accounts teams required automated reminders for unpaid invoices sent to multiple stakeholders simultaneously.
- **Decision**:
  - Upgraded `bills` table to store `recipient_numbers` array.
  - Configured Meta Graph API v21.0 integration with automatic rate-limit throttling and dispatch logging in `bill_reminder_logs`.
  - Added `node-cron` daily scheduler running at 09:00 AM.
- **Consequences**: Automated multi-person notification delivery without third-party SMS costs.

---

### [2026-10-20] - Hardware Specification Profile Engine for IT Assets
- **Context**: Organizations manage different categories of assets (laptops, mobile devices, monitors, furniture) requiring distinct technical specifications.
- **Decision**:
  - Added `hardwareProfile` (`computer`, `mobile`, `none`) to `asset_categories`.
  - Conditionally render processor, RAM, storage type, storage capacity, OS, display size, and SIM/mobile number fields based on the selected category's profile.
- **Consequences**: Flexible, category-aware hardware inventory without rigid schema migrations for each new device type.

---

### [2026-10-26] - Dynamic Category-Tailored Asset Form Formats
- **Context**: Different asset types required vastly different fields. An ID/Access Card only needs card/badge number and employee assignment, while a SIM card needs phone number, telecom operator, and monthly plan; asking users to fill out brand, processor, RAM, and invoice details for an ID card or SIM card creates confusion and friction.
- **Decision**:
  - Implemented dynamic form templates in `AddAssetModal` (`src/pages/Assets.tsx`) governed by `getAssetKind(type, category, hardwareProfile)`.
  - Defined 5 distinct format templates:
    1. **`card` (ID & Access Card)**: Card/badge name, RFID/Card number, access permissions, assignment, issue date, department, location, status, notes. Cleanly removes hardware, purchase, warranty, and vendor fields.
    2. **`sim` (SIM Card)**: Mobile number, network carrier (with datalist), SIM name, ICCID serial, plan details, assignment, department, status, notes.
    3. **`mobile` (Mobile & Tablet)**: Device name, brand, model, IMEI 1/Serial, IMEI 2, linked phone/SIM, OS, storage/RAM, purchase, warranty, assignment.
    4. **`computer` (Laptop, Desktop, Mac)**: Full enterprise hardware specs (Processor, RAM, SSD/HDD, OS, GPU, display), purchase, vendor, invoice, warranty, assignment.
    5. **`general` (General Equipment)**: Name, asset code, serial, category, brand, model, purchase, location, assignment.
  - Excluded any redundant resignation modal in favor of keeping the existing Return and Reassign modals clean and functional.
  - Enhanced table and grid listings to display `🪪 Card No: ...` and `📶 ICCID: ...` dynamically.
- **Consequences**: Fast, intuitive asset entry with zero irrelevant fields per asset kind and full schema compatibility with PostgreSQL.

---

### [2026-10-28] - Default Active Employee Visibility & Status Filtering
- **Context**: Both the Employees and Admin Dashboard views previously defaulted to showing all employees (including deactivated/inactive staff), cluttering the primary roster view.
- **Decision**:
  - `src/pages/Employees.tsx`: Updated `statusFilter` default state to `'active'`. The "Active" summary card is highlighted with a focus ring by default. Users can click "Total", "Inactive", or "On Leave" cards for 1-click filtering.
  - `src/pages/AdminDashboard.tsx`: Added `statusFilter` defaulting to `'active'`. Added interactive pill buttons (`Active`, `All`, `Inactive`) displaying live counts both in the main dashboard grid and in the employee detail sidebar.
  - Preserved all existing sorting, searching, department/designation filters, and layout components.
- **Consequences**: Cleaner roster displays active personnel by default while retaining instant 1-click access to all or inactive employee records.

---

### [2026-10-28] - Searchable & Scrollable Employee Select Component
- **Context**: Across Projects, Leaves, and Timesheets, the employee selection was rendered as a native HTML `<select>` tag which popped up over other elements, had no search functionality, and didn't provide a cleanly styled, scrollable view when organizations have dozens of employees.
- **Decision**:
  - Implemented reusable component `SearchableEmployeeSelect.tsx` with embedded real-time search input, scrollable popup panel (`max-h-60 overflow-y-auto`), click-outside handling, and active selection checkmarks.
  - Deployed across `Projects.tsx`, `Leaves.tsx` (Leave History & Permissions tabs), and `Timesheets.tsx` (Organization & Drill-Down views).
  - Converted the Status filter on `AdminDashboard.tsx` to a native `<select>` dropdown matching Department and Designation.
- **Consequences**: Fast keyboard-friendly employee search across all multi-module management screens with uniform UX and zero disruption to underlying filtering logic.
### [2026-10-29] - Progressive Loading for Employees & Admin Dashboard
- **Context**: The Employees roster and Admin Dashboard waited on slower LMS, TimeStrap, and PMS integration requests before finishing their initial loading state.
- **Decision**:
  - Make the employee roster the required initial data for both pages.
  - Fetch leave status, departments, timesheets, projects, assignments, tasks, and employee sync status independently after the core roster is available.
  - Represent LMS/PMS sync badges as pending until their status request resolves.
- **Consequences**: The main employee views can render without waiting for secondary integrations, while retaining those integrations and their existing data surfaces.
