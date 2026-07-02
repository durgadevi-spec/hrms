import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Check enum values
    const res = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = 'asset_status_enum'::regtype;
    `);
    console.log('asset_status_enum values:', res.rows.map(r => r.enumlabel));
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
};

run();
