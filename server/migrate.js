/**
 * Database migration — creates all HRMS tables in Supabase PostgreSQL
 * and seeds the initial admin account.
 * Run: node server/migrate.js
 */
import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔄 Starting database migration...');

    await client.query(`
      -- Enable UUID extension
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      -- DROP EXISTING TABLES (for clean reset during development)
      DROP TABLE IF EXISTS notifications CASCADE;
      DROP TABLE IF EXISTS asset_assignments CASCADE;
      DROP TABLE IF EXISTS employee_assets CASCADE;
      DROP TABLE IF EXISTS assets CASCADE;
      DROP TABLE IF EXISTS leave_requests CASCADE;
      DROP TABLE IF EXISTS timesheets CASCADE;
      DROP TABLE IF EXISTS tasks CASCADE;
      DROP TABLE IF EXISTS project_assignments CASCADE;
      DROP TABLE IF EXISTS projects CASCADE;
      
      DROP TABLE IF EXISTS employee_system_access CASCADE;
      DROP TABLE IF EXISTS employee_attachments CASCADE;
      DROP TABLE IF EXISTS employee_emergency_contacts CASCADE;
      DROP TABLE IF EXISTS employee_experience CASCADE;
      DROP TABLE IF EXISTS employee_education CASCADE;
      DROP TABLE IF EXISTS employee_certifications CASCADE;
      DROP TABLE IF EXISTS employee_salary_details CASCADE;
      DROP TABLE IF EXISTS employee_job_details CASCADE;
      DROP TABLE IF EXISTS employees CASCADE;
      DROP TABLE IF EXISTS departments CASCADE;

      -- DROP ENUMS
      DROP TYPE IF EXISTS gender_enum CASCADE;
      DROP TYPE IF EXISTS marital_status_enum CASCADE;
      DROP TYPE IF EXISTS employment_type_enum CASCADE;
      DROP TYPE IF EXISTS employment_status_enum CASCADE;
      DROP TYPE IF EXISTS work_mode_enum CASCADE;
      DROP TYPE IF EXISTS priority_enum CASCADE;
      DROP TYPE IF EXISTS doc_type_enum CASCADE;
      DROP TYPE IF EXISTS asset_status_enum CASCADE;
      DROP TYPE IF EXISTS account_status_enum CASCADE;
      DROP TYPE IF EXISTS user_role_enum CASCADE;

      -- ─── ENUMs ────────────────────────────────────────────────────────────────
      CREATE TYPE gender_enum AS ENUM ('Male', 'Female', 'Non-Binary', 'Other', 'Prefer Not to Say');
      CREATE TYPE marital_status_enum AS ENUM ('Single', 'Married', 'Divorced', 'Widowed', 'Other');
      CREATE TYPE employment_type_enum AS ENUM ('Full Time', 'Part Time', 'Contract', 'Internship', 'Consultant');
      CREATE TYPE employment_status_enum AS ENUM ('Active', 'Probation', 'Notice Period', 'Resigned', 'Terminated');
      CREATE TYPE work_mode_enum AS ENUM ('Office', 'Hybrid', 'Remote');
      CREATE TYPE priority_enum AS ENUM ('Primary', 'Secondary');
      CREATE TYPE doc_type_enum AS ENUM ('Profile Photo', 'Resume / CV', 'Aadhaar Card', 'PAN Card', 'Passport', 'Passport Visa', 'Visa Document', 'Driving License', 'Educational Certificates', 'Experience Certificates', 'Offer Letter', 'Appointment Letter', 'Salary Slips', 'Relieving Letter', 'Medical Certificate', 'Disability Certificate', 'Police Verification', 'Other Documents');
      CREATE TYPE asset_status_enum AS ENUM ('Available', 'Assigned', 'Damaged', 'Returned', 'Lost');
      CREATE TYPE account_status_enum AS ENUM ('Active', 'Locked', 'Suspended', 'Inactive');
      CREATE TYPE user_role_enum AS ENUM ('admin', 'hr', 'manager', 'employee');

      -- ─── Departments ──────────────────────────────────────────────────────────
      CREATE TABLE departments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        manager_ids UUID[] DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID,
        updated_by UUID
      );

      -- ─── 1. Personal Information (employees) ──────────────────────────────────
      CREATE TABLE employees (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id VARCHAR(50) UNIQUE NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          middle_name VARCHAR(100),
          last_name VARCHAR(100) NOT NULL,
          preferred_name VARCHAR(100),
          profile_photo TEXT,
          official_email VARCHAR(255) UNIQUE NOT NULL,
          personal_email VARCHAR(255),
          mobile_number VARCHAR(20) NOT NULL,
          alternate_mobile_number VARCHAR(20),
          
          date_of_birth DATE NOT NULL,
          gender gender_enum NOT NULL,
          blood_group VARCHAR(10),
          marital_status marital_status_enum,
          nationality VARCHAR(100),
          religion VARCHAR(100),
          
          aadhaar_number VARCHAR(20),
          pan_number VARCHAR(20),
          passport_number VARCHAR(50),
          passport_expiry_date DATE,
          driving_license_number VARCHAR(50),
          driving_license_expiry_date DATE,
          
          is_person_with_disability BOOLEAN DEFAULT FALSE,
          disability_type VARCHAR(100),
          disability_percentage DECIMAL(5,2),
          requires_workplace_accommodation BOOLEAN DEFAULT FALSE,
          accommodation_details TEXT,
          
          current_address TEXT,
          permanent_address TEXT,
          city VARCHAR(100),
          state VARCHAR(100),
          country VARCHAR(100),
          postal_code VARCHAR(20),
          
          languages_known JSONB DEFAULT '[]',
          skills JSONB DEFAULT '[]',
          bio TEXT,
          
          visa_number VARCHAR(50),
          visa_type VARCHAR(100),
          visa_country VARCHAR(100),
          visa_issue_date DATE,
          visa_expiry_date DATE,
          visa_status VARCHAR(50),

          is_deleted BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          created_by UUID,
          updated_by UUID
      );

      -- ─── 2. Job Details ───────────────────────────────────────────────────────
      CREATE TABLE employee_job_details (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
          joining_date DATE,
          confirmation_date DATE,
          employment_type employment_type_enum,
          employment_status employment_status_enum DEFAULT 'Active',
          department_id UUID REFERENCES departments(id),
          designation VARCHAR(100),
          role VARCHAR(100),
          reporting_manager_id UUID REFERENCES employees(id),
          branch VARCHAR(100),
          work_location VARCHAR(100),
          work_mode work_mode_enum,
          shift VARCHAR(50),
          cost_center VARCHAR(100),
          probation_end_date DATE,
          notice_period_days INTEGER,
          exit_date DATE,
          remarks TEXT,
          
          is_deleted BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          created_by UUID,
          updated_by UUID
      );

      -- ─── 3. Salary Information ────────────────────────────────────────────────
      CREATE TABLE employee_salary_details (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
          basic_salary DECIMAL(15,2),
          gross_salary DECIMAL(15,2),
          ctc DECIMAL(15,2),
          hra DECIMAL(15,2),
          other_allowances DECIMAL(15,2),
          bank_name VARCHAR(100),
          branch VARCHAR(100),
          account_holder_name VARCHAR(150),
          account_number VARCHAR(50),
          ifsc_code VARCHAR(20),
          pf_number VARCHAR(50),
          uan_number VARCHAR(50),
          esi_number VARCHAR(50),
          professional_tax_number VARCHAR(50),
          tax_regime VARCHAR(50),
          effective_from DATE,
          
          is_deleted BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          created_by UUID,
          updated_by UUID
      );

      -- ─── 4. Education ─────────────────────────────────────────────────────────
      CREATE TABLE employee_education (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
          degree VARCHAR(150),
          specialization VARCHAR(150),
          institution VARCHAR(255),
          university VARCHAR(255),
          country VARCHAR(100),
          year_of_passing INTEGER,
          percentage_or_cgpa VARCHAR(20),
          grade VARCHAR(20),
          
          is_deleted BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          created_by UUID,
          updated_by UUID
      );

      -- ─── 5. Experience ────────────────────────────────────────────────────────
      CREATE TABLE employee_experience (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
          company_name VARCHAR(255),
          designation VARCHAR(150),
          employment_type employment_type_enum,
          industry VARCHAR(150),
          start_date DATE,
          end_date DATE,
          currently_working BOOLEAN DEFAULT FALSE,
          responsibilities TEXT,
          reason_for_leaving TEXT,
          
          is_deleted BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          created_by UUID,
          updated_by UUID
      );

      -- ─── Certifications ────────────────────────────────────────────────────────
      CREATE TABLE employee_certifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
          certification_name VARCHAR(255) NOT NULL,
          issuing_organization VARCHAR(255) NOT NULL,
          issue_date DATE,
          expiry_date DATE,
          
          is_deleted BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          created_by UUID,
          updated_by UUID
      );

      -- ─── 6. Emergency Contacts ────────────────────────────────────────────────
      CREATE TABLE employee_emergency_contacts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
          contact_name VARCHAR(150),
          relationship VARCHAR(100),
          mobile_number VARCHAR(20),
          alternate_number VARCHAR(20),
          email_address VARCHAR(255),
          address TEXT,
          priority priority_enum DEFAULT 'Secondary',
          
          is_deleted BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          created_by UUID,
          updated_by UUID
      );

      -- ─── 7. Attachments ───────────────────────────────────────────────────────
      CREATE TABLE employee_attachments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
          document_type doc_type_enum NOT NULL,
          document_name VARCHAR(255),
          file_name VARCHAR(255) NOT NULL,
          file_path TEXT NOT NULL,
          file_size BIGINT,
          mime_type VARCHAR(100),
          uploaded_date TIMESTAMPTZ DEFAULT NOW(),
          expiry_date DATE,
          remarks TEXT,
          
          is_deleted BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          created_by UUID,
          updated_by UUID
      );

      -- ─── 8. Employee Assets ───────────────────────────────────────────────────
      CREATE TABLE employee_assets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
          asset_name VARCHAR(150),
          asset_category VARCHAR(100),
          asset_code VARCHAR(100),
          serial_number VARCHAR(100),
          assigned_date DATE,
          returned_date DATE,
          status asset_status_enum DEFAULT 'Available',
          remarks TEXT,
          
          is_deleted BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          created_by UUID,
          updated_by UUID
      );

      ALTER TABLE assets ADD COLUMN IF NOT EXISTS purchase_date DATE;
      ALTER TABLE assets ADD COLUMN IF NOT EXISTS location VARCHAR(255);

      -- ─── 9. System Access ─────────────────────────────────────────────────────
      CREATE TABLE employee_system_access (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
          username VARCHAR(100) UNIQUE NOT NULL,
          login_email VARCHAR(255) UNIQUE NOT NULL,
          role user_role_enum DEFAULT 'employee',
          account_status account_status_enum DEFAULT 'Active',
          password_hash TEXT NOT NULL,
          mfa_enabled BOOLEAN DEFAULT FALSE,
          last_login TIMESTAMPTZ,
          
          is_deleted BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          created_by UUID,
          updated_by UUID
      );

      -- CREATE INDEXES
      CREATE INDEX idx_employees_email ON employees(official_email);
      CREATE INDEX idx_employees_emp_id ON employees(employee_id);
      CREATE INDEX idx_sys_access_email ON employee_system_access(login_email);
      CREATE INDEX idx_job_details_emp ON employee_job_details(employee_id);

      -- ─── Projects ─────────────────────────────────────────────────────────────
      CREATE TABLE projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','on_hold','delayed')),
        start_date DATE,
        end_date DATE,
        created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        updated_by UUID REFERENCES employees(id) ON DELETE SET NULL
      );

      -- ─── Project Assignments ──────────────────────────────────────────────────
      CREATE TABLE project_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        role_in_project TEXT NOT NULL DEFAULT 'member',
        assigned_at TIMESTAMPTZ DEFAULT NOW(),
        assigned_by UUID REFERENCES employees(id) ON DELETE SET NULL,
        UNIQUE(project_id, employee_id)
      );

      -- ─── Tasks ────────────────────────────────────────────────────────────────
      CREATE TABLE tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT,
        project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
        assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','on_hold')),
        priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
        due_date DATE,
        completed_at TIMESTAMPTZ,
        created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        updated_by UUID REFERENCES employees(id) ON DELETE SET NULL
      );

      -- ─── Timesheets ───────────────────────────────────────────────────────────
      CREATE TABLE timesheets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        hours_worked NUMERIC(5,2) NOT NULL,
        project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
        task_description TEXT,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected')),
        submitted_at TIMESTAMPTZ,
        approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
        approved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID REFERENCES employees(id) ON DELETE SET NULL
      );

      -- ─── Leave Requests ───────────────────────────────────────────────────────
      CREATE TABLE leave_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        leave_type TEXT NOT NULL CHECK (leave_type IN ('paid_leave','sick_leave','loss_of_pay','other')),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
        approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
        approved_at TIMESTAMPTZ,
        rejection_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID REFERENCES employees(id) ON DELETE SET NULL
      );

      -- ─── Notifications ────────────────────────────────────────────────────────
      CREATE TABLE notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('leave','timesheet','task','asset','system')),
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        link TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('✅ Tables created successfully');

    // Seed admin account
    const adminEmail = 'rebeca@ctint';
    const adminPassword = 'admin123';

    const { rows: existing } = await client.query(
      'SELECT id FROM employee_system_access WHERE login_email = $1',
      [adminEmail]
    );

    if (existing.length === 0) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      
      const { rows: newEmp } = await client.query(
        `INSERT INTO employees (
          employee_id, first_name, last_name, official_email, mobile_number, date_of_birth, gender
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ['EMP001', 'Admin', 'User', adminEmail, '0000000000', '1990-01-01', 'Prefer Not to Say']
      );
      
      const empId = newEmp[0].id;
      
      await client.query(
        `INSERT INTO employee_system_access (
          employee_id, username, login_email, password_hash, role
        ) VALUES ($1, $2, $3, $4, $5)`,
        [empId, 'admin', adminEmail, passwordHash, 'admin']
      );

      await client.query(
        `INSERT INTO employee_job_details (employee_id, designation, role) VALUES ($1, $2, $3)`,
        [empId, 'System Administrator', 'Admin']
      );

      
      console.log('✅ Admin account created: rebeca@ctint / admin123');
    } else {
      console.log('ℹ️  Admin account already exists, skipping seed');
    }

    console.log('🎉 Migration complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(process.exit);
