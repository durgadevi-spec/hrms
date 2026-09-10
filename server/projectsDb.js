import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Pool connecting to the external Projects database
const projectsPool = new Pool({
  connectionString: process.env.PROJECTS_DB_URL,
  ssl: { rejectUnauthorized: false },
});

projectsPool.on('error', (err) => {
  console.error('Projects DB pool error:', err.message);
});

export default projectsPool;
