// Diagnostic script — run with: node check_broken_logins.js
//
// Finds every login/access record (employee_system_access) whose
// employee_id does NOT match any row in `employees`. Anyone in this
// list is logged in under an id that the rest of the app can't find —
// their own profile page will show "Employee not found", and anything
// assigned to their *real* employee record (assets, tasks, etc.) won't
// show up under "my stuff" because the ids don't match.
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();

        console.log('\n=== Broken logins: access.employee_id has no matching employees row ===');
        const broken = await client.query(`
      SELECT a.id AS access_id, a.login_email, a.employee_id AS broken_employee_id, a.role, a.account_status
      FROM employee_system_access a
      LEFT JOIN employees e ON e.id = a.employee_id
      WHERE e.id IS NULL
    `);
        console.table(broken.rows);

        if (broken.rows.length === 0) {
            console.log('None found — logins all resolve correctly.');
        }

        for (const row of broken.rows) {
            console.log(`\n--- Possible matching employees row(s) for ${row.login_email} ---`);
            const candidates = await client.query(
                `SELECT id, employee_id, first_name, last_name, official_email, is_deleted
         FROM employees
         WHERE official_email ILIKE $1 OR official_email ILIKE $2`,
                [`%${row.login_email}%`, `%${row.login_email.split('@')[0]}%`]
            );
            console.table(candidates.rows);
            if (candidates.rows.length === 1) {
                console.log(`Fix:\n  UPDATE employee_system_access SET employee_id = '${candidates.rows[0].id}' WHERE id = '${row.access_id}';`);
            } else if (candidates.rows.length > 1) {
                console.log('Multiple possible matches — pick the correct one manually before running the UPDATE.');
            } else {
                console.log('No matching employees row found by email — will need manual lookup by name.');
            }
        }

        console.log('\n=== Bonus: employee_assets rows pointing at a non-existent employee (still-open assignments only) ===');
        const orphanAssets = await client.query(`
      SELECT ea.id, ea.asset_id, ea.asset_name, ea.employee_id, ea.assigned_date
      FROM employee_assets ea
      LEFT JOIN employees e ON e.id = ea.employee_id
      WHERE e.id IS NULL AND ea.returned_date IS NULL
    `);
        console.table(orphanAssets.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
};

run();