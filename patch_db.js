import pkg from 'pg';
const { Pool } = pkg;
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function patch() {
  const client = await pool.connect();
  try {
    console.log('🔄 Applying schema patches...');

    await client.query(`
      -- Employees Table Visa Fields
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS visa_number VARCHAR(50);
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS visa_type VARCHAR(100);
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS visa_country VARCHAR(100);
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS visa_issue_date DATE;
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS visa_expiry_date DATE;
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS visa_status VARCHAR(50);
      
      -- Add Document Enum type if not present - PostgreSQL doesn't support IF NOT EXISTS directly on ENUM values but we can use a block
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'doc_type_enum' AND e.enumlabel = 'Visa Document') THEN
          ALTER TYPE doc_type_enum ADD VALUE 'Visa Document';
        END IF;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      
      -- Certifications Table
      CREATE TABLE IF NOT EXISTS employee_certifications (
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

      -- Assets Table additions
      ALTER TABLE assets ADD COLUMN IF NOT EXISTS purchase_date DATE;
      ALTER TABLE assets ADD COLUMN IF NOT EXISTS location VARCHAR(255);

      -- Attachments Table support
      -- The employee_attachments table already uses doc_type_enum, which now includes 'Visa Document'.
    `);

    console.log('✅ Patch applied successfully');
  } catch (err) {
    console.error('❌ Patch failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

patch().catch(console.error);
