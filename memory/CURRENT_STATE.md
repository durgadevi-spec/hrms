# Current Project State: CTI HRMS
*Last Updated: 2026-10-26*

## 1. Active Focus
- Verification of dynamic category-tailored asset forms across inventory.
- Direct Supabase document storage integration.

## 2. Recently Completed
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
