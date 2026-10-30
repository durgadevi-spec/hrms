import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ override: true });

const { Pool } = pg;

// Pool for the knockturn.cloud portal database (the login + admin employee
// registry that knockturn.cloud uses as its DATABASE_URL).
// Optional: if KNOCKTURN_DATABASE_URL is not set, the employee sync simply
// skips this target and reports it as "skipped" instead of crashing.
const knockturnPool = process.env.KNOCKTURN_DATABASE_URL
    ? new Pool({
        connectionString: process.env.KNOCKTURN_DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    })
    : null;

if (knockturnPool) {
    knockturnPool.on('error', (err) => {
        console.error('Knockturn DB pool error:', err.message);
    });
}

export default knockturnPool;