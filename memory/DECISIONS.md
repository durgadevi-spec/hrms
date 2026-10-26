# Technical & Architectural Decision Log: CTI HRMS

*Rules: Never overwrite past entries. Always append new decisions with the date.*

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

