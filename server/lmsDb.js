import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Pool connecting to the external LMS database
const lmsPool = new Pool({
  connectionString: process.env.LMS_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

lmsPool.on('error', (err) => {
  console.error('LMS DB pool error:', err.message);
});

export default lmsPool;
