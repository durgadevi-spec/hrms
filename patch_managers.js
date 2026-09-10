import pkg from 'pg';
const { Pool } = pkg;
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function patch() {
  const client = await pool.connect();
  try {
    console.log('🔄 Applying schema patches for multiple managers...');

    await client.query(`
      -- Add the new column
      ALTER TABLE departments ADD COLUMN IF NOT EXISTS manager_ids UUID[] DEFAULT '{}';

      -- Migrate existing single manager_id to the new manager_ids array
      UPDATE departments 
      SET manager_ids = ARRAY[manager_id]
      WHERE manager_id IS NOT NULL AND manager_ids = '{}';

      -- Drop the old manager_id column
      ALTER TABLE departments DROP COLUMN IF EXISTS manager_id;
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
