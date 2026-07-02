import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const pool = new pg.Pool({
  connectionString: process.env.TIMESTRAP_DB_URL,
});

async function run() {
  try {
    const res = await pool.query('SELECT * FROM public.employees LIMIT 1');
    console.log('Columns:', Object.keys(res.rows[0]));
    
    // Test the specific query
    const res2 = await pool.query("SELECT id, name, employee_code, department FROM public.employees WHERE is_active = true LIMIT 1");
    console.log('Query success:', res2.rows.length);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    pool.end();
  }
}

run();
