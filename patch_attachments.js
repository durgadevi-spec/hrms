import pkg from 'pg';
const { Pool } = pkg;
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function patch() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Altering employee_attachments.file_path to TEXT...');
    await client.query(`
      ALTER TABLE employee_attachments
      ALTER COLUMN file_path TYPE TEXT;
    `);

    // We should also reload the schema cache for postgrest just in case.
    try {
      await client.query(`NOTIFY pgrst, 'reload schema';`);
      console.log('PostgREST schema cache reloaded.');
    } catch (e) {
      console.log('Could not notify pgrst (might not be needed or supported on this connection):', e.message);
    }

    await client.query('COMMIT');
    console.log('✅ Patch applied successfully: employee_attachments.file_path is now TEXT.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error applying patch:', error);
  } finally {
    client.release();
    pool.end();
  }
}

patch();
