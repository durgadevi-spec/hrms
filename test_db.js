import pg from 'pg';
const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.gykfyiqujyiwchqgmsjx:Rebecasuji%4013@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const email = 'rebeca@ctint.in';
  let userExternalId = null;

  const userRes = await pool.query(
    "SELECT user_id, email FROM public.users WHERE email ILIKE '%' || $1 || '%'",
    [email]
  );

  if (userRes.rows.length > 0) {
    userExternalId = userRes.rows[0].user_id;
    console.log('Found user:', userExternalId, 'Email in DB:', userRes.rows[0].email);
  } else {
    console.log('User not found');
  }

  if (userExternalId) {
    const balRes = await pool.query("SELECT * FROM public.leave_balance WHERE employee_code = $1", [userExternalId]);
    const histRes = await pool.query("SELECT * FROM public.leaves WHERE user_id = $1 ORDER BY created_at DESC", [userExternalId]);
    const permRes = await pool.query("SELECT * FROM public.permissions WHERE user_id = $1 ORDER BY created_at DESC", [userExternalId]);
    
    console.log('Balances:', balRes.rows.length);
    console.log('History length:', histRes.rows.length);
    console.log('Permissions length:', permRes.rows.length);
  }
  process.exit(0);
}
run();
