import pkg from 'pg';
const { Pool } = pkg;
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const client = await pool.connect();
  try {
    // Check all employees
    const emps = await client.query(`SELECT id, first_name, last_name, employee_id, official_email FROM employees WHERE is_deleted = false;`);
    console.log('\n=== EMPLOYEES ===');
    console.table(emps.rows);

    for (const emp of emps.rows) {
      const eduRes = await client.query(`SELECT * FROM employee_education WHERE employee_id = $1;`, [emp.id]);
      const expRes = await client.query(`SELECT * FROM employee_experience WHERE employee_id = $1;`, [emp.id]);
      const certRes = await client.query(`SELECT * FROM employee_certifications WHERE employee_id = $1;`, [emp.id]);
      const emerRes = await client.query(`SELECT * FROM employee_emergency_contacts WHERE employee_id = $1;`, [emp.id]);
      const jobRes = await client.query(`SELECT * FROM employee_job_details WHERE employee_id = $1;`, [emp.id]);
      const salRes = await client.query(`SELECT * FROM employee_salary_details WHERE employee_id = $1;`, [emp.id]);

      console.log(`\n--- ${emp.first_name} ${emp.last_name} (${emp.id}) ---`);
      console.log(`Education: ${eduRes.rows.length} records`);
      if (eduRes.rows.length > 0) console.table(eduRes.rows.map(r => ({degree: r.degree, institution: r.institution, year: r.year_of_passing})));
      console.log(`Experience: ${expRes.rows.length} records`);
      console.log(`Certifications: ${certRes.rows.length} records`);
      console.log(`Emergency contacts: ${emerRes.rows.length} records`);
      if (emerRes.rows.length > 0) console.table(emerRes.rows.map(r => ({name: r.contact_name, relationship: r.relationship, phone: r.mobile_number})));
      console.log(`Job details: ${jobRes.rows.length > 0 ? 'YES' : 'NO'}`);
      console.log(`Salary: ${salRes.rows.length > 0 ? 'YES' : 'NO'}`);
    }
  } finally {
    client.release();
    pool.end();
  }
}

check().catch(console.error);
