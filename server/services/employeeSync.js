/**
 * Employee sync: HRMS is the single place where employees are added, deleted
 * and activated/deactivated. This service mirrors those actions into the
 * other systems:
 *
 *   - knockturn.cloud portal DB  (employees)
 *   - TimeStrap DB               (employees)
 *   - PMS / Projects DB          (employees + users)
 *   - LMS DB                     (employees + users)
 *
 * The record shapes below are the same ones knockturn.cloud's own
 * "add employee" feature writes (server/employee-provisioning.ts), so the
 * downstream apps keep working exactly as they do today.
 *
 * Employees are matched across systems by employee code (HRMS employee_id).
 */
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import lmsPool from '../lmsDb.js';
import projectsPool from '../projectsDb.js';
import timestrapPool from '../timestrapDb.js';
import knockturnPool from '../knockturnDb.js';

// Default password for a newly added employee in the OTHER systems
// (knockturn.cloud, TimeStrap, PMS, LMS) - same default knockturn.cloud seeds
// (script/seed.ts). Can be overridden with EXTERNAL_DEFAULT_PASSWORD.
// HRMS' own login keeps its existing default.
export const DEFAULT_EXTERNAL_PASSWORD = process.env.EXTERNAL_DEFAULT_PASSWORD || 'admin123';

// Prefix put in front of a stored password to block login while an employee
// is deactivated in systems that have no "active" flag (knockturn.cloud, PMS,
// LMS), so none of those apps need any code change. It is
// removed again on reactivation, so the original password is preserved.
const LOCK_PREFIX = '!DEACTIVATED!';

// HRMS has 5 roles; the other systems only know employee / hr / admin.
const ROLE_MAP = {
    admin: 'admin',
    hr: 'hr',
    manager: 'employee',
    it_support: 'employee',
    employee: 'employee',
};
const mapRole = (role) => ROLE_MAP[String(role || '').toLowerCase()] || 'employee';

const departmentCode = (name) =>
    String(name || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'GENERAL';

async function withTransaction(pool, work) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    } finally {
        client.release();
    }
}

// Run a statement that is allowed to fail (e.g. optional table) without
// aborting the surrounding transaction.
async function tryQuery(client, sql, params) {
    await client.query('SAVEPOINT optional_step');
    try {
        await client.query(sql, params);
        await client.query('RELEASE SAVEPOINT optional_step');
    } catch (err) {
        await client.query('ROLLBACK TO SAVEPOINT optional_step');
        console.warn('[employeeSync] optional step skipped:', err.message);
    }
}

const targets = () => [
    { key: 'knockturn', label: 'knockturn.cloud', pool: knockturnPool },
    { key: 'timestrap', label: 'TimeStrap', pool: timestrapPool },
    { key: 'pms', label: 'PMS', pool: projectsPool },
    { key: 'lms', label: 'LMS', pool: lmsPool },
];

const conflict = (message) => Object.assign(new Error(message), { status: 409 });

/* ───────────────────────────── ADD ───────────────────────────── */

/**
 * Check every system for clashes BEFORE anything is created, so a duplicate
 * is reported up-front rather than half-way through.
 */
export async function assertAvailableEverywhere({ name, employeeCode }) {
    const code = employeeCode.trim().toUpperCase();
    const username = name.trim();

    if (knockturnPool) {
        const r = await knockturnPool.query(
            'SELECT 1 FROM employees WHERE employee_code = $1 OR LOWER(username) = LOWER($2) LIMIT 1',
            [code, username]
        );
        if (r.rowCount) throw conflict(`knockturn.cloud already has an employee with code ${code} or name "${username}"`);
    }

    const ts = await timestrapPool.query('SELECT 1 FROM employees WHERE employee_code = $1 LIMIT 1', [code]);
    if (ts.rowCount) throw conflict(`TimeStrap already has employee code ${code}`);

    const pmsUser = await projectsPool.query('SELECT 1 FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1', [username]);
    if (pmsUser.rowCount) throw conflict(`PMS already has username "${username}". Use a different full name.`);
    const pmsEmp = await projectsPool.query('SELECT 1 FROM employees WHERE emp_code = $1 LIMIT 1', [code]);
    if (pmsEmp.rowCount) throw conflict(`PMS already has employee code ${code}`);

    const lmsUser = await lmsPool.query(
        'SELECT 1 FROM users WHERE LOWER(username) = LOWER($1) OR user_id = $2 LIMIT 1',
        [username, code]
    );
    if (lmsUser.rowCount) throw conflict(`LMS already has username "${username}" or employee code ${code}`);
    const lmsEmp = await lmsPool.query('SELECT 1 FROM employees WHERE employee_code = $1 LIMIT 1', [code]);
    if (lmsEmp.rowCount) throw conflict(`LMS already has employee code ${code}`);
}

