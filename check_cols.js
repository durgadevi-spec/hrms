import pkg from 'pg';
const { Pool } = pkg;
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const client = await pool.connect();
  try {
    const res = await client.query(`SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'employee_attachments';`);
    console.table(res.rows);
  } finally {
    client.release();
    pool.end();
  }
}

check();
