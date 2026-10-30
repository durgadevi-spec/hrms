import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ override: true });

const { Pool } = pg;

const timestrapPool = new Pool({
    connectionString: process.env.TIMESTRAP_DB_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

timestrapPool.on('error', (err) => {
    console.error('Unexpected error on idle TimeStrap client', err);
    process.exit(-1);
});

export default timestrapPool;