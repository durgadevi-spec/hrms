import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Use the external TimeStrap database URL
// The user provided: postgresql://postgres.bmigbiajnhhknltuvrso:Durgadevi%4067@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require
const timestrapPool = new Pool({
    connectionString: 'postgresql://postgres.bmigbiajnhhknltuvrso:Durgadevi%4067@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres',
    ssl: {
        rejectUnauthorized: false
    }
});

timestrapPool.on('error', (err) => {
    console.error('Unexpected error on idle TimeStrap client', err);
    process.exit(-1);
});

export default timestrapPool;