/**
 * Create the employee in knockturn.cloud, TimeStrap, PMS and LMS.
 * If any system fails, everything created so far is removed again and the
 * error is re-thrown, so HRMS never ends up half-synced.
 */
export async function provisionEverywhere({
    hrmsEmployeeId,
    name,
    employeeCode,
    password = DEFAULT_EXTERNAL_PASSWORD,
    role,
    email,
    department,
    designation,
    joiningDate,
}) {
    const code = employeeCode.trim().toUpperCase();
    const fullName = name.trim();
    const mappedRole = mapRole(role);
    const dept = (department || '').trim() || 'General';
    const mail = email ? email.trim().toLowerCase() : null;

    const pmsEmployeeId = randomUUID();
    const pmsUserId = randomUUID();
    const timestrapPassword = await bcrypt.hash(password, 10);

    const done = []; // for rollback
    const skipped = [];

    try {
        if (knockturnPool) {
            await withTransaction(knockturnPool, async (c) => {
                await c.query(
                    `INSERT INTO employees (id, username, employee_code, password, is_admin)
           VALUES ($1, $2, $3, $4, $5)`,
                    [hrmsEmployeeId, fullName, code, password, mappedRole === 'admin']
                );
            });
            done.push(() => knockturnPool.query('DELETE FROM employees WHERE id = $1', [hrmsEmployeeId]));
        } else {
            skipped.push('knockturn.cloud');
        }

        await withTransaction(timestrapPool, async (c) => {
            await c.query(
                `INSERT INTO departments (name, code) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [dept, departmentCode(dept)]
            );
            await c.query(
                `INSERT INTO employees (id, name, email, employee_code, password, role, department, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
                [hrmsEmployeeId, fullName, mail, code, timestrapPassword, mappedRole, dept]
            );
        });
        done.push(() => timestrapPool.query('DELETE FROM employees WHERE id = $1', [hrmsEmployeeId]));

        await withTransaction(projectsPool, async (c) => {
            await c.query(`INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [dept]);
            await c.query(
                `INSERT INTO employees (id, name, designation, department, emp_code, email)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [pmsEmployeeId, fullName, designation || null, dept, code, mail]
            );
            await c.query(
                `INSERT INTO users (id, username, password, employee_id, role)
         VALUES ($1, $2, $3, $4, $5)`,
                [pmsUserId, fullName, password, pmsEmployeeId, mappedRole.toUpperCase()]
            );
        });
        done.push(async () => {
            await projectsPool.query('DELETE FROM users WHERE id = $1', [pmsUserId]);
            await projectsPool.query('DELETE FROM employees WHERE id = $1', [pmsEmployeeId]);
        });

        await withTransaction(lmsPool, async (c) => {
            await c.query(
                `INSERT INTO employees (id, employee_code, name, designation, role, join_date)
         VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE))`,
                [pmsEmployeeId, code, fullName, designation || null, mappedRole, joiningDate || null]
            );
            await c.query(
                `INSERT INTO users (user_id, username, password, role, email)
         VALUES ($1, $2, $3, $4, $5)`,
                [code, fullName, password, mappedRole, mail]
            );
        });
    } catch (err) {
        for (const undo of done.reverse()) {
            await Promise.resolve(undo()).catch((e) => console.error('[employeeSync] rollback step failed:', e.message));
        }
        throw err;
    }

    return { synced: ['knockturn.cloud', 'TimeStrap', 'PMS', 'LMS'].filter((l) => !skipped.includes(l)), skipped };
}

/** Undo provisionEverywhere for an employee (used if the HRMS side fails afterwards). */
export const rollbackProvisioned = (args) => deleteEverywhere(args).catch((e) =>
    console.error('[employeeSync] rollbackProvisioned failed:', e.message)
);

/* ─────────────────────── ACTIVATE / DEACTIVATE ─────────────────────── */

// Matching rules used by deactivate / reactivate / delete. Codes are compared
// ignoring case and surrounding spaces, and the email is used as a fallback,
// so employees whose code is stored slightly differently are still found.
const tsMatch = `(UPPER(TRIM(employee_code)) = $1 OR ($2::text IS NOT NULL AND LOWER(TRIM(email)) = $2))`;
const pmsEmpMatch = `(UPPER(TRIM(emp_code)) = $1 OR ($2::text IS NOT NULL AND LOWER(TRIM(email)) = $2))`;
const lmsUserMatch = `(UPPER(TRIM(user_id)) = $1 OR ($2::text IS NOT NULL AND LOWER(TRIM(email)) = $2))`;
const knMatch = `UPPER(TRIM(employee_code)) = $1`;

/**
 * Deactivate (active=false) or reactivate (active=true) the employee in all
 * other systems. Idempotent. Throws if a system fails; systems where no
 * matching employee was found are returned in `notFound` (nothing changed there).
 */
export async function setActiveEverywhere({ employeeCode, email, active }) {
    const code = employeeCode.trim().toUpperCase();
    const mail = email ? email.trim().toLowerCase() : null;
    const failures = [];
    const synced = [];
    const notFound = [];

    const run = async (label, fn) => {
        try {
            const res = await fn();
            console.log(`[employeeSync] ${label} ${active ? 'reactivate' : 'deactivate'}: ${res.rowCount} row(s) matched`);
            if (!res.rowCount) notFound.push(label);
            else synced.push(label);
        } catch (err) {
            console.error(`[employeeSync] ${label} ${active ? 'reactivate' : 'deactivate'} failed:`, err.message);
            failures.push(`${label}: ${err.message}`);
        }
    };

    // knockturn.cloud, PMS and LMS have no "active" flag, so login is blocked by
    // locking the stored password (reversible). Written so it can run twice safely
    // and so rowCount always means "employee found".
    const lockSet = active
        ? `password = CASE WHEN password LIKE '${LOCK_PREFIX}%' THEN SUBSTRING(password FROM ${LOCK_PREFIX.length + 1}) ELSE password END`
        : `password = CASE WHEN password LIKE '${LOCK_PREFIX}%' THEN password ELSE '${LOCK_PREFIX}' || password END`;

    if (knockturnPool) {
        await run('knockturn.cloud', () =>
            knockturnPool.query(`UPDATE employees SET ${lockSet} WHERE ${knMatch}`, [code])
        );
    }

    await run('TimeStrap', () =>
        timestrapPool.query(`UPDATE employees SET is_active = $3 WHERE ${tsMatch}`, [code, mail, active])
    );

    await run('PMS', () =>
        projectsPool.query(
            `UPDATE users SET ${lockSet}
       WHERE employee_id IN (SELECT id FROM employees WHERE ${pmsEmpMatch})`,
            [code, mail]
        )
    );

    await run('LMS', () =>
        lmsPool.query(`UPDATE users SET ${lockSet} WHERE ${lmsUserMatch}`, [code, mail])
    );

    if (failures.length) {
        throw Object.assign(
            new Error(`Could not ${active ? 'reactivate' : 'deactivate'} in: ${failures.join('; ')}`),
            { status: 502 }
        );
    }
    return { synced, notFound, skipped: knockturnPool ? [] : ['knockturn.cloud'] };
}

/* ───────────────────────────── DELETE ───────────────────────────── */

/**
 * Permanently remove the employee's identity/login records from the other
 * systems. Idempotent, so a failed delete can simply be retried. Leave,
 * timesheet and punch history rows are intentionally left alone.
 */
export async function deleteEverywhere({ employeeCode, email }) {
    const code = employeeCode.trim().toUpperCase();
    const mail = email ? email.trim().toLowerCase() : null;

    if (knockturnPool) {
        await withTransaction(knockturnPool, async (c) => {
            await tryQuery(
                c,
                `DELETE FROM employee_app_access WHERE employee_id IN (SELECT id::text FROM employees WHERE ${knMatch})`,
                [code]
            );
            await c.query(`DELETE FROM employees WHERE ${knMatch}`, [code]);
        });
    }

    await withTransaction(timestrapPool, async (c) => {
        await c.query(`DELETE FROM employees WHERE ${tsMatch}`, [code, mail]);
    });

    await withTransaction(projectsPool, async (c) => {
        await tryQuery(
            c,
            `DELETE FROM project_team_members WHERE employee_id IN (SELECT id FROM employees WHERE ${pmsEmpMatch})`,
            [code, mail]
        );
        await c.query(`DELETE FROM users WHERE employee_id IN (SELECT id FROM employees WHERE ${pmsEmpMatch})`, [code, mail]);
        await c.query(`DELETE FROM employees WHERE ${pmsEmpMatch}`, [code, mail]);
    });

    await withTransaction(lmsPool, async (c) => {
        await c.query(`DELETE FROM users WHERE ${lmsUserMatch}`, [code, mail]);
        await c.query(`DELETE FROM employees WHERE UPPER(TRIM(employee_code)) = $1`, [code]);
    });

    return { synced: ['knockturn.cloud', 'TimeStrap', 'PMS', 'LMS'].filter((l) => knockturnPool || l !== 'knockturn.cloud'), skipped: knockturnPool ? [] : ['knockturn.cloud'] };
}