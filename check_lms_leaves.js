import pg from 'pg';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

const { Pool } = pg;

const run = async () => {
  const lmsPool = new Pool({
    connectionString: process.env.LMS_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Get all HRMS employees with their emails (via system_access)
    const { data: emps } = await supabase.from('employees').select('id, first_name, last_name, official_email, employee_id').eq('is_deleted', false);
    const { data: access } = await supabase.from('employee_system_access').select('employee_id, login_email, account_status');
    
    const accessMap = {};
    access?.forEach(a => accessMap[a.employee_id] = a);

    console.log('=== HRMS EMPLOYEES WITH EMAILS ===');
    emps?.forEach(e => {
      const acc = accessMap[e.id];
      const email = acc?.login_email || e.official_email;
      const status = acc?.account_status || 'Unknown';
      console.log(`  ${e.first_name} ${e.last_name} (${e.employee_id}) - email: "${email}" - status: ${status}`);
    });

    // Get all LMS users
    const lmsUsersRes = await lmsPool.query(`SELECT user_id, email FROM public.users`);
    console.log('\n=== LMS USERS ===');
    lmsUsersRes.rows.forEach(r => console.log(`  ${r.user_id}: "${r.email}" (trimmed: "${r.email?.trim()}")`));

    // Try matching
    console.log('\n=== EMAIL MATCHING ===');
    emps?.forEach(e => {
      const acc = accessMap[e.id];
      const hrmsEmail = (acc?.login_email || e.official_email || '').toLowerCase().trim();
      const match = lmsUsersRes.rows.find(u => u.email && u.email.toLowerCase().trim() === hrmsEmail);
      if (match) {
        console.log(`  ✓ ${e.first_name} ${e.last_name}: HRMS="${hrmsEmail}" ↔ LMS="${match.user_id}"`);
      } else {
        console.log(`  ✗ ${e.first_name} ${e.last_name}: HRMS="${hrmsEmail}" → NO LMS MATCH`);
      }
    });

    // Today's leave check
    const today = new Date().toISOString().split('T')[0];
    const todayLeaves = await lmsPool.query(
      `SELECT * FROM public.leaves WHERE start_date <= $1::date AND end_date >= $1::date AND status = 'Approved'`,
      [today]
    );
    console.log(`\n=== APPROVED LEAVES COVERING TODAY (${today}) ===`);
    todayLeaves.rows.forEach(r => {
      const lmsUser = lmsUsersRes.rows.find(u => u.user_id === r.user_id);
      const lmsEmail = lmsUser?.email?.trim();
      const hrmsMatch = emps?.find(e => {
        const acc = accessMap[e.id];
        const hrmsEmail = (acc?.login_email || e.official_email || '').toLowerCase().trim();
        return hrmsEmail === lmsEmail?.toLowerCase();
      });
      console.log(`  ${r.username?.trim()} (LMS: ${r.user_id}, email: "${lmsEmail}") → HRMS match: ${hrmsMatch ? hrmsMatch.first_name + ' ' + hrmsMatch.last_name : 'NONE'}`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await lmsPool.end();
  }
};

run();
